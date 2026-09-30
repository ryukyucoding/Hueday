import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from './index'
import { getPhoto, photoKey, putPhoto } from './photoStore'
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

describe('photoStore（照片存在 KV）', () => {
  it('key 含使用者、日期與照片 id', () => {
    expect(photoKey('u', '2025-01-02', 'p1')).toBe('photo:u:2025-01-02:p1')
  })

  it('存進去再讀出來：位元組與 content-type 都一致（二進位，不經過文字編碼）', async () => {
    const bytes = new Uint8Array(256).map((_, i) => i) // 涵蓋所有位元組值 0–255
    await putPhoto(env.CACHE, 'photo:t:1', bytes.buffer, 'image/png')
    const got = await getPhoto(env.CACHE, 'photo:t:1')
    expect(got?.contentType).toBe('image/png')
    expect(new Uint8Array(await new Response(got!.body).arrayBuffer())).toEqual(bytes)
  })

  it('不存在回 null', async () => {
    expect(await getPhoto(env.CACHE, 'photo:nope')).toBeNull()
  })

  it('大照片（接近 10 MB 上限）也能存取', async () => {
    const big = new Uint8Array(9 * 1024 * 1024).fill(7)
    await putPhoto(env.CACHE, 'photo:t:big', big.buffer, 'image/jpeg')
    const got = await getPhoto(env.CACHE, 'photo:t:big')
    expect((await new Response(got!.body).arrayBuffer()).byteLength).toBe(big.byteLength)
  })
})

describe('照片 API 走 KV', () => {
  it('PNG 上傳後以 image/png 讀回；KV 裡被清掉時回 404（不是 500）', async () => {
    const fd = new FormData()
    fd.set('file', new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], 'a.png', { type: 'image/png' }))
    const up = (await (await app.request('/api/entries/2025-02-01/photos', { method: 'POST', body: fd, headers: { 'X-User-Id': 'ps1' } }, env)).json()) as any
    const img = await app.request(up.photo.url, { headers: { 'X-User-Id': 'ps1' } }, env)
    expect(img.status).toBe(200)
    expect(img.headers.get('content-type')).toBe('image/png')
    const { results } = await env.DB.prepare('SELECT r2_key FROM photos WHERE id = ?').bind(up.photo.id).all<{ r2_key: string }>()
    expect(results[0].r2_key).toMatch(/^photo:ps1:2025-02-01:/)
    await env.CACHE.delete(results[0].r2_key)
    expect((await app.request(up.photo.url, { headers: { 'X-User-Id': 'ps1' } }, env)).status).toBe(404)
  })
})
