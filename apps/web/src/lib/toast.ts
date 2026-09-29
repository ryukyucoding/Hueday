import { reactive } from 'vue'

export const toast = reactive({ message: '', id: 0 })
let timer: ReturnType<typeof setTimeout> | undefined

/** 輕量提示：只顯示文字，不帶任何數字或社交指標 */
export function showToast(message: string, ms = 2200): void {
  toast.message = message
  toast.id++
  clearTimeout(timer)
  timer = setTimeout(() => (toast.message = ''), ms)
}
