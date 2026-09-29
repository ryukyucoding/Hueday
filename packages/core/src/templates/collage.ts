import { classifyHue } from '../hueClassify'

export const STORY_WIDTH = 1080
export const STORY_HEIGHT = 1920
export const COLLAGE_MAX_PHOTOS = 6

/** 拍立得卡片：x/y 為未旋轉時的左上角，rotate（度）繞卡片中心；photo 為相片區（相對卡片左上角） */
export type PolaroidSlot = {
  x: number
  y: number
  w: number
  h: number
  rotate: number
  photo: { x: number; y: number; w: number; h: number }
}

export type CollageLayout = {
  width: number
  height: number
  header: { dateY: number; nameY: number; dateSize: number; nameSize: number; yearSize: number }
  footer: { y: number; size: number }
  photos: PolaroidSlot[]
}

/** 每張卡：中心 cx/cy、外框寬 w、旋轉角 */
type Spec = [cx: number, cy: number, w: number, rotate: number]

const SPECS: Record<number, Spec[]> = {
  1: [[540, 1020, 720, -2]],
  2: [[310, 860, 440, -3], [770, 1240, 440, 3]],
  3: [[300, 760, 400, -3], [780, 800, 400, 3], [540, 1330, 460, -2]],
  4: [[300, 760, 400, -3], [780, 800, 400, 2], [300, 1290, 400, 3], [780, 1320, 400, -2]],
  5: [[290, 820, 380, -3], [790, 850, 380, 2], [240, 1250, 270, 2], [540, 1260, 270, -2], [840, 1250, 270, 3]],
  6: [[232, 820, 285, -2], [540, 840, 285, 2], [848, 820, 285, -2], [232, 1200, 285, 2], [540, 1220, 285, -2], [848, 1200, 285, 2]]
}

/** 白框拍立得：上左右留邊 5%，下方留 15% 寫字 */
function polaroid([cx, cy, w, rotate]: Spec): PolaroidSlot {
  const pad = Math.round(w * 0.05)
  const inner = w - pad * 2
  const h = pad + inner + pad * 3
  return {
    x: Math.round(cx - w / 2),
    y: Math.round(cy - h / 2),
    w,
    h,
    rotate,
    photo: { x: pad, y: pad, w: inner, h: inner }
  }
}

/** count 會被限制在 1–6；0 張回傳空的 photos（只有標題與頁尾） */
export function layoutCollage(count: number): CollageLayout {
  const n = Math.max(0, Math.min(COLLAGE_MAX_PHOTOS, Math.floor(count)))
  return {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    header: { dateY: 190, nameY: 400, dateSize: 210, nameSize: 64, yearSize: 44 },
    footer: { y: 1780, size: 38 },
    photos: n === 0 ? [] : SPECS[n].map(polaroid)
  }
}

/** 旋轉後的四個角落座標（用於檢查出界 / 重疊） */
export function slotCorners(s: PolaroidSlot): [number, number][] {
  const cx = s.x + s.w / 2
  const cy = s.y + s.h / 2
  const a = (s.rotate * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return ([[-s.w / 2, -s.h / 2], [s.w / 2, -s.h / 2], [s.w / 2, s.h / 2], [-s.w / 2, s.h / 2]] as const).map(
    ([dx, dy]) => [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos] as [number, number]
  )
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

/** date: YYYY-MM-DD → 大字英文數字日期（不受時區影響） */
export function formatStoryDate(date: string): { month: string; day: string; year: string; weekday: string } {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return { month: MONTHS[m - 1], day: String(d).padStart(2, '0'), year: String(y), weekday }
}

/** 當天收集到的顏色數 = 所有照片主色涵蓋的色相群組數 */
export function countCollectedColors(colorLists: string[][]): number {
  const groups = new Set<string>()
  for (const list of colorLists) for (const c of list) groups.add(classifyHue(c))
  return groups.size
}

export function collageFooterText(collected: number): string {
  return `collected ${collected} ${collected === 1 ? 'color' : 'colors'} · Hueday`
}
