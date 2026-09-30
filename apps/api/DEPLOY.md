# 部署步驟（Cloudflare 免費方案就夠）

整個 App 是**一個 Worker**：它同時提供 `/api/*` 與前端靜態檔（Workers Assets），所以只有一個網址，不需要 Pages、不需要設定路由、不需要自訂網域，也**不需要付費方案**。

限動圖是在使用者的手機（瀏覽器）裡產生的，不會占用 Worker 的 CPU；Worker 只做輕量的 API 與字型代理。

> 以下步驟需要你的 Cloudflare 帳號，開發 loop 不會執行。

## 準備

- **Node.js 22 以上**（`node -v` 確認；舊版會讓 wrangler 等套件裝不起來）。
- 一個 Cloudflare 帳號（免費即可）。
- **R2（照片儲存）需要先在帳號綁一張付款方式才能啟用**（據我所知；免費額度 10 GB，用量在額度內不會扣款）。如果你完全不想綁卡，照片可以改存 D1，需要改程式，跟我說。
- （選配）Gemini API key：到 Google AI Studio 申請。沒有也能用，AI 結果會是示意資料。

## 步驟

在專案根目錄：

```bash
npm install
cd apps/api
npx wrangler login
```

1. 建立 D1：`npx wrangler d1 create hueday` → 把印出的 `database_id` 填進 `apps/api/wrangler.toml`
2. 建立 R2：`npx wrangler r2 bucket create hueday-photos`
3. 建立 KV：`npx wrangler kv namespace create CACHE` → 把印出的 `id` 填進 `wrangler.toml`
4. 建立資料表：`npx wrangler d1 migrations apply DB --remote`
5. （選配）Gemini：`npx wrangler secret put GEMINI_API_KEY`，貼上金鑰
6. 回到根目錄部署（會依序 build core → 前端 → 部署 Worker 與靜態檔）：

```bash
cd ../..
npm run deploy
```

完成後會印出網址 `https://hueday-api.<你的帳號>.workers.dev`。

驗證：開 `你的網址/api/health` 應該看到 `{"ok":true}`；用手機開首頁，Safari／Chrome 選「加入主畫面」就是 App。

## 免費方案的限制（個人使用都在額度內）

| 項目 | 免費額度 | 對這個 App 的影響 |
| --- | --- | --- |
| Worker 請求 | 10 萬次／天 | 只有 `/api/*` 算；靜態檔（前端、wasm）免費、不限次數 |
| Worker CPU | 每次請求 10 ms | API 都很輕，但「上傳照片」要做 base64 與資料庫寫入，若偶爾出現 1102（超過 CPU 限制）錯誤，可把 Gemini 相關邏輯拆開或升級方案 |
| KV 寫入 | **1,000 次／天** | 限流計數、字型與月回顧快取都會寫 KV。一個人用很夠；多人使用會先碰到這個上限 |
| D1 | 5 GB、每天 500 萬次讀取 | 夠用 |
| R2 | 10 GB | 夠用（照片已壓到長邊 1600px） |

## 注意事項

- **目前沒有登入**，身分只是瀏覽器產生的匿名 UUID。**知道網址的人都能使用、也能上傳照片到你的 R2**。自己用的話建議不要公開網址；或用 Cloudflare Access（免費，50 人以內）把這個 Worker 保護起來。上線給一般大眾之前需要補登入。
- 限流用 KV 固定視窗計數器（每位使用者每分鐘：上傳 10、Gemini 20、字型 30）。KV 是最終一致且非原子操作，這是「擋一般濫用」的近似限流；要嚴格限流請改用 Durable Object 或 Cloudflare Rate Limiting binding。
- 第一次分享時瀏覽器會下載約 1.4 MB 的產圖引擎（wasm），之後會快取。
- `ALLOW_SIMULATE` 只給本地開發用（`npm run dev` 已帶 `--var ALLOW_SIMULATE:1`），**不要**在正式環境設定。沒設定時 `X-Simulate` header 會被完全忽略（有測試）。
- 之後改程式再部署，只要再跑一次 `npm run deploy`。資料表有變動時先跑 `npx wrangler d1 migrations apply DB --remote`。

## 常見錯誤

| 訊息 | 原因與解法 |
| --- | --- |
| `Unknown arguments: #, ...` | 你把指令連同後面的 `# 註解` 一起貼進 macOS 的 zsh 了。zsh 互動模式不把 `#` 當註解，請只貼指令本身。 |
| `npm warn EBADENGINE ... required: { node: '>=22' }` 之後 `tsc: command not found` | Node 版本太舊，安裝沒完成。升級到 Node 22+ 後，刪掉 `node_modules` 重新 `npm install`。 |
| `npm error ECONNRESET` | 網路中斷，安裝不完整。直接重跑 `npm install`（可能要重試幾次）。 |
| `Please enable R2 through the Cloudflare Dashboard [code: 10042]` | 帳號還沒啟用 R2。到 Cloudflare Dashboard → R2 Object Storage 啟用（需要綁付款方式，用量在免費額度內不會扣款）。 |
| `Invalid property: databaseId => Invalid uuid` | `wrangler.toml` 的 `database_id` 還是 `REPLACE_ME`，先完成第 1 步並填入。 |
