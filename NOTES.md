# NOTES
P1: npm workspaces monorepo (core/api/web)；Vue3+Vite6+vue-router4+vite-plugin-pwa；固定 TS 5.9 / vitest 3 / vite 6（避開 registry 最新大版本的相容風險）；PWA icon 由 scripts/gen-icons.mjs 用 sharp 從 icon.svg 產生 PNG；api 目前只是佔位 build。
