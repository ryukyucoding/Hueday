import { collageHtml, collageTexts, type CollageHtmlInput } from './collageHtml'
import { compareHtml, compareTexts, type CompareHtmlInput } from './compareHtml'
import { posterHtml, posterTexts, type PosterHtmlInput } from './posterHtml'
import { recapHtml, recapTexts, type RecapHtmlInput } from './recapHtml'
import { statsHtml, statsTexts, type StatsHtmlInput } from './statsHtml'
import { swatchHtml, swatchTexts, type SwatchHtmlInput } from './swatchHtml'

/**
 * 一張限動要交給渲染器的東西：HTML，以及版面上會出現的文字
 * （用來決定字型只需要下載哪些字——Noto Sans TC 與 Fraunces 各一份）。
 * 瀏覽器（Web Worker 裡的 satori + resvg）與測試共用同一份，模板只寫一次。
 */
export type RenderSpec = { html: string; bodyText: string; dispText: string }

export const collageSpec = (i: CollageHtmlInput): RenderSpec => {
  const t = collageTexts(i)
  return { html: collageHtml(i), bodyText: t.zh + t.empty + t.footer + t.sub + t.big + t.en, dispText: t.big + t.sub + t.en + t.footer }
}

export const statsSpec = (i: StatsHtmlInput): RenderSpec => {
  const t = statsTexts(i.stats)
  const all = t.title + t.subtitle + t.numbers.map((n) => n.value + n.label).join('') + t.legend.map((l) => l.label + l.pct).join('') + t.mainLabel + t.mainEn + t.footer + t.empty
  return { html: statsHtml(i), bodyText: all, dispText: all }
}

export const swatchSpec = (i: SwatchHtmlInput): RenderSpec => {
  const t = swatchTexts(i)
  const all = t.kicker + t.zh + t.en + t.hex + t.date + t.captions.join('') + t.footer
  return { html: swatchHtml(i), bodyText: all, dispText: all }
}

export const compareSpec = (i: CompareHtmlInput): RenderSpec => {
  const t = compareTexts(i)
  const all = [t.last, t.now].map((x) => x.label + x.big + x.sub + x.zh).join('') + t.pill + t.empty
  return { html: compareHtml(i), bodyText: all, dispText: all }
}

export const recapSpec = (i: RecapHtmlInput): RenderSpec => {
  const t = recapTexts(i)
  const all = t.big + t.sub + t.body + t.numbers.map((n) => n.value + n.label).join('') + t.footer
  return { html: recapHtml(i), bodyText: all, dispText: all }
}

export const posterSpec = (i: PosterHtmlInput): RenderSpec => {
  const t = posterTexts(i.month)
  const all = t.big + t.year + t.footer + 'SMTWTFS' + '0123456789'
  return { html: posterHtml(i), bodyText: all, dispText: all }
}
