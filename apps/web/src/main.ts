import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { friendlyMessage } from './lib/errors'
import { showError } from './lib/toast'
import './styles/global.css'

const app = createApp(App).use(router)

// 沒被任何元件接住的錯誤：記錄下來，並給使用者友善提示，而不是安靜地壞掉
app.config.errorHandler = (err) => {
  console.error(err)
  showError(friendlyMessage(err))
}
window.addEventListener('unhandledrejection', (e) => {
  e.preventDefault()
  console.error(e.reason)
  showError(friendlyMessage(e.reason))
})

app.mount('#app')
