import { Hono } from 'hono'
import { getDailyColor, storyBackgroundSvg, type GradientStyle } from '@hueday/core'
import type { AppEnv } from '../types'
import { errorJson } from '../errors'
import { toBase64 } from '../gemini'
import { DATE_RE } from './entries'
import { BODY_FONT, DISPLAY_FONT, collageHtml, collageTexts } from '../render/collageHtml'
import { loadGoogleFont, type LoadedFont } from '../render/fonts'

export const render = new Hono<AppEnv>()

const TEMPLATES = ['collage'] as const

render.get('/', async (c) => {
  const template = c.req.query('template') ?? 'collage'
  if (!(TEMPLATES as readonly string[]).includes(template)) return errorJson(c, 400, 'bad_template', `未知的模板：${template}`)
  const date = c.req.query('date') ?? ''
  if (!DATE_RE.test(date)) return errorJson(c, 400, 'bad_date', '日期格式應為 YYYY-MM-DD')

  const styleQ = c.req.query('style')
  const style: GradientStyle | undefined = styleQ === 'mesh' || styleQ === 'flow' ? styleQ : undefined
  const grainQ = Number(c.req.query('grain'))
  const grain = c.req.query('grain') !== undefined && Number.isFinite(grainQ) ? Math.max(0, Math.min(100, grainQ)) : undefined

  const userId = c.get('userId')
  const entry = await c.env.DB.prepare('SELECT id, mode FROM entries WHERE user_id = ? AND date = ?').bind(userId, date).first<{ id: string; mode: 'single' | 'collect' }>()
  const rows = entry
    ? (await c.env.DB.prepare('SELECT r2_key, dominant_colors FROM photos WHERE entry_id = ? ORDER BY created_at ASC LIMIT 6').bind(entry.id).all<{ r2_key: string; dominant_colors: string }>()).results
    : []

  const photos: { dataUri: string; dominantColors: string[] }[] = []
  for (const r of rows) {
    const obj = await c.env.PHOTOS.get(r.r2_key)
    if (!obj) continue
    const mime = obj.httpMetadata?.contentType ?? 'image/jpeg'
    photos.push({ dataUri: `data:${mime};base64,${toBase64(await obj.arrayBuffer())}`, dominantColors: JSON.parse(r.dominant_colors) as string[] })
  }

  const target = getDailyColor(date)
  const bgSvg = storyBackgroundSvg(photos.map((p) => p.dominantColors), { mode: entry?.mode ?? 'single', date, targetHex: target.hex, style, grain })
  const input = { date, zhName: target.zh, enName: target.en, bgDataUri: `data:image/svg+xml;base64,${btoa(bgSvg)}`, photos }

  // 字型只下載用到的字，並快取在 KV
  const texts = collageTexts(input)
  const bodyText = texts.zh + texts.empty + texts.footer + texts.sub + texts.big + texts.en
  const dispText = texts.big + texts.sub + texts.en + texts.footer
  let fonts: LoadedFont[] = []
  try {
    fonts = await Promise.all([loadGoogleFont(BODY_FONT, 700, bodyText, c.env.CACHE), loadGoogleFont(DISPLAY_FONT, 700, dispText, c.env.CACHE)])
  } catch {
    return errorJson(c, 500, 'font_failed', '字型載入失敗，請稍後再試')
  }

  try {
    const { ImageResponse } = await import('workers-og')
    return new ImageResponse(collageHtml(input), { width: 1080, height: 1920, format: 'png', fonts }) as unknown as Response
  } catch {
    return errorJson(c, 500, 'render_failed', '產圖失敗，請稍後再試')
  }
})
