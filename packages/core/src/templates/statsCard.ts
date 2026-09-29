import { HUE_GROUPS, HUE_GROUP_COLORS, type HueGroup } from '../hue'

/** 色相分佈環形圖（單一 SVG）。沒有資料時畫一圈淡灰。 */
export function donutSvg(share: Record<HueGroup, number>, size: number, thickness = size * 0.16): string {
  const r = (size - thickness) / 2
  const c = size / 2
  const circ = 2 * Math.PI * r
  const gap = 0.006 * circ
  const total = HUE_GROUPS.reduce((s, g) => s + share[g], 0)
  const round = (n: number) => Math.round(n * 100) / 100
  let offset = 0
  const arcs: string[] = []
  if (total <= 0) {
    arcs.push(`<circle cx="${c}" cy="${c}" r="${round(r)}" fill="none" stroke="rgba(43,42,40,0.12)" stroke-width="${round(thickness)}"/>`)
  } else {
    for (const g of HUE_GROUPS) {
      const len = (share[g] / total) * circ
      if (len <= 0) continue
      const dash = Math.max(0, len - (HUE_GROUPS.filter((x) => share[x] > 0).length > 1 ? gap : 0))
      arcs.push(
        `<circle cx="${c}" cy="${c}" r="${round(r)}" fill="none" stroke="${HUE_GROUP_COLORS[g]}" stroke-width="${round(thickness)}" ` +
          `stroke-dasharray="${round(dash)} ${round(circ - dash)}" stroke-dashoffset="${round(-offset)}" transform="rotate(-90 ${c} ${c})"/>`
      )
      offset += len
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${arcs.join('')}</svg>`
}
