<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getDailyColor, yearAgo } from '@hueday/core'
import { getEntry, photoObjectUrl, type EntryResponse } from '../lib/entries'

const props = defineProps<{ date: string }>()
const router = useRouter()
const last = computed(() => yearAgo(props.date))
const data = ref<EntryResponse | null>(null)
const thumb = ref('')

// 只有一年前的同一天有照片時才出現；沒有就完全不佔位置
const found = computed(() => {
  const d = data.value
  if (!d?.photos.length) return null
  const first = d.photos[0]
  return { name: first.aiColorName ?? getDailyColor(last.value).zh, first }
})

onMounted(async () => {
  try {
    data.value = await getEntry(last.value)
    const first = data.value.photos[0]
    if (first) thumb.value = await photoObjectUrl(first.url)
  } catch {
    /* 沒有連線就不顯示 */
  }
})
</script>

<template>
  <aside v-if="found" class="card" data-testid="last-year">
    <div class="thumb" :style="thumb ? { backgroundImage: `url(${thumb})` } : undefined" />
    <div class="body">
      <p class="txt">去年的今天，你找到了<strong>「{{ found.name }}」</strong></p>
      <button class="link" data-testid="compare-btn" @click="router.push({ path: '/share', query: { template: 'compare' } })">做成對比限動 ›</button>
    </div>
  </aside>
</template>

<style scoped>
.card { display: flex; align-items: center; gap: 14px; padding: 12px 14px; margin: 4px 0 16px; border-radius: var(--radius); background: rgba(255, 255, 255, 0.65); box-shadow: var(--shadow); }
.thumb { flex: none; width: 64px; height: 64px; border-radius: 12px; background: rgba(43, 42, 40, 0.08) center / cover; }
.body { min-width: 0; }
.txt { margin: 0; font-size: 15px; line-height: 1.5; }
.txt strong { font-weight: 500; }
.link { border: 0; background: transparent; padding: 8px 0 0; min-height: 44px; font-size: 15px; color: var(--ink-soft); cursor: pointer; }
</style>
