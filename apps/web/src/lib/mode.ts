export type Mode = 'single' | 'collect'

const key = (date: string) => `hueday:mode:${date}`

export function loadMode(date: string): Mode {
  try {
    return localStorage.getItem(key(date)) === 'collect' ? 'collect' : 'single'
  } catch {
    return 'single'
  }
}

export function saveMode(date: string, mode: Mode): void {
  try {
    localStorage.setItem(key(date), mode)
  } catch {
    /* 無痕模式等情況忽略 */
  }
}
