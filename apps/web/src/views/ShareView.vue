<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getDailyColor } from '@hueday/core'
import CollagePreview from '../components/CollagePreview.vue'
import { getEntry, type PhotoDto } from '../lib/entries'
import { todayString } from '../lib/date'
import { gradientDataUri, pickDistinct } from '../lib/gradient'
import { fetchRenderBlob } from '../lib/render'
import { shareFilename, shareOrDownload } from '../lib/share'
import { showToast } from '../lib/toast'

const date = todayString()
const photos = ref<PhotoDto[]>([])
const mode = ref<'single' | 'collect'>('single')
const pngUrl = ref('')
const pngBlob = ref<Blob | null>(null)
const sharing = ref(false)
const renderFailed = ref(false)
const ctrl = new AbortController()

onMounted(async () => {
  try {
    const r = await getEntry(date)
    photos.value = r.photos
    if (r.entry) mode.value = r.entry.mode
  } catch {
    /* 沒有連線時顯示前端版預覽 */
  }
  try {
    // 網頁看到的和下載的一致：預覽直接顯示 Worker 產的 PNG
    const blob = await fetchRenderBlob({ template: 'collage', date }, ctrl.signal)
    pngBlob.value = blob
    pngUrl.value = URL.createObjectURL(blob)
  } catch {
    renderFailed.value = true
  }
})
onBeforeUnmount(() => {
  ctrl.abort()
  if (pngUrl.value) URL.revokeObjectURL(pngUrl.value)
})

async function onShare() {
  if (!pngBlob.value || sharing.value) return
  sharing.value = true
  try {
    const r = await shareOrDownload(pngBlob.value, shareFilename(date))
    if (r === 'shared') showToast('已分享')
    else if (r === 'downloaded') showToast('圖片已下載')
  } finally {
    sharing.value = false
  }
}

const bg = computed(() => {
  const colors = pickDistinct(photos.value.flatMap((p) => p.dominantColors))
  return gradientDataUri(colors.length ? colors : [getDailyColor(date).hex], { style: mode.value === 'single' ? 'mesh' : 'flow', seed: date })
})
</script>

<template>
  <section class="page" data-testid="page-share">
    <h2>分享</h2>
    <p class="hint">Color Hunt 拼貼 · 1080×1920</p>
    <div class="wrap">
      <img v-if="pngUrl" :src="pngUrl" class="png" alt="限時動態預覽" data-testid="render-png" />
      <!-- 載入中（或產圖失敗）先顯示前端版 -->
      <CollagePreview v-else :date="date" :photos="photos" :bg="bg" />
      <p v-if="!pngUrl && !renderFailed" class="note">產生中…</p>
      <p v-if="renderFailed" class="note">無法產生圖片，目前顯示的是預覽版</p>
    </div>
    <button class="share" :disabled="!pngBlob || sharing" data-testid="share-btn" @click="onShare">分享</button>
  </section>
</template>

<style scoped>
.hint { color: var(--ink-soft); margin: 4px 0 16px; }
.wrap { max-width: 340px; margin: 0 auto; }
.png { display: block; width: 100%; aspect-ratio: 9 / 16; border-radius: var(--radius); box-shadow: var(--shadow); }
.share { display: block; margin: 20px auto 0; min-width: 160px; min-height: 48px; padding: 0 28px; border: 0; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 16px; cursor: pointer; transition: opacity var(--ease); }
.share:disabled { opacity: 0.35; cursor: default; }
.note { color: var(--ink-soft); font-size: 15px; text-align: center; margin: 12px 0 0; }
</style>
