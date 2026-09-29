import type { Context } from 'hono'
import { errorJson } from './errors'
import type { AppEnv } from './types'

export type Bucket = 'upload' | 'gemini' | 'render'

/** 每位使用者每分鐘的上限 */
export const LIMITS: Record<Bucket, number> = { upload: 10, gemini: 20, render: 30 }

const WINDOW_MS = 60_000

export type HitResult = { ok: boolean; limit: number; remaining: number; retryAfter: number }

/**
 * 固定視窗計數器（每分鐘一格），存在 KV。
 * 注意：KV 是最終一致、讀-改-寫也不是原子的，所以這是「擋一般濫用」的近似限流，
 * 極短時間內大量並行請求可能略微超過上限；要嚴格限流請改用 Durable Object 或 Rate Limiting binding。
 */
export async function hit(kv: KVNamespace, userId: string, bucket: Bucket, cost = 1, now = Date.now()): Promise<HitResult> {
  const limit = LIMITS[bucket]
  const windowIdx = Math.floor(now / WINDOW_MS)
  const key = `rl:${bucket}:${userId}:${windowIdx}`
  const retryAfter = Math.max(1, Math.ceil(((windowIdx + 1) * WINDOW_MS - now) / 1000))
  const used = Number((await kv.get(key).catch(() => null)) ?? 0) || 0
  if (used + cost > limit) return { ok: false, limit, remaining: Math.max(0, limit - used), retryAfter }
  // KV 的 expirationTtl 最少 60 秒
  await kv.put(key, String(used + cost), { expirationTtl: 120 }).catch(() => {})
  return { ok: true, limit, remaining: limit - used - cost, retryAfter }
}

/** 超過上限時回傳 429 + Retry-After（沒超過回傳 null） */
export async function enforce(c: Context<AppEnv>, bucket: Bucket, cost = 1): Promise<Response | null> {
  const r = await hit(c.env.CACHE, c.get('userId'), bucket, cost)
  if (r.ok) return null
  c.header('Retry-After', String(r.retryAfter))
  return errorJson(c, 429, 'rate_limited', `操作太頻繁了，請 ${r.retryAfter} 秒後再試`)
}
