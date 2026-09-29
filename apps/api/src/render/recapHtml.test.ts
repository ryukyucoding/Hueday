import { describe, expect, it } from 'vitest'
import { computeStats } from '@hueday/core'
import { recapHtml, recapTexts } from './recapHtml'

const stats = computeStats([{ date: '2025-09-01', photos: [{ dominantColors: ['#FF0000'] }] }, { date: '2025-09-02', photos: [{ dominantColors: ['#0000FF'] }] }], '2025-09', '2025-09-02')
const base = { stats, text: '這個月你收集了很多顏色。', bgDataUri: 'data:image/svg+xml;base64,AAAA' }

describe('recapHtml', () => {
  it('回顧文字 + 三個關鍵數字（連續天數/收集色數/記錄天數）+ 月份標題', () => {
    const t = recapTexts(base)
    expect(t.big).toBe('SEP')
    expect(t.sub).toBe('2025 RECAP')
    expect(t.numbers.map((n) => n.label)).toEqual(['連續天數', '收集色數', '記錄天數'])
    const html = recapHtml(base)
    expect(html).toContain('這個月你收集了很多顏色。')
    expect(html).toContain('SEP')
  })

  it('每個 div 都有 display:flex、每個 img 都有 width/height；文字會 escape', () => {
    const html = recapHtml({ ...base, text: '<b>&' })
    for (const d of html.match(/<div style="[^"]*"/g) ?? []) expect(d).toContain('display:flex')
    const imgs = html.match(/<img [^>]*>/g) ?? []
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toMatch(/ width="\d+" height="\d+"/)
    expect(html).not.toContain('<b>')
  })
})
