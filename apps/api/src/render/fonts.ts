export type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 500 | 700; style: 'normal' }

const CSS_BASE = 'https://fonts.googleapis.com/css2'

export function uniqueChars(text: string): string {
  return Array.from(new Set(Array.from(text + ' '))).sort().join('')
}

function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(36)
}

export function fontCssUrl(family: string, weight: number, text: string): string {
  return `${CSS_BASE}?family=${family.replace(/ /g, '+')}:wght@${weight}&text=${encodeURIComponent(text)}`
}

/**
 * 只下載 text 用到的字（Google Fonts CSS2 API 的 text= 參數），不打包完整字型。
 * 不帶 User-Agent 時 Google 回傳 TTF（satori 不吃 woff2）。結果快取在 KV。
 */
export async function loadGoogleFont(
  family: string,
  weight: 400 | 500 | 700,
  text: string,
  kv?: KVNamespace,
  fetchImpl: typeof fetch = fetch
): Promise<LoadedFont> {
  const chars = uniqueChars(text)
  const key = `font:${family}:${weight}:${hash(chars)}`
  const cached = kv ? await kv.get(key, 'arrayBuffer').catch(() => null) : null
  if (cached) return { name: family, data: cached, weight, style: 'normal' }

  const css = await (await fetchImpl(fontCssUrl(family, weight, chars))).text()
  const m = /src:\s*url\(([^)]+)\)/.exec(css)
  if (!m) throw new Error(`font css has no src for ${family}`)
  const res = await fetchImpl(m[1].replace(/["']/g, ''))
  if (!res.ok) throw new Error(`font download failed ${res.status}`)
  const data = await res.arrayBuffer()
  if (kv) await kv.put(key, data, { expirationTtl: 60 * 60 * 24 * 30 }).catch(() => {})
  return { name: family, data, weight, style: 'normal' }
}
