# Hueday（拾色）— Claude Code 專案指引

完整需求見 `PROJECT_BRIEF.md`（若不存在，以本檔與 `PROMPTS.md` 為準），逐步任務見 `PROMPTS.md`。

## 專案結構（npm workspaces monorepo）
```
apps/web        Vue 3 + Vite + TS 前端（PWA）
apps/api        Cloudflare Worker（Hono），D1 / KV（照片也存在 KV，不用 R2——R2 需要綁卡）
packages/core   純 TypeScript 邏輯，不可 import 任何 DOM / Vue / Worker API
```
- 根目錄 `npm run build` 必須依序 build 三個 workspace；`npm test` 跑所有 vitest。
- 本地開發：`npm run dev` 同時啟動 Vite（5173）與 `wrangler dev`（8787），Vite 把 `/api` proxy 到 8787。

## 架構鐵則
1. 抽色、色相分類、漸層、統計等邏輯只寫在 `packages/core`，前端與 Worker 都從這裡 import。
2. 限動圖一律由 `packages/core` 的版面與 HTML 模板產生，在**瀏覽器的 Web Worker** 用 satori + resvg-wasm 轉成 PNG（`apps/web/src/render/`），不得用 html2canvas 之類截圖。模板只寫一次（core），之後包成原生 App 也能沿用。
   - 原本規定由 Worker 產 PNG；但產圖的 CPU 用量遠超過 Cloudflare Workers 免費方案的 10 ms 上限，為了讓使用者不必付費，經使用者同意改到瀏覽器端。Worker 只提供 `/api/font`（向 Google Fonts 取 TTF 子集並快取）。
3. 任何 API key 只能透過 Worker 的 `env` 讀取（`wrangler secret` / `.dev.vars`），絕不進前端或 git。`.dev.vars` 必須在 `.gitignore`。
4. `GEMINI_API_KEY` 不存在時，Gemini 相關端點回傳 mock 資料並帶 `"mock": true`，整個 App 在沒有 key 的情況下也要能完整操作。
5. 使用者身分：前端產生匿名 UUID 存 localStorage（讀寫包 try/catch），以 `X-User-Id` header 傳給 API。
6. 不顯示任何瀏覽數、按讚數、追蹤者等社交指標。

## 設計語言
- 手機優先，最大內容寬度 480px 置中。
- 風格：簡約、大量留白、底片感（淡淡顆粒、暖白底 `#FAF7F2`、深灰文字 `#2B2A28`）。
- 字體：Noto Sans TC（內文）+ 一個有個性的英文 display 字體給數字與標題。
- 圓角 16px，陰影極輕，動畫 200ms ease-out。

## Loop 規則（每一輪都要遵守）
1. 打開 `PROMPTS.md`，找到**第一個**還沒打勾 `[ ]` 的步驟。一輪只做這一步，不要順手做後面的步驟。
2. 依照該步驟的「要做的事」實作，遵守上面的架構鐵則。
3. 逐條檢查該步驟的「完成條件」，並執行 `npm run build` 與 `npm test`（若已有測試），全部通過才算完成。
4. 失敗就修；同一步修 3 次仍失敗 → 在 `NOTES.md` 記錄原因，把該步標成 `[!]`，進下一輪。
5. 完成後：在 `PROMPTS.md` 把該步改成 `[x]`，在 `NOTES.md` 追加一行 `P<n>: <做了什麼、做了哪些決定>`，然後 `git add -A && git commit -m "feat(P<n>): <簡述>"`。
6. 遇到需要人決定的事，自己做合理選擇並寫進 `NOTES.md`，不要停下來問。
7. 所有步驟都是 `[x]` 或 `[!]` 時，輸出總結（完成、失敗、使用者待辦），並結束 loop。
8. 不要執行 `wrangler deploy`、`wrangler login` 或任何需要 Cloudflare 帳號的指令；這是雲端 session（環境會被回收），所以每輪 commit 後必須 `git push -u origin claude/focused-feynman-lgilkm`；不要推到其他分支。
