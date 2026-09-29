import { Hono } from 'hono'
import { getDailyColor } from '@hueday/core'
import type { AppEnv } from '../types'
import { errorJson } from '../errors'
import { judgeWithGemini, nameColor } from '../gemini'

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type EntryRow = { id: string; user_id: string; date: string; mode: string; target_color: string | null; note: string | null; created_at: number }
type PhotoRow = {
  id: string
  entry_id: string
  r2_key: string
  dominant_colors: string
  ai_color_name: string | null
  matches_target: number | null
  subject: string | null
  ai_confidence: number | null
  ai_mock: number
  created_at: number
}

export function photoDto(p: PhotoRow) {
  return {
    id: p.id,
    url: `/api/photos/${p.id}`,
    dominantColors: JSON.parse(p.dominant_colors) as string[],
    aiColorName: p.ai_color_name,
    matchesTarget: p.matches_target === null ? null : p.matches_target === 1,
    subject: p.subject,
    confidence: p.ai_confidence,
    mock: p.ai_mock === 1,
    createdAt: p.created_at
  }
}

export function entryDto(e: EntryRow) {
  return { id: e.id, date: e.date, mode: e.mode, targetColor: e.target_color, note: e.note, createdAt: e.created_at }
}

export const entries = new Hono<AppEnv>()

entries.get('/:date', async (c) => {
  const date = c.req.param('date')
  if (!DATE_RE.test(date)) return errorJson(c, 400, 'bad_date', '日期格式應為 YYYY-MM-DD')
  const userId = c.get('userId')
  const entry = await c.env.DB.prepare('SELECT * FROM entries WHERE user_id = ? AND date = ?').bind(userId, date).first<EntryRow>()
  if (!entry) return c.json({ entry: null, photos: [] })
  const { results } = await c.env.DB.prepare('SELECT * FROM photos WHERE entry_id = ? ORDER BY created_at ASC').bind(entry.id).all<PhotoRow>()
  return c.json({ entry: entryDto(entry), photos: results.map(photoDto) })
})

entries.post('/:date/photos', async (c) => {
  const date = c.req.param('date')
  if (!DATE_RE.test(date)) return errorJson(c, 400, 'bad_date', '日期格式應為 YYYY-MM-DD')
  const declared = Number(c.req.header('Content-Length') ?? 0)
  if (declared > MAX_PHOTO_BYTES + 64 * 1024) return errorJson(c, 413, 'too_large', '照片超過 10MB')

  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file') as File | string | null | undefined
  if (!form || !(file instanceof File)) return errorJson(c, 400, 'no_file', '缺少 file 欄位')
  if (file.size > MAX_PHOTO_BYTES) return errorJson(c, 413, 'too_large', '照片超過 10MB')
  if (!file.type.startsWith('image/')) return errorJson(c, 415, 'bad_type', '只接受圖片')

  const userId = c.get('userId')
  const mode = form.get('mode') === 'collect' ? 'collect' : 'single'
  let colors: string[] = []
  try {
    const raw = form.get('dominantColors')
    if (typeof raw === 'string') colors = (JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x)).slice(0, 5)
  } catch {
    /* 忽略格式錯誤 */
  }

  const now = Date.now()
  let entry = await c.env.DB.prepare('SELECT * FROM entries WHERE user_id = ? AND date = ?').bind(userId, date).first<EntryRow>()
  if (!entry) {
    const id = crypto.randomUUID()
    const target = getDailyColor(date).hex
    await c.env.DB.prepare('INSERT OR IGNORE INTO entries (id, user_id, date, mode, target_color, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, userId, date, mode, target, now)
      .run()
    entry = (await c.env.DB.prepare('SELECT * FROM entries WHERE user_id = ? AND date = ?').bind(userId, date).first<EntryRow>())!
  }

  const photoId = crypto.randomUUID()
  const r2Key = `${userId}/${date}/${photoId}.jpg`
  await c.env.PHOTOS.put(r2Key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || 'image/jpeg' } })
  await c.env.DB.prepare('INSERT INTO photos (id, entry_id, r2_key, dominant_colors, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(photoId, entry.id, r2Key, JSON.stringify(colors), now)
    .run()

  // 單色日才問 Gemini；失敗只是沒有判斷結果，不影響上傳成功
  if (entry.mode === 'single' && entry.target_color) {
    const j = await judgeWithGemini(c.env, {
      bytes: await file.arrayBuffer(),
      mimeType: file.type || 'image/jpeg',
      targetHex: entry.target_color,
      dominantColors: colors
    }).catch(() => null)
    if (j) {
      await c.env.DB.prepare('UPDATE photos SET matches_target = ?, subject = ?, ai_confidence = ?, ai_mock = ? WHERE id = ?')
        .bind(j.matchesTarget ? 1 : 0, j.subject, j.confidence, j.mock ? 1 : 0, photoId)
        .run()
    }
  }

  // 每張照片都要有色名（Gemini 失敗時用示意色名）
  const nameColorHex = colors[0] ?? entry.target_color ?? '#888888'
  const named = await nameColor(c.env, { bytes: await file.arrayBuffer(), mimeType: file.type || 'image/jpeg', dominantColor: nameColorHex }, photoId)
  await c.env.DB.prepare('UPDATE photos SET ai_color_name = ? WHERE id = ?').bind(named.name, photoId).run()

  const row = (await c.env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(photoId).first<PhotoRow>())!
  return c.json({ entry: entryDto(entry), photo: photoDto(row) }, 201)
})
