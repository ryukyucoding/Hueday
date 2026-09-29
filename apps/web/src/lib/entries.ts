import { api, getUserId } from './api'
import type { Mode } from './mode'

export type PhotoDto = {
  id: string
  url: string
  dominantColors: string[]
  aiColorName: string | null
  matchesTarget: boolean | null
  subject: string | null
  confidence: number | null
  mock: boolean
  createdAt: number
}
export type EntryDto = { id: string; date: string; mode: Mode; targetColor: string | null; note: string | null; createdAt: number }
export type EntryResponse = { entry: EntryDto | null; photos: PhotoDto[] }

export const getEntry = (date: string) => api<EntryResponse>(`/api/entries/${date}`)

export async function uploadPhoto(date: string, blob: Blob, mode: Mode, dominantColors: string[] = []): Promise<{ entry: EntryDto; photo: PhotoDto }> {
  const fd = new FormData()
  fd.set('file', blob, 'photo.jpg')
  fd.set('mode', mode)
  fd.set('dominantColors', JSON.stringify(dominantColors))
  return api(`/api/entries/${date}/photos`, { method: 'POST', body: fd })
}

/** 圖片端點需要 X-User-Id，<img> 無法帶 header，所以先 fetch 成 blob URL */
const cache = new Map<string, Promise<string>>()
export function photoObjectUrl(url: string): Promise<string> {
  let p = cache.get(url)
  if (!p) {
    p = fetch(url, { headers: { 'X-User-Id': getUserId() } }).then(async (r) => {
      if (!r.ok) throw new Error(`photo ${r.status}`)
      return URL.createObjectURL(await r.blob())
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}
