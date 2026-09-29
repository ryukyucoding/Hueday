/**
 * 開發用：在本地 D1 / R2 塞入過去 400 天的假資料（含假照片色塊）。
 *   npm run seed            # 使用者 id 預設 seed-user
 *   SEED_USER=xxx npm run seed
 * 之後開 http://localhost:5173/?uid=seed-user 即可用這個使用者瀏覽（只有 dev 模式生效）。
 * 需要先執行過 migration：npm run migrate:local -w apps/api
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { getPlatformProxy } from 'wrangler'
import { planSeed } from './seedPlan'
import type { Bindings } from '../src/types'

const sharp = createRequire(import.meta.url)('sharp') as typeof import('sharp')

const user = process.env.SEED_USER ?? 'seed-user'
const today = process.env.SEED_TODAY ?? new Date().toISOString().slice(0, 10)

async function fakePhoto(colors: string[]): Promise<Uint8Array> {
  const [a, b] = [colors[0], colors[1] ?? colors[0]].map((c) => c.toUpperCase())
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="320" height="400" fill="url(#g)"/><circle cx="160" cy="180" r="70" fill="#fff" fill-opacity=".3"/></svg>`
  return new Uint8Array(await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer())
}

const proxy = await getPlatformProxy<Bindings>({ configPath: fileURLToPath(new URL('../wrangler.toml', import.meta.url)) })
try {
  const { DB, PHOTOS } = proxy.env
  const has = await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='photos'").first()
  if (!has) {
    console.error('找不到資料表，請先執行：npm run migrate:local -w apps/api')
    process.exit(1)
  }

  // 重跑時先清掉同一位使用者的舊資料
  const old = await DB.prepare('SELECT r2_key FROM photos WHERE entry_id IN (SELECT id FROM entries WHERE user_id = ?)').bind(user).all<{ r2_key: string }>()
  for (const r of old.results) await PHOTOS.delete(r.r2_key)
  await DB.prepare('DELETE FROM photos WHERE entry_id IN (SELECT id FROM entries WHERE user_id = ?)').bind(user).run()
  await DB.prepare('DELETE FROM entries WHERE user_id = ?').bind(user).run()

  const plan = planSeed(today, 400)
  let photoCount = 0
  for (const e of plan) {
    const entryId = `seed-${user}-${e.date}`
    const created = Date.parse(`${e.date}T12:00:00Z`)
    await DB.prepare('INSERT INTO entries (id, user_id, date, mode, target_color, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(entryId, user, e.date, e.mode, e.target, e.note, created)
      .run()
    for (const [i, p] of e.photos.entries()) {
      const id = `${entryId}-${i}`
      const key = `${user}/${e.date}/${id}.jpg`
      await PHOTOS.put(key, await fakePhoto(p.colors), { httpMetadata: { contentType: 'image/jpeg' } })
      await DB.prepare(
        'INSERT INTO photos (id, entry_id, r2_key, dominant_colors, ai_color_name, matches_target, subject, ai_confidence, ai_mock, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)'
      )
        .bind(id, entryId, key, JSON.stringify(p.colors), p.aiName, p.matches === null ? null : p.matches ? 1 : 0, p.matches === null ? null : p.subject, p.matches === null ? null : 0.8, created + i)
        .run()
      photoCount++
    }
  }
  console.log(`已寫入 ${plan.length} 天、${photoCount} 張假照片（user=${user}，今天=${today}）`)
  console.log(`開 http://localhost:5173/?uid=${user} 瀏覽（需先 npm run dev）`)
} finally {
  await proxy.dispose()
}
