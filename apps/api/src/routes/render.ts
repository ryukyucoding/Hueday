import { Hono, type Context } from 'hono'
import { SWATCH_GRADIENT_HEIGHT, STORY_WIDTH, computeStats, donutSvg, getDailyColor, storyBackgroundSvg, type GradientStyle } from '@hueday/core'
import type { AppEnv } from '../types'
import { errorJson } from '../errors'
import { toBase64 } from '../gemini'
import { DATE_RE } from './entries'
import { loadStatsEntries, parseMonthParams } from './stats'
import { BODY_FONT, DISPLAY_FONT, collageHtml, collageTexts } from '../render/collageHtml'
import { statsHtml, statsTexts } from '../render/statsHtml'
import { swatchHtml, swatchTexts } from '../render/swatchHtml'
import { loadGoogleFont, type LoadedFont } from '../render/fonts'

export const render = new Hono<AppEnv>()

const TEMPLATES = ['collage', 'stats', 'swatch'] as const

type Built = { html: string; bodyText: string; dispText: string }
type Ctx = Context<AppEnv>

const svgUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`

function styleParams(c: Ctx): { style?: GradientStyle; grain?: number } {
  const styleQ = c.req.query('style')
  const grainQ = Number(c.req.query('grain'))
  return {
    style: styleQ === 'mesh' || styleQ === 'flow' ? styleQ : undefined,
    grain: c.req.query('grain') !== undefined && Number.isFinite(grainQ) ? Math.max(0, Math.min(100, grainQ)) : undefined
  }
}

async function buildCollage(c: Ctx): Promise<Built | Response> {
  const date = c.req.query('date') ?? ''
  if (!DATE_RE.test(date)) return errorJson(c, 400, 'bad_date', '日期格式應為 YYYY-MM-DD')
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
  const { style, grain } = styleParams(c)
  const bgSvg = storyBackgroundSvg(photos.map((p) => p.dominantColors), { mode: entry?.mode ?? 'single', date, targetHex: target.hex, style, grain })
  const input = { date, zhName: target.zh, enName: target.en, bgDataUri: svgUri(bgSvg), photos }
  const t = collageTexts(input)
  return {
    html: collageHtml(input),
    bodyText: t.zh + t.empty + t.footer + t.sub + t.big + t.en,
    dispText: t.big + t.sub + t.en + t.footer
  }
}

async function buildStats(c: Ctx): Promise<Built | Response> {
  const p = parseMonthParams(c.req.query('month'), c.req.query('asOf'))
  if (!p) return errorJson(c, 400, 'bad_month', 'month 應為 YYYY-MM（asOf 應為 YYYY-MM-DD）')
  const s = computeStats(await loadStatsEntries(c.env.DB, c.get('userId')), p.month, p.asOf)
  const { style, grain } = styleParams(c)
  // 背景：本月主色漸層；沒有資料時用當月 1 號的今日色
  const bgSvg = storyBackgroundSvg([s.palette], { mode: 'single', date: p.month, targetHex: getDailyColor(`${p.month}-01`).hex, style, grain })
  const t = statsTexts(s)
  const all = t.title + t.subtitle + t.numbers.map((n) => n.value + n.label).join('') + t.legend.map((l) => l.label + l.pct).join('') + t.mainLabel + t.mainEn + t.footer + t.empty
  return {
    html: statsHtml({ stats: s, bgDataUri: svgUri(bgSvg), donutDataUri: svgUri(donutSvg(s.hueShare, 520)) }),
    bodyText: all,
    dispText: all
  }
}

async function buildSwatch(c: Ctx): Promise<Built | Response> {
  const date = c.req.query('date') ?? ''
  if (!DATE_RE.test(date)) return errorJson(c, 400, 'bad_date', '日期格式應為 YYYY-MM-DD')
  const userId = c.get('userId')
  const entry = await c.env.DB.prepare('SELECT id, mode FROM entries WHERE user_id = ? AND date = ?').bind(userId, date).first<{ id: string; mode: 'single' | 'collect' }>()
  const rows = entry
    ? (await c.env.DB.prepare('SELECT r2_key, dominant_colors, ai_color_name FROM photos WHERE entry_id = ? ORDER BY created_at ASC LIMIT 4').bind(entry.id).all<{ r2_key: string; dominant_colors: string; ai_color_name: string | null }>()).results
    : []

  const photos: { dataUri: string; caption: string; colors: string[] }[] = []
  for (const r of rows) {
    const obj = await c.env.PHOTOS.get(r.r2_key)
    if (!obj) continue
    const mime = obj.httpMetadata?.contentType ?? 'image/jpeg'
    photos.push({ dataUri: `data:${mime};base64,${toBase64(await obj.arrayBuffer())}`, caption: r.ai_color_name ?? '', colors: JSON.parse(r.dominant_colors) as string[] })
  }

  const target = getDailyColor(date)
  const { style, grain } = styleParams(c)
  // 單色日：漸層以今日色為主（同色系深淺），照片主色不混入，色票才像「這個顏色」
  const bgSvg = storyBackgroundSvg([], { mode: 'single', date, targetHex: target.hex, style, grain }, STORY_WIDTH, SWATCH_GRADIENT_HEIGHT)
  const input = { date, hex: target.hex, zhName: target.zh, enName: target.en, bgDataUri: svgUri(bgSvg), photos }
  const t = swatchTexts(input)
  const all = t.kicker + t.zh + t.en + t.hex + t.date + t.captions.join('') + t.footer
  return { html: swatchHtml(input), bodyText: all, dispText: all }
}

render.get('/', async (c) => {
  const template = c.req.query('template') ?? 'collage'
  if (!(TEMPLATES as readonly string[]).includes(template)) return errorJson(c, 400, 'bad_template', `未知的模板：${template}`)

  const built = template === 'stats' ? await buildStats(c) : template === 'swatch' ? await buildSwatch(c) : await buildCollage(c)
  if (built instanceof Response) return built

  // 字型只下載用到的字，並快取在 KV
  let fonts: LoadedFont[] = []
  try {
    fonts = await Promise.all([loadGoogleFont(BODY_FONT, 700, built.bodyText, c.env.CACHE), loadGoogleFont(DISPLAY_FONT, 700, built.dispText, c.env.CACHE)])
  } catch {
    return errorJson(c, 500, 'font_failed', '字型載入失敗，請稍後再試')
  }

  try {
    const { ImageResponse } = await import('workers-og')
    return new ImageResponse(built.html, { width: 1080, height: 1920, format: 'png', fonts }) as unknown as Response
  } catch {
    return errorJson(c, 500, 'render_failed', '產圖失敗，請稍後再試')
  }
})
