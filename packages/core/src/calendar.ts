import { daysInMonth } from './stats'

const pad = (n: number) => String(n).padStart(2, '0')

/** '2025-12' + 1 → '2026-01'；n 可為負數 */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}

/** 星期幾（0 = 週日），以 UTC 計算不受時區影響 */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** 月曆格子：長度為 7 的倍數，月初前與月底後補 null。weekStart：0 = 週日開頭、1 = 週一開頭 */
export function monthGrid(month: string, weekStart: 0 | 1 = 0): (string | null)[] {
  const lead = (weekdayOf(`${month}-01`) - weekStart + 7) % 7
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= daysInMonth(month); d++) cells.push(`${month}-${pad(d)}`)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** 一年前的同一天；閏日（2/29）回到 2/28 */
export function yearAgo(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y - 1, m, 0)).getUTCDate()
  return `${y - 1}-${pad(m)}-${pad(Math.min(d, lastDay))}`
}
