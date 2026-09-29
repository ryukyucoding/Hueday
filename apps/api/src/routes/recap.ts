import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { errorJson } from '../errors'
import { getOrCreateRecap, loadRecapData } from '../recap'
import { parseMonthParams } from './stats'

export const recap = new Hono<AppEnv>()

/** 產生（或讀取快取的）月總結。?force=1 強制重產。 */
recap.post('/', async (c) => {
  const p = parseMonthParams(c.req.query('month'), c.req.query('asOf'))
  if (!p) return errorJson(c, 400, 'bad_month', 'month 應為 YYYY-MM（asOf 應為 YYYY-MM-DD）')
  const userId = c.get('userId')
  const data = await loadRecapData(c.env.DB, userId, p.month, p.asOf)
  const r = await getOrCreateRecap(c.env, userId, p.month, data, { force: c.req.query('force') === '1' })
  return c.json({ month: p.month, text: r.text, mock: r.mock, cached: r.cached })
})
