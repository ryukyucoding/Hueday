import { Hono } from 'hono'
import { computeStats, type StatsEntry } from '@hueday/core'
import type { AppEnv } from '../types'
import { errorJson } from '../errors'
import { DATE_RE } from './entries'

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

/** 使用者所有有照片的 entry（跨月連續天數需要前面月份的資料） */
export async function loadStatsEntries(db: D1Database, userId: string): Promise<StatsEntry[]> {
  const { results } = await db
    .prepare('SELECT e.date AS date, p.dominant_colors AS dc FROM entries e JOIN photos p ON p.entry_id = e.id WHERE e.user_id = ? ORDER BY e.date ASC, p.created_at ASC')
    .bind(userId)
    .all<{ date: string; dc: string }>()
  const byDate = new Map<string, StatsEntry>()
  for (const r of results) {
    let e = byDate.get(r.date)
    if (!e) byDate.set(r.date, (e = { date: r.date, photos: [] }))
    e.photos.push({ dominantColors: JSON.parse(r.dc) as string[] })
  }
  return [...byDate.values()]
}

export function parseMonthParams(month: string | undefined, asOf: string | undefined): { month: string; asOf?: string } | null {
  if (!month || !MONTH_RE.test(month)) return null
  if (asOf !== undefined && !DATE_RE.test(asOf)) return null
  return { month, asOf }
}

export const stats = new Hono<AppEnv>()

stats.get('/', async (c) => {
  const p = parseMonthParams(c.req.query('month'), c.req.query('asOf'))
  if (!p) return errorJson(c, 400, 'bad_month', 'month 應為 YYYY-MM（asOf 應為 YYYY-MM-DD）')
  const entries = await loadStatsEntries(c.env.DB, c.get('userId'))
  return c.json(computeStats(entries, p.month, p.asOf))
})
