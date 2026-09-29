<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { HUE_GROUPS, HUE_GROUP_LABELS, classifyHue, getDailyColor, readableTextColor } from '@hueday/core'
import { aiWarningMessage, friendlyMessage } from '../lib/errors'
import { simulation } from '../lib/simulate'
import { showError, showToast } from '../lib/toast'
import { compressImage, sampleDominantColors } from '../lib/image'
import { getEntry, uploadPhoto, type PhotoDto } from '../lib/entries'
import PhotoTile from '../components/PhotoTile.vue'
import LastYearCard from '../components/LastYearCard.vue'
import { todayString } from '../lib/date'
import { gradientDataUri, pickDistinct } from '../lib/gradient'
import { loadMode, saveMode, type Mode } from '../lib/mode'

const date = todayString()
const color = getDailyColor(date)
const textColor = readableTextColor(color.hex)
const mode = ref<Mode>(loadMode(date))
watch(mode, (m) => saveMode(date, m))

if (simulation.value === 'crash') throw new Error('simulated crash') // 開發用：?simulate=crash 驗證頁面保護

const photos = ref<PhotoDto[]>([])
const photosLoading = ref(true)
const photosFailed = ref(false)
const uploading = ref(0)
const sheet = ref(false)
const cameraInput = ref<HTMLInputElement>()
const albumInput = ref<HTMLInputElement>()

async function loadPhotos() {
  photosLoading.value = true
  photosFailed.value = false
  try {
    photos.value = (await getEntry(date)).photos
  } catch {
    photosFailed.value = true
  } finally {
    photosLoading.value = false
  }
}

/** 送出一張已壓縮、已抽色的照片；失敗時給友善訊息與「重試」（重試不需要重新壓縮） */
async function send(blob: Blob, colors: string[]) {
  uploading.value++
  try {
    const { photo, warnings } = await uploadPhoto(date, blob, mode.value, colors)
    photos.value.push(photo)
    const note = aiWarningMessage(warnings)
    if (note) showToast(note, 4000) // 照片已經傳好了，只是提醒 AI 暫時沒辦法判斷
  } catch (e) {
    showError(friendlyMessage(e, 'upload'), () => send(blob, colors))
  } finally {
    uploading.value--
  }
}

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  sheet.value = false
  for (const f of files) {
    uploading.value++ // 壓縮期間也顯示 placeholder
    try {
      const blob = await compressImage(f)
      const colors = await sampleDominantColors(blob)
      uploading.value--
      await send(blob, colors)
    } catch (err) {
      uploading.value--
      showError(friendlyMessage(err, 'upload'))
    }
  }
}

// 背景：今日照片主色的漸層（沒有照片時用今日顏色）；單色日 mesh、集色日 flow
const bg = computed(() => {
  const fromPhotos = pickDistinct(photos.value.flatMap((p) => p.dominantColors))
  return gradientDataUri(fromPhotos.length ? fromPhotos : [color.hex], { style: mode.value === 'single' ? 'mesh' : 'flow', seed: date })
})

onMounted(loadPhotos)

const modes: { id: Mode; label: string }[] = [
  { id: 'single', label: '單色日' },
  { id: 'collect', label: '集色日' }
]
// 集色日：每個色相群組取第一張照片中屬於該群組的主色來填色
const hueSlots = computed(() => {
  const found = new Map<string, string>()
  for (const p of photos.value) for (const hex of p.dominantColors) {
    const g = classifyHue(hex)
    if (!found.has(g)) found.set(g, hex)
  }
  return HUE_GROUPS.map((g) => ({ id: g, label: HUE_GROUP_LABELS[g], hex: found.get(g) ?? null }))
})
</script>

