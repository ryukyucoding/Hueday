<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDailyColor, readableTextColor } from '@hueday/core'
import PhotoTile from '../components/PhotoTile.vue'
import { getEntry, saveNote, type EntryResponse } from '../lib/entries'
import { showError, showToast } from '../lib/toast'
import { friendlyMessage } from '../lib/errors'

const route = useRoute()
const router = useRouter()
const date = computed(() => String(route.params.date))
const color = computed(() => getDailyColor(date.value))
const data = ref<EntryResponse | null>(null)
const errorMsg = ref('')
const loading = ref(true)
const note = ref('')
const saved = ref('')
const saving = ref(false)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    data.value = await getEntry(date.value)
    note.value = saved.value = data.value.entry?.note ?? ''
  } catch (e) {
    errorMsg.value = friendlyMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const dirty = computed(() => note.value.trim() !== saved.value)

async function save() {
  if (!dirty.value || saving.value) return
  saving.value = true
  try {
    const e = await saveNote(date.value, note.value)
    saved.value = e.note ?? ''
    note.value = saved.value
    showToast('已儲存')
  } catch (e) {
    showError(friendlyMessage(e, 'save'), save) // 備註內容還在輸入框裡，重試不會遺失
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

    <div v-if="loading" class="photos" data-testid="day-skeleton">
      <PhotoTile v-for="n in 3" :key="n" pending />
    </div>
    <div v-else-if="errorMsg" class="inline-err" data-testid="day-error">
      <span>{{ errorMsg }}</span>
      <button @click="load">重試</button>
    </div>
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
.inline-err { display: flex; align-items: center; gap: 12px; color: var(--ink-soft); font-size: 15px; }
.inline-err button { min-height: 44px; padding: 0 18px; border: 1.5px solid var(--line); border-radius: 999px; background: transparent; font-size: 15px; cursor: pointer; }
.label { display: block; margin: 24px 0 6px; color: var(--ink-soft); font-size: 15px; }
textarea { width: 100%; border: 1.5px solid var(--line); border-radius: var(--radius); background: rgba(255, 255, 255, 0.6); padding: 12px 14px; font: inherit; font-size: 16px; color: var(--ink); resize: vertical; }
textarea:focus { outline: 2px solid var(--ink); outline-offset: 1px; }
.save { display: block; margin: 12px 0 0 auto; min-height: 44px; padding: 0 24px; border: 0; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 16px; cursor: pointer; transition: opacity var(--ease); }
.save:disabled { opacity: 0.35; cursor: default; }
</style>
