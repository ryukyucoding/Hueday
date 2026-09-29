<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getDailyColor } from '@hueday/core'
import CollagePreview from '../components/CollagePreview.vue'
import { getEntry, type PhotoDto } from '../lib/entries'
import { todayString } from '../lib/date'
import { gradientDataUri, pickDistinct } from '../lib/gradient'
import { fetchRenderBlob } from '../lib/render'

const date = todayString()
const photos = ref<PhotoDto[]>([])
const mode = ref<'single' | 'collect'>('single')
const pngUrl = ref('')
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
    pngUrl.value = URL.createObjectURL(await fetchRenderBlob({ template: 'collage', date }, ctrl.signal))
  } catch {
    renderFailed.value = true
  }
})
onBeforeUnmount(() => {
  ctrl.abort()
  if (pngUrl.value) URL.revokeObjectURL(pngUrl.value)
})

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
  </section>
</template>

<style scoped>
.hint { color: var(--ink-soft); margin: 4px 0 16px; }
.wrap { max-width: 340px; margin: 0 auto; }
.png { display: block; width: 100%; aspect-ratio: 9 / 16; border-radius: var(--radius); box-shadow: var(--shadow); }
.note { color: var(--ink-soft); font-size: 15px; text-align: center; margin: 12px 0 0; }
</style>
