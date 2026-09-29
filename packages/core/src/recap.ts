export const RECAP_MIN = 80
export const RECAP_MAX = 120

export type RecapFacts = {
  /** 1–12 */
  monthNumber: number
  daysRecorded: number
  photoCount: number
  streak: number
  collectedColors: number
  /** 依佔比由大到小的色相群組中文名（紅、橘…） */
  topHues: string[]
  mainColorName: string | null
  /** 照片的 AI 色名（取樣） */
  sampleNames: string[]
}

const len = (s: string) => Array.from(s).length

/** 把文字整理成 80–120 字內：太長就在句尾截斷（盡量停在句號等標點），不補字 */
export function fitRecap(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const chars = Array.from(clean)
  if (chars.length <= RECAP_MAX) return clean
  const cut = chars.slice(0, RECAP_MAX)
  for (const marks of [/[。！？!?]/, /[，、,；]/]) {
    for (let i = cut.length - 1; i >= RECAP_MIN - 1; i--) {
      if (marks.test(cut[i])) return cut.slice(0, i + 1).join('').replace(/[，、,；]$/, '。')
    }
  }
  return cut.slice(0, RECAP_MAX - 1).join('') + '。'
}

export function isValidRecap(text: string): boolean {
  const n = len(text)
  return n >= RECAP_MIN && n <= RECAP_MAX
}

const CLOSERS = ['下個月，繼續慢慢找顏色吧。', '沒有壓力，只是把日子染上一點顏色。', '謝謝你每一次停下來看見它們。']

/** 沒有 AI 時的示意回顧：用模板句子拼出，並保證落在 80–120 字 */
export function mockRecapText(f: RecapFacts): string {
  if (f.daysRecorded === 0 || f.photoCount === 0) {
    return `${f.monthNumber} 月還沒有留下任何顏色，沒關係，日子一直都在。拿起相機，找找今天的顏色吧，不用刻意，也不用完美，一張就好。之後這裡會慢慢被你的顏色填滿，每一個看似普通的瞬間，都值得被好好收藏起來，等你回來看。`
  }
  // [優先度越大越先被捨棄, 句子]
  const parts: [number, string][] = [
    [0, `${f.monthNumber} 月，你有 ${f.daysRecorded} 天替生活留下了顏色。`],
    [0, `一共收集了 ${f.collectedColors} 種顏色、${f.photoCount} 張照片。`]
  ]
  if (f.topHues.length) parts.push([1, `${f.topHues[0]}色最常出現在你的鏡頭裡${f.topHues[1] ? `，其次是${f.topHues[1]}色` : ''}。`])
  if (f.mainColorName) parts.push([2, `這個月的主色是「${f.mainColorName}」。`])
  if (f.streak >= 2) parts.push([3, `你連續記錄了 ${f.streak} 天，一天都沒有錯過。`])
  if (f.sampleNames[0]) parts.push([4, `像「${f.sampleNames[0]}」這樣的瞬間，你都好好收下了。`])

  const join = (list: [number, string][]) => list.map((p) => p[1]).join('')
  let chosen = [...parts]
  // 太長：從優先度最大的開始捨棄
  while (len(join(chosen)) > RECAP_MAX && chosen.length > 1) {
    const worst = chosen.reduce((a, b) => (b[0] > a[0] ? b : a))
    chosen = chosen.filter((p) => p !== worst)
  }
  // 太短：補結語
  let i = 0
  let text = join(chosen)
  while (len(text) < RECAP_MIN && i < CLOSERS.length) {
    const next = text + CLOSERS[(f.monthNumber + i) % CLOSERS.length]
    if (len(next) > RECAP_MAX) break
    text = next
    i++
  }
  return text
}
