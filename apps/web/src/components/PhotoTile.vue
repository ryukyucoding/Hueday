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
  <figure class="tile" :class="{ pending: pending || !src }">
    <img v-if="src" :src="src" alt="" />
  </figure>
</template>

<style scoped>
.tile { margin: 0; aspect-ratio: 1; border-radius: var(--radius); overflow: hidden; background: rgba(43, 42, 40, 0.06); box-shadow: var(--shadow); }
.tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pending { animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.55; } }
</style>
