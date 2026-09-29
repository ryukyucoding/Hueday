import { api } from './api'

export type RecapResponse = { month: string; text: string; mock: boolean; cached: boolean; degraded?: 'quota' | 'timeout' | 'error' | null }

/** 取得（或產生）月總結；同月只會產生一次，force 可強制重產 */
export const fetchRecap = (month: string, opts: { force?: boolean; asOf?: string } = {}) => {
  const q = new URLSearchParams({ month })
  if (opts.asOf) q.set('asOf', opts.asOf)
  if (opts.force) q.set('force', '1')
  return api<RecapResponse>(`/api/recap?${q}`, { method: 'POST' })
}

export const recapFilename = (month: string) => `hueday-${month}-recap.png`
