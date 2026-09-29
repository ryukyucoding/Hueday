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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('X-User-Id', getUserId())
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<T>
}
