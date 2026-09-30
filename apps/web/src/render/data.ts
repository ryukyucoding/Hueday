import {
  COMPARE_HALF,
  STORY_WIDTH,
  SWATCH_GRADIENT_HEIGHT,
  collageSpec,
  compareSpec,
  donutSvg,
  getDailyColor,
  posterSpec,
  recapSpec,
  statsSpec,
  storyBackgroundSvg,
  swatchSpec,
  yearAgo,
  type GradientStyle,
  type MonthStats,
  type RenderSpec
} from '@hueday/core'
import { api } from '../lib/api'
import { getEntry, getMonth, photoObjectUrl, type EntryResponse, type PhotoDto } from '../lib/entries'
import { fetchRecap } from '../lib/recap'
import type { RenderParams } from '../lib/render'

const svgUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`

const dataUriCache = new Map<string, Promise<string>>()

/** 照片縮到長邊 900px 再內嵌（卡片最大也才 720px），resvg 解碼與繪製會快很多 */
export function photoDataUri(p: Pick<PhotoDto, 'id' | 'url'>): Promise<string> {
  let c = dataUriCache.get(p.id)
  if (!c) {
    c = (async () => {
      const blob = await (await fetch(await photoObjectUrl(p.url))).blob()
      try {
        const bmp = await createImageBitmap(blob)
        const s = Math.min(1, 900 / Math.max(bmp.width, bmp.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bmp.width * s)
        canvas.height = Math.round(bmp.height * s)
        canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
        bmp.close()
        return canvas.toDataURL('image/jpeg', 0.85)
      } catch {
        // 解不了碼（例如非 Safari 的 HEIC）就用原檔
        return await new Promise<string>((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(String(r.result))
          r.onerror = () => rej(r.error)
          r.readAsDataURL(blob)
        })
      }
    })()
    c.catch(() => dataUriCache.delete(p.id))
    dataUriCache.set(p.id, c)
  }
  return c
}

type Style = { style?: GradientStyle; grain?: number }
const styleOf = (p: RenderParams): Style => ({ style: p.style, grain: p.grain })

async function dayPhotos(res: EntryResponse, limit: number) {
  return Promise.all(res.photos.slice(0, limit).map(async (p) => ({ dataUri: await photoDataUri(p), dominantColors: p.dominantColors, caption: p.aiColorName ?? '' })))
}

/** 依模板載入資料並組成 HTML 與字型要用到的字。各模板的資料來源與原本 Worker 端產圖時完全相同。 */
export async function buildSpec(p: RenderParams): Promise<RenderSpec> {
  const { style, grain } = styleOf(p)

  if (p.template === 'collage') {
    const res = await getEntry(p.date)
    const photos = await dayPhotos(res, 6)
    const target = getDailyColor(p.date)
    const bg = storyBackgroundSvg(photos.map((x) => x.dominantColors), { mode: res.entry?.mode ?? 'single', date: p.date, targetHex: target.hex, style, grain })
    return collageSpec({ date: p.date, zhName: target.zh, enName: target.en, bgDataUri: svgUri(bg), photos })
  }

  if (p.template === 'swatch') {
    const res = await getEntry(p.date)
    const photos = await dayPhotos(res, 4)
    const target = getDailyColor(p.date)
    // 單色日：漸層以今日色為主（同色系深淺），照片主色不混入，色票才像「這個顏色」
    const bg = storyBackgroundSvg([], { mode: 'single', date: p.date, targetHex: target.hex, style, grain }, STORY_WIDTH, SWATCH_GRADIENT_HEIGHT)
    return swatchSpec({ date: p.date, hex: target.hex, zhName: target.zh, enName: target.en, bgDataUri: svgUri(bg), photos })
  }

  if (p.template === 'compare') {
    const side = async (date: string, label: string) => {
      const res = await getEntry(date)
      const photos = await dayPhotos(res, 3)
      const target = getDailyColor(date)
      const bg = storyBackgroundSvg(photos.map((x) => x.dominantColors), { mode: res.entry?.mode ?? 'single', date, targetHex: target.hex, style, grain }, STORY_WIDTH, COMPARE_HALF)
      return { date, label, zhName: target.zh, bgDataUri: svgUri(bg), photos, hasRecord: !!res.entry }
    }
    const [last, now] = await Promise.all([side(yearAgo(p.date), 'LAST YEAR'), side(p.date, 'THIS YEAR')])
    return compareSpec({ last, now })
  }

  // 以下都是「月」的模板
  const q = new URLSearchParams({ month: p.month })
  if (p.asOf) q.set('asOf', p.asOf)

  if (p.template === 'palette') {
    const m = await getMonth(p.month)
    const colors: Record<string, string> = {}
    for (const d of m.days) if (d.mainColor) colors[d.date] = d.mainColor
    return posterSpec({ month: p.month, colors })
  }

  const stats = await api<MonthStats>(`/api/stats?${q}`)
  // 背景：本月主色漸層；沒有資料時用當月 1 號的今日色
  const bg = svgUri(storyBackgroundSvg([stats.palette], { mode: 'single', date: p.month, targetHex: getDailyColor(`${p.month}-01`).hex, style, grain }))

  if (p.template === 'stats') {
    return statsSpec({ stats, bgDataUri: bg, donutDataUri: svgUri(donutSvg(stats.hueShare, 520)) })
  }
  const recap = await fetchRecap(p.month, { asOf: p.asOf })
  return recapSpec({ stats, text: recap.text, bgDataUri: bg })
}
