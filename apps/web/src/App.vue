<script setup lang="ts">
import { useRoute } from 'vue-router'
import { toast } from './lib/toast'

const route = useRoute()
const tabs = [
  { to: '/', label: '今天', icon: '●' },
  { to: '/calendar', label: '日曆', icon: '▦' },
  { to: '/share', label: '分享', icon: '↗' }
]
</script>

<template>
  <div class="shell">
    <header class="topbar"><h1>拾色 <span>Hueday</span></h1></header>
    <main class="content"><RouterView /></main>
    <Transition name="toast"><div v-if="toast.message" :key="toast.id" class="toast" role="status">{{ toast.message }}</div></Transition>
    <nav class="tabbar">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="tab" :class="{ active: route.meta.tab === t.to }">
        <span class="ico">{{ t.icon }}</span><span>{{ t.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.shell { max-width: var(--max-w); margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; padding-left: var(--safe-left); padding-right: var(--safe-right); }
.topbar { padding: calc(16px + var(--safe-top)) 20px 8px; }
.topbar h1 { font-size: 22px; }
.topbar span { font-weight: 500; color: var(--ink-soft); font-size: 16px; margin-left: 4px; }
.content { flex: 1; padding: 8px 20px calc(var(--tabbar-h) + var(--safe-bottom) + 24px); }
.tabbar {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-w);
  height: calc(var(--tabbar-h) + var(--safe-bottom)); padding-bottom: var(--safe-bottom); display: flex; background: var(--bg); border-top: 1px solid var(--line); z-index: 10;
}
.tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-decoration: none; color: var(--ink-soft); font-size: 15px; transition: color var(--ease); }
.tab .ico { font-size: 18px; }
.tab.active { color: var(--ink); font-weight: 500; }
.toast { position: fixed; left: 50%; bottom: calc(var(--tabbar-h) + 24px + var(--safe-bottom)); transform: translateX(-50%); background: var(--ink); color: var(--bg); padding: 10px 20px; border-radius: 999px; font-size: 15px; z-index: 30; box-shadow: var(--shadow); }
.toast-enter-active, .toast-leave-active { transition: opacity var(--ease), transform var(--ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
