import { STORY_HEIGHT, STORY_WIDTH } from './collage'

export const SWATCH_MAX_PHOTOS = 4
/** 上半部漸層佔 60% */
export const SWATCH_GRADIENT_HEIGHT = Math.round(STORY_HEIGHT * 0.6)

export type SwatchPhotoSlot = { x: number; y: number; size: number; captionY: number; captionW: number }

export type SwatchLayout = {
  width: number
  height: number
  gradientHeight: number
  /** Pantone 風格白色資訊條（跨在漸層與下半部的交界） */
  strip: { x: number; y: number; w: number; h: number }
  chip: { x: number; y: number; size: number }
  text: { x: number; w: number }
  photos: SwatchPhotoSlot[]
  footerY: number
}

/**
 * 3–4 張照片各佔一格；不足 3 張時沿用 3 張的格子大小並整組置中，版面仍然平衡。
 * 多於 4 張只排前 4 張。
 */
export function layoutSwatch(count: number): SwatchLayout {
  const n = Math.max(0, Math.min(SWATCH_MAX_PHOTOS, Math.floor(count)))
  const size = n === 4 ? 207 : 280
  const gap = n === 4 ? 24 : 30
  const total = n * size + Math.max(0, n - 1) * gap
  const startX = Math.round((STORY_WIDTH - total) / 2)
  const y = 1430
  return {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    gradientHeight: SWATCH_GRADIENT_HEIGHT,
    strip: { x: 90, y: 1030, w: 900, h: 320 },
    chip: { x: 120, y: 1060, size: 260 },
    text: { x: 420, w: 540 },
    photos: Array.from({ length: n }, (_, i) => ({ x: startX + i * (size + gap), y, size, captionY: y + size + 16, captionW: size })),
    footerY: 1840
  }
}

/** hex 顯示用（大寫、含 #） */
export function formatHex(hex: string): string {
  return hex.toUpperCase()
}

/** 2025-05-01 → 2025.05.01 */
export function formatSwatchDate(date: string): string {
  return date.replace(/-/g, '.')
}
