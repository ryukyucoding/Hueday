/**
 * 用 Playwright 模擬 iPhone 與 Pixel，截三個 tab 存到 docs/screenshots/，並檢查：
 *   1. 沒有水平捲動  2. 文字 ≥ 15px（限動預覽縮圖內的文字除外）  3. 觸控目標 ≥ 44px
 * 用法：
 *   npm run dev            # 另一個終端機先啟動
 *   npm run seed           # 想要有內容的截圖時（預設使用者 seed-user）
 *   npm run screenshots
 * 環境變數：BASE_URL（預設 http://localhost:5173）、SEED_USER（預設 seed-user）、CHROMIUM_PATH
 */
import { chromium, devices } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const USER = process.env.SEED_USER ?? 'seed-user'
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname
const CHROMIUM = process.env.CHROMIUM_PATH ?? ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)

const TABS = [
  { name: 'today', path: '/', ready: '[data-testid=page-today]' },
  { name: 'calendar', path: '/calendar', ready: '[data-testid=grid] .day' },
  { name: 'share', path: '/share', ready: '[data-testid=render-png]' }
]
const DEVICES = ['iPhone 14', 'Pixel 7']

try {
  const r = await fetch(`${BASE}/api/health`)
  if (!r.ok) throw new Error(String(r.status))
} catch {
  console.error(`連不到 ${BASE}。請先執行 npm run dev（想要有內容再先 npm run seed）。`)
  process.exit(2)
}
mkdirSync(OUT, { recursive: true })

/**
 * 在頁面內檢查，回傳違規清單。
 * width 是裝置的真實 CSS 寬度：手機版 Chrome 遇到超寬內容會自動縮小可視範圍，
 * window.innerWidth 也會跟著變大，所以不能拿它當基準。
 */
function audit(width) {
  const problems = []
  const doc = document.documentElement
  if (doc.scrollWidth > width + 1) problems.push(`水平捲動：scrollWidth ${doc.scrollWidth} > 裝置寬度 ${width}`)
  // body 設了 overflow-x:hidden 會讓 scrollWidth 失真，所以另外逐一檢查元素是否超出視窗左右邊界
  // （祖先有 overflow 捲動/裁切的容器，例如模板橫向滑動區，不算）
  const clipped = (el) => {
    for (let a = el.parentElement; a && a !== document.body && a !== doc; a = a.parentElement) {
      const o = getComputedStyle(a)
      if (o.overflowX !== 'visible' || o.overflow !== 'visible') return true
    }
    return false
  }
  for (const el of document.body.querySelectorAll('*')) {
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed' || el.getClientRects().length === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || clipped(el)) continue
    if (r.right > width + 1 || r.left < -1) {
      problems.push(`超出視窗：${el.tagName.toLowerCase()}.${el.className} left=${Math.round(r.left)} right=${Math.round(r.right)} (裝置寬度 ${width})`)
      break // 一個就夠，避免整棵子樹重複回報
    }
  }

  const visible = (el) => {
    const s = getComputedStyle(el)
    return s.visibility !== 'hidden' && s.display !== 'none' && el.getClientRects().length > 0
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const seen = new Set()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement
    if (!el || seen.has(el) || !n.textContent.trim() || !visible(el)) continue
    seen.add(el)
    if (el.closest('.canvas') || el.closest('script,style')) continue // 限動預覽縮圖：字級是縮放後的
    const px = parseFloat(getComputedStyle(el).fontSize)
    if (px < 15) problems.push(`字級 ${px}px < 15px：「${n.textContent.trim().slice(0, 16)}」(${el.tagName.toLowerCase()}.${el.className})`)
  }
  for (const el of document.querySelectorAll('button, a[href], [role=tab], input[type=range], textarea')) {
    if (!visible(el) || el.closest('.canvas')) continue
    const r = el.getBoundingClientRect()
    if (Math.min(r.width, r.height) < 43.5) problems.push(`觸控目標 ${Math.round(r.width)}×${Math.round(r.height)} < 44：${el.tagName.toLowerCase()}.${el.className} 「${(el.textContent || '').trim().slice(0, 8)}」`)
    if (el.matches('textarea, input') && parseFloat(getComputedStyle(el).fontSize) < 16) problems.push(`輸入框字級 < 16px（iOS 會自動放大）：${el.tagName.toLowerCase()}`)
  }
  return problems
}

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] })
let failed = 0
for (const name of DEVICES) {
  const { defaultBrowserType, ...opts } = devices[name]
  const ctx = await browser.newContext({ ...opts, locale: 'zh-TW' })
  const page = await ctx.newPage()
  for (const tab of TABS) {
    await page.goto(`${BASE}${tab.path}${tab.path.includes('?') ? '&' : '?'}uid=${USER}`)
    await page.waitForSelector(tab.ready, { timeout: 60_000 }).catch(() => console.warn(`  ! ${name}/${tab.name}：等不到 ${tab.ready}，仍然截圖`))
    if (tab.name === 'share') await page.waitForFunction(() => !document.querySelector('.badge'), null, { timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(600)
    const file = `${name.toLowerCase().replace(/\s+/g, '-')}-${tab.name}.png`
    await page.screenshot({ path: OUT + file }) // 視窗大小 = 使用者實際看到的畫面（fullPage 會讓固定的 tab bar 跑到中間）
    const problems = await page.evaluate(audit, opts.viewport.width)
    console.log(`${problems.length ? '✗' : '✓'} ${name} / ${tab.name} → docs/screenshots/${file}`)
    for (const p of problems) console.log(`    - ${p}`)
    failed += problems.length
  }
  await ctx.close()
}
await browser.close()
if (failed) {
  console.error(`\n共 ${failed} 個問題`)
  process.exit(1)
}
console.log('\n全部通過：無水平捲動、字級 ≥ 15px、觸控目標 ≥ 44px')
