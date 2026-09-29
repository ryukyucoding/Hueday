# NOTES
P1: npm workspaces monorepo (core/api/web)；Vue3+Vite6+vue-router4+vite-plugin-pwa；固定 TS 5.9 / vitest 3 / vite 6（避開 registry 最新大版本的相容風險）；PWA icon 由 scripts/gen-icons.mjs 用 sharp 從 icon.svg 產生 PNG；api 目前只是佔位 build。
P2: Hono API + wrangler.toml（DB/PHOTOS/CACHE 用 REPLACE_ME；GEMINI_MODEL=gemini-2.5-flash）；0001_init.sql 本地 migrate 成功；/api/health 免 X-User-Id，其他 /api/* 缺少則 400（錯誤格式已用 {error:{code,message}}）；npm run dev 用 concurrently，Vite proxy /api→8787；前端 lib/api.ts 帶匿名 UUID。build 用 wrangler deploy --dry-run。
P3: core: 60 色 palette（palette.data.ts）、FNV-1a+avalanche 的 getDailyColor(date)、HUE_GROUPS、readableTextColor；首頁顯示今日色塊/提示，單色日/集色日切換，模式暫存 localStorage(hueday:mode:date)，Entry 建立後（P4）再同步；集色日先顯示 9 個空格。日期用裝置當地日期。
