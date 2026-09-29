import { describe, expect, it } from 'vitest'
import { renderUrl } from './render'
import { TEMPLATES, defaultStyle, monthOf, templateFilename, templateParams } from './templates'

const ctx = { date: '2025-05-01', asOf: '2025-05-01', style: 'flow', grain: 35 } as const

describe('templates', () => {
  it('有四種模板', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['collage', 'stats', 'swatch', 'compare'])
  })

  it('collage / swatch 帶 date，stats 帶 month 與 asOf；都帶 style 與 grain', () => {
    expect(renderUrl(templateParams('collage', ctx))).toBe('/api/render?template=collage&date=2025-05-01&style=flow&grain=35')
    expect(renderUrl(templateParams('swatch', ctx))).toBe('/api/render?template=swatch&date=2025-05-01&style=flow&grain=35')
    expect(renderUrl(templateParams('compare', ctx))).toBe('/api/render?template=compare&date=2025-05-01&style=flow&grain=35')
    expect(renderUrl(templateParams('stats', ctx))).toBe('/api/render?template=stats&month=2025-05&asOf=2025-05-01&style=flow&grain=35')
  })

  it('調整風格或顆粒會改變 URL', () => {
    const a = renderUrl(templateParams('collage', ctx))
    expect(renderUrl(templateParams('collage', { ...ctx, style: 'mesh' }))).not.toBe(a)
    expect(renderUrl(templateParams('collage', { ...ctx, grain: 80 }))).not.toBe(a)
    expect(renderUrl(templateParams('collage', { ...ctx, grain: 0 }))).toContain('grain=0')
  })

  it('檔名', () => {
    expect(templateFilename('collage', '2025-05-01')).toBe('hueday-2025-05-01.png')
    expect(templateFilename('swatch', '2025-05-01')).toBe('hueday-2025-05-01-swatch.png')
    expect(templateFilename('compare', '2025-05-01')).toBe('hueday-2025-05-01-compare.png')
    expect(templateFilename('stats', '2025-05-01')).toBe('hueday-2025-05-stats.png')
    expect(monthOf('2025-05-01')).toBe('2025-05')
  })

  it('預設風格依模式', () => {
    expect(defaultStyle('single')).toBe('mesh')
    expect(defaultStyle('collect')).toBe('flow')
    expect(defaultStyle(undefined)).toBe('mesh')
  })
})
