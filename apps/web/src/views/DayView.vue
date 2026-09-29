<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDailyColor, readableTextColor } from '@hueday/core'
import PhotoTile from '../components/PhotoTile.vue'
import { getEntry, saveNote, type EntryResponse } from '../lib/entries'
import { showToast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const date = computed(() => String(route.params.date))
const color = computed(() => getDailyColor(date.value))
const data = ref<EntryResponse | null>(null)
const failed = ref(false)
const note = ref('')
const saved = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    data.value = await getEntry(date.value)
    note.value = saved.value = data.value.entry?.note ?? ''
  } catch {
    failed.value = true
  }
})

const dirty = computed(() => note.value.trim() !== saved.value)

async function save() {
  if (!dirty.value || saving.value) return
  saving.value = true
  try {
    const e = await saveNote(date.value, note.value)
    saved.value = e.note ?? ''
    note.value = saved.value
    showToast('已儲存')
  } catch {
    showToast('儲存失敗，請再試一次')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="page" data-testid="page-day">
    <button class="back" data-testid="back" @click="router.push('/calendar')">‹ 日曆</button>
    <h2 class="date">{{ date }}</h2>

    <div class="chip" :style="{ background: color.hex, color: readableTextColor(color.hex) }">
      <span>{{ color.zh }}</span><small>{{ color.hex }}</small>
    </div>

    <p v-if="failed" class="empty">無法載入這一天</p>
    <template v-else-if="data">
      <div v-if="data.photos.length" class="photos" data-testid="day-photos">
        <PhotoTile v-for="p in data.photos" :key="p.id" :photo="p" />
      </div>
      <p v-else class="empty">這天沒有照片</p>

      <label class="label" for="note">備註</label>
      <textarea id="note" v-model="note" rows="4" maxlength="500" placeholder="寫點什麼吧…" data-testid="note" @blur="save" />
      <button class="save" :disabled="!dirty || saving" data-testid="save-note" @click="save">儲存</button>
    </template>
  </section>
</template>

<style scoped>
.back { border: 0; background: transparent; font-size: 16px; color: var(--ink-soft); padding: 10px 0; min-height: 44px; cursor: pointer; }
.date { font-size: 26px; margin: 2px 0 12px; }
.chip { display: inline-flex; align-items: baseline; gap: 10px; padding: 8px 16px; border-radius: 999px; font-weight: 500; margin-bottom: 16px; }
.chip small { font-family: var(--font-display); opacity: 0.8; font-size: 15px; }
.photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.empty { color: var(--ink-soft); }
.label { display: block; margin: 24px 0 6px; color: var(--ink-soft); font-size: 15px; }
textarea { width: 100%; border: 1.5px solid var(--line); border-radius: var(--radius); background: rgba(255, 255, 255, 0.6); padding: 12px 14px; font: inherit; font-size: 16px; color: var(--ink); resize: vertical; }
textarea:focus { outline: 2px solid var(--ink); outline-offset: 1px; }
.save { display: block; margin: 12px 0 0 auto; min-height: 44px; padding: 0 24px; border: 0; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 16px; cursor: pointer; transition: opacity var(--ease); }
.save:disabled { opacity: 0.35; cursor: default; }
</style>
