import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { errorJson } from '../errors'
import { enforce } from '../rateLimit'
import { loadGoogleFont } from '../render/fonts'

export const font = new Hono<AppEnv>()

/** 只允許模板用到的字型與字重，避免被拿來當任意網址的代理 */
export const FONT_FAMILIES = ['Noto Sans TC', 'Fraunces'] as const
export const FONT_WEIGHTS = [400, 500, 700] as const
export const MAX_FONT_TEXT = 800

/**
 * 字型代理：瀏覽器端產圖（satori）只吃 TTF/OTF/WOFF，但瀏覽器向 Google Fonts 要字型時一定會拿到 woff2。
 * 所以由 Worker 用「不帶 User-Agent」的方式向 Google 要 TTF（且只要用到的字，text= 子集），
 * 結果快取在 KV；同樣的請求對瀏覽器是 immutable，只會抓一次。
 */
font.get('/', async (c) => {
  const family = c.req.query('family') ?? ''
  const weight = Number(c.req.query('weight') ?? 700)
  const text = c.req.query('text') ?? ''
  if (!(FONT_FAMILIES as readonly string[]).includes(family)) return errorJson(c, 400, 'bad_font', '不支援這個字型')
  if (!(FONT_WEIGHTS as readonly number[]).includes(weight)) return errorJson(c, 400, 'bad_font', '不支援這個字重')
  if (text.length === 0 || Array.from(text).length > MAX_FONT_TEXT) return errorJson(c, 400, 'bad_text', `text 需為 1–${MAX_FONT_TEXT} 個字`)

  const limited = await enforce(c, 'font')
  if (limited) return limited
  try {
    const f = await loadGoogleFont(family, weight as 400 | 500 | 700, text, c.env.CACHE)
    return new Response(f.data, { headers: { 'Content-Type': 'font/ttf', 'Cache-Control': 'public, max-age=31536000, immutable' } })
  } catch {
    return errorJson(c, 500, 'font_failed', '字型載入失敗，請稍後再試')
  }
})
