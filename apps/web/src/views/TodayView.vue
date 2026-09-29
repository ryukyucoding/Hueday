<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../lib/api'

const health = ref('檢查中…')
onMounted(async () => {
  try {
    const r = await api<{ ok: boolean }>('/api/health')
    health.value = r.ok ? 'API 連線正常' : 'API 異常'
  } catch {
    health.value = 'API 未連線'
  }
})
</script>

<template>
  <section class="page" data-testid="page-today">
    <h2>今天</h2>
    <p class="hint">(placeholder)</p>
    <p class="hint" data-testid="health">{{ health }}</p>
  </section>
</template>

<style scoped>
.hint { color: var(--ink-soft); }
</style>
