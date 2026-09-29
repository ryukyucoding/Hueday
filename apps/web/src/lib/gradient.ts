import { buildGradient, gradientToSvg, type GradientStyle } from '@hueday/core'

export { pickDistinctColors as pickDistinct } from '@hueday/core'

export function gradientDataUri(colors: string[], opts: { style: GradientStyle; seed: string; grain?: number }): string {
  const svg = gradientToSvg(buildGradient(colors, { style: opts.style, seed: opts.seed, grain: opts.grain ?? 60 }), 540, 960)
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
