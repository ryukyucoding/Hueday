import { describe, expect, it } from 'vitest'
import { computeStats } from '../stats'
import { collageSpec, compareSpec, posterSpec, recapSpec, statsSpec, swatchSpec } from './specs'

const uri = 'data:image/svg+xml;base64,AAAA'
const photo = { dataUri: 'data:image/jpeg;base64,BBBB', dominantColors: ['#FF0000'], caption: '傍晚捷運站的橘' }
const stats = computeStats([{ date: '2025-09-01', photos: [{ dominantColors: ['#FF0000', '#0000FF'] }] }], '2025-09', '2025-09-01')

const specs = {
  collage: collageSpec({ date: '2025-09-01', zhName: '柿子橘', enName: 'Persimmon', bgDataUri: uri, photos: [photo] }),
  stats: statsSpec({ stats, bgDataUri: uri, donutDataUri: uri }),
  swatch: swatchSpec({ date: '2025-09-01', hex: '#E8603C', zhName: '柿子橘', enName: 'Persimmon', bgDataUri: uri, photos: [photo] }),
  compare: compareSpec({
    last: { date: '2024-09-01', label: 'LAST YEAR', zhName: '柿子橘', bgDataUri: uri, photos: [photo], hasRecord: true },
    now: { date: '2025-09-01', label: 'THIS YEAR', zhName: '抹茶綠', bgDataUri: uri, photos: [], hasRecord: false }
  }),
  recap: recapSpec({ stats, text: '這個月你收集了很多顏色。', bgDataUri: uri }),
  poster: posterSpec({ month: '2025-09', colors: { '2025-09-01': '#E8603C' } })
}

describe('RenderSpec：HTML + 字型要用到的字', () => {
  for (const [name, spec] of Object.entries(specs)) {
    describe(name, () => {
      it('HTML 符合 satori 的限制：每個 div 有 display:flex、每個 img 有 width/height', () => {
        for (const d of spec.html.match(/<div style="[^"]*"/g) ?? []) expect(d, name).toContain('display:flex')
        for (const i of spec.html.match(/<img [^>]*>/g) ?? []) expect(i, name).toMatch(/ width="\d+" height="\d+"/)
      })
      it('版面上的每個中文字都在 bodyText 裡（否則字型子集會缺字，變成豆腐字）', () => {
        const visible = spec.html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, '')
        for (const ch of new Set(Array.from(visible))) {
          if (/[一-鿿]/.test(ch)) expect(spec.bodyText, `${name} 缺字 ${ch}`).toContain(ch)
        }
      })
      it('版面上的每個英數字都在 dispText 或 bodyText 裡', () => {
        const visible = spec.html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/g, '')
        for (const ch of new Set(Array.from(visible))) {
          if (/[A-Za-z0-9]/.test(ch)) expect(spec.dispText + spec.bodyText, `${name} 缺字 ${ch}`).toContain(ch)
        }
      })
    })
  }
})
