import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:8787' } },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // 離線時：預先快取的 App 外殼照常開啟（各頁自己顯示離線狀態）；API 請求不可被換成 index.html
      workbox: { navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/api\//] },
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
