import { describe, expect, it } from 'vitest'
import { computeStats } from '@hueday/core'
import { statsHtml, statsTexts } from './statsHtml'

const entries = [
  { date: '2025-02-01', photos: [{ dominantColors: ['#FF0000', '#0000FF'] }] },
  { date: '2025-02-02', photos: [{ dominantColors: ['#E8603C'] }] }
]
const base = { bgDataUri: 'data:image/svg+xml;base64,AAAA', donutDataUri: 'data:image/svg+xml;base64,BBBB' }

describe('statsHtml', () => {
  const s = computeStats(entries, '2025-02', '2025-02-02')

  it('三格大數字：連續天數 / 收集色數 / 記錄天數', () => {
    const t = statsTexts(s)
    expect(t.numbers.map((n) => n.label)).toEqual(['連續天數', '收集色數', '記錄天數'])
    expect(t.numbers[0].value).toBe('2')
    expect(t.title).toBe('FEB 2025')
  })

  it('圖例依佔比由大到小，且不含任何社交指標字樣', () => {
    const t = statsTexts(s)
    expect(t.legend.length).toBeGreaterThan(0)
    const pcts = t.legend.map((l) => parseInt(l.pct))
    expect([...pcts].sort((a, b) => b - a)).toEqual(pcts)
    expect(JSON.stringify(t)).not.toMatch(/讚|追蹤|瀏覽|views|likes/)
  })

  for (const [name, stats] of [['有資料', s], ['沒資料', computeStats([], '2025-02')]] as const) {
    it(`${name}：每個 div 都有 display:flex、每個 img 都有 width/height`, () => {
      const html = statsHtml({ stats, ...base })
      const divs = html.match(/<div style="[^"]*"/g) ?? []
      expect(divs.length).toBeGreaterThan(5)
      for (const d of divs) expect(d).toContain('display:flex')
      const imgs = html.match(/<img [^>]*>/g) ?? []
      expect(imgs).toHaveLength(2)
      for (const i of imgs) expect(i).toMatch(/ width="\d+" height="\d+"/)
    })
  }

  it('沒資料時顯示空狀態文字', () => {
    expect(statsHtml({ stats: computeStats([], '2025-02'), ...base })).toContain('這個月還沒有記錄')
  })
})
