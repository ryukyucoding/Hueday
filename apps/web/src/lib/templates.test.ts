import { describe, expect, it } from 'vitest'
import { renderKey } from './render'
import { TEMPLATES, defaultStyle, monthOf, templateFilename, templateParams } from './templates'

const ctx = { date: '2025-05-01', asOf: '2025-05-01', style: 'flow', grain: 35 } as const

describe('templates', () => {
  it('有五種模板', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['collage', 'stats', 'swatch', 'compare', 'palette'])
  })

  it('collage / swatch 帶 date，stats 帶 month 與 asOf；都帶 style 與 grain', () => {
    expect(renderKey(templateParams('collage', ctx))).toBe('template=collage&date=2025-05-01&style=flow&grain=35')
    expect(renderKey(templateParams('swatch', ctx))).toBe('template=swatch&date=2025-05-01&style=flow&grain=35')
    expect(renderKey(templateParams('compare', ctx))).toBe('template=compare&date=2025-05-01&style=flow&grain=35')
    expect(renderKey(templateParams('palette', ctx))).toBe('template=palette&month=2025-05&asOf=2025-05-01&style=flow&grain=35')
    expect(renderKey(templateParams('stats', ctx))).toBe('template=stats&month=2025-05&asOf=2025-05-01&style=flow&grain=35')
  })

  it('調整風格或顆粒會改變 URL', () => {
    const a = renderKey(templateParams('collage', ctx))
    expect(renderKey(templateParams('collage', { ...ctx, style: 'mesh' }))).not.toBe(a)
    expect(renderKey(templateParams('collage', { ...ctx, grain: 80 }))).not.toBe(a)
    expect(renderKey(templateParams('collage', { ...ctx, grain: 0 }))).toContain('grain=0')
  })

  it('檔名', () => {
    expect(templateFilename('collage', '2025-05-01')).toBe('hueday-2025-05-01.png')
    expect(templateFilename('swatch', '2025-05-01')).toBe('hueday-2025-05-01-swatch.png')
    expect(templateFilename('compare', '2025-05-01')).toBe('hueday-2025-05-01-compare.png')
    expect(templateFilename('palette', '2025-05-01')).toBe('hueday-2025-05-palette.png')
    expect(templateFilename('stats', '2025-05-01')).toBe('hueday-2025-05-stats.png')
    expect(monthOf('2025-05-01')).toBe('2025-05')
  })

  it('預設風格依模式', () => {
    expect(defaultStyle('single')).toBe('mesh')
    expect(defaultStyle('collect')).toBe('flow')
    expect(defaultStyle(undefined)).toBe('mesh')
  })
})
