import { HUE_GROUPS, HUE_GROUP_COLORS, HUE_GROUP_LABELS } from '../hue'
import type { MonthStats } from '../stats'
import { STORY_HEIGHT, STORY_WIDTH } from '../templates/collage'
import { BODY_FONT, DISPLAY_FONT, esc } from './collageHtml'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function statsTexts(s: MonthStats) {
  const [y, m] = s.month.split('-').map(Number)
  const legend = HUE_GROUPS.filter((g) => s.hueShare[g] > 0)
    .sort((a, b) => s.hueShare[b] - s.hueShare[a])
    .map((g) => ({ group: g, label: HUE_GROUP_LABELS[g], pct: `${Math.round(s.hueShare[g] * 100)}%` }))
  return {
    title: `${MONTHS[m - 1]} ${y}`,
    subtitle: 'COLOR LOG · Hueday',
    numbers: [
      { value: String(s.streak), label: '連續天數' },
      { value: String(s.collectedColors), label: '收集色數' },
      { value: String(s.daysRecorded), label: '記錄天數' }
    ],
    legend,
    mainLabel: '本月主色',
    mainEn: 'MAIN COLORS',
    footer: 'Hueday',
    empty: '這個月還沒有記錄'
  }
}

export type StatsHtmlInput = { stats: MonthStats; bgDataUri: string; donutDataUri: string }

/** 每個 div 都要 display:flex、每個 img 都要 width/height（satori 限制） */
export function statsHtml({ stats, bgDataUri, donutDataUri }: StatsHtmlInput): string {
  const t = statsTexts(stats)
  const disp = `font-family:${DISPLAY_FONT},${BODY_FONT};`
  const body = `font-family:${BODY_FONT};`
  const W = STORY_WIDTH
  const H = STORY_HEIGHT

  const numbers = t.numbers
    .map(
      (n) =>
        `<div style="display:flex;flex-direction:column;width:300px;">` +
        `<div style="display:flex;font-size:190px;font-weight:700;line-height:1;${disp}">${esc(n.value)}</div>` +
        `<div style="display:flex;font-size:40px;margin-top:14px;opacity:0.75;${body}">${esc(n.label)}</div>` +
        `</div>`
    )
    .join('')

  const legend = t.legend
    .map(
      (l) =>
        `<div style="display:flex;align-items:center;margin:0 26px 16px 0;font-size:34px;${body}">` +
        `<div style="display:flex;width:26px;height:26px;border-radius:13px;background:${HUE_GROUP_COLORS[l.group]};margin-right:10px;"></div>` +
        `<div style="display:flex;">${esc(l.label)} ${esc(l.pct)}</div></div>`
    )
    .join('')

  const palette = stats.palette.length
    ? stats.palette.map((c) => `<div style="display:flex;flex:1;height:120px;background:${c};"></div>`).join('')
    : `<div style="display:flex;flex:1;height:120px;background:rgba(43,42,40,0.1);"></div>`

  return (
    `<div style="display:flex;position:relative;width:${W}px;height:${H}px;color:#2b2a28;">` +
    `<img src="${bgDataUri}" width="${W}" height="${H}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;" />` +
    `<div style="display:flex;position:absolute;left:90px;top:100px;font-size:150px;font-weight:700;line-height:1;${disp}">${esc(t.title)}</div>` +
    `<div style="display:flex;position:absolute;left:94px;top:280px;font-size:40px;letter-spacing:5px;opacity:0.7;${disp}">${esc(t.subtitle)}</div>` +
    `<div style="display:flex;position:absolute;left:90px;top:430px;width:900px;">${numbers}</div>` +
    `<div style="display:flex;position:absolute;left:280px;top:800px;width:520px;height:520px;">` +
    `<img src="${donutDataUri}" width="520" height="520" style="width:520px;height:520px;" /></div>` +
    (stats.photoCount === 0
      ? `<div style="display:flex;justify-content:center;position:absolute;left:0;top:1030px;width:${W}px;font-size:44px;opacity:0.6;${body}">${esc(t.empty)}</div>`
      : '') +
    `<div style="display:flex;flex-wrap:wrap;justify-content:center;position:absolute;left:90px;top:1370px;width:900px;">${legend}</div>` +
    `<div style="display:flex;align-items:baseline;position:absolute;left:90px;top:1560px;">` +
    `<div style="display:flex;font-size:40px;font-weight:700;${body}">${esc(t.mainLabel)}</div>` +
    `<div style="display:flex;font-size:30px;margin-left:16px;opacity:0.65;letter-spacing:3px;${disp}">${esc(t.mainEn)}</div></div>` +
    `<div style="display:flex;position:absolute;left:90px;top:1630px;width:900px;height:120px;border-radius:24px;overflow:hidden;">${palette}</div>` +
    `<div style="display:flex;justify-content:center;position:absolute;left:0;top:1810px;width:${W}px;font-size:36px;opacity:0.7;letter-spacing:4px;${disp}">${esc(t.footer)}</div>` +
    `</div>`
  )
}
