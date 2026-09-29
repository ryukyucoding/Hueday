import { yearAgo } from '@hueday/core'

/** 改了模板程式碼、需要讓所有舊快取失效時，把這個字串加一 */
export const RENDER_VERSION = 'r1'

export type RenderCache = { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> }

function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(36)
}

type Q = Pick<URLSearchParams, 'get'>

async function dayVersion(db: D1Database, userId: string, date: string): Promise<string> {
  const r = await db
    .prepare(
      `SELECT e.id AS id, e.mode AS mode, COUNT(p.id) AS n, COALESCE(MAX(p.created_at), 0) AS m
         FROM entries e LEFT JOIN photos p ON p.entry_id = e.id WHERE e.user_id = ? AND e.date = ?`
    )
    .bind(userId, date)
    .first<{ id: string | null; mode: string | null; n: number; m: number }>()
  return r?.id ? `${r.id}:${r.mode}:${r.n}:${r.m}` : 'none'
}

async function userVersion(db: D1Database, userId: string): Promise<string> {
  const r = await db
    .prepare('SELECT COUNT(*) AS n, COALESCE(MAX(created_at), 0) AS m FROM photos WHERE entry_id IN (SELECT id FROM entries WHERE user_id = ?)')
    .bind(userId)
    .first<{ n: number; m: number }>()
  return `${r?.n ?? 0}:${r?.m ?? 0}`
}

/**
 * 這張圖依賴的資料的「版本」：資料一變（新增照片…）版本就變，快取 key 跟著變，舊快取自然不會再被用到。
 * - collage / swatch：當天的 Entry 與照片    - compare：今年與去年那一天
 * - stats / palette：使用者所有照片（連續天數會跨月）    - recap：同上，再加上快取的回顧文字（重新產生後圖也要換）
 */
export async function dataVersion(env: { DB: D1Database; CACHE: KVNamespace }, userId: string, template: string, q: Q): Promise<string> {
  const date = q.get('date') ?? ''
  if (template === 'collage' || template === 'swatch') return dayVersion(env.DB, userId, date)
  if (template === 'compare') return `${await dayVersion(env.DB, userId, date)}|${await dayVersion(env.DB, userId, /^\d{4}-\d{2}-\d{2}$/.test(date) ? yearAgo(date) : date)}`
  const v = await userVersion(env.DB, userId)
  if (template === 'recap') {
    const cached = await env.CACHE.get<{ text?: string }>(`recap:${userId}:${q.get('month') ?? ''}`, 'json').catch(() => null)
    return `${v}|${cached?.text ? hash(cached.text) : 'none'}`
  }
  return v
}

/** 快取 key：使用者 + 模板 + 全部查詢參數（排序後）+ 資料版本 + 程式版本 */
export function cacheRequest(userId: string, template: string, query: URLSearchParams, version: string): Request {
  const params = [...query.entries()].sort(([a], [b]) => a.localeCompare(b))
  const search = new URLSearchParams(params)
  search.set('_v', `${RENDER_VERSION}.${hash(version)}`)
  return new Request(`https://render-cache.hueday.internal/${encodeURIComponent(userId)}/${template}?${search}`)
}

const CLIENT_HEADERS = { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-cache' }

export function pngResponse(body: BodyInit, status: 'hit' | 'miss'): Response {
  return new Response(body, { headers: { ...CLIENT_HEADERS, 'X-Render-Cache': status } })
}

/** 存進快取時要有可快取的 Cache-Control；對使用者則維持 no-cache，避免瀏覽器自己留著舊圖 */
export function storeResponse(buf: ArrayBuffer): Response {
  return new Response(buf, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' } })
}
