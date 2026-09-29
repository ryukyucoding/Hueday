import { describe, expect, it } from 'vitest'
import { COMPARE_HALF, compareHtml, compareTexts } from './compareHtml'

const side = (date: string, label: string, n: number, hasRecord = true) => ({
  date,
  label,
  zhName: '柿子橘',
  bgDataUri: 'data:image/svg+xml;base64,AAAA',
  photos: Array.from({ length: n }, () => ({ dataUri: 'data:image/jpeg;base64,BBBB' })),
  hasRecord
})

describe('compareHtml', () => {
  it('上下各半：去年在上、今年在下，帶日期、色名與 1 YEAR LATER', () => {
    const html = compareHtml({ last: side('2025-09-29', 'LAST YEAR', 2), now: side('2026-09-29', 'THIS YEAR', 3) })
    expect(COMPARE_HALF).toBe(960)
    expect(html.indexOf('LAST YEAR')).toBeLessThan(html.indexOf('THIS YEAR'))
    for (const s of ['SEP 29', '2025', '2026', '柿子橘', '1 YEAR LATER']) expect(html).toContain(s)
    expect(html).toContain('top:960px') // 今年那一半從 960 開始
  })

  for (const [a, b, rec] of [[0, 0, false], [1, 3, true], [5, 2, true]] as const) {
    it(`去年 ${a} 張 / 今年 ${b} 張：每個 div 有 display:flex、每個 img 有 width/height、每邊最多 3 張`, () => {
      const html = compareHtml({ last: side('2025-09-29', 'LAST YEAR', a, rec), now: side('2026-09-29', 'THIS YEAR', b) })
      for (const d of html.match(/<div style="[^"]*"/g) ?? []) expect(d).toContain('display:flex')
      const imgs = html.match(/<img [^>]*>/g) ?? []
      expect(imgs).toHaveLength(2 + Math.min(a, 3) + Math.min(b, 3))
      for (const i of imgs) expect(i).toMatch(/ width="\d+" height="\d+"/)
    })
  }

  it('去年沒有記錄時顯示空狀態', () => {
    expect(compareHtml({ last: side('2025-09-29', 'LAST YEAR', 0, false), now: side('2026-09-29', 'THIS YEAR', 1) })).toContain('這天沒有照片')
  })

  it('compareTexts 提供字型子集用的文字', () => {
    expect(compareTexts({ last: side('2025-09-29', 'LAST YEAR', 0), now: side('2026-09-29', 'THIS YEAR', 0) }).now.big).toBe('SEP 29')
  })
})
