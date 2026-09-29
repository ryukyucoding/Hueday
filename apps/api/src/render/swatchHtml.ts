import { STORY_HEIGHT, STORY_WIDTH, formatHex, formatSwatchDate, layoutSwatch } from '@hueday/core'
import { BODY_FONT, DISPLAY_FONT, esc } from './collageHtml'

export type SwatchHtmlInput = {
  date: string
  hex: string
  zhName: string
  enName: string
  bgDataUri: string
  /** 最多取 4 張；caption 為 AI 色名 */
  photos: { dataUri: string; caption: string }[]
}

export function swatchTexts(i: Pick<SwatchHtmlInput, 'date' | 'hex' | 'zhName' | 'enName' | 'photos'>) {
  return {
    kicker: 'COLOR OF THE DAY',
    zh: i.zhName,
    en: i.enName,
    hex: formatHex(i.hex),
    date: formatSwatchDate(i.date),
    captions: i.photos.slice(0, 4).map((p) => p.caption),
    footer: 'Hueday'
  }
}

/** 每個 div 都要 display:flex、每個 img 都要 width/height（satori 限制） */
export function swatchHtml(input: SwatchHtmlInput): string {
  const photos = input.photos.slice(0, 4)
  const l = layoutSwatch(photos.length)
  const t = swatchTexts({ ...input, photos })
  const disp = `font-family:${DISPLAY_FONT},${BODY_FONT};`
  const body = `font-family:${BODY_FONT};`
  const W = STORY_WIDTH

  const cells = l.photos
    .map(
      (s, i) =>
        `<img src="${photos[i].dataUri}" width="${s.size}" height="${s.size}" style="position:absolute;left:${s.x}px;top:${s.y}px;width:${s.size}px;height:${s.size}px;object-fit:cover;border-radius:12px;" />` +
        `<div style="display:flex;justify-content:center;text-align:center;position:absolute;left:${s.x}px;top:${s.captionY}px;width:${s.captionW}px;font-size:${photos.length === 4 ? 26 : 30}px;line-height:1.3;color:#2b2a28;${body}">${esc(t.captions[i])}</div>`
    )
    .join('')

  return (
    `<div style="display:flex;position:relative;width:${W}px;height:${STORY_HEIGHT}px;background:#faf7f2;color:#2b2a28;">` +
    `<img src="${input.bgDataUri}" width="${W}" height="${l.gradientHeight}" style="position:absolute;left:0;top:0;width:${W}px;height:${l.gradientHeight}px;" />` +
    // Pantone 風格資訊條
    `<div style="display:flex;position:absolute;left:${l.strip.x}px;top:${l.strip.y}px;width:${l.strip.w}px;height:${l.strip.h}px;background:#ffffff;border-radius:8px;box-shadow:0 18px 50px rgba(43,42,40,0.22);"></div>` +
    `<div style="display:flex;position:absolute;left:${l.chip.x}px;top:${l.chip.y}px;width:${l.chip.size}px;height:${l.chip.size}px;background:${input.hex};border-radius:4px;"></div>` +
    `<div style="display:flex;position:absolute;left:${l.text.x}px;top:${l.strip.y + 34}px;font-size:28px;letter-spacing:6px;opacity:0.6;${disp}">${esc(t.kicker)}</div>` +
    `<div style="display:flex;align-items:baseline;position:absolute;left:${l.text.x}px;top:${l.strip.y + 84}px;width:${l.text.w}px;">` +
    `<div style="display:flex;font-size:84px;font-weight:700;line-height:1.1;${body}">${esc(t.zh)}</div>` +
    `<div style="display:flex;font-size:38px;margin-left:16px;opacity:0.65;${disp}">${esc(t.en)}</div></div>` +
    `<div style="display:flex;position:absolute;left:${l.text.x}px;top:${l.strip.y + 214}px;width:${l.text.w}px;justify-content:space-between;align-items:baseline;">` +
    `<div style="display:flex;font-size:52px;font-weight:700;letter-spacing:3px;${disp}">${esc(t.hex)}</div>` +
    `<div style="display:flex;font-size:34px;opacity:0.7;letter-spacing:2px;${disp}">${esc(t.date)}</div></div>` +
    cells +
    `<div style="display:flex;justify-content:center;position:absolute;left:0;top:${l.footerY}px;width:${W}px;font-size:32px;letter-spacing:4px;opacity:0.6;${disp}">${esc(t.footer)}</div>` +
    `</div>`
  )
}
