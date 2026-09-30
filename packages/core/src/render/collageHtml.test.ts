import { describe, expect, it } from 'vitest'
import { collageHtml, collageTexts, esc } from './collageHtml'

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
