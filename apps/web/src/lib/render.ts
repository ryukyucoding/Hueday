import { getUserId } from './api'

type Common = { style?: 'mesh' | 'flow'; grain?: number }
export type RenderParams =
  | ({ template: 'collage'; date: string } & Common)
  | ({ template: 'swatch'; date: string } & Common)
  | ({ template: 'compare'; date: string } & Common)
  | ({ template: 'stats'; month: string; asOf?: string } & Common)
  | ({ template: 'recap'; month: string; asOf?: string } & Common)
  | ({ template: 'palette'; month: string; asOf?: string } & Common)

export function renderUrl(p: RenderParams): string {
  const q = new URLSearchParams({ template: p.template })
  if (p.template === 'stats' || p.template === 'recap' || p.template === 'palette') {
    q.set('month', p.month)
    if (p.asOf) q.set('asOf', p.asOf)
  } else q.set('date', p.date)
  if (p.style) q.set('style', p.style)
  if (p.grain !== undefined) q.set('grain', String(Math.round(p.grain)))
  return `/api/render?${q}`
}

/** 取得 Worker 產出的 PNG（需要 X-User-Id，所以 fetch 成 blob）。呼叫端負責 revokeObjectURL。 */
export async function fetchRenderBlob(p: RenderParams, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(renderUrl(p), { headers: { 'X-User-Id': getUserId() }, signal })
  if (!res.ok) throw new Error(`render ${res.status}`)
  return res.blob()
}
