<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CollagePreview from '../components/CollagePreview.vue'
import TemplateSlide from '../components/TemplateSlide.vue'
import { getEntry, type PhotoDto } from '../lib/entries'
import { todayString } from '../lib/date'
import { gradientDataUri, pickDistinct } from '../lib/gradient'
import { shareOrDownload } from '../lib/share'
import { showToast } from '../lib/toast'
import { TEMPLATES, defaultStyle, templateFilename, templateParams, type GradientChoice, type TemplateId } from '../lib/templates'
import { getDailyColor } from '@hueday/core'

const route = useRoute()
const date = todayString()
const ready = ref(false)
const photos = ref<PhotoDto[]>([])
const style = ref<GradientChoice>('mesh')
const grain = ref(60)
const activeIdx = ref(0)
const blobs = ref<Partial<Record<TemplateId, Blob | null>>>({})
const sharing = ref(false)
const scroller = ref<HTMLElement>()

const ctx = computed(() => ({ date, asOf: date, style: style.value, grain: grain.value }))
const active = computed(() => TEMPLATES[activeIdx.value])
const canShare = computed(() => !!blobs.value[active.value.id] && !sharing.value)

onMounted(async () => {
  try {
    const r = await getEntry(date)
    photos.value = r.photos
    style.value = defaultStyle(r.entry?.mode)
  } catch {
    /* 沒有連線時仍顯示模板，但產圖會失敗 */
  }
  // /share?template=compare 直接停在指定模板（例如從「去年的今天」卡片進來）
  const wanted = TEMPLATES.findIndex((t) => t.id === route.query.template)
  if (wanted > 0) activeIdx.value = wanted
  ready.value = true
  if (wanted > 0) go(wanted, 'instant')
})

let raf = 0
function onScroll() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    const el = scroller.value
    if (!el) return
    activeIdx.value = Math.max(0, Math.min(TEMPLATES.length - 1, Math.round(el.scrollLeft / el.clientWidth)))
  })
}
onBeforeUnmount(() => cancelAnimationFrame(raf))

async function go(i: number, behavior: ScrollBehavior = 'smooth') {
  await nextTick()
  scroller.value?.scrollTo({ left: i * scroller.value.clientWidth, behavior })
}

async function onShare() {
  const blob = blobs.value[active.value.id]
  if (!blob || sharing.value) return
  sharing.value = true
  try {
    const r = await shareOrDownload(blob, templateFilename(active.value.id, date))
    if (r === 'shared') showToast('已分享')
    else if (r === 'downloaded') showToast('圖片已下載')
  } finally {
    sharing.value = false
  }
}

// 拼貼模板載入中先顯示前端版預覽
const bg = computed(() => {
  const colors = pickDistinct(photos.value.flatMap((p) => p.dominantColors))
  return gradientDataUri(colors.length ? colors : [getDailyColor(date).hex], { style: style.value, seed: date })
})
</script>

<template>
  <section class="page" data-testid="page-share">
    <div ref="scroller" class="track" data-testid="track" @scroll.passive="onScroll">
      <template v-if="ready">
        <TemplateSlide
          v-for="(t, i) in TEMPLATES"
          :key="t.id"
          :params="templateParams(t.id, ctx)"
          :active="i === activeIdx"
          :label="t.label"
          @blob="(b) => (blobs[t.id] = b)"
        >
          <template v-if="t.id === 'collage'" #placeholder>
            <div class="fallback"><CollagePreview :date="date" :photos="photos" :bg="bg" /></div>
          </template>
        </TemplateSlide>
      </template>
    </div>

    <div class="dots" role="tablist">
      <button v-for="(t, i) in TEMPLATES" :key="t.id" role="tab" :aria-selected="i === activeIdx" :class="{ on: i === activeIdx }" @click="go(i)">
        {{ t.label }}
      </button>
    </div>

    <div class="controls">
      <div class="seg" role="group" aria-label="漸層風格">
        <button v-for="s in ['mesh', 'flow'] as const" :key="s" :class="{ on: style === s }" :data-testid="'style-' + s" @click="style = s">{{ s === 'mesh' ? 'Mesh' : 'Flow' }}</button>
      </div>
      <label class="grain">
        <span>顆粒</span>
        <input v-model.number="grain" type="range" min="0" max="100" step="5" data-testid="grain" />
      </label>
    </div>

    <button class="share" :disabled="!canShare" data-testid="share-btn" @click="onShare">分享</button>
  </section>
</template>

<style scoped>
.track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; margin: 0 -20px; overscroll-behavior-x: contain; }
.track::-webkit-scrollbar { display: none; }
.fallback { width: min(100%, 340px); }
.dots { display: flex; justify-content: center; gap: 6px; margin: 14px 0 6px; flex-wrap: wrap; }
.dots button { border: 0; background: transparent; padding: 8px 12px; min-height: 44px; border-radius: 999px; font-size: 15px; color: var(--ink-soft); cursor: pointer; transition: all var(--ease); }
.dots button.on { background: rgba(43, 42, 40, 0.08); color: var(--ink); font-weight: 500; }
.controls { display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; margin-top: 8px; }
.seg { display: inline-flex; padding: 3px; border-radius: 999px; background: rgba(43, 42, 40, 0.06); }
.seg button { border: 0; background: transparent; padding: 8px 18px; min-height: 40px; border-radius: 999px; font-size: 15px; cursor: pointer; transition: all var(--ease); }
.seg button.on { background: var(--bg); box-shadow: var(--shadow); font-weight: 500; }
.grain { display: flex; align-items: center; gap: 10px; font-size: 15px; color: var(--ink-soft); }
.grain input { width: 140px; accent-color: var(--ink); min-height: 44px; }
.share { display: block; margin: 16px auto 0; min-width: 160px; min-height: 48px; padding: 0 28px; border: 0; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 16px; cursor: pointer; transition: opacity var(--ease); }
.share:disabled { opacity: 0.35; cursor: default; }
</style>
