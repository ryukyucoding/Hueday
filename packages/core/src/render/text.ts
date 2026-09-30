/** 去重、排序、補空白：字型子集（Google Fonts text= 參數）與 KV 快取 key 的共同基礎，前後端必須一致 */
export function uniqueChars(text: string): string {
  return Array.from(new Set(Array.from(text + ' '))).sort().join('')
}
