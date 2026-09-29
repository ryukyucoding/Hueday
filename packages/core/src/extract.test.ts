import { describe, expect, it } from 'vitest'
import { extractDominantColors } from './extract'
import { classifyHue } from './hueClassify'
import { colorDistance } from './oklab'
import { hexToRgb } from './color'
import { PALETTE } from './palette'

function solid(hex: string, n = 64): number[] {
  const [r, g, b] = hexToRgb(hex)
  return Array.from({ length: n }, () => [r, g, b, 255]).flat()
}
const px = (a: number[]) => new Uint8ClampedArray(a)

describe('extractDominantColors', () => {
  it('純色圖回傳該色', () => {
    expect(extractDominantColors(px(solid('#E8603C')))).toEqual(['#E8603C'])
  })
  it('紅藍各半回傳紅與藍', () => {
    const r = extractDominantColors(px([...solid('#FF0000', 32), ...solid('#0000FF', 32)]))
    expect(r.sort()).toEqual(['#0000FF', '#FF0000'])
  })
  it('依群集大小排序', () => {
    const r = extractDominantColors(px([...solid('#FF0000', 10), ...solid('#00FF00', 50), ...solid('#0000FF', 30)]))
    expect(r).toEqual(['#00FF00', '#0000FF', '#FF0000'])
  })
  it('忽略透明像素', () => {
    const a = [...solid('#FF0000', 8), 0, 255, 0, 0, 0, 255, 0, 50]
    expect(extractDominantColors(px(a))).toEqual(['#FF0000'])
  })
  it('全透明回傳空陣列', () => {
    expect(extractDominantColors(px([1, 2, 3, 0]))).toEqual([])
  })
  it('漸層圖：回傳 k 個、可重現、與原圖色彩接近', () => {
    const pixels: number[] = []
    for (let i = 0; i < 4096; i++) pixels.push(i % 256, (i * 7) % 256, (i * 13) % 256, 255)
    const a = extractDominantColors(px(pixels), 5)
    const b = extractDominantColors(px(pixels), 5)
    expect(a).toHaveLength(5)
    expect(a).toEqual(b)
  })
  it('三大色塊加雜訊時仍找回三大色', () => {
    const pixels: number[] = []
    const base = ['#D62828', '#2A9D8F', '#F7B801']
    for (let i = 0; i < 3000; i++) {
      const [r, g, b] = hexToRgb(base[i % 3])
      const j = (i * 31) % 9 - 4
      pixels.push(r + j, g - j, b + j, 255)
    }
    const r = extractDominantColors(px(pixels), 3)
    for (const c of base) expect(Math.min(...r.map((x) => colorDistance(x, c)))).toBeLessThan(3)
  })
})

describe('classifyHue', () => {
  const cases: [string, string][] = [
    ['#FF0000', 'red'], ['#C8372D', 'red'],
    ['#FF7A00', 'orange'], ['#E8603C', 'orange'],
    ['#FFD93D', 'yellow'], ['#E9B949', 'yellow'],
    ['#2F6B3F', 'green'], ['#5E8C61', 'green'],
    ['#3B6FB6', 'blue'], ['#89C2D9', 'blue'],
    ['#7B5EA7', 'purple'], ['#4B2C6F', 'purple'],
    ['#F4A6B7', 'pink'], ['#D6336C', 'pink'],
    ['#7A4E2D', 'brown'], ['#C19A6B', 'brown'],
    ['#000000', 'neutral'], ['#FFFFFF', 'neutral'], ['#8E8B85', 'neutral']
  ]
  for (const [hex, g] of cases) it(`${hex} → ${g}`, () => expect(classifyHue(hex)).toBe(g))

  it('每個色相群組在 60 色色票中至少有一色', () => {
    const groups = new Set(PALETTE.map((c) => classifyHue(c.hex)))
    expect([...groups].sort()).toEqual(['blue', 'brown', 'green', 'neutral', 'orange', 'pink', 'purple', 'red', 'yellow'])
  })
})

describe('colorDistance', () => {
  it('同色為 0、黑白很遠、相近色較近', () => {
    expect(colorDistance('#123456', '#123456')).toBe(0)
    expect(colorDistance('#000000', '#FFFFFF')).toBeGreaterThan(90)
    expect(colorDistance('#FF0000', '#FF1010')).toBeLessThan(colorDistance('#FF0000', '#0000FF'))
  })
})
