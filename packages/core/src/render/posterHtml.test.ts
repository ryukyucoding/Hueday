import { describe, expect, it } from 'vitest'
import { posterHtml, posterTexts } from './posterHtml'

describe('posterHtml', () => {
  const colors = { '2026-09-01': '#E8603C', '2026-09-03': '#3B6FB6', '2026-09-30': '#1D3557' }

  it('每天一格：有記錄用主色，沒記錄用斜線圖；每格右下角有日期', () => {
    const html = posterHtml({ month: '2026-09', colors })
    expect(html.match(/border-radius:12px/g)).toHaveLength(30) // 3 個有色格 + 27 個斜線格，共 30 天
    expect(html.match(/<img /g)).toHaveLength(27)
    for (const hex of Object.values(colors)) expect(html).toContain(`background:${hex}`)
    for (const d of [1, 15, 30]) expect(html).toContain(`>${d}</div>`)
    expect(html).not.toContain('>31</div>')
    expect(html.match(/justify-content:flex-end;align-items:flex-end/g)!.length).toBe(30)
  })

  it('底部有月份與 Hueday；頂部有大月份與年份', () => {
    const t = posterTexts('2026-09')
    expect(t).toEqual({ big: 'SEP', year: '2026', footer: 'SEP 2026 · Hueday' })
    const html = posterHtml({ month: '2026-09', colors })
    expect(html).toContain('SEP 2026 · Hueday')
  })

  for (const [month, days] of [['2026-02', 28], ['2024-02', 29], ['2026-09', 30], ['2026-08', 31]] as const) {
    it(`${month}（${days} 天）：每個 div 有 display:flex、每個 img 有 width/height，無記錄時全是斜線`, () => {
      const html = posterHtml({ month, colors: {} })
      for (const d of html.match(/<div style="[^"]*"/g) ?? []) expect(d).toContain('display:flex')
      const imgs = html.match(/<img [^>]*>/g) ?? []
      expect(imgs).toHaveLength(days)
      for (const i of imgs) expect(i).toMatch(/ width="\d+" height="\d+"/)
    })
  }
})
