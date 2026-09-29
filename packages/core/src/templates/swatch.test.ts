import { describe, expect, it } from 'vitest'
import { formatHex, formatSwatchDate, layoutSwatch, SWATCH_GRADIENT_HEIGHT } from './swatch'

describe('layoutSwatch', () => {
  it('漸層佔 60%', () => {
    expect(SWATCH_GRADIENT_HEIGHT).toBe(1152)
    expect(layoutSwatch(3).gradientHeight).toBe(1152)
  })

  for (let n = 0; n <= 4; n++) {
    describe(`${n} 張`, () => {
      const l = layoutSwatch(n)
      it('張數正確，且都在畫布內（留 40px 邊）', () => {
        expect(l.photos).toHaveLength(n)
        for (const p of l.photos) {
          expect(p.x).toBeGreaterThanOrEqual(40)
          expect(p.x + p.size).toBeLessThanOrEqual(1080 - 40)
          expect(p.captionY + 90).toBeLessThanOrEqual(l.footerY)
        }
      })
      it('整組水平置中（不足 3 張時版面仍平衡）', () => {
        if (n === 0) return
        const left = l.photos[0].x
        const right = 1080 - (l.photos[n - 1].x + l.photos[n - 1].size)
        expect(Math.abs(left - right)).toBeLessThanOrEqual(1)
      })
      it('照片彼此不重疊，也不碰到資訊條', () => {
        for (let i = 1; i < n; i++) expect(l.photos[i].x).toBeGreaterThanOrEqual(l.photos[i - 1].x + l.photos[i - 1].size + 10)
        for (const p of l.photos) expect(p.y).toBeGreaterThan(l.strip.y + l.strip.h + 30)
      })
    })
  }

  it('不足 3 張時格子大小與 3 張相同；4 張縮小；超過 4 張只排 4 張', () => {
    expect(layoutSwatch(1).photos[0].size).toBe(layoutSwatch(3).photos[0].size)
    expect(layoutSwatch(4).photos[0].size).toBeLessThan(layoutSwatch(3).photos[0].size)
    expect(layoutSwatch(9).photos).toHaveLength(4)
    expect(layoutSwatch(-1).photos).toHaveLength(0)
  })

  it('色票資訊條跨在漸層與下半部交界，色塊在條內', () => {
    const l = layoutSwatch(3)
    expect(l.strip.y).toBeLessThan(l.gradientHeight)
    expect(l.strip.y + l.strip.h).toBeGreaterThan(l.gradientHeight)
    expect(l.chip.x).toBeGreaterThanOrEqual(l.strip.x)
    expect(l.chip.y + l.chip.size).toBeLessThanOrEqual(l.strip.y + l.strip.h)
  })

  it('文字格式', () => {
    expect(formatHex('#e8603c')).toBe('#E8603C')
    expect(formatSwatchDate('2025-05-01')).toBe('2025.05.01')
  })
})
