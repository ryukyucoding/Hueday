import { describe, expect, it } from 'vitest'
import { layoutMonthPoster, emptyStripeSvg } from './monthPoster'
import { weekdayOf } from '../calendar'
import { dayMainColor } from '../stats'

const MONTHS = [
  ['2026-02', 28], // 平年 2 月，週日開頭剛好 4 列
  ['2024-02', 29], // 閏年
  ['2026-09', 30],
  ['2026-08', 31], // 8/1 是週六 → 6 列
  ['2025-03', 31], // 3/1 是週六
  ['2025-06', 30], // 6/1 是週日
  ['2026-05', 31] // 5/1 是週五
] as const

describe('layoutMonthPoster', () => {
  for (const [month, days] of MONTHS) {
    for (const ws of [0, 1] as const) {
      describe(`${month}（${days} 天，週${ws === 0 ? '日' : '一'}開頭）`, () => {
        const l = layoutMonthPoster(month, ws)
        it('每天一格、日期連續、最多 6 列', () => {
          expect(l.cells).toHaveLength(days)
          expect(l.cells.map((c) => c.day)).toEqual(Array.from({ length: days }, (_, i) => i + 1))
          expect(l.rows).toBeGreaterThanOrEqual(4)
          expect(l.rows).toBeLessThanOrEqual(6)
        })
        it('依星期對齊：欄位 = 星期幾（依開頭日換算）', () => {
          for (const c of l.cells) expect(c.col).toBe((weekdayOf(c.date) - ws + 7) % 7)
        })
        it('同一欄 x 相同、同一列 y 相同，格子彼此不重疊', () => {
          const seen = new Set<string>()
          for (const c of l.cells) {
            const key = `${c.row},${c.col}`
            expect(seen.has(key)).toBe(false)
            seen.add(key)
            expect(c.x).toBe(l.grid.x + c.col * (l.cell + l.gap))
            expect(c.y).toBe(l.grid.y + c.row * (l.cell + l.gap))
          }
        })
        it('整個格子在畫布內、水平置中，且不碰到頁尾', () => {
          expect(l.grid.x).toBeGreaterThanOrEqual(40)
          expect(Math.abs(l.grid.x - (1080 - (l.grid.x + l.grid.w)))).toBeLessThanOrEqual(1)
          expect(l.grid.y + l.grid.h).toBeLessThan(l.footer.y - 60)
          for (const c of l.cells) expect(c.x + c.size).toBeLessThanOrEqual(1080 - 40)
        })
      })
    }
  }

  it('星期標籤 7 個，位置對齊欄位', () => {
    const l = layoutMonthPoster('2026-09', 0)
    expect(l.weekdays.labels).toHaveLength(7)
    expect(l.weekdays.labels.map((x) => x.text).join('')).toBe('SMTWTFS')
    expect(layoutMonthPoster('2026-09', 1).weekdays.labels.map((x) => x.text).join('')).toBe('MTWTFSS')
    l.weekdays.labels.forEach((x, i) => expect(x.x).toBe(l.grid.x + i * (l.cell + l.gap)))
  })

  it('斜線 SVG 是合法的單一 SVG', () => {
    const svg = emptyStripeSvg(118)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('<line')
  })
})

describe('dayMainColor', () => {
  it('沒有照片為 null；單一顏色回傳該色；多張時取占比最大者', () => {
    expect(dayMainColor([])).toBeNull()
    expect(dayMainColor([{ dominantColors: ['#E8603C'] }])).toBe('#E8603C')
    expect(dayMainColor([{ dominantColors: ['#FF0000', '#0000FF'] }, { dominantColors: ['#FF0000'] }])).toBe('#FF0000')
  })
})
