import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '仪表盘', icon: 'mdi:view-dashboard-outline' }
      },
      {
        path: 'mirror',
        name: 'Mirror',
        component: () => import('@/views/MirrorView.vue'),
        meta: { title: '投屏', icon: 'mdi:cellphone-screenshot' }
      },
      {
        path: 'performance',
        name: 'Performance',
        component: () => import('@/views/PerformanceView.vue'),
        meta: { title: '性能', icon: 'mdi:chart-line' }
      },
      {
        path: 'automation',
        name: 'Automation',
        component: () => import('@/views/AutomationView.vue'),
        meta: { title: '自动化', icon: 'mdi:robot' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/ReportsView.vue'),
        meta: { title: '报告', icon: 'mdi:file-document-outline' }
      },
      {
        path: 'assistant',
        name: 'Assistant',
        component: () => import('@/views/AssistantView.vue'),
        meta: { title: '助手' }
      },
      {
        path: 'tools',
        name: 'Tools',
        component: () => import('@/views/ToolsView.vue'),
        meta: { title: '工具' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
