import { createRouter, createWebHistory } from 'vue-router'
import TodayView from './views/TodayView.vue'
import CalendarView from './views/CalendarView.vue'
import DayView from './views/DayView.vue'
import RecapView from './views/RecapView.vue'
import ShareView from './views/ShareView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** 這個頁面屬於哪個 tab（tab bar 的高亮） */
    tab?: string
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'today', component: TodayView, meta: { tab: '/' } },
    { path: '/calendar', name: 'calendar', component: CalendarView, meta: { tab: '/calendar' } },
    { path: '/day/:date(\\d{4}-\\d{2}-\\d{2})', name: 'day', component: DayView, meta: { tab: '/calendar' } },
    { path: '/recap/:month(\\d{4}-\\d{2})', name: 'recap', component: RecapView, meta: { tab: '/calendar' } },
    { path: '/share', name: 'share', component: ShareView, meta: { tab: '/share' } }
  ]
})
