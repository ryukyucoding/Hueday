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

async function upload(uid: string, date: string, colors: string[]) {
  const fd = new FormData()
  fd.set('file', jpegFile())
  fd.set('mode', 'collect')
  fd.set('dominantColors', JSON.stringify(colors))
  await app.request(`/api/entries/${date}/photos`, { method: 'POST', body: fd, headers: { 'X-User-Id': uid } }, env)
}
const get = (uid: string, q: string) => app.request(`/api/stats?${q}`, { headers: { 'X-User-Id': uid } }, env)

describe('GET /api/stats', () => {
  it('回傳連續天數（跨月）、收集色數、色相佔比與主色', async () => {
    for (const d of ['2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02']) await upload('s1', d, ['#FF0000', '#0000FF'])
    const res = await get('s1', 'month=2025-02&asOf=2025-02-02')
    expect(res.status).toBe(200)
    const s = (await res.json()) as any
    expect(s.streak).toBe(4)
    expect(s.daysRecorded).toBe(2)
    expect(s.photoCount).toBe(2)
    expect(s.collectedColors).toBeGreaterThanOrEqual(2)
    expect(s.hueShare.red + s.hueShare.blue).toBeCloseTo(1)
    expect(s.mainColor).toBeTruthy()
  })

  it('中斷後連續天數重新計算', async () => {
    for (const d of ['2025-03-01', '2025-03-02', '2025-03-04']) await upload('s2', d, ['#00FF00'])
    const s = (await (await get('s2', 'month=2025-03&asOf=2025-03-04')).json()) as any
    expect(s.streak).toBe(1)
  })

  it('沒有資料回傳 0；其他使用者的資料不會混入', async () => {
    const s = (await (await get('nobody', 'month=2025-02')).json()) as any
    expect(s.streak).toBe(0)
    expect(s.photoCount).toBe(0)
    expect(s.mainColor).toBeNull()
  })

  it('month / asOf 格式錯誤回 400', async () => {
    expect((await get('s1', 'month=2025-13')).status).toBe(400)
    expect((await get('s1', '')).status).toBe(400)
    expect((await get('s1', 'month=2025-02&asOf=nope')).status).toBe(400)
  })
})