<template>
  <section class="page" data-testid="page-today">
    <div class="bg" :style="{ backgroundImage: bg }" data-testid="bg" aria-hidden="true" />
    <LastYearCard :date="date" />
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
        <div v-for="s in hueSlots" :key="s.id" class="slot" :style="s.hex ? { background: s.hex, color: readableTextColor(s.hex), borderStyle: 'solid', borderColor: 'transparent' } : undefined">
          <span>{{ s.label }}</span>
        </div>
      </div>
    </template>

    <div class="photos" data-testid="photos">
      <template v-if="photosLoading">
        <PhotoTile v-for="n in 3" :key="'sk' + n" pending data-testid="photo-skeleton" />
      </template>
      <template v-else>
        <PhotoTile v-for="p in photos" :key="p.id" :photo="p" />
        <PhotoTile v-for="n in uploading" :key="'u' + n" pending />
      </template>
    </div>
    <div v-if="photosFailed" class="inline-err" data-testid="photos-error">
      <span>無法載入今天的照片</span>
      <button @click="loadPhotos">重試</button>
    </div>

    <button class="fab" aria-label="新增照片" data-testid="add" @click="sheet = !sheet">＋</button>
    <div v-if="sheet" class="sheet">
      <button @click="cameraInput?.click()">拍照</button>
      <button @click="albumInput?.click()">從相簿選</button>
    </div>
    <input ref="cameraInput" type="file" accept="image/*" capture="environment" hidden @change="onPick" />
    <input ref="albumInput" type="file" accept="image/*" multiple hidden @change="onPick" />

  </section>
</template>

<style scoped>
.bg { position: fixed; inset: 0; z-index: -1; background-size: cover; background-position: center; opacity: 0.55; pointer-events: none; }
.date { font-family: var(--font-display); font-size: 15px; color: var(--ink-soft); margin: 4px 0 12px; }
.seg { display: inline-flex; padding: 3px; border-radius: 999px; background: rgba(43, 42, 40, 0.06); margin-bottom: 16px; }
.seg button { border: 0; background: transparent; padding: 8px 18px; border-radius: 999px; font-size: 15px; min-height: 44px; cursor: pointer; transition: all var(--ease); }
.seg button.on { background: var(--bg); box-shadow: var(--shadow); font-weight: 500; }
.swatch { border-radius: var(--radius); box-shadow: var(--shadow); aspect-ratio: 4 / 5; padding: 20px; display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; }
.swatch .hex { font-family: var(--font-display); opacity: 0.8; letter-spacing: 0.08em; font-size: 15px; }
.swatch h2 { font-size: 40px; }
.swatch .en { opacity: 0.8; font-size: 15px; }
.tip { color: var(--ink-soft); line-height: 1.6; margin: 16px 2px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.slot { aspect-ratio: 1; border-radius: var(--radius); border: 1.5px dashed var(--line); display: flex; align-items: center; justify-content: center; color: var(--ink-soft); font-size: 15px; }
.photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; }
.inline-err { display: flex; align-items: center; gap: 12px; margin-top: 10px; color: var(--ink-soft); font-size: 15px; }
.inline-err button { min-height: 44px; padding: 0 18px; border: 1.5px solid var(--line); border-radius: 999px; background: transparent; font-size: 15px; cursor: pointer; }
.fab { position: fixed; right: max(20px, calc(50% - 220px)); bottom: calc(var(--tabbar-h) + 20px + var(--safe-bottom)); width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--ink); color: var(--bg); font-size: 28px; box-shadow: 0 4px 16px rgba(43, 42, 40, 0.25); cursor: pointer; z-index: 20; }
.sheet { position: fixed; right: max(20px, calc(50% - 220px)); bottom: calc(var(--tabbar-h) + 88px + var(--safe-bottom)); display: flex; flex-direction: column; gap: 6px; padding: 8px; background: var(--bg); border-radius: var(--radius); box-shadow: 0 4px 20px rgba(43, 42, 40, 0.18); z-index: 20; }
.sheet button { border: 0; background: transparent; padding: 12px 18px; font-size: 16px; text-align: left; min-height: 44px; cursor: pointer; }
</style>
