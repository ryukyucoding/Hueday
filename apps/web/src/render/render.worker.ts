/// <reference lib="webworker" />
// 在 Web Worker 裡把 HTML 版面轉成 PNG：satori（HTML → SVG）+ resvg-wasm（SVG → PNG）。
// 放在 Worker 是因為這很吃 CPU（手機上要數秒），不能卡住主畫面。
import satori from 'satori'
import { html as toVNode } from 'satori-html'
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import wasmUrl from '@resvg/resvg-wasm/index_bg.wasm?url'

export type RenderRequest = {
  id: number
  html: string
  fonts: { name: string; data: ArrayBuffer; weight: 400 | 500 | 700 }[]
  width: number
  height: number
}
export type RenderResponse = { id: number; png: ArrayBuffer } | { id: number; error: string }

let wasmReady: Promise<void> | undefined

self.onmessage = async (e: MessageEvent<RenderRequest>) => {
  const { id, html, fonts, width, height } = e.data
  try {
    wasmReady ??= initWasm(fetch(wasmUrl))
    await wasmReady
    const svg = await satori(toVNode(html) as Parameters<typeof satori>[0], {
      width,
      height,
      fonts: fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: 'normal' as const }))
    })
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng()
    const buf = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer
    // satori 遇到不合法的版面可能產出空內容：當成失敗
    if (buf.byteLength === 0) throw new Error('empty png')
    ;(self as unknown as Worker).postMessage({ id, png: buf } satisfies RenderResponse, [buf])
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies RenderResponse)
  }
}
