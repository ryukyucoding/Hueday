import { describe, expect, it } from 'vitest'
import { swatchHtml, swatchTexts } from './swatchHtml'

const p = (caption: string) => ({ dataUri: 'data:image/jpeg;base64,AAAA', caption })
const base = { date: '2025-05-01', hex: '#e8603c', zhName: '柿子橘', enName: 'Persimmon', bgDataUri: 'data:image/svg+xml;base64,BBBB' }

describe('swatchHtml', () => {
  it('色票資訊：色名、HEX（大寫）、日期，以及每張照片的 AI 色名', () => {
    const html = swatchHtml({ ...base, photos: [p('傍晚捷運站的橘'), p('柿子橘的午後'), p('轉角的暖光')] })
    for (const s of ['柿子橘', 'Persimmon', '#E8603C', '2025.05.01', '傍晚捷運站的橘', '轉角的暖光', 'COLOR OF THE DAY']) expect(html).toContain(s)
  })

  for (const n of [0, 1, 2, 3, 4, 7]) {
    it(`${n} 張：每個 div 有 display:flex、每個 img 有 width/height，最多 4 張照片`, () => {
      const html = swatchHtml({ ...base, photos: Array.from({ length: n }, (_, i) => p(`色名${i}`)) })
      for (const d of html.match(/<div style="[^"]*"/g) ?? []) expect(d).toContain('display:flex')
      const imgs = html.match(/<img [^>]*>/g) ?? []
      expect(imgs).toHaveLength(1 + Math.min(n, 4))
      for (const i of imgs) expect(i).toMatch(/ width="\d+" height="\d+"/)
    })
  }

  it('漸層底圖只佔上半部 60%（高度 1152）', () => {
    expect(swatchHtml({ ...base, photos: [] })).toContain('width="1080" height="1152"')
  })

  it('swatchTexts 供字型子集使用', () => {
    expect(swatchTexts({ ...base, photos: [p('a')] }).hex).toBe('#E8603C')
  })
})
