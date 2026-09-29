import { describe, expect, it } from 'vitest'
import app from './index'

describe('api', () => {
  it('health 不需要 user id', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
  it('其他端點缺少 X-User-Id 回 400', async () => {
    const res = await app.request('/api/entries/2025-01-01')
    expect(res.status).toBe(400)
  })
})
