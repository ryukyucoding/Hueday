import { hexToRgb } from './color'
import type { HueGroup } from './hue'

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min
  const l = (max + min) / 2
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4
  h *= 60
  if (h < 0) h += 360
  return [h, s, l]
}

/** 以 HSL 判斷色相群組：黑白灰看飽和度/明度，棕與粉看明度與飽和度 */
export function classifyHue(hex: string): HueGroup {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex))
  if (l < 0.1 || l > 0.9 || s < 0.16) return 'neutral'
  const warm = h < 50 || h >= 345
  if (warm && h >= 10 && h < 50 && (l < 0.45 || (s < 0.55 && l < 0.7))) return 'brown'
  if ((h >= 345 || h < 40) && l >= 0.78) return 'pink'
  if (h >= 345 || h < 10) return 'red'
  if (h < 40) return 'orange'
  if (h < 65) return 'yellow'
  if (h < 172) return 'green'
  if (h < 255) return 'blue'
  if (h < 320) return 'purple'
  return 'pink'
}
