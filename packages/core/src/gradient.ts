import { hashString } from './palette'
import { hexToOklab, oklabToHex, type Lab } from './oklab'
import { mulberry32 } from './rng'

export type GradientStyle = 'mesh' | 'flow'

export type GradientOptions = { style: GradientStyle; seed: string; grain: number }

/** 位置與半徑皆為畫布寬高的比例（0–1），輸出前四捨五入到 3 位以確保可重現 */
export type GradientBlob = { cx: number; cy: number; rx: number; ry: number; color: string }

export type GradientParams = {
  style: GradientStyle
  seed: string
  /** 0–100 */
  grain: number
  /** 底色（第一個顏色的淺化版） */
  background: string
  colors: string[]
  blobs: GradientBlob[]
}

const round = (n: number) => Math.round(n * 1000) / 1000
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

function shift(lab: Lab, dL: number, dA: number, dB: number): string {
  return oklabToHex([clamp(lab[0] + dL, 0.05, 0.98), lab[1] + dA, lab[2] + dB])
}

/** 同色系的淺、深、偏暖、偏冷變化（OKLab：+b/+a 偏暖，-b/-a 偏冷） */
export function colorVariants(hex: string): { light: string; dark: string; warm: string; cool: string } {
  const lab = hexToOklab(hex)
  return {
    light: shift(lab, 0.14, -lab[1] * 0.25, -lab[2] * 0.25),
    dark: shift(lab, -0.16, lab[1] * 0.1, lab[2] * 0.1),
    warm: shift(lab, 0.03, 0.04, 0.05),
    cool: shift(lab, -0.02, -0.04, -0.05)
  }
}

/** 只有 1–2 色時，用同色系變化補到 4 色；3 色以上維持原樣 */
export function expandColors(colors: string[]): string[] {
  const base = colors.map((c) => c.toUpperCase())
  if (base.length === 0) return ['#E8603C', '#F6C453', '#D9D5CC', '#7BA7D9']
  if (base.length >= 3) return base
  const out = [...base]
  const order = ['light', 'dark', 'warm', 'cool'] as const
  let i = 0
  while (out.length < 4) {
    const src = base[i % base.length]
    out.push(colorVariants(src)[order[Math.floor(i / base.length) % order.length]].toUpperCase())
    i++
  }
  return out
}

export function buildGradient(colors: string[], opts: GradientOptions): GradientParams {
  const palette = expandColors(colors)
  const rand = mulberry32(hashString(`${opts.style}:${opts.seed}:${palette.join('')}`))
  const n = palette.length
  const blobs: GradientBlob[] = []

  if (opts.style === 'mesh') {
    // 打散顏色順序，再分配到 2 欄 × N 列的抖動格點上
    const order = palette.map((c, i) => ({ c, k: rand() + i * 0 })).sort((a, b) => a.k - b.k)
    const rows = Math.ceil(n / 2)
    order.forEach(({ c }, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cx = (col + 0.5) / 2 + (rand() - 0.5) * 0.35
      const cy = (row + 0.5) / rows + (rand() - 0.5) * (0.5 / rows)
      const r = 0.42 + rand() * 0.26
      blobs.push({ cx: round(clamp(cx, 0.05, 0.95)), cy: round(clamp(cy, 0.05, 0.95)), rx: round(r), ry: round(r * 0.85), color: c })
    })
  } else {
    // flow：沿一條 S 形對角流線排列細長色帶
    const phase = rand() * Math.PI * 2
    const amp = 0.14 + rand() * 0.1
    palette.forEach((c, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1)
      const cy = 0.08 + t * 0.84
      const cx = 0.5 + Math.sin(t * Math.PI * 1.6 + phase) * amp * 2.2
      blobs.push({
        cx: round(clamp(cx, 0.05, 0.95)),
        cy: round(cy),
        rx: round(0.55 + rand() * 0.2),
        ry: round(0.22 + rand() * 0.1),
        color: c
      })
    })
  }

  return {
    style: opts.style,
    seed: opts.seed,
    grain: clamp(Math.round(opts.grain), 0, 100),
    background: colorVariants(palette[0]).light.toUpperCase(),
    colors: palette,
    blobs
  }
}

/**
 * 產生單一 SVG：多個 radial gradient 橢圓 + feGaussianBlur 柔化 + feTurbulence 顆粒。
 * 這份 SVG 是唯一真相：前端直接顯示，Worker 產圖時也嵌入同一份。
 */
export function gradientToSvg(params: GradientParams, width: number, height: number): string {
  const min = Math.min(width, height)
  const blur = round(min * 0.06)
  const seedNum = hashString(params.seed) % 1000
  const defs: string[] = []
  const shapes: string[] = []
  params.blobs.forEach((b, i) => {
    defs.push(
      `<radialGradient id="g${i}"><stop offset="0" stop-color="${b.color}" stop-opacity="0.95"/><stop offset="1" stop-color="${b.color}" stop-opacity="0"/></radialGradient>`
    )
    shapes.push(
      `<ellipse cx="${round(b.cx * width)}" cy="${round(b.cy * height)}" rx="${round(b.rx * width)}" ry="${round(b.ry * height)}" fill="url(#g${i})"/>`
    )
  })
  defs.push(
    `<filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${blur}"/></filter>`
  )
  const grainOn = params.grain > 0
  if (grainOn) {
    defs.push(
      `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seedNum}" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"/></filter>`
    )
  }
  const grainRect = grainOn
    ? `<rect width="${width}" height="${height}" filter="url(#grain)" opacity="${round((params.grain / 100) * 0.45)}" style="mix-blend-mode:overlay"/>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>${defs.join('')}</defs>` +
    `<rect width="${width}" height="${height}" fill="${params.background}"/>` +
    `<g filter="url(#blur)">${shapes.join('')}</g>` +
    grainRect +
    `</svg>`
  )
}
