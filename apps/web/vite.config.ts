import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  worker: { format: 'es' },
  server: { proxy: { '/api': 'http://localhost:8787' } },
  preview: { proxy: { '/api': 'http://localhost:8787' } },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // 離線時：預先快取的 App 外殼照常開啟（各頁自己顯示離線狀態）；API 請求不可被換成 index.html
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // 產圖用的 wasm（約 2.4 MB）只有分享時才需要：不預先快取，第一次用到才下載，之後從快取讀
        globIgnores: ['**/*.wasm'],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.endsWith('.wasm'), handler: 'CacheFirst', options: { cacheName: 'hueday-wasm', expiration: { maxEntries: 2 } } },
          // 字型回應是 immutable（同樣的字永遠同樣的檔案）
          { urlPattern: ({ url }) => url.pathname === '/api/font', handler: 'CacheFirst', options: { cacheName: 'hueday-fonts', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 40 } } }
        ]
      },
      includeAssets: ['icon.svg'],
      manifest: {
        name: '拾色 Hueday',
        short_name: 'Hueday',
        description: '每天拾起一個顏色，無壓力地記錄生活',
        theme_color: '#FAF7F2',
        background_color: '#FAF7F2',
        display: 'standalone',
        start_url: '/',
        lang: 'zh-Hant',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
})
