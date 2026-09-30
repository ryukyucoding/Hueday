import { describe, expect, it, vi } from 'vitest'
import { fontCssUrl, loadGoogleFont, uniqueChars } from './fonts'

class FakeKV {
  store = new Map<string, ArrayBuffer>()
  async get(key: string) {
    return this.store.get(key) ?? null
  }
  async put(key: string, value: ArrayBuffer) {
    this.store.set(key, value)
  }
}

const css = `@font-face { font-family: 'Noto Sans TC'; src: url(https://fonts.gstatic.com/l/font?kit=abc) format('truetype'); }`

describe('fonts', () => {
  it('uniqueChars 去重並包含空白', () => {
    expect(uniqueChars('拾aab拾')).toBe(' ab拾')
  })

  it('CSS URL 只帶用到的字（text= 參數）', () => {
    const u = fontCssUrl('Noto Sans TC', 700, '拾色')
    expect(u).toBe('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@700&text=%E6%8B%BE%E8%89%B2')
  })

  it('下載後快取在 KV，第二次不再打網路', async () => {
    const kv = new FakeKV()
    const f = vi.fn(async (url: string) => (url.includes('googleapis') ? new Response(css) : new Response(new Uint8Array([1, 2, 3]))))
    const a = await loadGoogleFont('Noto Sans TC', 700, '拾色', kv as unknown as KVNamespace, f as unknown as typeof fetch)
    expect(new Uint8Array(a.data)).toEqual(new Uint8Array([1, 2, 3]))
    expect(f).toHaveBeenCalledTimes(2)
    const b = await loadGoogleFont('Noto Sans TC', 700, '色拾', kv as unknown as KVNamespace, f as unknown as typeof fetch)
    expect(b.data.byteLength).toBe(3)
    expect(f).toHaveBeenCalledTimes(2) // 字元集合相同 → 命中快取
  })

  it('CSS 沒有 src 或下載失敗會丟錯', async () => {
    await expect(loadGoogleFont('X', 700, 'a', undefined, (async () => new Response('nothing')) as unknown as typeof fetch)).rejects.toThrow()
    const f = async (url: string) => (url.includes('googleapis') ? new Response(css) : new Response('x', { status: 404 }))
    await expect(loadGoogleFont('X', 700, 'a', undefined, f as unknown as typeof fetch)).rejects.toThrow()
  })
})
