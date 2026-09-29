import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { errorJson } from '../errors'

export const photos = new Hono<AppEnv>()

photos.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT p.r2_key AS r2_key FROM photos p JOIN entries e ON e.id = p.entry_id WHERE p.id = ? AND e.user_id = ?')
    .bind(c.req.param('id'), c.get('userId'))
    .first<{ r2_key: string }>()
  if (!row) return errorJson(c, 404, 'not_found', '找不到照片')
  const obj = await c.env.PHOTOS.get(row.r2_key)
  if (!obj) return errorJson(c, 404, 'not_found', '找不到照片')
  return new Response(obj.body, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' }
  })
})
