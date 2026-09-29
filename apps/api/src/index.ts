import { Hono } from 'hono'
import type { AppEnv } from './types'
import { entries } from './routes/entries'
import { photos } from './routes/photos'
import { render } from './routes/render'
import { stats } from './routes/stats'
import { recap } from './routes/recap'
import { errorJson } from './errors'
import { getSimulation } from './simulate'

const app = new Hono<AppEnv>()

app.get('/api/health', (c) => c.json({ ok: true }))

// 之後所有 /api/* 端點都需要 X-User-Id（health 除外）
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health') return next()
  const userId = c.req.header('X-User-Id')
  if (!userId) return c.json({ error: { code: 'missing_user_id', message: '缺少 X-User-Id' } }, 400)
  c.set('userId', userId)
  // 開發用錯誤模擬（僅本地 ALLOW_SIMULATE=1 時生效）
  const sim = getSimulation(c)
  if (sim === 'rate-limit') {
    c.header('Retry-After', '30')
    return errorJson(c, 429, 'rate_limited', '操作太頻繁，請稍後再試')
  }
  if (sim === 'server-error') throw new Error('simulated server error')
  await next()
})

app.route('/api/entries', entries)
app.route('/api/photos', photos)
app.route('/api/render', render)
app.route('/api/stats', stats)
app.route('/api/recap', recap)

// 所有錯誤都統一成 { error: { code, message } }
app.notFound((c) => errorJson(c, 404, 'not_found', '找不到這個資源'))
app.onError((err, c) => {
  console.error(err)
  return errorJson(c, 500, 'internal_error', '伺服器發生錯誤，請稍後再試')
})

export default app
