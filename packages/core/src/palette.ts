import { PALETTE, type PaletteColor } from './palette.data'

export { PALETTE }
export type { PaletteColor }

/** FNV-1a 32-bit，deterministic，不依賴任何環境 API */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  // 額外 avalanche，避免連續日期的低位元相關
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}

/** date: YYYY-MM-DD。同一天所有人得到同一色。 */
export function getDailyColor(date: string): PaletteColor {
  return PALETTE[hashString(`hueday:${date}`) % PALETTE.length]
}
