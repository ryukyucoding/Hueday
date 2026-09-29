<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { photoObjectUrl, type PhotoDto } from '../lib/entries'

const props = defineProps<{ photo?: PhotoDto; pending?: boolean }>()
const src = ref('')
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
    <div v-if="photo?.dominantColors.length" class="dots" data-testid="dots">
      <i v-for="c in photo.dominantColors" :key="c" :style="{ background: c }" />
    </div>
  </figure>
</template>

<style scoped>
.card { margin: 0; }
.dots { display: flex; gap: 4px; justify-content: center; margin-top: 6px; }
.dots i { width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(43, 42, 40, 0.12); }
.tile { aspect-ratio: 1; border-radius: var(--radius); overflow: hidden; background: rgba(43, 42, 40, 0.06); box-shadow: var(--shadow); }
.tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pending { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.55; } }
</style>
