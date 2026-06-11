import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type TaskStatus = 'draft' | 'running' | 'annotating' | 'completed' | 'failed'
export type AnnotationMode = 'manual' | 'algorithm' | 'mixed'

export interface SpeedTestRun {
  id: string
  index: number
  status: 'pending' | 'running' | 'recorded' | 'annotated' | 'failed'
  startFrame?: number
  endFrame?: number
  durationMs?: number
  confidence?: number
  annotationMode?: AnnotationMode
}

export interface SpeedTestTask {
  id: string
  name: string
  scenario: string
  deviceName: string
  appPackage: string
  status: TaskStatus
  scriptId: string
  iterations: number
  recording: {
    resolution: string
    fps: number
    bitrate: string
  }
  algorithmId: string
  reportTemplateId: string
  runs: SpeedTestRun[]
  updatedAt: string
}

const nowLabel = () => new Date().toLocaleString('zh-CN', { hour12: false })

const demoRuns: SpeedTestRun[] = [
  { id: 'run-1', index: 1, status: 'annotated', startFrame: 12, endFrame: 67, durationMs: 1833, confidence: 0.91, annotationMode: 'mixed' },
  { id: 'run-2', index: 2, status: 'annotated', startFrame: 10, endFrame: 63, durationMs: 1767, confidence: 0.88, annotationMode: 'algorithm' },
  { id: 'run-3', index: 3, status: 'recorded', confidence: 0.72 },
  { id: 'run-4', index: 4, status: 'pending' },
  { id: 'run-5', index: 5, status: 'pending' }
]

export const useSpeedTestStore = defineStore('speedTest', () => {
  const tasks = ref<SpeedTestTask[]>([
    {
      id: 'task-cold-start',
      name: 'Demo APP 冷启动评测',
      scenario: 'cold_start',
      deviceName: '未选择设备',
      appPackage: 'com.demo.app',
      status: 'annotating',
      scriptId: 'script-cold-start-agent',
      iterations: 5,
      recording: { resolution: '720p', fps: 30, bitrate: '8Mbps' },
      algorithmId: 'visual-diff',
      reportTemplateId: 'default',
      runs: demoRuns,
      updatedAt: nowLabel()
    }
  ])
  const currentTaskId = ref('task-cold-start')

  const currentTask = computed(() =>
    tasks.value.find(task => task.id === currentTaskId.value) || tasks.value[0] || null
  )

  const completedRuns = computed(() =>
    currentTask.value?.runs.filter(run => typeof run.durationMs === 'number') || []
  )

  const summary = computed(() => {
    const durations = completedRuns.value.map(run => run.durationMs || 0).sort((a, b) => a - b)
    const average = durations.length
      ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
      : 0
    const percentile = (ratio: number) => {
      if (!durations.length) return 0
      const index = Math.min(durations.length - 1, Math.ceil(durations.length * ratio) - 1)
      return durations[index]
    }
    return {
      total: currentTask.value?.runs.length || 0,
      annotated: durations.length,
      average,
      p50: percentile(0.5),
      p90: percentile(0.9),
      successRate: currentTask.value?.runs.length
        ? Math.round((durations.length / currentTask.value.runs.length) * 100)
        : 0
    }
  })

  const selectTask = (taskId: string) => {
    currentTaskId.value = taskId
  }

  const updateCurrentTask = (patch: Partial<Omit<SpeedTestTask, 'id' | 'runs'>>) => {
    if (!currentTask.value) return
    Object.assign(currentTask.value, patch, { updatedAt: nowLabel() })
  }

  const updateRecording = (recording: Partial<SpeedTestTask['recording']>) => {
    if (!currentTask.value) return
    currentTask.value.recording = { ...currentTask.value.recording, ...recording }
    currentTask.value.updatedAt = nowLabel()
  }

  const applyRunAnnotation = (runId: string, startFrame: number, endFrame: number, mode: AnnotationMode) => {
    const run = currentTask.value?.runs.find(item => item.id === runId)
    if (!run) return
    run.startFrame = startFrame
    run.endFrame = endFrame
    run.durationMs = Math.max(0, Math.round((endFrame - startFrame) * (1000 / (currentTask.value?.recording.fps || 30))))
    run.annotationMode = mode
    run.status = 'annotated'
    run.confidence = mode === 'manual' ? undefined : run.confidence || 0.86
  }

  const simulateStart = () => {
    if (!currentTask.value) return
    currentTask.value.status = 'running'
    const nextRun = currentTask.value.runs.find(run => run.status === 'pending' || run.status === 'recorded')
    if (nextRun) nextRun.status = 'running'
  }

  return {
    tasks,
    currentTaskId,
    currentTask,
    summary,
    selectTask,
    updateCurrentTask,
    updateRecording,
    applyRunAnnotation,
    simulateStart
  }
})
