import { getUserId } from './api'

export type RenderParams = { template: 'collage'; date: string; style?: 'mesh' | 'flow'; grain?: number }

export function renderUrl(p: RenderParams): string {
  const q = new URLSearchParams({ template: p.template, date: p.date })
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
