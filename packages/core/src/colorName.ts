export const COLOR_NAME_MAX = 10

/** 去頭尾空白與引號，並以「字」（非 UTF-16 code unit）截到 max 字 */
export function truncateColorName(name: string, max = COLOR_NAME_MAX): string {
  const cleaned = name.trim().replace(/^[「『"'“]+|[」』"'”]+$/g, '').trim()
  return Array.from(cleaned).slice(0, max).join('')
}

const SUFFIXES = ['片刻', '午後', '轉角', '日常', '小憩', '一隅']

/** 沒有 AI 時的示意色名：色票中文名 + subject（或依 seed 挑的小尾巴） */
export function mockColorName(paletteZh: string, subject?: string | null, seed = ''): string {
  if (subject) return truncateColorName(`${paletteZh}的${subject}`)
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return truncateColorName(`${paletteZh}的${SUFFIXES[h % SUFFIXES.length]}`)
}
