const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** ASCII 字串 → base64（純函式，不依賴 btoa，這樣 core 在任何環境都能用）。含非 ASCII 字元會丟錯。 */
export function base64Ascii(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i += 3) {
    const codes = [s.charCodeAt(i), s.charCodeAt(i + 1), s.charCodeAt(i + 2)]
    if (codes.some((c) => c > 127)) throw new Error('base64Ascii: 只接受 ASCII')
    const [a, b, c] = codes
    const n = (a << 16) | ((b || 0) << 8) | (c || 0)
    out += CHARS[(n >> 18) & 63] + CHARS[(n >> 12) & 63]
    out += i + 1 < s.length ? CHARS[(n >> 6) & 63] : '='
    out += i + 2 < s.length ? CHARS[n & 63] : '='
  }
  return out
}
