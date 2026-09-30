import { uniqueChars } from '@hueday/core'
import { apiBlob } from '../lib/api'

export type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 500 | 700 }

const cache = new Map<string, Promise<LoadedFont>>()

/**
 * 只下載這張圖用到的字（Worker 的 /api/font 會向 Google Fonts 要 TTF 子集，快取在 KV，
 * 回應標 immutable，瀏覽器對同樣的字只會抓一次）。記憶體也留一份，拖動滑桿重產時不用再抓。
 */
export function loadFont(family: 'Noto Sans TC' | 'Fraunces', text: string, weight: 400 | 500 | 700 = 700): Promise<LoadedFont> {
  const chars = uniqueChars(text)
  const key = `${family}:${weight}:${chars}`
  let p = cache.get(key)
  if (!p) {
    const q = new URLSearchParams({ family, weight: String(weight), text: chars })
    p = apiBlob(`/api/font?${q}`).then(async (b) => ({ name: family, data: await b.arrayBuffer(), weight }))
    p.catch(() => cache.delete(key)) // 失敗不要留著，下次重試
    cache.set(key, p)
  }
  return p
}
