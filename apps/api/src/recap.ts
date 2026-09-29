import { HUE_GROUPS, HUE_GROUP_LABELS, computeStats, fitRecap, isValidRecap, mockRecapText, nearestPaletteColor, type MonthStats, type RecapFacts } from '@hueday/core'
import { GEMINI_TIMEOUT_MS, failureOf, type GeminiFailure } from './gemini'
import { loadStatsEntries } from './routes/stats'
import type { Bindings } from './types'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'

export type RecapResult = { text: string; mock: boolean }
export type RecapData = { stats: MonthStats; facts: RecapFacts; notes: string[] }

const recapSchema = {
  type: 'OBJECT',
  properties: { recap: { type: 'STRING' } },
  required: ['recap']
} as const

/** 讀取本月統計、每張照片的 AI 色名與備註，整理成回顧需要的素材 */
export async function loadRecapData(db: D1Database, userId: string, month: string, asOf?: string): Promise<RecapData> {
  const stats = computeStats(await loadStatsEntries(db, userId), month, asOf)
  const { results } = await db
    .prepare(
      `SELECT e.date AS date, e.note AS note, p.ai_color_name AS name
         FROM entries e LEFT JOIN photos p ON p.entry_id = e.id
        WHERE e.user_id = ? AND e.date >= ? AND e.date <= ? ORDER BY e.date ASC, p.created_at ASC`
    )
    .bind(userId, `${month}-01`, `${month}-31`)
    .all<{ date: string; note: string | null; name: string | null }>()

  const names = results.map((r) => r.name).filter((n): n is string => !!n)
  const step = Math.max(1, Math.ceil(names.length / 12))
  const notes = [...new Map(results.filter((r) => r.note).map((r) => [r.date, r.note!.slice(0, 60)])).values()].slice(0, 8)
  const topHues = HUE_GROUPS.filter((g) => stats.hueShare[g] > 0)
    .sort((a, b) => stats.hueShare[b] - stats.hueShare[a])
    .slice(0, 3)
    .map((g) => HUE_GROUP_LABELS[g])

  return {
    stats,
    notes,
    facts: {
      monthNumber: Number(month.slice(5)),
      daysRecorded: stats.daysRecorded,
      photoCount: stats.photoCount,
      streak: stats.streak,
      collectedColors: stats.collectedColors,
      topHues,
      mainColorName: stats.mainColor ? nearestPaletteColor(stats.mainColor).zh : null,
      sampleNames: names.filter((_, i) => i % step === 0)
    }
  }
}

export function buildRecapRequest(facts: RecapFacts, notes: string[]) {
  const material = {
    月份: `${facts.monthNumber} 月`,
    記錄天數: facts.daysRecorded,
    照片數: facts.photoCount,
    連續記錄天數: facts.streak,
    收集色數: facts.collectedColors,
    最常出現的色系: facts.topHues,
    本月主色: facts.mainColorName,
    照片的AI色名: facts.sampleNames,
    使用者備註: notes
  }
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              '你是「拾色 Hueday」App 的月度回顧作家。請根據下面這個月的資料，寫一段像 Spotify Wrapped 口吻的繁體中文回顧：' +
              '用第二人稱「你」、輕快有趣又帶一點詩意，可以引用具體的數字、色名或備註；不要條列、不要標題、不要 hashtag、不要出現任何按讚或瀏覽數之類的社交指標。' +
              '長度必須是 80 到 120 個中文字。只回傳 JSON：{"recap": "..."}。\n\n' +
              JSON.stringify(material)
          }
        ]
      }
    ],
    generationConfig: { responseMimeType: 'application/json', responseSchema: recapSchema, temperature: 0.9 }
  }
}

/** 解析 Gemini 回應；整理成 80–120 字，不合格（太短）回 null 以改用示意文字 */
export function parseRecap(json: unknown): string | null {
  const text = (json as any)?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') return null
  try {
    const v = JSON.parse(text)
    if (typeof v.recap !== 'string') return null
    const fitted = fitRecap(v.recap)
    return isValidRecap(fitted) ? fitted : null
  } catch {
    return null
  }
}

export async function generateRecap(
  env: Pick<Bindings, 'GEMINI_API_KEY' | 'GEMINI_MODEL'>,
  facts: RecapFacts,
  notes: string[],
  fetchImpl: typeof fetch = fetch,
  onFail?: (reason: GeminiFailure) => void
): Promise<RecapResult> {
  const mock = (): RecapResult => ({ text: mockRecapText(facts), mock: true })
  if (!env.GEMINI_API_KEY || facts.photoCount === 0) return mock()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS)
  try {
    const res = await fetchImpl(`${ENDPOINT}/${env.GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify(buildRecapRequest(facts, notes)),
      signal: ctrl.signal
    })
    const text = res.ok ? parseRecap(await res.json()) : null
    if (!text) onFail?.(res.ok ? 'error' : failureOf(res))
    return text ? { text, mock: false } : mock()
  } catch (e) {
    onFail?.(failureOf(undefined, e))
    return mock()
  } finally {
    clearTimeout(timer)
  }
}

export const recapKey = (userId: string, month: string) => `recap:${userId}:${month}`

/** 同一個月只產生一次（快取在 KV）；force 可強制重產 */
export async function getOrCreateRecap(
  env: Pick<Bindings, 'GEMINI_API_KEY' | 'GEMINI_MODEL' | 'CACHE'>,
  userId: string,
  month: string,
  data: RecapData,
  opts: { force?: boolean; fetchImpl?: typeof fetch } = {}
): Promise<RecapResult & { cached: boolean; degraded: GeminiFailure | null }> {
  const key = recapKey(userId, month)
  if (!opts.force) {
    const hit = await env.CACHE.get<RecapResult>(key, 'json').catch(() => null)
    if (hit?.text) return { ...hit, cached: true, degraded: null }
  }
  let degraded: GeminiFailure | null = null
  const made = await generateRecap(env, data.facts, data.notes, opts.fetchImpl, (r) => (degraded = r))
  // AI 暫時失敗時的示意文字不快取，讓使用者稍後重試就能拿到真正的回顧
  if (!degraded) await env.CACHE.put(key, JSON.stringify(made)).catch(() => {})
  return { ...made, cached: false, degraded }
}
