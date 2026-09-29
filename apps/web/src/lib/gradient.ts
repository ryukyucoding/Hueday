import { buildGradient, colorDistance, gradientToSvg, type GradientStyle } from '@hueday/core'

/** 依出現順序取最多 max 個彼此夠不同的顏色 */
export function pickDistinct(colors: string[], max = 5, minDistance = 8): string[] {
  const out: string[] = []
  for (const c of colors) {
    if (out.every((o) => colorDistance(o, c) >= minDistance)) out.push(c)
    if (out.length >= max) break
  }
  return out
}

export function gradientDataUri(colors: string[], opts: { style: GradientStyle; seed: string; grain?: number }): string {
  const svg = gradientToSvg(buildGradient(colors, { style: opts.style, seed: opts.seed, grain: opts.grain ?? 60 }), 540, 960)
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
