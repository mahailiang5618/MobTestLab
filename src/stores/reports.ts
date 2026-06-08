import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface PerfReport {
  id: string
  name: string
  type: 'performance' | 'automation'
  device: string
  app: string
  status: 'passed' | 'failed' | 'warning'
  duration: string
  createdAt: string
  metrics?: { time: string; cpu: number; memory: number; fps: number; network: number; battery: number; temperature: number; gpu: number }[]
  markers?: { label: string; time: string; type: string }[]
  htmlContent?: string
}

const api = (window as any).electronAPI

export const useReportsStore = defineStore('reports', () => {
  const reports = ref<PerfReport[]>([])

  const stats = computed(() => ({
    total: reports.value.length,
    passed: reports.value.filter(r => r.status === 'passed').length,
    failed: reports.value.filter(r => r.status === 'failed').length,
    warnings: reports.value.filter(r => r.status === 'warning').length
  }))

  const loadReports = async () => {
    if (api?.getReports) {
      reports.value = await api.getReports()
    }
  }

  const addReport = (report: PerfReport) => {
    reports.value.unshift(report)
    api?.saveReport(report)
  }

  const deleteReport = (id: string) => {
    reports.value = reports.value.filter(r => r.id !== id)
    api?.deleteReportFromDb(id)
  }

  loadReports()

  return { reports, stats, addReport, deleteReport, loadReports }
})
