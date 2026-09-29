import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../index'
import { createTestEnv, jpegFile } from '../testUtils'
import type { Bindings } from '../types'
import { RENDER_VERSION, cacheRequest, dataVersion, pngResponse, storeResponse } from './renderCache'

let env: Bindings
let dispose: () => Promise<void>
beforeAll(async () => {
  const t = await createTestEnv()
  env = t.env
  dispose = t.dispose
})
afterAll(() => dispose())

async function upload(uid: string, date: string, colors = '["#FF0000"]', mode = 'single') {
  const fd = new FormData()
  fd.set('file', jpegFile())
  fd.set('mode', mode)
  fd.set('dominantColors', colors)
  await app.request(`/api/entries/${date}/photos`, { method: 'POST', body: fd, headers: { 'X-User-Id': uid } }, env)
}
const q = (s: string) => new URLSearchParams(s)

describe('cacheRequest：key 由使用者、模板、全部參數與資料版本決定', () => {
  const key = (uid: string, tpl: string, query: string, v: string) => cacheRequest(uid, tpl, q(query), v).url

  it('同樣輸入同樣 key，且與參數順序無關', () => {
    expect(key('u', 'collage', 'date=2025-01-01&style=flow', 'v1')).toBe(key('u', 'collage', 'style=flow&date=2025-01-01', 'v1'))
  })
  it('使用者、模板、日期、風格、顆粒、資料版本任一不同 → key 不同', () => {
    const base = key('u', 'collage', 'date=2025-01-01&style=flow&grain=60', 'v1')
    for (const other of [
      key('u2', 'collage', 'date=2025-01-01&style=flow&grain=60', 'v1'),
      key('u', 'swatch', 'date=2025-01-01&style=flow&grain=60', 'v1'),
      key('u', 'collage', 'date=2025-01-02&style=flow&grain=60', 'v1'),
      key('u', 'collage', 'date=2025-01-01&style=mesh&grain=60', 'v1'),
      key('u', 'collage', 'date=2025-01-01&style=flow&grain=61', 'v1'),
      key('u', 'collage', 'date=2025-01-01&style=flow&grain=60', 'v2')
    ]) expect(other).not.toBe(base)
  })
  it('key 帶程式版本，改版可一次讓舊快取失效', () => {
    expect(key('u', 'collage', 'date=2025-01-01', 'v1')).toContain(`_v=${RENDER_VERSION}.`)
  })
})

describe('response headers', () => {
  it('給使用者的是 private/no-cache（避免瀏覽器留舊圖），存進快取的是 immutable', () => {
    const r = pngResponse(new Uint8Array([1]), 'miss')
    expect(r.headers.get('Cache-Control')).toBe('private, no-cache')
    expect(r.headers.get('X-Render-Cache')).toBe('miss')
    expect(pngResponse(new Uint8Array([1]), 'hit').headers.get('X-Render-Cache')).toBe('hit')
    expect(storeResponse(new ArrayBuffer(1)).headers.get('Cache-Control')).toContain('max-age=31536000')
  })
})

describe('dataVersion：資料一變版本就變（快取自動失效）', () => {
  it('collage：當天新增照片 → 版本改變；別天、別人的資料不影響', async () => {
    const d = { DB: env.DB, CACHE: env.CACHE }
    const empty = await dataVersion(d, 'v1', 'collage', q('date=2025-03-01'))
    expect(empty).toBe('none')
    await upload('v1', '2025-03-01')
    const one = await dataVersion(d, 'v1', 'collage', q('date=2025-03-01'))
    expect(one).not.toBe(empty)
    expect(await dataVersion(d, 'v1', 'collage', q('date=2025-03-01'))).toBe(one) // 沒變動 → 穩定
    await new Promise((r) => setTimeout(r, 5))
    await upload('v1', '2025-03-01')
    const two = await dataVersion(d, 'v1', 'collage', q('date=2025-03-01'))
    expect(two).not.toBe(one)
    await upload('v1', '2025-03-02')
    await upload('other', '2025-03-01')
    expect(await dataVersion(d, 'v1', 'collage', q('date=2025-03-01'))).toBe(two)
  })

  it('compare：今年或去年任一天有變動就失效', async () => {
    const d = { DB: env.DB, CACHE: env.CACHE }
    const a = await dataVersion(d, 'v2', 'compare', q('date=2026-03-05'))
    await upload('v2', '2025-03-05')
    const b = await dataVersion(d, 'v2', 'compare', q('date=2026-03-05'))
    expect(b).not.toBe(a)
    await new Promise((r) => setTimeout(r, 5))
    await upload('v2', '2026-03-05')
    expect(await dataVersion(d, 'v2', 'compare', q('date=2026-03-05'))).not.toBe(b)
  })

  it('stats / palette：使用者任何照片變動就失效（連續天數會跨月）', async () => {
    const d = { DB: env.DB, CACHE: env.CACHE }
    const a = await dataVersion(d, 'v3', 'stats', q('month=2025-04'))
    await upload('v3', '2025-03-31')
    const b = await dataVersion(d, 'v3', 'stats', q('month=2025-04'))
    expect(b).not.toBe(a)
    expect(await dataVersion(d, 'v3', 'palette', q('month=2025-04'))).toBe(b)
  })

  it('recap：回顧文字（KV）改變，版本也跟著變', async () => {
    const d = { DB: env.DB, CACHE: env.CACHE }
    const a = await dataVersion(d, 'v4', 'recap', q('month=2025-05'))
    await env.CACHE.put('recap:v4:2025-05', JSON.stringify({ text: '第一版', mock: true }))
    const b = await dataVersion(d, 'v4', 'recap', q('month=2025-05'))
    expect(b).not.toBe(a)
    await env.CACHE.put('recap:v4:2025-05', JSON.stringify({ text: '重新產生的第二版', mock: true }))
    expect(await dataVersion(d, 'v4', 'recap', q('month=2025-05'))).not.toBe(b)
  })
})
