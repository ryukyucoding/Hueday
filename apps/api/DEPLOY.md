# 部署步驟（使用者待辦）

以下步驟需要 Cloudflare 帳號，開發 loop 不會執行。

1. 登入：`npx wrangler login`
2. 建立 D1：`npx wrangler d1 create hueday` → 把回傳的 `database_id` 填進 `apps/api/wrangler.toml`
3. 建立 R2 bucket：`npx wrangler r2 bucket create hueday-photos`
4. 建立 KV：`npx wrangler kv namespace create CACHE` → 把回傳的 `id` 填進 `wrangler.toml`
5. 套用 migration：`npx wrangler d1 migrations apply DB --remote`（在 `apps/api` 目錄）
6. 設定 secret：`npx wrangler secret put GEMINI_API_KEY`（沒設就走 mock 模式）
7. 部署 Worker：`npm run build -w apps/web && npx wrangler deploy`（在 `apps/api` 目錄）
8. 部署前端（Cloudflare Pages）：
   - Build command：`npm run build -w packages/core && npm run build -w apps/web`
   - Output directory：`apps/web/dist`
   - 讓 `/api/*` 導向 Worker：在 Pages 專案加上 Worker route（`yourdomain/api/*` → `hueday-api`），或在同網域使用 Worker route。
9. （選配）綁定自訂網域。

## 快取與限流（P21）注意事項

- **產圖快取使用 Cache API，在 `*.workers.dev` 網域不會生效**（`cache.put` 會被忽略，每次都重新產圖）。
  正式部署請綁定自訂網域（Worker route 或 Pages Functions 同網域），本地 `wrangler dev` 有效。
  回應標頭 `X-Render-Cache: hit | miss` 可用來確認。
- 產圖非常吃 CPU（satori + resvg，本地實測約 5 秒）。**Workers 免費方案 CPU 上限 10 ms，一定會失敗，需要 Workers Paid**（快取命中時幾乎不吃 CPU）。
- 限流用 KV 固定視窗計數器（每位使用者每分鐘：上傳 10、Gemini 20、產圖 30）。KV 是最終一致且非原子操作，
  這是「擋一般濫用」的近似限流；若需要嚴格限流，改用 Durable Object 或 Cloudflare Rate Limiting binding。
- 強制清掉所有舊的產圖快取：把 `apps/api/src/render/renderCache.ts` 的 `RENDER_VERSION` 加一。
- `ALLOW_SIMULATE` 只給本地開發用（`npm run dev` 已帶 `--var ALLOW_SIMULATE:1`），**不要**在正式環境設定。
