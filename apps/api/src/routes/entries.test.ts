import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../index'
import { createTestEnv, jpegFile } from '../testUtils'
import type { Bindings } from '../types'

let env: Bindings
let dispose: () => Promise<void>

beforeAll(async () => {
  const t = await createTestEnv()
  env = t.env
  dispose = t.dispose
})
afterAll(() => dispose())

const headers = (uid: string) => ({ 'X-User-Id': uid })

async function upload(uid: string, date: string, file: File, extra: Record<string, string> = {}) {
  const fd = new FormData()
  fd.set('file', file)
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return app.request(`/api/entries/${date}/photos`, { method: 'POST', body: fd, headers: headers(uid) }, env)
}

describe('entries & photos', () => {
  it('上傳後可查回 Entry 與照片，並能串流圖片', async () => {
    const res = await upload('u1', '2025-05-01', jpegFile(32), { mode: 'collect', dominantColors: JSON.stringify(['#FF0000', 'bad']) })
    expect(res.status).toBe(201)
    const body = (await res.json()) as any
    expect(body.entry.mode).toBe('collect')
    expect(body.photo.dominantColors).toEqual(['#FF0000'])

    const got = (await (await app.request('/api/entries/2025-05-01', { headers: headers('u1') }, env)).json()) as any
    expect(got.photos).toHaveLength(1)

    const img = await app.request(got.photos[0].url, { headers: headers('u1') }, env)
    expect(img.status).toBe(200)
    expect(img.headers.get('content-type')).toBe('image/jpeg')
    expect((await img.arrayBuffer()).byteLength).toBe(32)
  })

  it('同一天多張照片共用同一個 Entry', async () => {
    await upload('u2', '2025-05-02', jpegFile())
    await upload('u2', '2025-05-02', jpegFile())
    const got = (await (await app.request('/api/entries/2025-05-02', { headers: headers('u2') }, env)).json()) as any
    expect(got.photos).toHaveLength(2)
  })

  it('其他使用者看不到照片', async () => {
    const got = (await (await app.request('/api/entries/2025-05-01', { headers: headers('u3') }, env)).json()) as any
    expect(got.entry).toBeNull()
    const r = await upload('u1', '2025-05-03', jpegFile())
    const id = ((await r.json()) as any).photo.id
    const img = await app.request(`/api/photos/${id}`, { headers: headers('u3') }, env)
    expect(img.status).toBe(404)
  })

  it('超過 10MB 回 413', async () => {
    const res = await upload('u1', '2025-05-04', jpegFile(10 * 1024 * 1024 + 1))
    expect(res.status).toBe(413)
  })

  it('非圖片回 415、日期錯誤回 400', async () => {
    const res = await upload('u1', '2025-05-05', new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(res.status).toBe(415)
    const bad = await app.request('/api/entries/nope', { headers: headers('u1') }, env)
    expect(bad.status).toBe(400)
  })
})
