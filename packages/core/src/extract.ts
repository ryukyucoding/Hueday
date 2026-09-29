import { rgbToHex } from './color'
import { oklabToHex, rgbToOklab, type Lab } from './oklab'
import { mulberry32 } from './rng'

type Point = { lab: Lab; count: number; rgb: number }

function sq(a: Lab, b: Lab) {
  const d0 = a[0] - b[0], d1 = a[1] - b[1], d2 = a[2] - b[2]
  return d0 * d0 + d1 * d1 + d2 * d2
}

/**
 * k-means（OKLab 空間，固定種子，最多 20 次迭代），忽略 alpha < 128 的像素。
 * 依群集大小排序回傳 hex；不同顏色少於 k 時直接回傳這些顏色。
 */
export function extractDominantColors(pixels: Uint8ClampedArray | Uint8Array, k = 5): string[] {
  const hist = new Map<number, number>()
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]
    hist.set(key, (hist.get(key) ?? 0) + 1)
  }
  if (hist.size === 0) return []

  const points: Point[] = [...hist.entries()]
    .sort((a, b) => a[0] - b[0]) // 讓結果與 Map 插入順序無關
    .map(([rgb, count]) => ({ rgb, count, lab: rgbToOklab((rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255) }))

  if (points.length <= k) {
    return points
      .sort((a, b) => b.count - a.count || a.rgb - b.rgb)
      .map((p) => rgbToHex((p.rgb >> 16) & 255, (p.rgb >> 8) & 255, p.rgb & 255))
  }

  // k-means++ 初始化
  const rand = mulberry32(0x68756564)
  const total = points.reduce((s, p) => s + p.count, 0)
  const centers: Lab[] = []
  let r = rand() * total
  for (const p of points) {
    r -= p.count
    if (r <= 0) { centers.push([...p.lab]); break }
  }
  if (centers.length === 0) centers.push([...points[0].lab])
  while (centers.length < k) {
    const d = points.map((p) => p.count * Math.min(...centers.map((c) => sq(p.lab, c))))
    const sum = d.reduce((s, v) => s + v, 0)
    if (sum === 0) break
    let t = rand() * sum
    let idx = d.length - 1
    for (let i = 0; i < d.length; i++) { t -= d[i]; if (t <= 0) { idx = i; break } }
    centers.push([...points[idx].lab])
  }

  const assign = new Array<number>(points.length).fill(-1)
  const sizes = new Array<number>(centers.length).fill(0)
  for (let iter = 0; iter < 20; iter++) {
    let changed = false
    for (let i = 0; i < points.length; i++) {
      let best = 0, bd = Infinity
      for (let c = 0; c < centers.length; c++) {
        const d = sq(points[i].lab, centers[c])
        if (d < bd) { bd = d; best = c }
      }
      if (assign[i] !== best) { assign[i] = best; changed = true }
    }
    const sums = centers.map(() => [0, 0, 0, 0])
    for (let i = 0; i < points.length; i++) {
      const s = sums[assign[i]], p = points[i]
      s[0] += p.lab[0] * p.count; s[1] += p.lab[1] * p.count; s[2] += p.lab[2] * p.count; s[3] += p.count
    }
    sizes.fill(0)
    for (let c = 0; c < centers.length; c++) {
      const s = sums[c]
      sizes[c] = s[3]
      if (s[3] > 0) centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]
    }
    if (!changed) break
  }

  return centers
    .map((c, i) => ({ c, n: sizes[i] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => oklabToHex(x.c))
}
