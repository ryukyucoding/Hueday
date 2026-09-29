<script setup lang="ts">
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
    <nav class="tabbar">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to" class="tab" active-class="active" exact-active-class="active">
        <span class="ico">{{ t.icon }}</span><span>{{ t.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.shell { max-width: var(--max-w); margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; }
.topbar { padding: 16px 20px 8px; }
.topbar h1 { font-size: 22px; }
.topbar span { font-weight: 500; color: var(--ink-soft); font-size: 16px; margin-left: 4px; }
.content { flex: 1; padding: 8px 20px calc(var(--tabbar-h) + 24px); }
.tabbar {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-w);
  height: var(--tabbar-h); display: flex; background: var(--bg); border-top: 1px solid var(--line); z-index: 10;
}
.tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-decoration: none; color: var(--ink-soft); font-size: 13px; transition: color var(--ease); }
.tab .ico { font-size: 18px; }
.tab.active { color: var(--ink); font-weight: 500; }
</style>
