import { extractDominantColors } from './extract'
import { HUE_GROUPS, type HueGroup } from './hue'
import { classifyHue } from './hueClassify'
import { hexToRgb } from './color'
import { nearestPaletteColor } from './palette'

export type StatsEntry = { date: string; photos: { dominantColors: string[] }[] }

export type MonthStats = {
  month: string
  asOf: string
  /** 截至 asOf 的連續記錄天數（可跨月；asOf 當天還沒記錄時從前一天算起） */
  streak: number
  daysRecorded: number
  photoCount: number
  /** 本月收集到幾種色票顏色（60 色色票中，主色最接近的不同顏色數） */
  collectedColors: number
  /** 各色相群組佔比，總和為 1（沒有資料時全 0） */
  hueShare: Record<HueGroup, number>
  /** 本月主色（全月主色 k-means，依大小排序，最多 5 色） */
  palette: string[]
  mainColor: string | null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 把各照片的主色依排名加權（越靠前占比越大）成像素，再跑 k-means 取 k 個主色 */
export function weightedPalette(photos: { dominantColors: string[] }[], k = 5): string[] {
  const pixels: number[] = []
  for (const p of photos) {
    p.dominantColors.forEach((hex, i) => {
      const [r, g, b] = hexToRgb(hex)
      for (let n = 0; n < Math.max(1, 5 - i); n++) pixels.push(r, g, b, 255)
    })
  }
  return pixels.length ? extractDominantColors(new Uint8ClampedArray(pixels), k) : []
}

/** 某一天的主色 = 最大的那一群顏色（k=1 只會得到平均混色，所以取 5 群中最大者）；沒有照片回傳 null */
export function dayMainColor(photos: { dominantColors: string[] }[]): string | null {
  return weightedPalette(photos, 5)[0] ?? null
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function monthEnd(month: string): string {
  return `${month}-${pad(daysInMonth(month))}`
}

/** entries 應包含 month 之前的資料才能算出跨月連續天數 */
export function computeStats(entries: StatsEntry[], month: string, asOf: string = monthEnd(month)): MonthStats {
  const withPhotos = entries.filter((e) => e.photos.length > 0)
  const recorded = new Set(withPhotos.map((e) => e.date))

  let cursor = recorded.has(asOf) ? asOf : addDays(asOf, -1)
  let streak = 0
  while (recorded.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }

  const inMonth = withPhotos.filter((e) => e.date.startsWith(month + '-'))
  const photos = inMonth.flatMap((e) => e.photos)

  const counts = Object.fromEntries(HUE_GROUPS.map((g) => [g, 0])) as Record<HueGroup, number>
  const buckets = new Set<string>()
  let total = 0
  for (const p of photos) {
    p.dominantColors.forEach((hex) => {
      counts[classifyHue(hex)]++
      total++
      buckets.add(nearestPaletteColor(hex).hex)
    })
  }
  const hueShare = Object.fromEntries(HUE_GROUPS.map((g) => [g, total ? counts[g] / total : 0])) as Record<HueGroup, number>
  const palette = weightedPalette(photos, 5)

  return {
    month,
    asOf,
    streak,
    daysRecorded: inMonth.length,
    photoCount: photos.length,
    collectedColors: buckets.size,
    hueShare,
    palette,
    mainColor: palette[0] ?? null
  }
}
