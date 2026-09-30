import { renderTemplate } from '../render/renderer'

type Common = { style?: 'mesh' | 'flow'; grain?: number }
export type RenderParams =
  | ({ template: 'collage'; date: string } & Common)
  | ({ template: 'swatch'; date: string } & Common)
  | ({ template: 'compare'; date: string } & Common)
  | ({ template: 'stats'; month: string; asOf?: string } & Common)
  | ({ template: 'recap'; month: string; asOf?: string } & Common)
  | ({ template: 'palette'; month: string; asOf?: string } & Common)

/** 這次產圖的「參數識別字串」：參數（模板、日期/月份、風格、顆粒）一變就不同，用來判斷要不要重產 */
export function renderKey(p: RenderParams): string {
  const q = new URLSearchParams({ template: p.template })
  if (p.template === 'stats' || p.template === 'recap' || p.template === 'palette') {
    q.set('month', p.month)
    if (p.asOf) q.set('asOf', p.asOf)
  } else q.set('date', p.date)
  if (p.style) q.set('style', p.style)
  if (p.grain !== undefined) q.set('grain', String(Math.round(p.grain)))
  return q.toString()
}

/** 在瀏覽器裡產出 1080×1920 PNG（Web Worker：satori + resvg-wasm）。呼叫端負責 revokeObjectURL。 */
export function fetchRenderBlob(p: RenderParams, signal?: AbortSignal): Promise<Blob> {
  return renderTemplate(p, signal)
}
