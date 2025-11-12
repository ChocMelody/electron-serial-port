import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import SettingsView from '../views/SettingsView.vue'
import LogsView from '../views/LogsView.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/settings'
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView
  },
  {
    path: '/logs',
    name: 'Logs',
    component: LogsView
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router