import { readableTextColor } from '../color'
import { STORY_HEIGHT, STORY_WIDTH } from '../templates/collage'
import { emptyStripeSvg, layoutMonthPoster } from '../templates/monthPoster'
import { base64Ascii } from './base64'
import { BODY_FONT, DISPLAY_FONT, esc } from './collageHtml'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export type PosterHtmlInput = {
  month: string
  /** date → 當天主色；沒有的日子畫淡灰斜線 */
  colors: Record<string, string>
}

export function posterTexts(month: string) {
  const [y, m] = month.split('-').map(Number)
  return { big: MONTHS[m - 1], year: String(y), footer: `${MONTHS[m - 1]} ${y} · Hueday` }
}

/** 每個 div 都要 display:flex、每個 img 都要 width/height（satori 限制） */
export function posterHtml(input: PosterHtmlInput): string {
  const l = layoutMonthPoster(input.month, 0)
  const t = posterTexts(input.month)
  const disp = `font-family:${DISPLAY_FONT},${BODY_FONT};`
  const W = STORY_WIDTH
  const stripe = `data:image/svg+xml;base64,${base64Ascii(emptyStripeSvg(l.cell))}`

  const weekdays = l.weekdays.labels
    .map(
      (w) =>
        `<div style="display:flex;justify-content:center;position:absolute;left:${w.x}px;top:${l.weekdays.y}px;width:${l.cell}px;font-size:${l.weekdays.size}px;letter-spacing:2px;opacity:0.55;${disp}">${esc(w.text)}</div>`
    )
    .join('')

  const cells = l.cells
    .map((c) => {
      const hex = input.colors[c.date]
      const pos = `position:absolute;left:${c.x}px;top:${c.y}px;width:${c.size}px;height:${c.size}px;`
      if (!hex) {
        return (
          `<img src="${stripe}" width="${c.size}" height="${c.size}" style="${pos}border-radius:12px;" />` +
          `<div style="display:flex;justify-content:flex-end;align-items:flex-end;${pos}padding:0 10px 6px 0;font-size:24px;color:#a8a296;${disp}">${c.day}</div>`
        )
      }
      return `<div style="display:flex;justify-content:flex-end;align-items:flex-end;${pos}padding:0 10px 6px 0;background:${hex};border-radius:12px;font-size:24px;color:${readableTextColor(hex)};${disp}">${c.day}</div>`
    })
    .join('')

  return (
    `<div style="display:flex;position:relative;width:${W}px;height:${STORY_HEIGHT}px;background:#faf7f2;color:#2b2a28;">` +
    `<div style="display:flex;position:absolute;left:90px;top:${l.header.monthY}px;font-size:${l.header.monthSize}px;font-weight:700;line-height:1;${disp}">${esc(t.big)}</div>` +
    `<div style="display:flex;position:absolute;left:94px;top:${l.header.yearY}px;font-size:${l.header.yearSize}px;letter-spacing:8px;opacity:0.65;${disp}">${esc(t.year)}</div>` +
    weekdays +
    cells +
    `<div style="display:flex;justify-content:center;position:absolute;left:0;top:${l.footer.y}px;width:${W}px;font-size:${l.footer.size}px;letter-spacing:4px;opacity:0.7;${disp}">${esc(t.footer)}</div>` +
    `</div>`
  )
}
