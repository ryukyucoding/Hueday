# Hueday 開發步驟

> 規則見 `CLAUDE.md` 的「Loop 規則」。一輪只做第一個 `[ ]`。
> 狀態：`[ ]` 未做 · `[x]` 完成 · `[!]` 失敗已記錄

---

## 地基

### [x] P1 專案骨架 + PWA
**要做的事**
- 建立 npm workspaces monorepo：`apps/web`、`apps/api`、`packages/core`（結構見 CLAUDE.md）。
- `apps/web`：Vue 3 + Vite + TypeScript + Vue Router，加 `vite-plugin-pwa`（manifest：name「拾色 Hueday」、short_name「Hueday」、theme_color `#FAF7F2`、display standalone、192/512 icon，icon 先用 SVG 產生一個漸層圓點）。
- 建立全域 CSS 變數與設計語言（CLAUDE.md）、一個 App 外框（頂部標題、底部 tab bar：今天／日曆／分享）。
- `packages/core`：TS 設定 + vitest，先放一個 `hello()` 測試確保流程通。
- 根目錄 scripts：`build`、`test`、`dev`；`.gitignore` 含 `node_modules`、`dist`、`.wrangler`、`.dev.vars`。
- `NOTES.md` 建立空白標題。

**完成條件**
- [ ] `npm install && npm run build && npm test` 全部成功
- [ ] build 產物包含 `manifest.webmanifest` 與 service worker
- [ ] 三個 tab 可切換（各自是 placeholder 頁面）

### [x] P2 Cloudflare Worker API
**要做的事**
- `apps/api`：Hono + TypeScript，`wrangler.toml` 綁定 `DB`（D1）、`PHOTOS`（R2）、`CACHE`（KV），id 用 `REPLACE_ME` placeholder；`[vars]` 放 `GEMINI_MODEL`。
- D1 migration `0001_init.sql`：`entries`（id, user_id, date, mode, target_color, note, created_at，UNIQUE(user_id, date)）、`photos`（id, entry_id, r2_key, dominant_colors JSON, ai_color_name, matches_target, subject, created_at）。
- `GET /api/health` 回 `{ ok: true }`；middleware 讀取 `X-User-Id`，缺少時回 400。
- 根目錄 `npm run dev` 用 `concurrently` 同時跑 Vite 與 `wrangler dev --local`；Vite proxy `/api` → 8787。
- 前端 `src/lib/api.ts`：fetch 包裝，自動帶 `X-User-Id`（匿名 UUID，localStorage + try/catch）。
- `apps/api/DEPLOY.md`：列出使用者之後要做的步驟（wrangler login、d1 create、r2 bucket create、kv namespace create、填回 id、migrations apply --remote、secret put、deploy、Pages 設定）。

**完成條件**
- [ ] `npm run build` 成功（Worker 用 `wrangler deploy --dry-run --outdir dist` 驗證可打包）
- [ ] 本地套用 migration 成功（`wrangler d1 migrations apply DB --local`）
- [ ] 前端首頁能顯示 `/api/health` 的結果

### [x] P3 今日顏色
**要做的事**
- `packages/core/src/palette.ts`：精選 60 色色票（每色含 hex、中文名、英文名、一句尋找提示，例：「#E8603C 柿子橘 — 找找看招牌、落葉或一杯熱茶」）。
- `getDailyColor(date: string)`：用日期字串做 deterministic hash 選色，同一天所有人相同；附測試（同日相同、不同日分佈合理）。
- 首頁「今天」：大色塊 + 色名 + 提示；「單色日／集色日」切換（存在當天 Entry 的 mode，未建立前存在 local state）。
- 集色日時顯示 9 個色相群組的空格，之後收集到就填色。

**完成條件**
- [ ] core 測試通過
- [ ] 首頁顯示今日顏色，重新整理不變；可切換兩種模式

