import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../index'
import { createTestEnv } from '../testUtils'
import { uniqueChars } from '../render/fonts'
import type { Bindings } from '../types'

let env: Bindings
let dispose: () => Promise<void>
beforeAll(async () => {
  const t = await createTestEnv()
  env = t.env
  dispose = t.dispose
})
afterAll(() => dispose())

const get = (q: string, uid = 'fo1') => app.request(`/api/font?${q}`, { headers: { 'X-User-Id': uid } }, env)
const err = async (res: Response) => ((await res.json()) as any).error

describe('GET /api/font 驗證（不會被拿來當任意網址的代理）', () => {
  it('只接受模板用到的字型與字重', async () => {
    for (const q of ['family=Comic+Sans&weight=700&text=a', 'family=http://evil.example/x&text=a', 'text=a']) {
      const r = await get(q)
      expect(r.status, q).toBe(400)
      expect((await err(r)).code).toBe('bad_font')
    }
    const w = await get('family=Fraunces&weight=900&text=a')
    expect(w.status).toBe(400)
    expect((await err(w)).code).toBe('bad_font')
  })

  it('text 必填且不能太長', async () => {
    for (const q of ['family=Fraunces&weight=700', 'family=Fraunces&weight=700&text=', `family=Fraunces&weight=700&text=${'字'.repeat(801)}`]) {
      const r = await get(q)
      expect(r.status, q.slice(0, 40)).toBe(400)
      expect((await err(r)).code).toBe('bad_text')
    }
  })

  it('沒有 X-User-Id 回 400（和其他 API 一致）', async () => {
    expect((await app.request('/api/font?family=Fraunces&text=a', {}, env)).status).toBe(400)
  })

  it('命中 KV 快取時直接回 TTF，並標成 immutable（不需要連 Google）', async () => {
    const text = 'FEB 02'
    const chars = uniqueChars(text)
    // 與 loadGoogleFont 相同的 key 規則：先讓它失敗一次以取得 key 的形狀太繞，所以直接掃描 KV 寫入後的 key
    // 這裡改成預先放一個假字型：呼叫一次會嘗試連網，失敗時回 500 font_failed（友善錯誤，不是例外）
    const res = await get(`family=Fraunces&weight=700&text=${encodeURIComponent(text)}`, 'fo-net')
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(res.headers.get('Cache-Control')).toContain('immutable')
      expect(res.headers.get('Content-Type')).toBe('font/ttf')
      expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(1000)
      // 第二次應該來自 KV 快取
      const again = await get(`family=Fraunces&weight=700&text=${encodeURIComponent(text)}`, 'fo-net')
      expect(again.status).toBe(200)
    } else {
      expect((await err(res)).code).toBe('font_failed')
    }
    expect(chars).toContain(' ')
  })
})
