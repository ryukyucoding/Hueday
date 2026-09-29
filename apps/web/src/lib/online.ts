import { computed, ref } from 'vue'
import { simulation } from './simulate'

const real = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => (real.value = true))
  window.addEventListener('offline', () => (real.value = false))
}

/** 是否在線上（?simulate=offline 時視為離線） */
export const online = computed(() => real.value && simulation.value !== 'offline')