### [x] P4 拍照與上傳
**要做的事**
- 首頁「＋」按鈕：`<input type="file" accept="image/*" capture="environment">`，也可從相簿選。
- 前端用 canvas 壓縮到長邊 1600px、JPEG 0.85。
- `POST /api/entries/:date/photos`（multipart）：若當天無 Entry 先建立，存 R2（key：`{userId}/{date}/{photoId}.jpg`），寫入 photos。
- `GET /api/entries/:date` 回傳 Entry + photos；`GET /api/photos/:id` 從 R2 串流圖片（檢查 userId）。
- 首頁顯示當天照片 grid，上傳中顯示 placeholder。

**完成條件**
- [ ] 本地可上傳、重新整理後照片仍在
- [ ] 上傳超過 10MB 回 413

## 核心

### [ ] P5 抽色與色相分類（core）
**要做的事**
- `extractDominantColors(pixels: Uint8ClampedArray, k = 5): string[]`：k-means（固定亂數種子，最多 20 次迭代），忽略 alpha < 128 的像素，依群集大小排序回傳 hex。
- `classifyHue(hex): HueGroup`，群組：red, orange, yellow, green, blue, purple, pink, brown, neutral（黑白灰；用 HSL 的飽和度 / 明度門檻判斷）。
- `colorDistance(a, b)`：用 CIEDE2000 或 OKLab 距離。
- 前端：上傳前用 canvas 縮到 64×64 取像素 → 呼叫 core → 把 `dominantColors` 一起送到 API 存起來。
- 集色日的色相格子依照片主色填入。

**完成條件**
- [ ] 測試：純色圖回傳該色；紅藍各半的圖回傳紅與藍；各色相群組至少各 1 個測試案例
- [ ] 上傳後照片卡片下方顯示 5 個主色小圓點

### [ ] P6 Gemini Vision 顏色判斷
**要做的事**
- `apps/api/src/gemini.ts`：呼叫 Gemini REST `models/{GEMINI_MODEL}:generateContent`，照片以 inline base64 傳入，`generationConfig.responseMimeType = "application/json"` + `responseSchema`。
- 回傳 `{ matchesTarget: boolean, subject: string, confidence: number }`，prompt 說明「照片的主要被攝物是否屬於目標顏色（hex + 中文名）」。
- 上傳流程：單色日時呼叫，結果寫入 photos；無 key 時用 core 的 `colorDistance` 做 mock 判斷並標 `mock: true`。
- 10 秒 timeout；失敗不影響上傳成功，只是不顯示判斷。
- 照片卡片顯示「✓ 找到了：紅色郵筒」或「這張比較像 ○○ 色」。

**完成條件**
- [ ] 無 key 時流程完整可用（mock）
- [ ] 有單元測試驗證 request body 的 schema 格式正確（mock fetch）

### [ ] P7 AI 色名
**要做的事**
- 同一次或另一次 Gemini 呼叫，為照片主色取 4–10 字的詩意中文名（例：「傍晚捷運站的橘」），需結合照片內容；回傳用 schema 限制長度。
- 存入 `ai_color_name`，照片卡片以小字顯示。
- mock：用 `palette` 的中文名 + subject 組合。

**完成條件**
- [ ] 每張照片都有色名（真實或 mock）
- [ ] 長度超過 10 字時截斷處理有測試

### [ ] P8 漸層產生器（core）
**要做的事**
- `buildGradient(colors: string[], opts: { style: 'mesh' | 'flow', seed: string, grain: number })`：
  - 單色日若只有 1–2 色，自動在 OKLab 空間補同色系的淺、深、偏暖、偏冷變化到 4 色。
  - 輸出色點參數（位置、半徑）。
- `gradientToSvg(params, width, height): string`：產生**單一 SVG**（多個 radial gradient 圓 + `feGaussianBlur` 柔化 + `feTurbulence` 顆粒疊加）。這個 SVG 是唯一真相：前端直接顯示，Worker 產圖時也嵌入同一份。
- 前端：首頁背景改成今日照片主色產生的漸層（沒有照片時用今日顏色）。

