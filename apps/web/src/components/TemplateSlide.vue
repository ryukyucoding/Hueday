<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { friendlyMessage } from '../lib/errors'
import { fetchRenderBlob, renderUrl, type RenderParams } from '../lib/render'

const props = defineProps<{ params: RenderParams; active: boolean; label: string; debounceMs?: number }>()
const emit = defineEmits<{ blob: [blob: Blob | null] }>()

const url = ref('')
const loading = ref(false)
const errorMsg = ref('')
let fetchedKey = ''
let timer: ReturnType<typeof setTimeout> | undefined
let ctrl: AbortController | undefined

function revoke() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''
}

async function load(key: string) {
  ctrl?.abort()
  ctrl = new AbortController()
  loading.value = true
  errorMsg.value = ''
  try {
    const blob = await fetchRenderBlob(props.params, ctrl.signal)
    revoke()
    url.value = URL.createObjectURL(blob)
    fetchedKey = key
    emit('blob', blob)
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    errorMsg.value = friendlyMessage(e, 'render')
    emit('blob', null)
  } finally {
    loading.value = false
  }
}

// 只在這一頁被看到時才產圖；參數（風格、顆粒）變更時 debounce，避免拖動滑桿時狂打 API
watch(
  () => [renderUrl(props.params), props.active] as const,
  ([key, active]) => {
    clearTimeout(timer)
    if (!active || key === fetchedKey) return
    timer = setTimeout(() => load(key), fetchedKey ? (props.debounceMs ?? 350) : 0)
  },
  { immediate: true }
)

// 切回這一頁時，讓父層拿到這一頁目前的圖
watch(
  () => props.active,
  (a) => {
    if (a && url.value && renderUrl(props.params) === fetchedKey) fetch(url.value).then((r) => r.blob()).then((b) => emit('blob', b))
  }
)

onBeforeUnmount(() => {
  clearTimeout(timer)
  ctrl?.abort()
  revoke()
})
</script>

<template>
  <div class="slide" :data-template="params.template">
    <div class="frame">
      <img v-if="url" :src="url" :alt="label" class="png" :class="{ dim: loading }" data-testid="render-png" />
      <slot v-else name="placeholder"><div class="skeleton" /></slot>
      <p v-if="loading" class="badge">產生中…</p>
      <div v-else-if="errorMsg" class="fail" role="alert" data-testid="slide-error">
        <p>{{ errorMsg }}</p>
        <button data-testid="slide-retry" @click="load(renderUrl(params))">重試</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide { flex: 0 0 100%; scroll-snap-align: center; display: flex; justify-content: center; }
.frame { position: relative; width: min(100%, 300px); }
.png { display: block; width: 100%; aspect-ratio: 9 / 16; border-radius: var(--radius); box-shadow: var(--shadow); transition: opacity var(--ease); }
.dim { opacity: 0.55; }
.skeleton { width: 100%; aspect-ratio: 9 / 16; border-radius: var(--radius); background: rgba(43, 42, 40, 0.06); animation: pulse 1.2s ease-in-out infinite; }
.badge { position: absolute; left: 50%; bottom: 14px; transform: translateX(-50%); margin: 0; padding: 6px 14px; border-radius: 999px; background: var(--ink); color: var(--bg); font-size: 15px; }
.fail { position: absolute; left: 12px; right: 12px; bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 8px 8px 16px; border-radius: 999px; background: #8c2a22; color: var(--bg); font-size: 15px; }
.fail p { margin: 0; line-height: 1.3; }
.fail button { flex: none; min-height: 44px; padding: 0 18px; border: 0; border-radius: 999px; background: rgba(255, 255, 255, 0.22); color: inherit; font-size: 15px; font-weight: 500; cursor: pointer; }
@keyframes pulse { 50% { opacity: 0.55; } }
</style>
