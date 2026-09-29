import { describe, expect, it } from 'vitest'
import { collageFooterText, countCollectedColors, formatStoryDate, layoutCollage, slotCorners, STORY_HEIGHT, STORY_WIDTH } from './collage'

type Pt = [number, number]

/** 分離軸定理：兩個凸多邊形是否相交 */
function intersects(a: Pt[], b: Pt[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i]
      const [x2, y2] = poly[(i + 1) % poly.length]
      const nx = y2 - y1, ny = x1 - x2
      const proj = (p: Pt[]) => p.map(([x, y]) => x * nx + y * ny)
      const pa = proj(a), pb = proj(b)
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false
    }
  }
  return true
}

describe('layoutCollage', () => {
  for (let n = 1; n <= 6; n++) {
    describe(`${n} 張`, () => {
      const layout = layoutCollage(n)
      it('張數正確、畫布為 1080×1920', () => {
        expect(layout.photos).toHaveLength(n)
        expect([layout.width, layout.height]).toEqual([STORY_WIDTH, STORY_HEIGHT])
      })
      it('旋轉後不出界（留 40px 安全邊）且避開標題與頁尾', () => {
        for (const s of layout.photos) {
          for (const [x, y] of slotCorners(s)) {
            expect(x).toBeGreaterThanOrEqual(40)
            expect(x).toBeLessThanOrEqual(STORY_WIDTH - 40)
            expect(y).toBeGreaterThanOrEqual(layout.header.nameY + 40)
            expect(y).toBeLessThanOrEqual(layout.footer.y - 100)
          }
        }
      })
      it('任兩張卡片不重疊', () => {
        const polys = layout.photos.map(slotCorners)
        for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) expect(intersects(polys[i], polys[j])).toBe(false)
      })
      it('相片區在卡片內、呈正方形，旋轉輕微', () => {
        for (const s of layout.photos) {
          expect(s.photo.x + s.photo.w).toBeLessThanOrEqual(s.w)
          expect(s.photo.y + s.photo.h).toBeLessThan(s.h)
          expect(s.photo.w).toBe(s.photo.h)
          expect(Math.abs(s.rotate)).toBeLessThanOrEqual(4)
        }
      })
    })
  }
  it('0 張回傳空、超過 6 張只排 6 張、同輸入結果相同', () => {
    expect(layoutCollage(0).photos).toHaveLength(0)
    expect(layoutCollage(9).photos).toHaveLength(6)
    expect(layoutCollage(3)).toEqual(layoutCollage(3))
  })
})

describe('story text helpers', () => {
  it('formatStoryDate', () => {
    expect(formatStoryDate('2025-05-01')).toEqual({ month: 'MAY', day: '01', year: '2025', weekday: 'THU' })
    expect(formatStoryDate('2024-12-31').month).toBe('DEC')
  })
  it('countCollectedColors 以色相群組計', () => {
    expect(countCollectedColors([['#FF0000', '#E5484D'], ['#3B6FB6']])).toBe(2)
    expect(countCollectedColors([])).toBe(0)
  })
  it('頁尾文字', () => {
    expect(collageFooterText(5)).toBe('collected 5 colors · Hueday')
    expect(collageFooterText(1)).toBe('collected 1 color · Hueday')
  })
})
