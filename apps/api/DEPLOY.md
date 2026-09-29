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
