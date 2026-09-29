import { describe, expect, it, vi } from 'vitest'
import { buildJudgeRequest, judgeWithGemini, mockJudge, parseJudgement, toBase64 } from './gemini'

const input = { bytes: new Uint8Array([1, 2, 3]).buffer, mimeType: 'image/jpeg', targetHex: '#E8603C', dominantColors: ['#E8603C'] }
const okBody = (o: unknown) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] })

describe('gemini request', () => {
  it('body 使用 inline base64 與 JSON responseSchema', () => {
    const b = buildJudgeRequest(input)
    const parts = b.contents[0].parts as any[]
    expect(parts[0].text).toContain('柿子橘')
    expect(parts[0].text).toContain('#E8603C')
    expect(parts[1]).toEqual({ inline_data: { mime_type: 'image/jpeg', data: toBase64(input.bytes) } })
    expect(toBase64(input.bytes)).toBe('AQID')
    expect(b.generationConfig.responseMimeType).toBe('application/json')
    const s = b.generationConfig.responseSchema
    expect(s.type).toBe('OBJECT')
    expect(s.properties).toEqual({ matchesTarget: { type: 'BOOLEAN' }, subject: { type: 'STRING' }, confidence: { type: 'NUMBER' } })
    expect(s.required).toEqual(['matchesTarget', 'subject', 'confidence'])
  })

  it('呼叫正確的 URL 與 key header，key 不在 body', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(okBody({ matchesTarget: true, subject: '橘色招牌', confidence: 0.9 }))))
    const r = await judgeWithGemini({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-x' }, input, f as any)
    expect(r).toEqual({ matchesTarget: true, subject: '橘色招牌', confidence: 0.9 })
    const [url, init] = f.mock.calls[0] as any
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-x:generateContent')
    expect(init.headers['x-goog-api-key']).toBe('k')
    expect(init.body).not.toContain('"k"')
  })

  it('非 2xx / 例外 / 格式錯誤都回 null', async () => {
    const env = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' }
    expect(await judgeWithGemini(env, input, (async () => new Response('x', { status: 429 })) as any)).toBeNull()
    expect(await judgeWithGemini(env, input, (async () => { throw new Error('boom') }) as any)).toBeNull()
    expect(await judgeWithGemini(env, input, (async () => new Response(JSON.stringify(okBody({ nope: 1 })))) as any)).toBeNull()
  })

  it('逾時會中止並回 null', async () => {
    vi.useFakeTimers()
    const f = (_: any, init: any) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(new Error('abort'))))
    const p = judgeWithGemini({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' }, input, f as any)
    await vi.advanceTimersByTimeAsync(10_001)
    expect(await p).toBeNull()
    vi.useRealTimers()
  })

  it('parseJudgement 會限制 confidence 範圍', () => {
    expect(parseJudgement(okBody({ matchesTarget: false, subject: 'x', confidence: 3 }))?.confidence).toBe(1)
  })
})

describe('mock', () => {
  it('無 key 走 mock 並標示 mock: true', async () => {
    const r = await judgeWithGemini({ GEMINI_MODEL: 'm' }, input)
    expect(r?.mock).toBe(true)
    expect(r?.matchesTarget).toBe(true)
  })
  it('顏色差很遠時判定不符', () => {
    expect(mockJudge({ targetHex: '#E8603C', dominantColors: ['#1D3557'] }).matchesTarget).toBe(false)
  })
})
