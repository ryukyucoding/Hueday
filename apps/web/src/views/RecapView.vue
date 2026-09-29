<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchRecap, recapFilename, type RecapResponse } from '../lib/recap'
import { fetchRenderBlob } from '../lib/render'
import { shareOrDownload } from '../lib/share'
import { showToast } from '../lib/toast'
import { todayString } from '../lib/date'

const route = useRoute()
const router = useRouter()
const month = computed(() => String(route.params.month))
const today = todayString()
const asOf = computed(() => (today.startsWith(month.value) ? today : undefined))

const recap = ref<RecapResponse | null>(null)
const pngUrl = ref('')
const pngBlob = ref<Blob | null>(null)
const loading = ref(true)
const failed = ref(false)
const sharing = ref(false)

function setPng(blob: Blob | null) {
  if (pngUrl.value) URL.revokeObjectURL(pngUrl.value)
  pngBlob.value = blob
  pngUrl.value = blob ? URL.createObjectURL(blob) : ''
}

async function load(force = false) {
  loading.value = true
  failed.value = false
  try {
    recap.value = await fetchRecap(month.value, { force, asOf: asOf.value })
    // 圖片使用剛產生（或快取）的文字，不會再呼叫一次 Gemini
    setPng(await fetchRenderBlob({ template: 'recap', month: month.value, asOf: asOf.value }))
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
onBeforeUnmount(() => setPng(null))

async function onShare() {
  if (!pngBlob.value || sharing.value) return
  sharing.value = true
  try {
    const r = await shareOrDownload(pngBlob.value, recapFilename(month.value))
    if (r === 'shared') showToast('已分享')
    else if (r === 'downloaded') showToast('圖片已下載')
  } finally {
    sharing.value = false
  }
}
</script>

<template>
  <section class="page" data-testid="page-recap">
    <button class="back" @click="router.push('/calendar')">‹ 日曆</button>
    <h2>{{ month }} 回顧</h2>

    <p v-if="failed" class="msg" data-testid="recap-error">暫時無法產生回顧，請稍後再試。</p>
    <template v-else>
      <p v-if="recap" class="text" data-testid="recap-text">{{ recap.text }}</p>
      <p v-if="recap?.mock" class="hint">（示意文字：尚未設定 AI 金鑰）</p>

      <div class="wrap">
        <img v-if="pngUrl" :src="pngUrl" class="png" alt="月總結限動預覽" data-testid="recap-png" />
        <div v-else class="skeleton" />
        <p v-if="loading" class="badge">產生中…</p>
      </div>

      <div class="actions">
        <button class="ghost" :disabled="loading" data-testid="regen" @click="load(true)">重新產生</button>
        <button class="share" :disabled="!pngBlob || sharing" data-testid="recap-share" @click="onShare">分享</button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.back { border: 0; background: transparent; font-size: 16px; color: var(--ink-soft); padding: 10px 0; min-height: 44px; cursor: pointer; }
h2 { font-size: 24px; margin: 2px 0 12px; }
.text { line-height: 1.8; font-size: 16px; margin: 0 0 6px; }
.hint, .msg { color: var(--ink-soft); font-size: 15px; margin: 0 0 12px; }
.wrap { position: relative; max-width: 340px; margin: 16px auto 0; }
.png { display: block; width: 100%; aspect-ratio: 9 / 16; border-radius: var(--radius); box-shadow: var(--shadow); }
.skeleton { width: 100%; aspect-ratio: 9 / 16; border-radius: var(--radius); background: rgba(43, 42, 40, 0.06); animation: pulse 1.2s ease-in-out infinite; }
.badge { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); margin: 0; padding: 6px 14px; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 15px; }
.actions { display: flex; justify-content: center; gap: 12px; margin-top: 16px; }
.actions button { min-height: 48px; padding: 0 24px; border-radius: 999px; font-size: 16px; cursor: pointer; transition: opacity var(--ease); }
.ghost { border: 1.5px solid var(--line); background: transparent; }
.share { border: 0; background: var(--ink); color: var(--bg); min-width: 120px; }
.actions button:disabled { opacity: 0.35; cursor: default; }
@keyframes pulse { 50% { opacity: 0.55; } }
</style>
