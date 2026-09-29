import { reactive } from 'vue'

export type ToastAction = { label: string; run: () => void }
export type ToastOptions = { ms?: number; action?: ToastAction; kind?: 'info' | 'error' }

export const toast = reactive<{ message: string; id: number; kind: 'info' | 'error'; action?: ToastAction }>({ message: '', id: 0, kind: 'info' })
let timer: ReturnType<typeof setTimeout> | undefined

export function hideToast(): void {
  clearTimeout(timer)
  toast.message = ''
  toast.action = undefined
}

/**
 * 輕量提示：只顯示文字，不帶任何數字或社交指標。
 * 帶 action（例如「重試」）時停留較久，讓使用者有時間按。第二個參數也可直接給毫秒數。
 */
export function showToast(message: string, opts: number | ToastOptions = {}): void {
  const o = typeof opts === 'number' ? { ms: opts } : opts
  toast.message = message
  toast.kind = o.kind ?? 'info'
  toast.action = o.action
  toast.id++
  clearTimeout(timer)
  timer = setTimeout(hideToast, o.ms ?? (o.action ? 8000 : 2200))
}

/** 錯誤提示（可附重試） */
export function showError(message: string, retry?: () => void): void {
  showToast(message, { kind: 'error', action: retry ? { label: '重試', run: retry } : undefined })
}
