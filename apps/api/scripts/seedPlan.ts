import { PALETTE, addDays, getDailyColor, mockColorName, mulberry32, nearestPaletteColor, yearAgo } from '@hueday/core'

export type SeedPhoto = { colors: string[]; aiName: string; subject: string; matches: boolean | null }
export type SeedEntry = { date: string; mode: 'single' | 'collect'; target: string; note: string | null; photos: SeedPhoto[] }

const SUBJECTS = ['招牌', '咖啡杯', '天空', '外套', '花', '牆面', '傘', '公車', '便當', '貓']
const NOTES = ['今天心情不錯', '下班路上拍的', '午休散步', '週末的早晨', '突然下雨了', '和朋友吃飯', null, null, null]

/** 產生過去 days 天的假資料（約 75% 的日子有記錄）。同樣的 today 與 seed 永遠得到同樣結果。 */
export function planSeed(today: string, days = 400, seed = 42): SeedEntry[] {
  const rand = mulberry32(seed)
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  const must = yearAgo(today) // 一定要有「去年今天」，才能測試 P16
  const out: SeedEntry[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i)
    if (rand() > 0.75 && date !== must) continue
    const mode = rand() < 0.6 ? 'single' : 'collect'
    const target = getDailyColor(date).hex
    const count = 1 + Math.floor(rand() * 3)
    const photos: SeedPhoto[] = Array.from({ length: count }, (_, k) => {
      const colors =
        mode === 'single' && k === 0
          ? [target, pick(PALETTE).hex]
          : [pick(PALETTE).hex, pick(PALETTE).hex, pick(PALETTE).hex].slice(0, 2 + Math.floor(rand() * 2))
      const subject = pick(SUBJECTS)
      return {
        colors,
        subject,
        aiName: mockColorName(nearestPaletteColor(colors[0]).zh, subject),
        matches: mode === 'single' ? colors[0] === target : null
      }
    })
    out.push({ date, mode, target, note: pick(NOTES), photos })
  }
  return out
}