**完成條件**
- [ ] 同樣輸入 + seed 輸出完全相同（測試）
- [ ] 產生的 SVG 在瀏覽器正確顯示，有明顯顆粒感

### [ ] P9 模板一「Color Hunt 拼貼」前端預覽
**要做的事**
- 「分享」tab：1080×1920 等比縮小的預覽。
- 版面：漸層底圖；上方日期（大字英文數字）+ 今日色名；中間 2–6 張照片拼貼（依張數有不同排版，白框、輕微旋轉像拍立得）；下方小字「collected 5 colors · Hueday」。
- 模板用純資料描述（`packages/core/src/templates/collage.ts` 輸出排版座標），前端與 Worker 共用。

**完成條件**
- [ ] 1–6 張照片各種數量都排得好看（無重疊出界）
- [ ] 排版座標函式有測試

### [ ] P10 Worker 產生 PNG
**要做的事**
- 使用 `workers-og`（或 `satori` + `@resvg/resvg-wasm`）在 Worker 產 1080×1920 PNG：`GET /api/render?template=collage&date=YYYY-MM-DD`。
- 底圖：嵌入 P8 的 SVG（data URI）；照片：從 R2 讀出轉 data URI。
- 中文字型：Worker 大小有限，**不要打包完整 Noto Sans TC**。用 Google Fonts CSS2 API 的 `text=` 參數只下載需要的字，結果快取在 KV。
- 前端預覽改成直接顯示這張 PNG（loading 時顯示 P9 的前端版本當 placeholder）。

**完成條件**
- [ ] 本地可取得 PNG，中文正常顯示、無豆腐字
- [ ] `wrangler deploy --dry-run` 打包大小在免費方案限制內（在 NOTES 記錄大小）

## 分享

### [ ] P11 分享 / 下載
**要做的事**
- 「分享」按鈕：取得 PNG → `navigator.canShare({ files })` 成立則 `navigator.share({ files: [file] })`（使用者可選 Instagram），否則下載 `hueday-YYYY-MM-DD.png`。
- 分享成功後顯示輕量 toast，不要顯示任何數字或社交指標。

**完成條件**
- [ ] 桌面瀏覽器走下載流程；支援的瀏覽器走分享流程（以 feature detection 判斷）

### [ ] P12 模板二「Strava 風數據卡」
**要做的事**
- core `computeStats(entries)`：連續記錄天數、本月收集色數、各色相群組佔比、本月主色（全月主色 k-means）。附測試。
- `GET /api/stats?month=YYYY-MM`。
- 模板：大字數據排版（像 Strava 活動卡：左上標題、三格大數字、中間色相分佈環形圖、底部本月主色色條），背景用本月主色漸層；`/api/render?template=stats&month=`。

**完成條件**
- [ ] 連續天數跨月、中斷等邊界情況有測試
- [ ] PNG 正常產出

### [ ] P13 模板三「單色日色票」
**要做的事**
- 上半部 60% 大面積漸層，中間像 Pantone 色票的白色資訊條（色名、HEX、日期），下半部 3–4 張小照片 + 各自 AI 色名。
- `/api/render?template=swatch&date=`。

**完成條件**
- [ ] 照片不足 3 張時版面仍平衡
- [ ] PNG 正常產出

### [ ] P14 模板選擇頁
**要做的事**
- 「分享」tab 改成左右滑動切換三個模板（CSS scroll-snap）。
- 控制項：漸層風格 mesh / flow、顆粒強度 slider（0–100），變更時更新 render URL 參數（加 debounce）。
- 選好後分享或下載。

**完成條件**
- [ ] 三種模板都能切換、調整、分享

## Retro 感

### [ ] P15 日曆牆
**要做的事**
- 「日曆」tab：月曆格子，每天用當天漸層的小方塊（core SVG 縮小版）；沒記錄的日子是淡淡的空格。
- 可切換月份；點某天進入當天頁（照片、色名、備註，可編輯備註）。
- `GET /api/entries?month=YYYY-MM` 回傳摘要（每天主色即可，不回整張照片）。

