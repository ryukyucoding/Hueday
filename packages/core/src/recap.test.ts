import { describe, expect, it } from 'vitest'
import { fitRecap, isValidRecap, mockRecapText, RECAP_MAX, RECAP_MIN, type RecapFacts } from './recap'

const len = (s: string) => Array.from(s).length
const base: RecapFacts = {
  monthNumber: 9,
  daysRecorded: 18,
  photoCount: 31,
  streak: 6,
  collectedColors: 24,
  topHues: ['綠', '橘', '藍'],
  mainColorName: '抹茶綠',
  sampleNames: ['傍晚捷運站的橘']
}

describe('mockRecapText', () => {
  it('一般情況落在 80–120 字', () => {
    const t = mockRecapText(base)
    expect(isValidRecap(t)).toBe(true)
    expect(t).toContain('9 月')
    expect(t).toContain('抹茶綠')
  })

  it('各種組合（缺欄位、長色名、大數字）都落在 80–120 字', () => {
    const variants: Partial<RecapFacts>[] = [
      {}, { streak: 0 }, { streak: 1 }, { topHues: [] }, { topHues: ['黑白灰'] }, { mainColorName: null }, { sampleNames: [] },
      { sampleNames: ['一二三四五六七八九十'], mainColorName: '向日葵黃' },
      { daysRecorded: 31, photoCount: 120, collectedColors: 58, streak: 31 },
      { daysRecorded: 1, photoCount: 1, collectedColors: 1, streak: 1, topHues: [], mainColorName: null, sampleNames: [] },
      { topHues: [], mainColorName: null, sampleNames: [], streak: 0 }
    ]
    for (let m = 1; m <= 12; m++) {
      for (const v of variants) {
        const t = mockRecapText({ ...base, monthNumber: m, ...v })
        expect(len(t), JSON.stringify({ m, v, t })).toBeGreaterThanOrEqual(RECAP_MIN)
        expect(len(t), JSON.stringify({ m, v, t })).toBeLessThanOrEqual(RECAP_MAX)
      }
    }
  })

  it('沒有記錄的月份也回一段 80–120 字的溫和文字', () => {
    const t = mockRecapText({ ...base, daysRecorded: 0, photoCount: 0 })
    expect(isValidRecap(t)).toBe(true)
    expect(t).toContain('還沒有留下')
  })

  it('同樣的輸入結果相同', () => {
    expect(mockRecapText(base)).toBe(mockRecapText({ ...base }))
  })
})

describe('fitRecap', () => {
  it('不超過上限的原樣返回（只整理空白）', () => {
    expect(fitRecap('  你好，\n世界。 ')).toBe('你好， 世界。')
  })

  it('太長時在句尾截斷、不超過 120 字', () => {
    const sentence = '這個月你收集了很多顏色，每一天都很特別。'
    const long = sentence.repeat(10)
    const out = fitRecap(long)
    expect(len(out)).toBeLessThanOrEqual(RECAP_MAX)
    expect(len(out)).toBeGreaterThanOrEqual(RECAP_MIN)
    expect(out.endsWith('。')).toBe(true)
  })

  it('沒有標點的超長文字硬切並補句號', () => {
    const out = fitRecap('字'.repeat(300))
    expect(len(out)).toBe(RECAP_MAX)
    expect(out.endsWith('。')).toBe(true)
  })
})
