<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { monthGrid, readableTextColor, shiftMonth } from '@hueday/core'
import { getMonth, type DaySummary } from '../lib/entries'
import { todayString } from '../lib/date'
import { cellGradientUri } from '../lib/gradient'

const router = useRouter()
const today = todayString()
const month = ref(today.slice(0, 7))
const cache = ref<Record<string, Map<string, DaySummary>>>({})
const loading = ref(false)
const failed = ref(false)

async function load(m: string) {
  if (cache.value[m]) return
  loading.value = true
  failed.value = false
  try {
    const r = await getMonth(m)
    cache.value = { ...cache.value, [m]: new Map(r.days.map((d) => [d.date, d])) }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

// 目前月份載入後，順手預載前後一個月，切換月份時不用等
watch(month, async (m) => {
  await load(m)
  load(shiftMonth(m, -1))
  load(shiftMonth(m, 1))
}, { immediate: false })
onMounted(async () => {
  await load(month.value)
  load(shiftMonth(month.value, -1))
})

const days = computed(() => cache.value[month.value] ?? new Map<string, DaySummary>())
const grid = computed(() => monthGrid(month.value, 0))
const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const title = computed(() => {
  const [y, m] = month.value.split('-')
  return { year: y, month: String(Number(m)) }
})

// 每個月只算一次格子（漸層 SVG 不便宜，不要在模板裡重複呼叫）
const cells = computed(() =>
  grid.value.map((date) => {
    if (!date) return null
    const d = days.value.get(date)
    const style: Record<string, string> | undefined =
      d && d.colors.length
        ? {
            backgroundImage: cellGradientUri(d.colors, { style: d.mode === 'collect' ? 'flow' : 'mesh', seed: date }),
            color: readableTextColor(d.colors[0])
          }
        : undefined
    return { date, style, hasNote: !!d?.hasNote }
  })
)

function open(date: string) {
  if (date > today) return
  router.push({ name: 'day', params: { date } })
}
</script>

<template>
  <section class="page cal" data-testid="page-calendar">
    <header class="head">
      <button class="nav" aria-label="上個月" data-testid="prev" @click="month = shiftMonth(month, -1)">‹</button>
      <div class="mid">
        <h2 data-testid="month-title"><span>{{ title.year }}</span> {{ title.month }} 月</h2>
        <button class="recap" data-testid="recap-link" @click="router.push({ name: 'recap', params: { month } })">本月回顧 ›</button>
      </div>
      <button class="nav" aria-label="下個月" data-testid="next" @click="month = shiftMonth(month, 1)">›</button>
    </header>

    <div class="wd"><span v-for="w in weekdays" :key="w">{{ w }}</span></div>
    <div class="grid" :class="{ busy: loading && !cache[month] }" data-testid="grid">
      <template v-for="(c, i) in cells" :key="i">
        <span v-if="!c" class="blank" />
        <button
          v-else
          class="day"
          :class="{ has: !!c.style, today: c.date === today, future: c.date > today, note: c.hasNote && !c.style }"
          :style="c.style"
          :disabled="c.date > today"
          :data-date="c.date"
          :aria-label="c.date"
          @click="open(c.date)"
        >
          {{ Number(c.date.slice(8)) }}
        </button>
      </template>
    </div>
    <p v-if="failed" class="note">無法載入這個月份</p>
  </section>
</template>

<style scoped>
/* 7 欄格子在窄螢幕要讓格子 ≥ 44px：日曆頁左右內距縮小 */
.cal { margin: 0 -8px; }
.head { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 12px; }
.mid { text-align: center; }
.recap { border: 0; background: transparent; color: var(--ink-soft); font-size: 15px; min-height: 44px; padding: 0 12px; cursor: pointer; }
.head h2 { font-size: 22px; }
.head h2 span { font-weight: 500; color: var(--ink-soft); font-size: 16px; margin-right: 4px; }
.nav { width: 44px; height: 44px; border: 0; border-radius: 50%; background: rgba(43, 42, 40, 0.06); font-size: 24px; cursor: pointer; transition: background var(--ease); }
.nav:active { background: rgba(43, 42, 40, 0.14); }
.wd { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; color: var(--ink-soft); font-size: 15px; margin-bottom: 6px; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; transition: opacity var(--ease); }
.grid.busy { opacity: 0.4; }
.blank { aspect-ratio: 1; }
.day { aspect-ratio: 1; border: 1.5px dashed var(--line); border-radius: 10px; background: transparent; color: var(--ink-soft); font-size: 15px; padding: 4px 0 0 6px; text-align: left; cursor: pointer; background-size: cover; background-position: center; transition: transform var(--ease); min-height: 44px; }
.day.has { border: 0; box-shadow: var(--shadow); }
.day.note { border-style: solid; }
.day.today { outline: 2px solid var(--ink); outline-offset: 2px; }
.day.future { opacity: 0.35; cursor: default; }
.day:active:not(:disabled) { transform: scale(0.96); }
.note { color: var(--ink-soft); text-align: center; }
</style>
