<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { collageFooterText, countCollectedColors, formatStoryDate, getDailyColor, layoutCollage, STORY_HEIGHT, STORY_WIDTH } from '@hueday/core'
import { photoObjectUrl, type PhotoDto } from '../lib/entries'

const props = defineProps<{ date: string; photos: PhotoDto[]; bg: string }>()

const shown = computed(() => props.photos.slice(0, 6))
const layout = computed(() => layoutCollage(shown.value.length))
const d = computed(() => formatStoryDate(props.date))
const color = computed(() => getDailyColor(props.date))
const footer = computed(() => collageFooterText(countCollectedColors(props.photos.map((p) => p.dominantColors))))

const urls = ref<Record<string, string>>({})
watch(
  shown,
  (list) => {
    for (const p of list) {
      if (!urls.value[p.id]) photoObjectUrl(p.url).then((u) => (urls.value = { ...urls.value, [p.id]: u })).catch(() => {})
    }
  },
  { immediate: true }
)

const box = ref<HTMLElement>()
const scale = ref(0.3)
let ro: ResizeObserver | undefined
onMounted(() => {
  if (!box.value) return
  scale.value = box.value.clientWidth / STORY_WIDTH
  ro = new ResizeObserver(() => box.value && (scale.value = box.value.clientWidth / STORY_WIDTH))
  ro.observe(box.value)
})
onBeforeUnmount(() => ro?.disconnect())
</script>

<template>
  <div ref="box" class="box" data-testid="collage-preview">
    <div class="canvas" :style="{ width: STORY_WIDTH + 'px', height: STORY_HEIGHT + 'px', transform: `scale(${scale})`, backgroundImage: bg }">
      <div class="head" :style="{ top: layout.header.dateY - layout.header.dateSize * 0.8 + 'px' }">
        <div class="date" :style="{ fontSize: layout.header.dateSize + 'px' }">{{ d.month }} {{ d.day }}</div>
        <div class="sub" :style="{ fontSize: layout.header.yearSize + 'px' }">{{ d.weekday }} · {{ d.year }}</div>
      </div>
      <div class="cname" :style="{ top: layout.header.nameY - layout.header.nameSize + 'px', fontSize: layout.header.nameSize + 'px' }">
        {{ color.zh }} <small>{{ color.en }}</small>
      </div>

      <div
        v-for="(s, i) in layout.photos"
        :key="i"
        class="card"
        :style="{ left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px', transform: `rotate(${s.rotate}deg)` }"
      >
        <div class="ph" :style="{ left: s.photo.x + 'px', top: s.photo.y + 'px', width: s.photo.w + 'px', height: s.photo.h + 'px' }">
          <img v-if="urls[shown[i].id]" :src="urls[shown[i].id]" alt="" />
        </div>
      </div>

      <div v-if="!layout.photos.length" class="empty">今天還沒有照片</div>
      <div class="foot" :style="{ top: layout.footer.y + 'px', fontSize: layout.footer.size + 'px' }">{{ footer }}</div>
    </div>
  </div>
</template>

<style scoped>
.box { position: relative; width: 100%; aspect-ratio: 9 / 16; overflow: hidden; border-radius: var(--radius); box-shadow: var(--shadow); background: #fff; }
.canvas { position: absolute; left: 0; top: 0; transform-origin: 0 0; background-size: cover; background-position: center; color: #2b2a28; font-family: var(--font-body); }
.head { position: absolute; left: 90px; right: 90px; }
.date { font-family: var(--font-display); font-weight: 700; line-height: 1; letter-spacing: -0.02em; }
.sub { font-family: var(--font-display); opacity: 0.7; margin-top: 12px; letter-spacing: 0.12em; }
.cname { position: absolute; left: 90px; right: 90px; font-weight: 700; line-height: 1.2; }
.cname small { font-family: var(--font-display); font-weight: 500; opacity: 0.65; font-size: 0.55em; margin-left: 12px; }
.card { position: absolute; background: #fffdf9; box-shadow: 0 14px 40px rgba(43, 42, 40, 0.22); }
.ph { position: absolute; background: #e8e4dc; overflow: hidden; }
.ph img { width: 100%; height: 100%; object-fit: cover; display: block; }
.empty { position: absolute; left: 0; right: 0; top: 900px; text-align: center; font-size: 56px; opacity: 0.6; }
.foot { position: absolute; left: 0; right: 0; text-align: center; font-family: var(--font-display); letter-spacing: 0.06em; opacity: 0.75; }
</style>
