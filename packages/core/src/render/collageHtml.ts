import { collageFooterText, countCollectedColors, formatStoryDate, layoutCollage, STORY_HEIGHT, STORY_WIDTH } from '../templates/collage'

export type CollageHtmlInput = {
  date: string
  zhName: string
  enName: string
  bgDataUri: string
  /** 已轉成 data URI 的照片，最多取 6 張 */
  photos: { dataUri: string; dominantColors: string[] }[]
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const DISPLAY_FONT = 'Fraunces'
export const BODY_FONT = 'Noto Sans TC'

/** 畫面上會出現的文字（用來決定要下載哪些字型字元） */
export function collageTexts(input: Pick<CollageHtmlInput, 'date' | 'zhName' | 'enName' | 'photos'>) {
  const d = formatStoryDate(input.date)
  return {
    big: `${d.month} ${d.day}`,
    sub: `${d.weekday} · ${d.year}`,
    zh: input.zhName,
    en: input.enName,
    footer: collageFooterText(countCollectedColors(input.photos.map((p) => p.dominantColors))),
    empty: '今天還沒有照片'
  }
}

/** 版面座標與前端預覽（CollagePreview.vue）使用同一份 layoutCollage */
export function collageHtml(input: CollageHtmlInput): string {
  const photos = input.photos.slice(0, 6)
  const layout = layoutCollage(photos.length)
  const t = collageTexts({ ...input, photos })
  const h = layout.header
  const disp = `font-family:${DISPLAY_FONT},${BODY_FONT};`
  const body = `font-family:${BODY_FONT};`

  const cards = layout.photos
    .map(
      (s, i) =>
        `<div style="display:flex;position:absolute;left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px;background:#fffdf9;transform:rotate(${s.rotate}deg);box-shadow:0 14px 40px rgba(43,42,40,0.22);">` +
        `<img src="${photos[i].dataUri}" width="${s.photo.w}" height="${s.photo.h}" style="position:absolute;left:${s.photo.x}px;top:${s.photo.y}px;width:${s.photo.w}px;height:${s.photo.h}px;object-fit:cover;" />` +
        `</div>`
    )
    .join('')

  return (
    `<div style="display:flex;position:relative;width:${STORY_WIDTH}px;height:${STORY_HEIGHT}px;color:#2b2a28;">` +
    `<img src="${input.bgDataUri}" width="${STORY_WIDTH}" height="${STORY_HEIGHT}" style="position:absolute;left:0;top:0;width:${STORY_WIDTH}px;height:${STORY_HEIGHT}px;" />` +
    `<div style="display:flex;position:absolute;left:90px;top:${h.dateY - h.dateSize * 0.8}px;font-size:${h.dateSize}px;font-weight:700;line-height:1;${disp}">${esc(t.big)}</div>` +
    `<div style="display:flex;position:absolute;left:90px;top:${h.dateY + 44}px;font-size:${h.yearSize}px;opacity:0.7;letter-spacing:5px;${disp}">${esc(t.sub)}</div>` +
    `<div style="display:flex;align-items:baseline;position:absolute;left:90px;top:${h.nameY - h.nameSize}px;${body}">` +
    `<span style="font-size:${h.nameSize}px;font-weight:700;">${esc(t.zh)}</span>` +
    `<span style="font-size:${Math.round(h.nameSize * 0.55)}px;opacity:0.65;margin-left:12px;${disp}">${esc(t.en)}</span>` +
    `</div>` +
    cards +
    (layout.photos.length
      ? ''
      : `<div style="position:absolute;left:0;top:900px;width:${STORY_WIDTH}px;justify-content:center;display:flex;font-size:56px;opacity:0.6;${body}">${esc(t.empty)}</div>`) +
    `<div style="display:flex;justify-content:center;position:absolute;left:0;top:${layout.footer.y}px;width:${STORY_WIDTH}px;font-size:${layout.footer.size}px;opacity:0.75;letter-spacing:2px;${disp}">${esc(t.footer)}</div>` +
    `</div>`
  )
}
