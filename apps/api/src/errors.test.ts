import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import app from './index'
import { failureOf, judgeWithGemini, nameColor } from './gemini'
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

const H = (extra: Record<string, string> = {}) => ({ 'X-User-Id': 'e1', ...extra })
const shape = (b: any) => expect(b).toEqual({ error: { code: expect.any(String), message: expect.any(String) } })

async function upload(sim?: string, date = '2025-11-01', e: Bindings = env) {
  const fd = new FormData()
  fd.set('file', jpegFile())
  fd.set('mode', 'single')
  return app.request(`/api/entries/${date}/photos`, { method: 'POST', body: fd, headers: H(sim ? { 'X-Simulate': sim } : {}) }, e)
}

describe('統一錯誤格式 { error: { code, message } }', () => {
  it('未知路徑 404、未預期的例外 500 都是同一種格式', async () => {
    const nf = await app.request('/api/nope', { headers: H() }, env)
    expect(nf.status).toBe(404)
    shape(await nf.json())
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const boom = await app.request('/api/entries/2025-01-01', { headers: H() }, {} as Bindings) // 沒有 DB → TypeError
    spy.mockRestore()
    expect(boom.status).toBe(500)
    const b = (await boom.json()) as any
    shape(b)
    expect(b.error.code).toBe('internal_error')
    expect(b.error.message).not.toMatch(/TypeError|undefined/) // 不外洩內部細節
  })

  it('既有的 4xx 也都是這個格式', async () => {
    shape(await (await app.request('/api/entries/bad', { headers: H() }, env)).json())
    shape(await (await app.request('/api/entries/2025-01-01')).json())
    shape(await (await app.request('/api/render?template=x&date=2025-01-01', { headers: H() }, env)).json())
  })
})

describe('Gemini 失敗原因分類', () => {
  it('429 → quota、AbortError → timeout、其他 → error', () => {
    expect(failureOf(new Response('', { status: 429 }))).toBe('quota')
    expect(failureOf(new Response('', { status: 500 }))).toBe('error')
    expect(failureOf(undefined, new DOMException('t', 'AbortError'))).toBe('timeout')
    expect(failureOf(undefined, new Error('x'))).toBe('error')
  })

  it('judge / nameColor 會回報失敗原因，且不影響結果', async () => {
    const e = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'm' }
    const input = { bytes: new Uint8Array([1]).buffer, mimeType: 'image/jpeg', targetHex: '#E8603C', dominantColors: ['#E8603C'] }
    const reasons: string[] = []
    const quota = (async () => new Response('x', { status: 429 })) as any
    const abort = (async () => { throw new DOMException('t', 'AbortError') }) as any
    expect(await judgeWithGemini(e, input, quota, (r) => reasons.push(r))).toBeNull()
    expect(await judgeWithGemini(e, input, abort, (r) => reasons.push(r))).toBeNull()
    const named = await nameColor(e, { bytes: input.bytes, mimeType: 'image/jpeg', dominantColor: '#E8603C' }, 's', quota, (r) => reasons.push(r))
    expect(named.mock).toBe(true)
    expect(reasons).toEqual(['quota', 'timeout', 'quota'])
  })
})

describe('開發用錯誤模擬（X-Simulate）', () => {
  const withSim = () => Object.assign(Object.create(Object.getPrototypeOf(env)), env, { ALLOW_SIMULATE: '1' }) as Bindings

  it('沒開 ALLOW_SIMULATE 時 header 完全被忽略（正式環境安全）', async () => {
    const res = await upload('upload-fail', '2025-11-02')
    expect(res.status).toBe(201)
    expect((await app.request('/api/entries/2025-11-02', { headers: H({ 'X-Simulate': 'server-error' }) }, env)).status).toBe(200)
  })

  it('upload-fail → 500 upload_failed，而且不會留下半套資料', async () => {
    const res = await upload('upload-fail', '2025-11-03', withSim())
    expect(res.status).toBe(500)
    expect(((await res.json()) as any).error.code).toBe('upload_failed')
    const got = (await (await app.request('/api/entries/2025-11-03', { headers: H() }, env)).json()) as any
    expect(got.photos).toEqual([])
  })

  it('gemini-quota / timeout / error → 照片仍上傳成功，warnings 回報原因', async () => {
    for (const [s, w] of [['gemini-quota', 'ai_quota'], ['gemini-timeout', 'ai_timeout'], ['gemini-error', 'ai_error']] as const) {
      const res = await upload(s, `2025-11-1${['gemini-quota', 'gemini-timeout', 'gemini-error'].indexOf(s)}`, withSim())
      expect(res.status).toBe(201)
      const b = (await res.json()) as any
      expect(b.warnings).toContain(w)
      expect(b.photo.aiColorName).toBeTruthy() // 仍有示意色名
    }
  })

  it('正常上傳 warnings 為空陣列', async () => {
    expect(((await (await upload(undefined, '2025-11-20')).json()) as any).warnings).toEqual([])
  })

  it('rate-limit → 429 + Retry-After；server-error → 500；render-fail → 500 render_failed', async () => {
    const e = withSim()
    const rl = await app.request('/api/entries/2025-01-01', { headers: H({ 'X-Simulate': 'rate-limit' }) }, e)
    expect(rl.status).toBe(429)
    expect(rl.headers.get('Retry-After')).toBe('30')
    shape(await rl.json())
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await app.request('/api/entries/2025-01-01', { headers: H({ 'X-Simulate': 'server-error' }) }, e)).status).toBe(500)
    spy.mockRestore()
    const r = await app.request('/api/render?template=collage&date=2025-01-01', { headers: H({ 'X-Simulate': 'render-fail' }) }, e)
    expect(r.status).toBe(500)
    expect(((await r.json()) as any).error.code).toBe('render_failed')
  })

  it('recap：Gemini 失敗時回報 degraded，且示意文字不進快取（稍後重試可拿到真的）', async () => {
    const e = withSim()
    const post = (s?: string) => app.request('/api/recap?month=2025-11', { method: 'POST', headers: H(s ? { 'X-Simulate': s } : {}) }, e)
    const a = (await (await post('gemini-quota')).json()) as any
    expect(a).toMatchObject({ mock: true, degraded: 'quota' })
    const b = (await (await post()).json()) as any
    expect(b.cached).toBe(false) // 上一次是降級結果，沒有被快取
    expect(b.degraded).toBeNull()
  })
})
