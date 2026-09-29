import { PALETTE, colorDistance, mockColorName, nearestPaletteColor, truncateColorName } from '@hueday/core'
import type { Bindings } from './types'

export const GEMINI_TIMEOUT_MS = 10_000
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export type ColorJudgement = { matchesTarget: boolean; subject: string; confidence: number; mock?: boolean }

export type JudgeInput = {
  bytes: ArrayBuffer
  mimeType: string
  targetHex: string
  dominantColors: string[]
}

export function targetName(hex: string): string {
  const c = PALETTE.find((p) => p.hex.toUpperCase() === hex.toUpperCase())
  return c ? c.zh : hex
}

export const judgementSchema = {
  type: 'OBJECT',
  properties: {
    matchesTarget: { type: 'BOOLEAN' },
    subject: { type: 'STRING' },
    confidence: { type: 'NUMBER' }
  },
  required: ['matchesTarget', 'subject', 'confidence'],
  propertyOrdering: ['matchesTarget', 'subject', 'confidence']
} as const

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export function buildJudgeRequest(input: JudgeInput) {
  const name = targetName(input.targetHex)
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `目標顏色是「${name}」（${input.targetHex}）。請判斷這張照片的「主要被攝物」是否屬於這個顏色。` +
              `以 JSON 回答：matchesTarget（布林）、subject（用繁體中文 2–8 字描述主要被攝物，例如「紅色郵筒」）、confidence（0 到 1）。`
          },
          { inline_data: { mime_type: input.mimeType, data: toBase64(input.bytes) } }
        ]
      }
    ],
    generationConfig: { responseMimeType: 'application/json', responseSchema: judgementSchema, temperature: 0.2 }
  }
}

export function parseJudgement(json: unknown): ColorJudgement | null {
  const text = (json as any)?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') return null
  try {
    const v = JSON.parse(text)
    if (typeof v.matchesTarget !== 'boolean' || typeof v.subject !== 'string') return null
    const confidence = Math.max(0, Math.min(1, Number(v.confidence) || 0))
    return { matchesTarget: v.matchesTarget, subject: v.subject.slice(0, 20), confidence }
  } catch {
    return null
  }
}

/** 沒有 key 時：用主色與目標色的 OKLab 距離做示意判斷 */
export function mockJudge(input: Pick<JudgeInput, 'targetHex' | 'dominantColors'>): ColorJudgement {
  if (input.dominantColors.length === 0) return { matchesTarget: false, subject: '未知', confidence: 0, mock: true }
  const dists = input.dominantColors.map((c) => colorDistance(c, input.targetHex))
  const best = Math.min(...dists)
  return {
    matchesTarget: best < 18,
    subject: targetName(input.targetHex) + '色的東西',
    confidence: Math.max(0, Math.min(1, 1 - best / 60)),
    mock: true
  }
}

/** 呼叫 Gemini；逾時、非 2xx、格式錯誤一律回傳 null（不影響上傳） */
export async function judgeWithGemini(
  env: Pick<Bindings, 'GEMINI_API_KEY' | 'GEMINI_MODEL'>,
  input: JudgeInput,
  fetchImpl: typeof fetch = fetch
): Promise<ColorJudgement | null> {
  if (!env.GEMINI_API_KEY) return mockJudge(input)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS)
  try {
    const res = await fetchImpl(`${ENDPOINT}/${env.GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(buildJudgeRequest(input)),
      signal: ctrl.signal
    })
    if (!res.ok) return null
    return parseJudgement(await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ---------- AI 色名（P7）----------

export const nameSchema = {
  type: 'OBJECT',
  properties: { colorName: { type: 'STRING', minLength: 4, maxLength: 10 } },
  required: ['colorName']
} as const

export type NameInput = { bytes: ArrayBuffer; mimeType: string; dominantColor: string }

export function buildNameRequest(input: NameInput) {
  const near = nearestPaletteColor(input.dominantColor).zh
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `請替這張照片的主色（${input.dominantColor}，接近「${near}」）取一個 4 到 10 個字的詩意繁體中文色名，` +
              `要結合照片內容與場景，例如「傍晚捷運站的橘」。只回傳 JSON：{"colorName": "..."}。`
          },
          { inline_data: { mime_type: input.mimeType, data: toBase64(input.bytes) } }
        ]
      }
    ],
    generationConfig: { responseMimeType: 'application/json', responseSchema: nameSchema, temperature: 0.9 }
  }
}

export function parseName(json: unknown): string | null {
  const text = (json as any)?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') return null
  try {
    const v = JSON.parse(text)
    if (typeof v.colorName !== 'string') return null
    const name = truncateColorName(v.colorName)
    return name.length > 0 ? name : null
  } catch {
    return null
  }
}

/** 一定會回傳色名：Gemini 失敗或沒有 key 時用示意色名 */
export async function nameColor(
  env: Pick<Bindings, 'GEMINI_API_KEY' | 'GEMINI_MODEL'>,
  input: NameInput,
  seed: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ name: string; mock: boolean }> {
  const mock = () => ({ name: mockColorName(nearestPaletteColor(input.dominantColor).zh, null, seed), mock: true })
  if (!env.GEMINI_API_KEY) return mock()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS)
  try {
    const res = await fetchImpl(`${ENDPOINT}/${env.GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(buildNameRequest(input)),
      signal: ctrl.signal
    })
    const name = res.ok ? parseName(await res.json()) : null
    return name ? { name, mock: false } : mock()
  } catch {
    return mock()
  } finally {
    clearTimeout(timer)
  }
}
