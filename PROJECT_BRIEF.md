# PROJECT BRIEF — 拾色 Hueday

> 一個結合 **Color Hunt × Retro × Strava** 的生活記錄 App：
> 無壓力地記錄生活，並用漂亮的漸層模板一鍵產生可分享的限時動態。
>
> 階段一：網頁版 PWA（Vibe Coding 課程作業，需 20+ prompts、Cloudflare、第三方 API）
> 階段二：原生 App（Capacitor 包裝 或 Expo 重寫 UI 層）

---

## 1. 產品需求（原始構想）

### 1.1 Color Hunt 模式
- 在生活中尋找「屬於某個顏色」的東西拍下來，最後組合成一張該顏色的圖，發成漂亮的限時動態。
- 目的是**有點目的性地記錄生活**。
- 兩種玩法：
  - **單色日**：每天固定一個指定顏色（例：今天找橘色）。
  - **集色日**：當天收集各種不同顏色。

### 1.2 Retro 模式（無壓力記錄）
- 喜歡 Retro「沒有壓力地發動態」的感覺：**不顯示誰看過、沒有瀏覽數**，純粹記錄生活。
- 豐富的回顧與分享功能：
  - **月總結**
  - **去年今天**在做什麼
  - 大量漂亮的限時動態模板

### 1.3 Strava 式分享機制
- 像 Strava 把跑步軌跡、距離、時間做成漂亮的限動卡片，
  這裡把「顏色數據」做成分享卡：連續天數、收集色數、色相分佈、本月主色等。

