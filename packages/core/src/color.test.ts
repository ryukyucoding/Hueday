import { describe, expect, it } from 'vitest'
import { hexToRgb, readableTextColor, rgbToHex } from './color'

describe('color', () => {
  it('hex <-> rgb', () => {
    expect(hexToRgb('#FF8000')).toEqual([255, 128, 0])
    expect(rgbToHex(255, 128, 0)).toBe('#FF8000')
  })
  it('文字色對比', () => {
    expect(readableTextColor('#FFFFFF')).toBe('#2B2A28')
    expect(readableTextColor('#1D3557')).toBe('#FFFFFF')
  })
})
