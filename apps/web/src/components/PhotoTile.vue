<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { nearestPaletteColor } from '@hueday/core'
import { photoObjectUrl, type PhotoDto } from '../lib/entries'

const props = defineProps<{ photo?: PhotoDto; pending?: boolean }>()
const src = ref('')
const verdict = computed(() => {
  const p = props.photo
  if (!p || p.matchesTarget === null) return ''
  const tag = p.mock ? '（示意）' : ''
  if (p.matchesTarget) return `✓ 找到了：${p.subject ?? ''}${tag}`
  const first = p.dominantColors[0]
  return first ? `這張比較像${nearestPaletteColor(first).zh}${tag}` : ''
})
onMounted(async () => {
  if (props.photo) {
    try {
      src.value = await photoObjectUrl(props.photo.url)
    } catch {
      /* 保持 placeholder */
    }
  }
})
</script>

<template>
  <figure class="card">
    <div class="tile" :class="{ pending: pending || !src }">
      <img v-if="src" :src="src" alt="" />
    </div>
    <p v-if="photo?.aiColorName" class="name" data-testid="color-name">{{ photo.aiColorName }}</p>
    <p v-if="verdict" class="verdict" data-testid="verdict">{{ verdict }}</p>
    <div v-if="photo?.dominantColors.length" class="dots" data-testid="dots">
      <i v-for="c in photo.dominantColors" :key="c" :style="{ background: c }" />
    </div>
  </figure>
</template>

<style scoped>
.card { margin: 0; }
.name { margin: 6px 0 0; font-size: 13px; color: var(--ink); text-align: center; line-height: 1.4; }
.verdict { margin: 6px 0 0; font-size: 13px; color: var(--ink-soft); text-align: center; line-height: 1.4; }
.dots { display: flex; gap: 4px; justify-content: center; margin-top: 6px; }
.dots i { width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(43, 42, 40, 0.12); }
.tile { aspect-ratio: 1; border-radius: var(--radius); overflow: hidden; background: rgba(43, 42, 40, 0.06); box-shadow: var(--shadow); }
.tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pending { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.55; } }
</style>
