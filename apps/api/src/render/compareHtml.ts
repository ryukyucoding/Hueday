import { STORY_HEIGHT, STORY_WIDTH, formatStoryDate } from '@hueday/core'
import { BODY_FONT, DISPLAY_FONT, esc } from './collageHtml'

export const COMPARE_HALF = STORY_HEIGHT / 2
const PHOTO_SIZE = 260
const PHOTO_GAP = 30

export type CompareSide = {
  date: string
  label: string
  zhName: string
  bgDataUri: string
  photos: { dataUri: string }[]
  hasRecord: boolean
}

export type CompareHtmlInput = { last: CompareSide; now: CompareSide }

export function compareTexts(i: CompareHtmlInput) {
  const side = (s: CompareSide) => {
    const d = formatStoryDate(s.date)
    return { label: s.label, big: `${d.month} ${d.day}`, sub: `${d.weekday} · ${d.year}`, zh: s.zhName }
  }
  return { last: side(i.last), now: side(i.now), pill: '1 YEAR LATER', empty: '這天沒有照片' }
}

/** 一半畫面（1080×960）。每個 div 都要 display:flex、每個 img 都要 width/height（satori 限制） */
function half(s: CompareSide, top: number): string {
  const t = compareTexts({ last: s, now: s }).last
  const disp = `font-family:${DISPLAY_FONT},${BODY_FONT};`
  const body = `font-family:${BODY_FONT};`
  const W = STORY_WIDTH
  const photos = s.photos.slice(0, 3)
  const cells = photos
    .map(
      (p, i) =>
        `<img src="${p.dataUri}" width="${PHOTO_SIZE}" height="${PHOTO_SIZE}" style="position:absolute;left:${90 + i * (PHOTO_SIZE + PHOTO_GAP)}px;top:${top + 600}px;width:${PHOTO_SIZE}px;height:${PHOTO_SIZE}px;object-fit:cover;border:8px solid #fffdf9;border-radius:6px;box-shadow:0 12px 30px rgba(43,42,40,0.22);" />`
    )
    .join('')
  return (
    `<img src="${s.bgDataUri}" width="${W}" height="${COMPARE_HALF}" style="position:absolute;left:0;top:${top}px;width:${W}px;height:${COMPARE_HALF}px;" />` +
    `<div style="display:flex;position:absolute;left:90px;top:${top + 64}px;font-size:32px;letter-spacing:8px;opacity:0.65;${disp}">${esc(t.label)}</div>` +
    `<div style="display:flex;position:absolute;left:90px;top:${top + 120}px;font-size:130px;font-weight:700;line-height:1;${disp}">${esc(t.big)}</div>` +
    `<div style="display:flex;position:absolute;left:94px;top:${top + 268}px;font-size:40px;letter-spacing:5px;opacity:0.7;${disp}">${esc(t.sub)}</div>` +
    `<div style="display:flex;position:absolute;left:90px;top:${top + 340}px;font-size:60px;font-weight:700;${body}">${esc(t.zh)}</div>` +
    cells +
    (s.hasRecord && photos.length
      ? ''
      : `<div style="display:flex;position:absolute;left:90px;top:${top + 680}px;font-size:44px;opacity:0.6;${body}">${esc('這天沒有照片')}</div>`)
  )
}

export function compareHtml(input: CompareHtmlInput): string {
  const t = compareTexts(input)
  const disp = `font-family:${DISPLAY_FONT},${BODY_FONT};`
  return (
    `<div style="display:flex;position:relative;width:${STORY_WIDTH}px;height:${STORY_HEIGHT}px;background:#faf7f2;color:#2b2a28;">` +
    half(input.last, 0) +
    half(input.now, COMPARE_HALF) +
    `<div style="display:flex;position:absolute;left:0;top:${COMPARE_HALF - 4}px;width:${STORY_WIDTH}px;height:8px;background:#fffdf9;"></div>` +
    `<div style="display:flex;justify-content:center;align-items:center;position:absolute;left:390px;top:${COMPARE_HALF - 34}px;width:300px;height:68px;border-radius:34px;background:#fffdf9;font-size:28px;letter-spacing:6px;box-shadow:0 8px 24px rgba(43,42,40,0.2);${disp}">${esc(t.pill)}</div>` +
    `</div>`
  )
}