**完成條件**
- [ ] 月份切換流暢，當天頁可編輯備註並保存

### [ ] P16 去年今天
**要做的事**
- 首頁頂部：若一年前同一天有記錄，顯示溫和卡片「去年的今天，你找到了 ○○」+ 縮圖。
- 對比模板 `template=compare`：上下各半，去年 vs 今年的漸層與照片。
- 開發用：提供 `npm run seed` 腳本，在本地 D1 塞入過去 400 天的假資料（含假照片色塊），方便測試 P15–P18。

**完成條件**
- [ ] 用 seed 資料可看到去年今天卡片與對比 PNG

### [ ] P17 月總結
**要做的事**
- `POST /api/recap?month=YYYY-MM`：Gemini 讀取本月統計、每張照片的 AI 色名與備註，寫 80–120 字、Spotify Wrapped 口吻的繁體中文回顧；結果快取在 KV（同月只產一次，可強制重產）。
- mock：用模板句子拼出。
- 月總結模板 `template=recap`：回顧文字 + 本月主色漸層 + 3 個關鍵數字。
- 日曆頁月份標題旁加「本月回顧」入口。

**完成條件**
- [ ] 無 key 時 mock 可用；同月第二次呼叫走快取

### [ ] P18 月色票海報
**要做的事**
- `template=palette&month=`：整月每天主色排成 7 欄色格（依星期對齊），每格右下小字日期，底部月份與「Hueday」字樣。
- 沒記錄的日子用淡灰斜線。

**完成條件**
- [ ] 28/30/31 天與不同起始星期都正確對齊（測試排版函式）

## 收尾

### [ ] P19 手機體驗打磨
**要做的事**
- `env(safe-area-inset-*)` 處理瀏海與底部 home bar；tab bar 固定底部。
- 觸控目標 ≥ 44px、字級 ≥ 15px、input 避免 iOS 自動放大（font-size ≥ 16px）。
- 用 Playwright 在 iPhone 與 Pixel 裝置模擬下截圖三個 tab，存到 `docs/screenshots/`，檢查無水平捲動。

**完成條件**
- [ ] Playwright 截圖腳本可執行，無水平捲動

### [ ] P20 錯誤處理與 loading
**要做的事**
- 統一 API 錯誤格式 `{ error: { code, message } }`；前端 toast 顯示友善中文訊息 + 重試按鈕。
- 各情境：上傳失敗、Gemini 逾時／額度用完（429）、產圖失敗、離線（PWA offline 頁）。
- 每個頁面有 skeleton loading；Vue 全域 errorHandler，不可白畫面。

**完成條件**
- [ ] 模擬各錯誤（可用 query 參數或 dev flag 觸發）皆有對應 UI

### [ ] P21 Rate limit 與快取
**要做的事**
- KV 計數器：每個 userId 每分鐘上傳 ≤ 10、Gemini 呼叫 ≤ 20、render ≤ 30，超過回 429 + `Retry-After`。
- 圖片大小上限 10MB、只接受 image/jpeg、png、webp、heic。
- render 結果：以 (template, 參數, 資料最後更新時間) 為 key 存 Cache API，資料變更後自動失效。

**完成條件**
- [ ] rate limit 有整合測試（vitest + miniflare 或 `unstable_dev`）
- [ ] 同樣 render 請求第二次明顯變快（NOTES 記錄時間）

### [ ] P22 README（不部署）
**要做的事**
- `README.md`：產品介紹（一句話 + 三種模式）、截圖（P19）、架構圖（mermaid）、使用的第三方 API（Gemini、Cloudflare Workers/D1/R2/KV、Google Fonts、workers-og/Satori）、本地開發步驟、部署步驟（連到 `apps/api/DEPLOY.md`）。
- 在 `NOTES.md` 最後寫「使用者待辦」清單：部署步驟、要申請的 key、標成 `[!]` 的步驟。

**完成條件**
- [ ] README 內所有指令在本地實際跑過一次
- [ ] 輸出最終總結並結束 loop
