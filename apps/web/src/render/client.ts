import { ApiError } from '../lib/errors'
import type { RenderRequest, RenderResponse } from './render.worker'

type Font = RenderRequest['fonts'][number]

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (b: Blob) => void; reject: (e: unknown) => void }>()

function getWorker(): Worker {
  if (worker) return worker
  const w = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' })
  w.onmessage = (e: MessageEvent<RenderResponse>) => {
    const p = pending.get(e.data.id)
    if (!p) return
    pending.delete(e.data.id)
    if ('png' in e.data) p.resolve(new Blob([e.data.png], { type: 'image/png' }))
    else p.reject(new ApiError(500, 'render_failed', e.data.error))
  }
  w.onerror = () => {
    for (const p of pending.values()) p.reject(new ApiError(500, 'render_failed', 'worker crashed'))
    pending.clear()
    worker?.terminate()
    worker = null
  }
  worker = w
  return w
}

const abortError = () => new DOMException('aborted', 'AbortError')

/**
 * 交給 Worker 產 PNG。Worker 一次只能做一件事、中途也無法取消，
 * 所以被取消（例如使用者還在拖動顆粒滑桿）時直接終止這個 Worker，下一次再建立新的，
 * 避免舊的運算把新的請求排在後面。
 */
export function renderPng(html: string, fonts: Font[], size = { width: 1080, height: 1920 }, signal?: AbortSignal): Promise<Blob> {
  if (signal?.aborted) return Promise.reject(abortError())
  const id = ++seq
  return new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    signal?.addEventListener(
      'abort',
      () => {
        if (!pending.has(id)) return
        pending.delete(id)
        for (const p of pending.values()) p.reject(abortError()) // 被一起終止的其他工作
        pending.clear()
        worker?.terminate()
        worker = null
        reject(abortError())
      },
      { once: true }
    )
    // 字型 ArrayBuffer 複製一份再傳（記憶體快取裡的原本要留著下次用）
    const req: RenderRequest = { id, html, fonts: fonts.map((f) => ({ ...f, data: f.data.slice(0) })), ...size }
    getWorker().postMessage(req)
  })
}
