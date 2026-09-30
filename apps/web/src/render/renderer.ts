import { ApiError } from '../lib/errors'
import type { RenderParams } from '../lib/render'
import { simulation } from '../lib/simulate'
import { renderPng } from './client'
import { buildSpec } from './data'
import { loadFont } from './fonts'

/**
 * 在手機（瀏覽器）裡產出限動 PNG：載入資料 → core 的版面 → 下載用到的字型 → Web Worker（satori + resvg）。
 * 不需要 Worker 端產圖，所以 Cloudflare 免費方案就夠用。
 */
export async function renderTemplate(p: RenderParams, signal?: AbortSignal): Promise<Blob> {
  if (simulation.value === 'render-fail') throw new ApiError(500, 'render_failed', 'simulated render failure') // 開發用：?simulate=render-fail
  const spec = await buildSpec(p)
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
  const [body, disp] = await Promise.all([loadFont('Noto Sans TC', spec.bodyText), loadFont('Fraunces', spec.dispText)])
  return renderPng(spec.html, [body, disp], undefined, signal)
}