### 1.4 視覺核心：漸層底圖 + 照片主角
- 靈感來源：[feralui.dev/gradients](https://feralui.dev/gradients)
- 把當天收集到的顏色混成漂亮的漸層（mesh / flow + 底片顆粒感）當**底圖**，
  當天的照片當**主角**，做成適合分享的 9:16 視覺。
- 單色日 → mesh 風格同色系漸層；集色日 → flow 風格多色流動色帶（可延伸成會動的限動）。

### 1.5 一句話目標
**既能讓人無壓力地記錄生活，又有漂亮的模板可以發限時動態。**

---

## 2. 技術架構

| 層 | 技術 | 備註 |
|---|---|---|
| 前端 | Vue 3 + Vite + TypeScript，PWA | 可加入主畫面、開相機 |
| API | Cloudflare Workers | 所有第三方 API key 只存在 Worker Secrets |
| 資料庫 | Cloudflare D1 | 使用者、每日記錄、顏色 |
| 圖片 | Cloudflare R2 | 原圖、產出的限動圖 |
| 限動產圖 | Satori / workers-og（在 Worker 上產 PNG） | **模板只寫一次，網頁和未來 App 共用** |
| AI | Gemini API（Vision + 文字） | 判斷顏色主體、取色名、月總結文案 |
| 天氣（選配） | 中央氣象署開放資料 | 依天氣出每日顏色題 |

### 2.1 降低未來 App 技術債的原則
1. **核心邏輯寫成純 TypeScript 模組**（`/packages/core`），不碰 DOM：抽色、色相分類、漸層參數產生、統計計算。App 可直接 import。
2. **模板渲染放後端**：`GET /api/render?template=<id>&date=<yyyy-mm-dd>` → PNG。不要用 html2canvas 截圖（App 無法沿用）。
3. **前端只負責 UI 和呼叫 API**，之後換 Capacitor 或 Expo 都只動 UI 層。

### 2.2 網頁版先跳過（留給 App）
- 原生「分享到 IG 限動」（IG Share to Stories 可帶貼圖 + 上下漸層背景色，僅原生可用）
- 每日提醒推播（iOS PWA 限制多）
- 照片 EXIF 拍攝時間／地點（網頁上傳常被清除，先用上傳時間）
- 桌面小工具（今日顏色）

### 2.3 資料模型（初版）
```ts
type Entry = {
  id: string
  userId: string
  date: string            // yyyy-mm-dd
  mode: 'single' | 'collect'
  targetColor?: string    // 單色日的題目色 hex
  photos: Photo[]
  note?: string
  createdAt: number
}

type Photo = {
  id: string
  r2Key: string
  dominantColors: string[] // hex, 由 core 抽色
  aiColorName?: string     // 例：「傍晚捷運站的橘」
  matchesTarget?: boolean  // Gemini Vision 判斷
}
```

---

## 3. Vibe Coding Prompt 路線（22 個，可直接複製）

> 使用方式：依序貼到 Google AI Studio / Codex。每一步完成、能跑再進下一步。

### 地基
**P1** 建立一個 Vue 3 + Vite + TypeScript 專案，名稱 hueday，App 顯示名稱「拾色 Hueday」。設定成 PWA（manifest、service worker、可加入主畫面），手機優先的版面，整體風格簡約、留白多、帶一點底片感。

**P2** 設定 Cloudflare 部署：前端用 Cloudflare Pages，另外建立一個 Cloudflare Worker 當 API（/api/*），綁定 D1 資料庫與 R2 bucket。給我 wrangler.toml 與部署步驟。

**P3** 首頁顯示「今日顏色」：從一組精選色票中每天依日期決定一個顏色（同一天所有人相同），顯示色塊、色名與一句提示。提供「單色日／集色日」切換。

**P4** 新增拍照／上傳功能：手機可直接開相機。圖片先在前端壓縮到長邊 1600px，再上傳到 Worker，存進 R2，並在 D1 建立當天的 Entry 記錄。

### 核心
**P5** 建立 packages/core（純 TypeScript、不依賴 DOM 的邏輯）：寫一個從圖片像素抽出 5 個主色的函式（k-means 或 median cut），以及把顏色分類到色相群組（紅、橘、黃、綠、藍、紫、粉、棕、黑白灰）的函式，附單元測試。

**P6** 在 Worker 串接 Gemini Vision API（key 存在 Worker Secrets，不可出現在前端）：傳入照片與今日顏色，回傳 JSON `{ matchesTarget: boolean, subject: string, confidence: number }`，判斷照片主體是否屬於今天的顏色。使用 structured output / JSON schema。

**P7** 再用 Gemini 為每張照片的主色取一個詩意的中文名字（例：「傍晚捷運站的橘」），長度 4–10 字，存入 Photo.aiColorName，顯示在照片卡片上。

**P8** 在 core 寫漸層產生器：輸入 2–5 個顏色，輸出 mesh gradient 參數（每個色點的位置、半徑）。前端用多層 radial-gradient + blur 呈現，並用 SVG feTurbulence 疊一層底片顆粒。單色日自動補同色系深淺色。

**P9** 限動模板一「Color Hunt 拼貼」：9:16 畫布，漸層底圖，當天照片以 2–6 張的拼貼排版當主角，上方顯示日期與今日色名，下方小字顯示收集數量。先在前端做預覽。

**P10** 把模板一搬到 Worker 用 Satori（或 workers-og）產生 1080×1920 PNG：`GET /api/render?template=collage&date=yyyy-mm-dd`。前端預覽改成直接顯示這張 PNG，確保網頁看到的和下載的一致。

### 分享
**P11** 加入分享按鈕：用 Web Share API（支援檔案分享）把產出的 PNG 分享出去，讓使用者可以選 Instagram；不支援的瀏覽器則改為下載。

**P12** 限動模板二「Strava 風數據卡」：顯示連續記錄天數、本月收集色數、色相分佈環形圖、本月主色，數據大字排版、風格像 Strava 的活動分享卡，同樣由 Worker 產 PNG。

**P13** 限動模板三「單色日色票」：像色票卡的設計，上半部大面積漸層、下半部 3–4 張照片小圖與 AI 色名，底部顯示 HEX 值。

**P14** 模板選擇頁：左右滑動切換三種模板預覽，可切換漸層風格（mesh / flow）與顆粒強度，選好後下載或分享。

### Retro 感
**P15** 「日曆牆」頁面：月曆格子，每天用當天的漸層小方塊呈現，點進去看當天照片。整個 App 不顯示任何瀏覽數、按讚數，強調無壓力記錄。

**P16** 「去年今天」：若一年前的同一天有記錄，在首頁頂部以溫和的卡片顯示，可一鍵產生對比限動（去年 vs 今年的顏色）。

**P17** 「月總結」：每月底讓 Gemini 讀取本月所有 Entry 的顏色、AI 色名與備註，寫一段 80–120 字、像 Spotify Wrapped 口吻的中文回顧，並產生月總結限動模板。

**P18** 月色票卡：把整月每天的主色排成 5×7 色格，做成一張可分享的月色票海報。

### 收尾
**P19** 全面檢查手機版體驗：iPhone Safari 與 Android Chrome 的相機、安全區域（safe-area）、字級、按鈕大小，修正版面問題。

**P20** 加入錯誤處理與 loading 狀態：上傳失敗、Gemini 逾時或額度用完、產圖失敗時顯示友善提示與重試按鈕，不可出現白畫面。

**P21** 在 Worker 加 rate limit（每使用者每分鐘上限）與圖片大小限制，並用 KV 或 Cache API 快取產出的 PNG，避免重複呼叫 Gemini 與重複產圖。

**P22** 正式部署，設定自訂網域，寫一份 README：功能介紹、架構圖、使用的第三方 API、本地開發與部署步驟。

---

## 4. 第三方 API 清單（作業要求）
- **Gemini API**：Vision 顏色主體判斷、AI 色名、月總結文案
- **Cloudflare Workers / D1 / R2 / KV**：部署與後端
- **Satori / workers-og**：伺服器端產生限動 PNG
- （選配）**中央氣象署開放資料**：依天氣出每日顏色題

## 5. 階段二：原生 App 備忘
- 路線 A（最省力）：Capacitor 包 Vue → 補原生 IG 限動分享、推播、EXIF。
- 路線 B（最佳體驗）：Expo / React Native 重寫 UI，沿用 core、Worker API、模板產圖 API。
- App 限定功能：IG Share to Stories（貼圖＋漸層背景色）、每日提醒推播、桌面小工具、flow 漸層會動的 MP4 限動。
