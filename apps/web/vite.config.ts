import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
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
