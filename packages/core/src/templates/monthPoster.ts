import { monthGrid } from '../calendar'
import { STORY_HEIGHT, STORY_WIDTH } from './collage'

export type PosterCell = { date: string; day: number; row: number; col: number; x: number; y: number; size: number }

export type MonthPosterLayout = {
  width: number
  height: number
  rows: number
  cell: number
  gap: number
  grid: { x: number; y: number; w: number; h: number }
  header: { monthY: number; monthSize: number; yearY: number; yearSize: number }
  weekdays: { y: number; size: number; labels: { text: string; x: number }[] }
  footer: { y: number; size: number }
  cells: PosterCell[]
}

const COLS = 7
const GAP = 12
const CELL = 118
const GRID_W = COLS * CELL + (COLS - 1) * GAP // 898
const GRID_X = Math.round((STORY_WIDTH - GRID_W) / 2)
const GRID_Y = 600

/** 7 欄色格，依星期對齊（weekStart 0 = 週日開頭、1 = 週一開頭），最多 6 列 */
export function layoutMonthPoster(month: string, weekStart: 0 | 1 = 0): MonthPosterLayout {
  const grid = monthGrid(month, weekStart)
  const rows = grid.length / COLS
  const cells: PosterCell[] = []
  grid.forEach((date, i) => {
    if (!date) return
    const row = Math.floor(i / COLS)
    const col = i % COLS
    cells.push({ date, day: Number(date.slice(8)), row, col, x: GRID_X + col * (CELL + GAP), y: GRID_Y + row * (CELL + GAP), size: CELL })
  })
  const names = weekStart === 0 ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return {
    width: STORY_WIDTH,
    height: STORY_HEIGHT,
    rows,
    cell: CELL,
    gap: GAP,
    grid: { x: GRID_X, y: GRID_Y, w: GRID_W, h: rows * CELL + (rows - 1) * GAP },
    header: { monthY: 110, monthSize: 230, yearY: 370, yearSize: 48 },
    weekdays: { y: 540, size: 30, labels: names.map((text, col) => ({ text, x: GRID_X + col * (CELL + GAP) })) },
    footer: { y: 1790, size: 38 },
    cells
  }
}

/** 沒有記錄的日子：淡灰斜線（單一 SVG，當 <img> 使用） */
export function emptyStripeSvg(size: number): string {
  const lines: string[] = []
  for (let k = -size; k < size * 2; k += 14) lines.push(`<line x1="${k}" y1="${size}" x2="${k + size}" y2="0" />`)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" fill="#ebe7df"/>` +
    `<g stroke="#d3cec4" stroke-width="2">${lines.join('')}</g></svg>`
  )
}
