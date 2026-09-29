import { Hono } from 'hono'
import type { AppEnv } from './types'
import { entries } from './routes/entries'
import { photos } from './routes/photos'
import { render } from './routes/render'
import { stats } from './routes/stats'
import { recap } from './routes/recap'

const app = new Hono<AppEnv>()

app.get('/api/health', (c) => c.json({ ok: true }))

// 之後所有 /api/* 端點都需要 X-User-Id（health 除外）
app.use('/api/*', async (c, next) => {
  if (c.req.path === '/api/health') return next()
  const userId = c.req.header('X-User-Id')
  if (!userId) return c.json({ error: { code: 'missing_user_id', message: '缺少 X-User-Id' } }, 400)
  c.set('userId', userId)
  await next()
})

app.route('/api/entries', entries)
app.route('/api/photos', photos)
app.route('/api/render', render)
app.route('/api/stats', stats)
app.route('/api/recap', recap)

export default app
