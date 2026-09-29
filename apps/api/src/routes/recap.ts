import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { errorJson } from '../errors'
import { getOrCreateRecap, loadRecapData, recapKey } from '../recap'
import { enforce } from '../rateLimit'
import { getSimulation, simulatedFetch, withSimulatedKey } from '../simulate'
import { parseMonthParams } from './stats'

export const recap = new Hono<AppEnv>()

/** 產生（或讀取快取的）月總結。?force=1 強制重產。 */
recap.post('/', async (c) => {
  const p = parseMonthParams(c.req.query('month'), c.req.query('asOf'))
  if (!p) return errorJson(c, 400, 'bad_month', 'month 應為 YYYY-MM（asOf 應為 YYYY-MM-DD）')
  const userId = c.get('userId')
  const data = await loadRecapData(c.env.DB, userId, p.month, p.asOf)
  const sim = getSimulation(c)
  const env = withSimulatedKey(c.env, sim)
  const force = c.req.query('force') === '1' || !!sim?.startsWith('gemini-')
  // 月回顧的主要動作就是呼叫 Gemini，所以超過額度直接回 429；命中快取或沒有 key（mock）時不扣額度
  const cached = !force && !!(await c.env.CACHE.get(recapKey(userId, p.month)).catch(() => null))
  if (!cached && env.GEMINI_API_KEY) {
    const limited = await enforce(c, 'gemini')
    if (limited) return limited
  }
  const r = await getOrCreateRecap(env, userId, p.month, data, { force, fetchImpl: simulatedFetch(sim) })
  return c.json({ month: p.month, text: r.text, mock: r.mock, cached: r.cached, degraded: r.degraded })
})
