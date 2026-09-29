import { ref } from 'vue'

/**
 * 開發用：用網址 ?simulate=xxx 模擬各種錯誤，讓錯誤畫面可以被實際看到（只有 dev 模式生效，正式環境永遠是 null）。
 *   前端處理：offline（離線）、crash（頁面元件丟例外）
 *   送給 API（X-Simulate header，API 需 ALLOW_SIMULATE=1）：upload-fail、gemini-quota、gemini-timeout、
 *   gemini-error、render-fail、rate-limit、server-error
 * ?simulate=off 清除。也可在 console 呼叫 window.__simulate('upload-fail') / window.__simulate(null)。
 */
const KEY = 'hueday:simulate'
const enabled = import.meta.env.DEV

function read(): string | null {
  if (!enabled) return null
  try {
    const q = new URLSearchParams(location.search).get('simulate')
    if (q !== null) {
      if (q === '' || q === 'off') sessionStorage.removeItem(KEY)
      else sessionStorage.setItem(KEY, q)
    }
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const simulation = ref<string | null>(read())

export function setSimulation(v: string | null): void {
  if (!enabled) return
  simulation.value = v
  try {
    if (v) sessionStorage.setItem(KEY, v)
    else sessionStorage.removeItem(KEY)
  } catch {
    /* 忽略 */
  }
}

if (enabled && typeof window !== 'undefined') (window as unknown as { __simulate: typeof setSimulation }).__simulate = setSimulation

/** 這個模擬要交給 API 處理時，加上 header */
export function applySimulationHeader(headers: Headers): void {
  const s = simulation.value
  if (s && s !== 'offline' && s !== 'crash') headers.set('X-Simulate', s)
}
