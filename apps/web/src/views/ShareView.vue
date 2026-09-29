<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getDailyColor } from '@hueday/core'
import CollagePreview from '../components/CollagePreview.vue'
import { getEntry, type PhotoDto } from '../lib/entries'
import { todayString } from '../lib/date'
import { gradientDataUri, pickDistinct } from '../lib/gradient'

const date = todayString()
const photos = ref<PhotoDto[]>([])
const mode = ref<'single' | 'collect'>('single')

onMounted(async () => {
  try {
    const r = await getEntry(date)
    photos.value = r.photos
    if (r.entry) mode.value = r.entry.mode
  } catch {
    /* 沒有連線時顯示空白預覽 */
  }
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
    <div class="wrap"><CollagePreview :date="date" :photos="photos" :bg="bg" /></div>
  </section>
</template>

<style scoped>
.hint { color: var(--ink-soft); margin: 4px 0 16px; }
.wrap { max-width: 340px; margin: 0 auto; }
</style>
