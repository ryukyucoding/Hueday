import { STORY_HEIGHT, STORY_WIDTH, type MonthStats } from '@hueday/core'
import { BODY_FONT, DISPLAY_FONT, esc } from './collageHtml'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export type RecapHtmlInput = { stats: MonthStats; text: string; bgDataUri: string }

export function recapTexts(i: Pick<RecapHtmlInput, 'stats' | 'text'>) {
  const [y, m] = i.stats.month.split('-').map(Number)
  return {
    big: MONTHS[m - 1],
    sub: `${y} RECAP`,
    body: i.text,
    numbers: [
      { value: String(i.stats.streak), label: '連續天數' },
      { value: String(i.stats.collectedColors), label: '收集色數' },
      { value: String(i.stats.daysRecorded), label: '記錄天數' }
    ],
    footer: 'Hueday'
  }
}

/** 每個 div 都要 display:flex、每個 img 都要 width/height（satori 限制） */
export function recapHtml(input: RecapHtmlInput): string {
  const t = recapTexts(input)
  const disp = `font-family:${DISPLAY_FONT},${BODY_FONT};`
  const body = `font-family:${BODY_FONT};`
  const W = STORY_WIDTH
  const H = STORY_HEIGHT
  const numbers = t.numbers
    .map(
      (n) =>
        `<div style="display:flex;flex-direction:column;width:300px;">` +
        `<div style="display:flex;font-size:150px;font-weight:700;line-height:1;${disp}">${esc(n.value)}</div>` +
        `<div style="display:flex;font-size:38px;margin-top:12px;opacity:0.75;${body}">${esc(n.label)}</div></div>`
    )
    .join('')
  return (
    `<div style="display:flex;position:relative;width:${W}px;height:${H}px;color:#2b2a28;">` +
    `<img src="${input.bgDataUri}" width="${W}" height="${H}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;" />` +
    `<div style="display:flex;position:absolute;left:90px;top:100px;font-size:230px;font-weight:700;line-height:1;${disp}">${esc(t.big)}</div>` +
    `<div style="display:flex;position:absolute;left:94px;top:340px;font-size:44px;letter-spacing:8px;opacity:0.7;${disp}">${esc(t.sub)}</div>` +
    `<div style="display:flex;position:absolute;left:90px;top:470px;width:900px;font-size:54px;line-height:1.55;font-weight:700;${body}">${esc(t.body)}</div>` +
    `<div style="display:flex;position:absolute;left:90px;top:1460px;width:900px;">${numbers}</div>` +
    `<div style="display:flex;justify-content:center;position:absolute;left:0;top:1810px;width:${W}px;font-size:36px;letter-spacing:4px;opacity:0.7;${disp}">${esc(t.footer)}</div>` +
    `</div>`
  )
}
