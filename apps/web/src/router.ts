import { createRouter, createWebHistory } from 'vue-router'
import TodayView from './views/TodayView.vue'
import CalendarView from './views/CalendarView.vue'
import ShareView from './views/ShareView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'today', component: TodayView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
    { path: '/share', name: 'share', component: ShareView }
  ]
})
