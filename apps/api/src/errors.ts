import type { Context } from 'hono'

export function errorJson(c: Context, status: 400 | 403 | 404 | 413 | 415 | 429 | 500, code: string, message: string) {
  return c.json({ error: { code, message } }, status)
}
