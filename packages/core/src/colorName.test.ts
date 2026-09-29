import { describe, expect, it } from 'vitest'
import { mockColorName, truncateColorName } from './colorName'

describe('truncateColorName', () => {
  it('超過 10 字截斷', () => {
    expect(truncateColorName('傍晚捷運站月台上等車時看見的那一抹橘')).toBe('傍晚捷運站月台上等車')
    expect(Array.from(truncateColorName('一二三四五六七八九十十一')).length).toBe(10)
  })
  it('10 字以內不動、去引號空白', () => {
    expect(truncateColorName('傍晚捷運站的橘')).toBe('傍晚捷運站的橘')
    expect(truncateColorName(' 「傍晚的橘」 ')).toBe('傍晚的橘')
  })
  it('以字而不是 code unit 計算（含罕用字）', () => {
    expect(Array.from(truncateColorName('𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷')).length).toBe(10)
  })
})

describe('mockColorName', () => {
  it('有 subject 用 subject，沒有時可重現且不超過 10 字', () => {
    expect(mockColorName('柿子橘', '招牌')).toBe('柿子橘的招牌')
    expect(mockColorName('柿子橘', null, 'a')).toBe(mockColorName('柿子橘', null, 'a'))
    expect(Array.from(mockColorName('向日葵黃', '一整面很長很長的牆壁')).length).toBeLessThanOrEqual(10)
  })
})
