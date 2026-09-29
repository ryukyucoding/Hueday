import { ApiError, toApiError } from './errors'
import { applySimulationHeader, simulation } from './simulate'

const KEY = 'hueday:user-id'
let memoryId: string | null = null

export function getUserId(): string {
  try {
    // 開發用：網址帶 ?uid=xxx 就切換成該使用者（例如 npm run seed 的 seed-user），只在 dev 模式生效
    if (import.meta.env.DEV) {
      const forced = new URLSearchParams(location.search).get('uid')
      if (forced) localStorage.setItem(KEY, forced)
    }
    const saved = localStorage.getItem(KEY)
    if (saved) return saved
    const id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
    return id
  } catch {
    return (memoryId ??= crypto.randomUUID())
  }
}

/** fetch 的共同包裝：帶 X-User-Id、（dev）模擬 header；網路錯誤與 !ok 都轉成 ApiError */
async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('X-User-Id', getUserId())
  applySimulationHeader(headers)
  let res: Response
  try {
    if (simulation.value === 'offline') throw new TypeError('simulated offline')
    res = await fetch(path, { ...init, headers })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'network', '目前沒有網路')
  }
  if (!res.ok) throw await toApiError(res)
  return res
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await request(path, init)).json() as Promise<T>
}

export async function apiBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  return (await request(path, init)).blob()
}
