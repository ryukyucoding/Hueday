import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { isValidRecap, type RecapFacts } from '@hueday/core'
import app from './index'
import { buildRecapRequest, generateRecap, getOrCreateRecap, parseRecap, recapKey, type RecapData } from './recap'
import { createTestEnv, jpegFile } from './testUtils'
import type { Bindings } from './types'

const facts: RecapFacts = { monthNumber: 9, daysRecorded: 18, photoCount: 31, streak: 6, collectedColors: 24, topHues: ['綠', '橘'], mainColorName: '抹茶綠', sampleNames: ['傍晚捷運站的橘'] }
const okBody = (recap: string) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ recap }) }] } }] })
const good = '這個月你替生活收集了二十四種顏色，綠色最常闖進鏡頭，其次是橘色。抹茶綠是你的月度主色，傍晚捷運站的橘更是一整個月的亮點。連續記錄六天的你，把平凡日子過成了色票，下個月也繼續吧。'
const env = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' }

describe('recap request', () => {
  it('prompt 帶入素材與 80–120 字、Wrapped 口吻要求；schema 為 recap 字串', () => {
    const b = buildRecapRequest(facts, ['今天心情不錯'])
    const text = (b.contents[0].parts[0] as any).text as string
    for (const s of ['Spotify Wrapped', '80 到 120', '抹茶綠', '傍晚捷運站的橘', '今天心情不錯', '9 月']) expect(text).toContain(s)
    expect(b.generationConfig.responseMimeType).toBe('application/json')
    expect(b.generationConfig.responseSchema.properties).toEqual({ recap: { type: 'STRING' } })
  })
})

describe('parseRecap / generateRecap', () => {
  it('合格文字通過；太長截斷到 120 字內；太短或格式錯誤回 null', () => {
    expect(isValidRecap(good)).toBe(true)
    expect(parseRecap(okBody(good))).toBe(good)
    const long = parseRecap(okBody(good + good))
    expect(long && Array.from(long).length).toBeLessThanOrEqual(120)
    expect(parseRecap(okBody('太短了'))).toBeNull()
    expect(parseRecap({})).toBeNull()
  })

  it('Gemini 成功用 AI 文字；失敗、太短、無 key、沒有照片都退回示意文字（80–120 字）', async () => {
    const ok = await generateRecap(env, facts, [], (async () => new Response(JSON.stringify(okBody(good)))) as any)
    expect(ok).toEqual({ text: good, mock: false })
    for (const f of [
      (async () => new Response('x', { status: 429 })) as any,
      (async () => { throw new Error('boom') }) as any,
      (async () => new Response(JSON.stringify(okBody('太短')))) as any
    ]) {
      const r = await generateRecap(env, facts, [], f)
      expect(r.mock).toBe(true)
      expect(isValidRecap(r.text)).toBe(true)
    }
    expect((await generateRecap({ GEMINI_MODEL: 'm' }, facts, [])).mock).toBe(true)
    expect((await generateRecap(env, { ...facts, photoCount: 0, daysRecorded: 0 }, [], (async () => { throw new Error('should not call') }) as any)).mock).toBe(true)
  })

  it('逾時會中止並退回示意文字', async () => {
    vi.useFakeTimers()
    const f = (_: any, init: any) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(new Error('abort'))))
    const p = generateRecap(env, facts, [], f as any)
    await vi.advanceTimersByTimeAsync(10_001)
    expect((await p).mock).toBe(true)
    vi.useRealTimers()
  })
})

describe('getOrCreateRecap 快取', () => {
  class FakeKV {
    store = new Map<string, string>()
    async get(k: string, type?: string) {
      const v = this.store.get(k)
      return v === undefined ? null : type === 'json' ? JSON.parse(v) : v
    }
    async put(k: string, v: string) {
      this.store.set(k, v)
    }
  }
  const data: RecapData = { stats: {} as any, facts, notes: [] }

  it('同月第二次走快取（不再呼叫 Gemini）；force 會重產並覆蓋快取', async () => {
    const kv = new FakeKV()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(okBody(good))))
    const e = { ...env, CACHE: kv as unknown as KVNamespace }
    const a = await getOrCreateRecap(e, 'u', '2025-09', data, { fetchImpl: fetchImpl as any })
    expect(a.cached).toBe(false)
    const b = await getOrCreateRecap(e, 'u', '2025-09', data, { fetchImpl: fetchImpl as any })
    expect(b).toMatchObject({ text: good, cached: true })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const c = await getOrCreateRecap(e, 'u', '2025-09', data, { force: true, fetchImpl: fetchImpl as any })
    expect(c.cached).toBe(false)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(kv.store.has(recapKey('u', '2025-09'))).toBe(true)
    // 不同月份、不同使用者互不影響
    expect((await getOrCreateRecap(e, 'u', '2025-10', data, { fetchImpl: fetchImpl as any })).cached).toBe(false)
    expect((await getOrCreateRecap(e, 'other', '2025-09', data, { fetchImpl: fetchImpl as any })).cached).toBe(false)
  })
})

describe('POST /api/recap', () => {
  let benv: Bindings
  let dispose: () => Promise<void>
  beforeAll(async () => {
    const t = await createTestEnv()
    benv = t.env
    dispose = t.dispose
    for (const d of ['2025-09-01', '2025-09-02', '2025-09-03']) {
      const fd = new FormData()
      fd.set('file', jpegFile())
      fd.set('dominantColors', JSON.stringify(['#5E8C61', '#E8603C']))
      await app.request(`/api/entries/${d}/photos`, { method: 'POST', body: fd, headers: { 'X-User-Id': 'r1' } }, benv)
    }
    await app.request('/api/entries/2025-09-02/note', { method: 'PUT', body: JSON.stringify({ note: '下雨天的咖啡' }), headers: { 'X-User-Id': 'r1', 'Content-Type': 'application/json' } }, benv)
  })
  afterAll(() => dispose())

  const post = (q: string, uid = 'r1') => app.request(`/api/recap?${q}`, { method: 'POST', headers: { 'X-User-Id': uid } }, benv)

  it('無 key 走 mock（80–120 字、帶 mock:true）；同月第二次是快取；force 重產', async () => {
    const a = (await (await post('month=2025-09')).json()) as any
    expect(a.mock).toBe(true)
    expect(a.cached).toBe(false)
    expect(isValidRecap(a.text)).toBe(true)
    expect(a.text).toContain('9 月')
    const b = (await (await post('month=2025-09')).json()) as any
    expect(b).toMatchObject({ cached: true, text: a.text })
    const c = (await (await post('month=2025-09&force=1')).json()) as any
    expect(c.cached).toBe(false)
  })

  it('沒有記錄的月份也回 80–120 字；格式錯誤回 400', async () => {
    const r = (await (await post('month=2025-01', 'nobody')).json()) as any
    expect(isValidRecap(r.text)).toBe(true)
    expect((await post('month=2025-13')).status).toBe(400)
    expect((await post('')).status).toBe(400)
  })
})
