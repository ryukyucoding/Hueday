import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import app from './index'
import { LIMITS, hit } from './rateLimit'
import { createTestEnv, jpegFile } from './testUtils'
import type { Bindings } from './types'

let env: Bindings
let dispose: () => Promise<void>
beforeAll(async () => {
  const t = await createTestEnv()
  env = t.env
  dispose = t.dispose
})
afterAll(() => dispose())
afterEach(() => vi.useRealTimers())

const H = (uid: string, extra: Record<string, string> = {}) => ({ 'X-User-Id': uid, ...extra })

function upload(uid: string, date: string, file = jpegFile(), e: Bindings = env, extra: Record<string, string> = {}, mode = 'collect') {
  const fd = new FormData()
  fd.set('file', file)
  fd.set('mode', mode)
  return app.request(`/api/entries/${date}/photos`, { method: 'POST', body: fd, headers: H(uid, extra) }, e)
}

describe('hit（KV 固定視窗計數器）', () => {
  it('上限：upload 10 / gemini 20 / render 30', () => {
    expect(LIMITS).toEqual({ upload: 10, gemini: 20, render: 30 })
  })

  it('剛好用到上限為止；超過回 ok:false 與 1–60 秒的 retryAfter', async () => {
    const now = Date.UTC(2025, 0, 1, 0, 0, 15) // 該分鐘的第 15 秒
    for (let i = 1; i <= 10; i++) {
      const r = await hit(env.CACHE, 'h1', 'upload', 1, now)
      expect(r).toMatchObject({ ok: true, remaining: 10 - i })
    }
    const over = await hit(env.CACHE, 'h1', 'upload', 1, now)
    expect(over.ok).toBe(false)
    expect(over.remaining).toBe(0)
    expect(over.retryAfter).toBe(45) // 到下一分鐘還有 45 秒
    expect(over.retryAfter).toBeGreaterThanOrEqual(1)
    expect(over.retryAfter).toBeLessThanOrEqual(60)
  })

  it('下一分鐘重新計算；不同使用者、不同 bucket 互不影響', async () => {
    const t = Date.UTC(2025, 0, 1, 0, 5, 0)
    await hit(env.CACHE, 'h2', 'render', 30, t)
    expect((await hit(env.CACHE, 'h2', 'render', 1, t)).ok).toBe(false)
    expect((await hit(env.CACHE, 'h2', 'render', 1, t + 60_000)).ok).toBe(true)
    expect((await hit(env.CACHE, 'h2', 'upload', 1, t)).ok).toBe(true)
    expect((await hit(env.CACHE, 'someone-else', 'render', 1, t)).ok).toBe(true)
  })

  it('cost 大於剩餘量時不扣（整批拒絕）', async () => {
    const t = Date.UTC(2025, 0, 1, 0, 9, 0)
    await hit(env.CACHE, 'h3', 'gemini', 19, t)
    expect((await hit(env.CACHE, 'h3', 'gemini', 2, t)).ok).toBe(false)
    expect((await hit(env.CACHE, 'h3', 'gemini', 1, t)).ok).toBe(true) // 剩下的 1 次還在
  })
})

describe('上傳限流：每分鐘 ≤ 10 次', () => {
  it('第 11 次回 429 + Retry-After + 統一錯誤格式；別人不受影響；下一分鐘恢復', async () => {
    const day = (i: number) => `2025-06-${String(i + 1).padStart(2, '0')}`
    for (let i = 0; i < 10; i++) expect((await upload('up1', day(i))).status).toBe(201)
    const res = await upload('up1', day(10))
    expect(res.status).toBe(429)
    const ra = Number(res.headers.get('Retry-After'))
    expect(ra).toBeGreaterThanOrEqual(1)
    expect(ra).toBeLessThanOrEqual(60)
    expect(await res.json()).toEqual({ error: { code: 'rate_limited', message: expect.stringContaining('請') } })
    // 被擋的那次不會寫入任何資料
    const got = (await (await app.request(`/api/entries/${day(10)}`, { headers: H('up1') }, env)).json()) as any
    expect(got.photos).toEqual([])
    // 別的使用者不受影響
    expect((await upload('up2', day(0))).status).toBe(201)
    // 進入下一分鐘後恢復
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 61_000)
    expect((await upload('up1', day(10))).status).toBe(201)
  })
})

