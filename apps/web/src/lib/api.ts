const KEY = 'hueday:user-id'
let memoryId: string | null = null

export function getUserId(): string {
  try {
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
