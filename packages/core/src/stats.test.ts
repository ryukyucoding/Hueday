import { describe, expect, it } from 'vitest'
import { addDays, computeStats, daysInMonth, monthEnd, type StatsEntry } from './stats'
import { donutSvg } from './templates/statsCard'
import { HUE_GROUPS } from './hue'

const e = (date: string, ...colors: string[][]): StatsEntry => ({ date, photos: colors.map((c) => ({ dominantColors: c })) })

describe('date helpers', () => {
  it('addDays 跨月跨年、閏年', () => {
    expect(addDays('2025-01-31', 1)).toBe('2025-02-01')
    expect(addDays('2025-01-01', -1)).toBe('2024-12-31')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(daysInMonth('2024-02')).toBe(29)
    expect(monthEnd('2025-04')).toBe('2025-04-30')
  })
})

describe('streak', () => {
  it('跨月連續天數', () => {
    const entries = [e('2025-01-30', ['#FF0000']), e('2025-01-31', ['#FF0000']), e('2025-02-01', ['#FF0000']), e('2025-02-02', ['#FF0000'])]
    expect(computeStats(entries, '2025-02', '2025-02-02').streak).toBe(4)
  })
  it('中斷後只算最近一段', () => {
    const entries = [e('2025-02-01', ['#FF0000']), e('2025-02-02', ['#FF0000']), e('2025-02-04', ['#FF0000']), e('2025-02-05', ['#FF0000'])]
    expect(computeStats(entries, '2025-02', '2025-02-05').streak).toBe(2)
  })
  it('今天還沒記錄時，從昨天往回算（不歸零）', () => {
    const entries = [e('2025-02-03', ['#FF0000']), e('2025-02-04', ['#FF0000'])]
    expect(computeStats(entries, '2025-02', '2025-02-05').streak).toBe(2)
  })
  it('前天之後都沒記錄則為 0；沒有資料為 0', () => {
    expect(computeStats([e('2025-02-01', ['#FF0000'])], '2025-02', '2025-02-05').streak).toBe(0)
    expect(computeStats([], '2025-02').streak).toBe(0)
  })
  it('沒有照片的 entry 不算記錄', () => {
    expect(computeStats([{ date: '2025-02-05', photos: [] }], '2025-02', '2025-02-05').streak).toBe(0)
  })
  it('asOf 預設為月底：過去月份不會因為「今天」而斷掉', () => {
    const entries = [e('2025-02-27', ['#FF0000']), e('2025-02-28', ['#FF0000'])]
    expect(computeStats(entries, '2025-02').streak).toBe(2)
  })
})

describe('month stats', () => {
  const entries = [
    e('2025-01-31', ['#00FF00']), // 上個月：不算進本月
    e('2025-02-01', ['#FF0000', '#0000FF'], ['#FF0000']),
    e('2025-02-02', ['#E8603C'])
  ]
  const s = computeStats(entries, '2025-02', '2025-02-02')

  it('只計算本月', () => {
    expect(s.daysRecorded).toBe(2)
    expect(s.photoCount).toBe(3)
  })
  it('色相佔比總和為 1，紅色最多', () => {
    expect(HUE_GROUPS.reduce((a, g) => a + s.hueShare[g], 0)).toBeCloseTo(1)
    expect(s.hueShare.red).toBeCloseTo(2 / 4)
    expect(s.hueShare.green).toBe(0)
  })
  it('收集色數為不同色票顏色數', () => {
    expect(s.collectedColors).toBe(3)
  })
  it('本月主色由 k-means 得出，依大小排序', () => {
    expect(s.palette.length).toBeGreaterThan(0)
    expect(s.palette.length).toBeLessThanOrEqual(5)
    expect(s.mainColor).toBe('#FF0000')
  })
  it('沒有資料時佔比全 0、沒有主色', () => {
    const z = computeStats([], '2025-02')
    expect(HUE_GROUPS.every((g) => z.hueShare[g] === 0)).toBe(true)
    expect(z.mainColor).toBeNull()
    expect(z.palette).toEqual([])
  })
})

describe('donutSvg', () => {
  it('每個有佔比的群組一段弧，弧長加總約等於圓周', () => {
    const share = Object.fromEntries(HUE_GROUPS.map((g) => [g, 0])) as Record<(typeof HUE_GROUPS)[number], number>
    share.red = 0.5
    share.blue = 0.25
    share.green = 0.25
    const svg = donutSvg(share, 400)
    expect(svg.match(/<circle/g)).toHaveLength(3)
    const r = (400 - 400 * 0.16) / 2
    const circ = 2 * Math.PI * r
    const dashes = [...svg.matchAll(/stroke-dasharray="([\d.]+) /g)].map((m) => Number(m[1]))
    expect(dashes.reduce((a, b) => a + b, 0)).toBeGreaterThan(circ * 0.97)
    expect(dashes.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(circ)
  })
  it('沒有資料時畫一圈灰環', () => {
    const zero = Object.fromEntries(HUE_GROUPS.map((g) => [g, 0])) as Record<(typeof HUE_GROUPS)[number], number>
    expect(donutSvg(zero, 300).match(/<circle/g)).toHaveLength(1)
  })
})
