import { describe, expect, it } from 'vitest'
import { addDays, yearAgo } from '@hueday/core'
import { planSeed } from './seedPlan'

describe('planSeed', () => {
  const today = '2026-09-29'
  const plan = planSeed(today, 400)

  it('涵蓋過去 400 天、約 75% 有記錄，日期遞增不重複', () => {
    expect(plan.length).toBeGreaterThan(400 * 0.6)
    expect(plan.length).toBeLessThan(400 * 0.9)
    const dates = plan.map((e) => e.date)
    expect(new Set(dates).size).toBe(dates.length)
    expect([...dates].sort()).toEqual(dates)
    expect(dates[0] >= addDays(today, -399)).toBe(true)
    expect(dates.at(-1)! <= today).toBe(true)
  })

  it('一定有「去年今天」的記錄，且有照片', () => {
    const e = plan.find((x) => x.date === yearAgo(today))
    expect(e).toBeTruthy()
    expect(e!.photos.length).toBeGreaterThan(0)
  })

  it('每張照片有合法主色與 4–10 字內的 AI 色名；集色日不做判斷', () => {
    for (const e of plan) {
      for (const p of e.photos) {
        expect(p.colors.length).toBeGreaterThanOrEqual(1)
        for (const c of p.colors) expect(c).toMatch(/^#[0-9A-F]{6}$/i)
        expect(Array.from(p.aiName).length).toBeLessThanOrEqual(10)
        expect(p.aiName.length).toBeGreaterThan(0)
        if (e.mode === 'collect') expect(p.matches).toBeNull()
      }
    }
  })

  it('同樣輸入得到同樣結果，不同 seed 不同', () => {
    expect(planSeed(today, 400)).toEqual(plan)
    expect(planSeed(today, 400, 7)).not.toEqual(plan)
  })
})
