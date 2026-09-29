<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { online } from './lib/online'
import { hideToast, toast } from './lib/toast'

const route = useRoute()

// 頁面元件丟出例外時不要整頁白掉：顯示友善的替代畫面，換頁後恢復
const crashed = ref(false)
onErrorCaptured((err) => {
  console.error(err)
  crashed.value = true
  return false
})
watch(() => route.fullPath, () => (crashed.value = false))

function runToastAction() {
  const run = toast.action?.run
  hideToast()
  run?.()
}
const tabs = [
  { to: '/', label: '今天', icon: '●' },
  { to: '/calendar', label: '日曆', icon: '▦' },
  { to: '/share', label: '分享', icon: '↗' }
]
</script>

<template>
  <div class="shell">
    <header class="topbar"><h1>拾色 <span>Hueday</span></h1></header>
    <p v-if="!online" class="offline" role="status" data-testid="offline-banner">目前離線 · 部分功能暫時無法使用</p>
    <main class="content">
      <section v-if="crashed" class="crash" data-testid="crash">
        <h2>這一頁出了點問題</h2>
        <p>別擔心，你的照片和記錄都沒有遺失。</p>
        <div class="crash-actions">
          <button @click="$router.go(0)">重新載入</button>
          <RouterLink to="/" class="home">回到今天</RouterLink>
        </div>
      </section>
      <RouterView v-else />
    </main>
    <Transition name="toast" mode="out-in">
      <div v-if="toast.message" :key="toast.id" class="toast" :class="toast.kind" :role="toast.kind === 'error' ? 'alert' : 'status'" data-testid="toast">
        <span>{{ toast.message }}</span>
        <button v-if="toast.action" class="toast-action" data-testid="toast-action" @click="runToastAction">{{ toast.action.label }}</button>
      </div>
    </Transition>
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
.toast { position: fixed; left: 50%; bottom: calc(var(--tabbar-h) + 92px + var(--safe-bottom)); transform: translateX(-50%); width: max-content; max-width: calc(100vw - 32px); display: flex; align-items: center; gap: 12px; background: var(--ink); color: var(--bg); padding: 10px 20px; border-radius: 999px; font-size: 15px; line-height: 1.4; z-index: 30; box-shadow: var(--shadow); }
.toast.error { background: #8c2a22; }
.toast-action { flex: none; min-height: 44px; margin: -8px -10px -8px 0; padding: 0 16px; border: 0; border-radius: 999px; background: rgba(255, 255, 255, 0.2); color: inherit; font-size: 15px; font-weight: 500; cursor: pointer; }
.offline { margin: 0; padding: 8px 20px; background: rgba(43, 42, 40, 0.08); color: var(--ink-soft); font-size: 15px; text-align: center; }
.crash { padding: 48px 8px; text-align: center; }
.crash p { color: var(--ink-soft); line-height: 1.6; }
.crash-actions { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }
.crash-actions button, .crash-actions .home { min-height: 48px; padding: 0 24px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 16px; text-decoration: none; cursor: pointer; }
.crash-actions button { border: 0; background: var(--ink); color: var(--bg); }
.crash-actions .home { border: 1.5px solid var(--line); color: var(--ink); }
.toast-enter-active, .toast-leave-active { transition: opacity var(--ease), transform var(--ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
