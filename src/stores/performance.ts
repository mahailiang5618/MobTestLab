import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface PerformanceMetric {
  timestamp: number
  cpu: number
  memory: number
  fps: number
  network: number
  battery: number
  temperature: number
}

export interface TestSession {
  id: string
  name: string
  deviceId: string
  appName: string
  startTime: number
  endTime?: number
  status: 'running' | 'paused' | 'completed'
  metrics: PerformanceMetric[]
  tags: string[]
}

export const usePerformanceStore = defineStore('performance', () => {
  const currentSession = ref<TestSession | null>(null)
  const sessions = ref<TestSession[]>([])
  const isCollecting = ref(false)

  const thresholds = ref({
    cpu: { warning: 80, critical: 95 },
    memory: { warning: 500, critical: 800 },
    fps: { warning: 50, critical: 30 }
  })

  const startSession = (name: string, deviceId: string, appName: string) => {
    currentSession.value = {
      id: Date.now().toString(),
      name,
      deviceId,
      appName,
      startTime: Date.now(),
      status: 'running',
      metrics: [],
      tags: []
    }
    isCollecting.value = true
  }

  const stopSession = () => {
    if (currentSession.value) {
      currentSession.value.status = 'completed'
      currentSession.value.endTime = Date.now()
      sessions.value.push({ ...currentSession.value })
      currentSession.value = null
      isCollecting.value = false
    }
  }

  const addMetric = (metric: PerformanceMetric) => {
    if (currentSession.value && isCollecting.value) {
      currentSession.value.metrics.push(metric)
    }
  }

  return {
    currentSession,
    sessions,
    isCollecting,
    thresholds,
    startSession,
    stopSession,
    addMetric
  }
})
