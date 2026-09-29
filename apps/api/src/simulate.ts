import type { Context } from 'hono'
import type { AppEnv, Bindings } from './types'

/** 開發用：模擬各種錯誤，讓前端的錯誤畫面可以被實際看到。只有 ALLOW_SIMULATE=1（本地 wrangler dev）時才生效。 */
export const SIMULATIONS = ['upload-fail', 'gemini-quota', 'gemini-timeout', 'gemini-error', 'render-fail', 'rate-limit', 'server-error'] as const
export type Simulation = (typeof SIMULATIONS)[number]

export function getSimulation(c: Context<AppEnv>): Simulation | null {
  if (c.env.ALLOW_SIMULATE !== '1') return null
  const v = c.req.header('X-Simulate')
  return (SIMULATIONS as readonly string[]).includes(v ?? '') ? (v as Simulation) : null
}

/** 模擬 Gemini 失敗時，需要有 key 才會真的走到 fetch */
export function withSimulatedKey<T extends Pick<Bindings, 'GEMINI_API_KEY'>>(env: T, sim: Simulation | null): T {
  return sim?.startsWith('gemini-') ? { ...env, GEMINI_API_KEY: env.GEMINI_API_KEY ?? 'simulated' } : env
}

export function simulatedFetch(sim: Simulation | null): typeof fetch | undefined {
  if (sim === 'gemini-quota') return (async () => new Response('quota', { status: 429 })) as typeof fetch
  if (sim === 'gemini-error') return (async () => new Response('boom', { status: 500 })) as typeof fetch
  if (sim === 'gemini-timeout')
    return (async () => {
      throw new DOMException('simulated timeout', 'AbortError')
    }) as typeof fetch
  return undefined
}
