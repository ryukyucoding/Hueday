import { describe, expect, it } from 'vitest'
import { monthGrid, shiftMonth, weekdayOf } from './calendar'

describe('calendar', () => {
  it('shiftMonth 跨年與負數', () => {
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-05', 0)).toBe('2025-05')
    expect(shiftMonth('2025-05', -17)).toBe('2023-12')
  })

  it('weekdayOf', () => {
    expect(weekdayOf('2026-09-01')).toBe(2) // 週二
    expect(weekdayOf('2025-05-01')).toBe(4) // 週四
  })

  it('格子長度為 7 的倍數，日期連續且在正確星期欄位', () => {
    for (const month of ['2026-09', '2024-02', '2025-02', '2025-03', '2026-02']) {
      for (const ws of [0, 1] as const) {
        const g = monthGrid(month, ws)
        expect(g.length % 7).toBe(0)
        const days = g.filter((x): x is string => x !== null)
        expect(days[0]).toBe(`${month}-01`)
        expect(days).toHaveLength(new Date(Date.UTC(+month.slice(0, 4), +month.slice(5), 0)).getUTCDate())
        g.forEach((d, i) => d && expect((weekdayOf(d) - ws + 7) % 7).toBe(i % 7))
      }
    }
  })

  it('2026-02 剛好 4 週（週日開頭）；2026-09 週日開頭前面空 2 格', () => {
    expect(monthGrid('2026-02', 0)).toHaveLength(28)
    expect(monthGrid('2026-09', 0).slice(0, 3)).toEqual([null, null, '2026-09-01'])
  })
})
