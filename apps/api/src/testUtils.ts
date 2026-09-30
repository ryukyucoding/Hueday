import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getPlatformProxy } from 'wrangler'
import type { Bindings } from './types'

/** 用 wrangler 內建 miniflare 建立記憶體版 D1 / KV，並套用所有 migration */
export async function createTestEnv() {
  const proxy = await getPlatformProxy<Bindings>({
    configPath: fileURLToPath(new URL('../wrangler.toml', import.meta.url)),
    persist: false
  })
  const dir = new URL('../migrations/', import.meta.url)
  for (const f of readdirSync(dir).sort()) {
    const sql = readFileSync(new URL(f, dir), 'utf8')
    for (const stmt of sql.split(';').map((s) => s.trim()).filter(Boolean)) {
      await proxy.env.DB.prepare(stmt).run()
    }
  }
  return { env: proxy.env, dispose: () => proxy.dispose() }
}

export function jpegFile(bytes = 16, name = 'a.jpg') {
  return new File([new Uint8Array(bytes).fill(1)], name, { type: 'image/jpeg' })
}