describe('上傳格式白名單（JPEG / PNG / WebP / HEIC）與 10MB 上限', () => {
  const f = (type: string, name = 'x') => new File([new Uint8Array(8).fill(1)], name, { type })
  it('允許的格式（含大小寫、HEIF）', async () => {
    let i = 0
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'IMAGE/JPEG']) {
      const res = await upload('ty1', `2025-07-0${++i}`, f(t))
      expect(res.status, t).toBe(201)
    }
  })
  it('其他格式一律 415：gif、svg、bmp、pdf、文字、沒有型別', async () => {
    let i = 0
    for (const t of ['image/gif', 'image/svg+xml', 'image/bmp', 'application/pdf', 'text/plain', '']) {
      const res = await upload('ty2', `2025-07-0${++i}`, f(t))
      expect(res.status, JSON.stringify(t)).toBe(415)
      expect(((await res.json()) as any).error.code).toBe('bad_type')
    }
  })
  it('超過 10MB 回 413；剛好 10MB 可以', async () => {
    expect((await upload('sz1', '2025-08-01', new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'a.jpg', { type: 'image/jpeg' }))).status).toBe(413)
    expect((await upload('sz1', '2025-08-02', new File([new Uint8Array(10 * 1024 * 1024)], 'a.jpg', { type: 'image/jpeg' }))).status).toBe(201)
  })
})

describe('Gemini 呼叫額度：每分鐘 ≤ 20 次', () => {
  const withKey = (): Bindings => Object.assign(Object.create(Object.getPrototypeOf(env)), env, { GEMINI_API_KEY: 'k', ALLOW_SIMULATE: '1' }) as Bindings

  it('上傳：額度不夠時照片仍成功，改用示意結果並回報 ai_rate_limited（不呼叫 Gemini）', async () => {
    await hit(env.CACHE, 'g1', 'gemini', 19) // 只剩 1 次，單色日需要 2 次
    // 用 gemini-error 模擬：若真的呼叫了 Gemini，warnings 會出現 ai_error
    const res = await upload('g1', '2025-09-01', jpegFile(), withKey(), { 'X-Simulate': 'gemini-error' }, 'single')
    expect(res.status).toBe(201)
    const b = (await res.json()) as any
    expect(b.warnings).toEqual(['ai_rate_limited'])
    expect(b.photo.aiColorName).toBeTruthy()
    expect(b.photo.mock).toBe(true) // 降級成示意判斷（不是真的 Gemini 結果）
    expect(typeof b.photo.matchesTarget).toBe('boolean')
  })

  it('上傳：額度足夠時會呼叫 Gemini 並扣額度（單色日 2 次、集色日 1 次）', async () => {
    const e = withKey()
    const a = (await (await upload('g2', '2025-09-02', jpegFile(), e, { 'X-Simulate': 'gemini-error' }, 'single')).json()) as any
    expect(a.warnings).toContain('ai_error') // 有真的去呼叫
    const b = (await (await upload('g2', '2025-09-03', jpegFile(), e, { 'X-Simulate': 'gemini-error' }, 'collect')).json()) as any
    expect(b.warnings).toContain('ai_error')
    expect((await hit(env.CACHE, 'g2', 'gemini', 17)).ok).toBe(true) // 20 - 2 - 1 = 17
    expect((await hit(env.CACHE, 'g2', 'gemini', 1)).ok).toBe(false)
  })

  it('沒有 key（mock 模式）不扣額度', async () => {
    await upload('g3', '2025-09-04')
    expect((await hit(env.CACHE, 'g3', 'gemini', 20)).ok).toBe(true)
  })

  it('月回顧：額度用完回 429 + Retry-After；命中快取不扣額度', async () => {
    const e = withKey()
    await hit(env.CACHE, 'g4', 'gemini', 20)
    const post = (uid: string, month: string) => app.request(`/api/recap?month=${month}`, { method: 'POST', headers: H(uid) }, e)
    const limited = await post('g4', '2025-10')
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1)
    expect(((await limited.json()) as any).error.code).toBe('rate_limited')
    // 已有快取的月份：即使額度用完也能讀，且完全不呼叫 Gemini
    await env.CACHE.put('recap:g4:2025-11', JSON.stringify({ text: '已經產生過的回顧', mock: false }))
    for (let i = 0; i < 5; i++) {
      const ok = await post('g4', '2025-11')
      expect(ok.status).toBe(200)
      expect(await ok.json()).toMatchObject({ text: '已經產生過的回顧', cached: true })
    }
  })
})

describe('產圖額度：每分鐘 ≤ 30 次', () => {
  it('額度用完回 429 + Retry-After（在做任何重活之前就擋下）', async () => {
    await hit(env.CACHE, 'r1', 'render', 30)
    const res = await app.request('/api/render?template=collage&date=2025-01-01', { headers: H('r1') }, env)
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1)
    expect(((await res.json()) as any).error.code).toBe('rate_limited')
  })
})
