import { describe, expect, it, vi } from 'vitest'
import { fontCssUrl, loadGoogleFont, uniqueChars } from './fonts'
import { collageHtml, collageTexts, esc } from './collageHtml'

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

describe('collageHtml', () => {
  const photo = { dataUri: 'data:image/jpeg;base64,AAAA', dominantColors: ['#FF0000'] }
  const base = { date: '2025-05-01', zhName: '柿子橘', enName: 'Persimmon', bgDataUri: 'data:image/svg+xml;base64,BBBB' }

  it('每張照片一張旋轉的白框卡片，並帶入日期、色名與頁尾', () => {
    const html = collageHtml({ ...base, photos: [photo, photo, photo] })
    expect(html.match(/rotate\(/g)).toHaveLength(3)
    expect(html).toContain('MAY 01')
    expect(html).toContain('柿子橘')
    expect(html).toContain('collected 1 color · Hueday')
    expect(html).toContain('width:1080px;height:1920px')
  })

  it('最多 6 張、0 張時顯示空狀態', () => {
    expect(collageHtml({ ...base, photos: Array(9).fill(photo) }).match(/rotate\(/g)).toHaveLength(6)
    expect(collageHtml({ ...base, photos: [] })).toContain('今天還沒有照片')
  })

  it('每個 div 都要有 display:flex（否則 satori 會靜默失敗、回傳空白 PNG）', () => {
    for (const photos of [[], [photo], Array(6).fill(photo)]) {
      const divs = collageHtml({ ...base, photos }).match(/<div style="[^"]*"/g) ?? []
      expect(divs.length).toBeGreaterThan(0)
      for (const d of divs) expect(d).toContain('display:flex')
    }
  })

  it('每個 img 都有 width / height 屬性（satori 要求）', () => {
    const imgs = collageHtml({ ...base, photos: [photo, photo] }).match(/<img [^>]*>/g) ?? []
    expect(imgs).toHaveLength(3)
    for (const i of imgs) expect(i).toMatch(/ width="\d+" height="\d+"/)
  })

  it('文字會做 HTML escape', () => {
    expect(esc('<b>"&')).toBe('&lt;b&gt;&quot;&amp;')
    expect(collageHtml({ ...base, zhName: '<x>', photos: [] })).not.toContain('<x>')
  })

  it('collageTexts 提供字型子集用的所有文字', () => {
    const t = collageTexts({ ...base, photos: [photo] })
    expect(t.big).toBe('MAY 01')
    expect(t.sub).toBe('THU · 2025')
  })
})
