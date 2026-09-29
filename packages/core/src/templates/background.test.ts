import { describe, expect, it } from 'vitest'
import { pickDistinctColors, storyBackgroundSvg } from './background'

describe('story background', () => {
  it('pickDistinctColors 去掉太接近的顏色並限制數量', () => {
    expect(pickDistinctColors(['#FF0000', '#FF0101', '#0000FF'])).toEqual(['#FF0000', '#0000FF'])
    expect(pickDistinctColors(['#111111', '#FF0000', '#00FF00', '#0000FF'], 2)).toHaveLength(2)
  })
  it('沒有照片時用今日色，且同輸入輸出相同', () => {
    const o = { mode: 'single', date: '2025-05-01', targetHex: '#E8603C' } as const
    expect(storyBackgroundSvg([], o)).toBe(storyBackgroundSvg([], o))
    expect(storyBackgroundSvg([], o)).toContain('viewBox="0 0 1080 1920"')
  })
  it('style / grain 可覆寫', () => {
    const o = { mode: 'single', date: '2025-05-01', targetHex: '#E8603C' } as const
    expect(storyBackgroundSvg([], { ...o, grain: 0 })).not.toContain('feTurbulence')
    expect(storyBackgroundSvg([], { ...o, style: 'flow' })).not.toBe(storyBackgroundSvg([], o))
  })
})
