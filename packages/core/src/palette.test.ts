import { describe, expect, it } from 'vitest'
import { PALETTE, getDailyColor } from './palette'

function dates(year: number, days: number): string[] {
  const out: string[] = []
  const d = new Date(Date.UTC(year, 0, 1))
  for (let i = 0; i < days; i++) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

describe('palette', () => {
  it('有 60 色且欄位完整、hex 不重複', () => {
    expect(PALETTE).toHaveLength(60)
    expect(new Set(PALETTE.map((c) => c.hex)).size).toBe(60)
    for (const c of PALETTE) {
      expect(c.hex).toMatch(/^#[0-9A-F]{6}$/i)
      expect(c.zh && c.en && c.hint).toBeTruthy()
    }
  })

  it('同一天永遠同色', () => {
    expect(getDailyColor('2025-03-14')).toEqual(getDailyColor('2025-03-14'))
  })

  it('一年內分佈合理：涵蓋大多數色、沒有單色過度集中', () => {
    const counts = new Map<string, number>()
    for (const d of dates(2025, 365)) {
      const hex = getDailyColor(d).hex
      counts.set(hex, (counts.get(hex) ?? 0) + 1)
    }
    expect(counts.size).toBeGreaterThanOrEqual(52)
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(14)
  })

  it('連續兩天很少同色', () => {
    const ds = dates(2025, 365)
    let same = 0
    for (let i = 1; i < ds.length; i++) if (getDailyColor(ds[i]).hex === getDailyColor(ds[i - 1]).hex) same++
    expect(same).toBeLessThanOrEqual(12)
  })
})
