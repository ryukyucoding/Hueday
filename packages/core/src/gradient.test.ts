import { describe, expect, it } from 'vitest'
import { buildGradient, colorVariants, expandColors, gradientToSvg } from './gradient'
import { colorDistance } from './oklab'

const opts = { style: 'mesh', seed: '2025-05-01', grain: 60 } as const

describe('expandColors', () => {
  it('1 色補到 4 色，且補的色與原色不同但同色系', () => {
    const out = expandColors(['#E8603C'])
    expect(out).toHaveLength(4)
    expect(out[0]).toBe('#E8603C')
    for (const c of out.slice(1)) {
      expect(c).not.toBe('#E8603C')
      expect(colorDistance(c, '#E8603C')).toBeLessThan(40)
    }
    expect(new Set(out).size).toBe(4)
  })
  it('2 色補到 4 色；3 色以上維持原數量', () => {
    expect(expandColors(['#E8603C', '#3B6FB6'])).toHaveLength(4)
    expect(expandColors(['#E8603C', '#3B6FB6', '#5E8C61'])).toHaveLength(3)
    expect(expandColors(['#111111', '#222222', '#333333', '#444444', '#555555'])).toHaveLength(5)
  })
  it('淺色比原色亮、深色比原色暗', () => {
    const v = colorVariants('#E8603C')
    expect(colorDistance(v.light, '#FFFFFF')).toBeLessThan(colorDistance('#E8603C', '#FFFFFF'))
    expect(colorDistance(v.dark, '#000000')).toBeLessThan(colorDistance('#E8603C', '#000000'))
  })
})

describe('buildGradient / gradientToSvg', () => {
  it('同樣輸入 + seed 輸出完全相同', () => {
    const a = gradientToSvg(buildGradient(['#E8603C', '#F6C453'], opts), 1080, 1920)
    const b = gradientToSvg(buildGradient(['#E8603C', '#F6C453'], opts), 1080, 1920)
    expect(a).toBe(b)
  })
  it('不同 seed 或不同風格會得到不同結果', () => {
    const a = gradientToSvg(buildGradient(['#E8603C'], opts), 400, 700)
    expect(gradientToSvg(buildGradient(['#E8603C'], { ...opts, seed: 'other' }), 400, 700)).not.toBe(a)
    expect(gradientToSvg(buildGradient(['#E8603C'], { ...opts, style: 'flow' }), 400, 700)).not.toBe(a)
  })
  for (const style of ['mesh', 'flow'] as const) {
    it(`${style}：色點都在畫布內、每色一個色點`, () => {
      const p = buildGradient(['#E8603C', '#3B6FB6', '#5E8C61', '#F6C453', '#7B5EA7'], { ...opts, style })
      expect(p.blobs).toHaveLength(5)
      for (const b of p.blobs) {
        expect(b.cx).toBeGreaterThanOrEqual(0)
        expect(b.cx).toBeLessThanOrEqual(1)
        expect(b.cy).toBeGreaterThanOrEqual(0)
        expect(b.cy).toBeLessThanOrEqual(1)
        expect(b.rx).toBeGreaterThan(0)
      }
    })
  }
  it('SVG 包含 radialGradient、feGaussianBlur 與 feTurbulence 顆粒', () => {
    const svg = gradientToSvg(buildGradient(['#E8603C'], opts), 1080, 1920)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('<radialGradient')
    expect(svg).toContain('<feGaussianBlur')
    expect(svg).toContain('<feTurbulence')
    expect(svg).toContain('viewBox="0 0 1080 1920"')
  })
  it('grain = 0 時不輸出顆粒層；grain 越大越不透明', () => {
    const none = gradientToSvg(buildGradient(['#E8603C'], { ...opts, grain: 0 }), 100, 100)
    expect(none).not.toContain('feTurbulence')
    const low = gradientToSvg(buildGradient(['#E8603C'], { ...opts, grain: 20 }), 100, 100)
    const high = gradientToSvg(buildGradient(['#E8603C'], { ...opts, grain: 100 }), 100, 100)
    const op = (s: string) => Number(/filter="url\(#grain\)" opacity="([\d.]+)"/.exec(s)![1])
    expect(op(high)).toBeGreaterThan(op(low))
  })
  it('沒有顏色時使用預設色而不是壞掉', () => {
    expect(buildGradient([], opts).blobs).toHaveLength(4)
  })
})
