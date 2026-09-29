import { buildGradient, gradientToSvg, type GradientStyle } from '../gradient'
import { colorDistance } from '../oklab'
import { STORY_HEIGHT, STORY_WIDTH } from './collage'

/** 依出現順序取最多 max 個彼此夠不同的顏色 */
export function pickDistinctColors(colors: string[], max = 5, minDistance = 8): string[] {
  const out: string[] = []
  for (const c of colors) {
    if (out.every((o) => colorDistance(o, c) >= minDistance)) out.push(c)
    if (out.length >= max) break
  }
  return out
}

export type StoryBackgroundOptions = { mode: 'single' | 'collect'; date: string; targetHex: string; style?: GradientStyle; grain?: number }

/** 限動背景 SVG（前端預覽與 Worker 產圖共用）：照片主色漸層，沒有照片時用今日色 */
export function storyBackgroundSvg(photoColors: string[][], opts: StoryBackgroundOptions, width = STORY_WIDTH, height = STORY_HEIGHT): string {
  const picked = pickDistinctColors(photoColors.flat())
  const colors = picked.length ? picked : [opts.targetHex]
  const style = opts.style ?? (opts.mode === 'single' ? 'mesh' : 'flow')
  return gradientToSvg(buildGradient(colors, { style, seed: opts.date, grain: opts.grain ?? 60 }), width, height)
}
