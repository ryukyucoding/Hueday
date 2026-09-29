<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { HUE_GROUPS, HUE_GROUP_LABELS, getDailyColor, readableTextColor } from '@hueday/core'
import { api } from '../lib/api'
import { todayString } from '../lib/date'
import { loadMode, saveMode, type Mode } from '../lib/mode'

const date = todayString()
const color = getDailyColor(date)
const textColor = readableTextColor(color.hex)
const mode = ref<Mode>(loadMode(date))
watch(mode, (m) => saveMode(date, m))

const health = ref('')
onMounted(async () => {
  try {
    const r = await api<{ ok: boolean }>('/api/health')
    health.value = r.ok ? 'API 連線正常' : 'API 異常'
  } catch {
    health.value = 'API 未連線'
  }
})

const modes: { id: Mode; label: string }[] = [
  { id: 'single', label: '單色日' },
  { id: 'collect', label: '集色日' }
]
const hueSlots = computed(() => HUE_GROUPS.map((g) => ({ id: g, label: HUE_GROUP_LABELS[g], hex: null as string | null })))
</script>

<template>
  <section class="page" data-testid="page-today">
    <p class="date">{{ date }}</p>

    <div class="seg" role="tablist">
      <button v-for="m in modes" :key="m.id" role="tab" :aria-selected="mode === m.id" :class="{ on: mode === m.id }" @click="mode = m.id">
        {{ m.label }}
      </button>
    </div>

    <template v-if="mode === 'single'">
      <div class="swatch" :style="{ background: color.hex, color: textColor }" data-testid="swatch">
        <span class="hex">{{ color.hex }}</span>
        <h2>{{ color.zh }}</h2>
        <span class="en">{{ color.en }}</span>
      </div>
      <p class="tip">{{ color.hint }}</p>
    </template>

    <template v-else>
      <p class="tip">今天不限顏色，把遇見的每一種顏色都收進來吧。</p>
      <div class="grid" data-testid="collect-grid">
        <div v-for="s in hueSlots" :key="s.id" class="slot" :style="s.hex ? { background: s.hex } : undefined">
          <span>{{ s.label }}</span>
        </div>
      </div>
    </template>

    <p v-if="health" class="health" data-testid="health">{{ health }}</p>
  </section>
</template>

<style scoped>
.date { font-family: var(--font-display); font-size: 15px; color: var(--ink-soft); margin: 4px 0 12px; }
.seg { display: inline-flex; padding: 3px; border-radius: 999px; background: rgba(43, 42, 40, 0.06); margin-bottom: 16px; }
.seg button { border: 0; background: transparent; padding: 8px 18px; border-radius: 999px; font-size: 15px; min-height: 40px; cursor: pointer; transition: all var(--ease); }
.seg button.on { background: var(--bg); box-shadow: var(--shadow); font-weight: 500; }
.swatch { border-radius: var(--radius); box-shadow: var(--shadow); aspect-ratio: 4 / 5; padding: 20px; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; }
.swatch .hex { font-family: var(--font-display); opacity: 0.8; letter-spacing: 0.08em; font-size: 15px; }
.swatch h2 { font-size: 40px; }
.swatch .en { opacity: 0.8; font-size: 15px; }
.tip { color: var(--ink-soft); line-height: 1.6; margin: 16px 2px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.slot { aspect-ratio: 1; border-radius: var(--radius); border: 1.5px dashed var(--line); display: flex; align-items: center; justify-content: center; color: var(--ink-soft); font-size: 15px; }
.health { color: var(--ink-soft); font-size: 13px; text-align: center; margin-top: 24px; }
</style>
