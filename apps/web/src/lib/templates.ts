import type { RenderParams } from './render'

export const TEMPLATES = [
  { id: 'collage', label: 'Color Hunt 拼貼' },
  { id: 'stats', label: '數據卡' },
  { id: 'swatch', label: '單色日色票' },
  { id: 'compare', label: '去年 vs 今年' }
] as const

export type TemplateId = (typeof TEMPLATES)[number]['id']
export type GradientChoice = 'mesh' | 'flow'

export type ShareContext = { date: string; asOf: string; style: GradientChoice; grain: number }

export function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function templateParams(id: TemplateId, ctx: ShareContext): RenderParams {
  const common = { style: ctx.style, grain: ctx.grain }
  if (id === 'stats') return { template: 'stats', month: monthOf(ctx.date), asOf: ctx.asOf, ...common }
  return { template: id, date: ctx.date, ...common }
}

export function templateFilename(id: TemplateId, date: string): string {
  if (id === 'stats') return `hueday-${monthOf(date)}-stats.png`
  if (id === 'swatch') return `hueday-${date}-swatch.png`
  if (id === 'compare') return `hueday-${date}-compare.png`
  return `hueday-${date}.png`
}

/** 依當天 Entry 的模式決定預設漸層風格：單色日 mesh、集色日 flow */
export function defaultStyle(mode: 'single' | 'collect' | undefined): GradientChoice {
  return mode === 'collect' ? 'flow' : 'mesh'
}
