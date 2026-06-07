<template>
  <div class="flex flex-col h-full gap-4">
    <!-- 控制栏 -->
    <div class="flex items-center justify-between p-3 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
      <div class="flex items-center gap-3">
        <!-- 应用选择 -->
        <el-select v-model="selectedApp" placeholder="选择应用" style="width: 180px" size="default" filterable>
          <el-option
            v-for="app in apps"
            :key="app.package"
            :label="app.name"
            :value="app.package"
          >
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded bg-[hsl(var(--secondary))] flex items-center justify-center">
                <Icon icon="mdi:application" class="w-3 h-3" />
              </div>
              <span>{{ app.name }}</span>
            </div>
          </el-option>
        </el-select>

        <!-- 测试时间设置 -->
        <el-popover placement="bottom" :width="280" trigger="click">
          <template #reference>
            <el-button>
              <Icon icon="mdi:timer-outline" class="w-4 h-4 mr-1" />
              {{ testDurationLabel }}
            </el-button>
          </template>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">测试时长限制</span>
              <el-switch v-model="enableDurationLimit" size="small" />
            </div>
            <template v-if="enableDurationLimit">
              <div class="flex items-center gap-2">
                <el-input-number 
                  v-model="testDuration" 
                  :min="1" 
                  :max="180" 
                  size="small"
                  style="width: 100px"
                />
                <el-select v-model="durationUnit" size="small" style="width: 80px">
                  <el-option label="分钟" value="minutes" />
                  <el-option label="秒" value="seconds" />
                </el-select>
              </div>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">
                达到设定时间后自动停止采集
              </p>
            </template>
            <p v-else class="text-xs text-[hsl(var(--muted-foreground))]">
              不限制时长，手动停止采集
            </p>
          </div>
        </el-popover>

        <!-- 控制按钮 -->
        <div class="flex items-center gap-1">
          <el-button 
            :type="isCollecting ? 'danger' : 'primary'" 
            @click="toggleCollection"
          >
            <Icon :icon="isCollecting ? 'mdi:stop' : 'mdi:play'" class="w-4 h-4 mr-1" />
            {{ isCollecting ? '停止采集' : '开始采集' }}
          </el-button>
          <el-button :disabled="!isCollecting" @click="pauseCollection">
            <Icon :icon="isPaused ? 'mdi:play' : 'mdi:pause'" class="w-4 h-4 mr-1" />
            {{ isPaused ? '继续' : '暂停' }}
          </el-button>
        </div>

        <!-- 采集状态 -->
        <div v-if="isCollecting" class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--destructive)/0.1)] rounded text-sm">
            <span class="w-2 h-2 rounded-full bg-[hsl(var(--destructive))] animate-pulse"></span>
            <span class="text-[hsl(var(--destructive))]">{{ formatDuration(collectionDuration) }}</span>
          </div>
          <!-- 进度条（当设置了时间限制时显示） -->
          <div v-if="enableDurationLimit" class="w-32">
            <el-progress 
              :percentage="progressPercentage" 
              :stroke-width="6"
              :show-text="false"
              :color="progressPercentage > 90 ? 'hsl(var(--warning))' : 'hsl(var(--primary))'"
            />
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <el-dropdown trigger="click" :disabled="isCollecting">
          <el-button :disabled="isCollecting">
            <Icon icon="mdi:plus" class="w-4 h-4 mr-1" />
            指标
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="metric in availableMetrics" :key="metric.key">
                <el-checkbox v-model="metric.enabled">{{ metric.label }}</el-checkbox>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button :disabled="isCollecting" @click="showThresholdDialog = true">
          <Icon icon="mdi:alert-circle-outline" class="w-4 h-4 mr-1" />
          阈值
        </el-button>

        <el-button type="primary" plain :disabled="isCollecting" @click="exportReport">
          <Icon icon="mdi:export" class="w-4 h-4 mr-1" />
          导出
        </el-button>
      </div>
    </div>

    <!-- 性能图表区域 -->
    <div class="flex-1 grid grid-cols-2 gap-4 overflow-auto">
      <template v-for="mc in chartDefs" :key="mc.key">
        <div v-if="isMetricEnabled(mc.key)" :ref="(el: any) => setChartRef(el, mc.key)" class="p-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="mc.iconBg">
                <Icon :icon="mc.icon" class="w-4 h-4" :class="mc.iconColor" />
              </div>
              <span class="text-sm font-medium">{{ mc.label }}</span>
              <el-tooltip :content="metricDesc[mc.key]" placement="top"><span class="inline-block w-3.5 h-3.5 rounded-full bg-[hsl(var(--muted-foreground)/0.3)] text-[10px] text-center leading-[14px] cursor-help">?</span></el-tooltip>
            </div>
            <span data-value class="text-xl font-semibold">0{{ mc.unit }}</span>
          </div>
          <div class="h-36 bg-[hsl(var(--secondary)/0.3)] rounded-lg p-2 flex relative" @mousemove="onChartHover($event, mc.key)" @mouseleave="hoverInfo = null">
            <div class="flex flex-col justify-between text-[10px] text-[hsl(var(--muted-foreground))] pr-1 shrink-0 w-12 text-right">
              <span data-ymax>0</span><span data-ymid>0</span><span>0</span>
            </div>
            <div class="flex flex-col flex-1 min-w-0">
              <svg class="w-full flex-1" preserveAspectRatio="none" :viewBox="`0 0 ${HISTORY_SIZE - 1} 100`">
                <polyline points="" fill="none" :stroke="mc.color" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
              </svg>
              <div class="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                <span data-ts-start></span><span data-ts-end></span>
              </div>
            </div>
            <div v-if="hoverInfo && hoverInfo.key === mc.key" class="absolute bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-10" :style="{ left: hoverInfo.x + 'px', top: hoverInfo.y + 'px' }">
              {{ hoverInfo.value }}{{ mc.unit }} ({{ hoverInfo.time }})
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 事件标记时间线 -->
    <div class="p-3 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">事件标记</span>
        <el-button size="small" :disabled="!isCollecting" @click="addMarker">
          <Icon icon="mdi:flag" class="w-3.5 h-3.5 mr-1" />
          添加标记
        </el-button>
      </div>
      <div class="flex items-center gap-2 overflow-x-auto py-2">
        <div
          v-for="(marker, index) in markers"
          :key="index"
          class="flex items-center gap-1.5 px-2 py-1 bg-[hsl(var(--secondary))] rounded text-xs whitespace-nowrap"
        >
          <span class="w-2 h-2 rounded-full" :class="marker.type === 'auto' ? 'bg-blue-400' : 'bg-[hsl(var(--warning))]'"></span>
          <input
            v-if="marker.editing"
            class="bg-transparent border-b border-[hsl(var(--primary))] outline-none w-20 text-xs text-[hsl(var(--foreground))]"
            placeholder="标记名称"
            @keydown.enter="($event: any) => finishMarkerEdit(index, $event.target.value)"
            @blur="($event: any) => finishMarkerEdit(index, $event.target.value)"
          />
          <span v-else class="text-[hsl(var(--foreground))]">{{ marker.label }}</span>
          <span class="text-[hsl(var(--muted-foreground))]">{{ marker.time }}</span>
        </div>
      </div>
    </div>

    <!-- 阈值设置对话框 -->
    <el-dialog v-model="showThresholdDialog" title="阈值设置" width="480px">
      <div class="space-y-4">
        <template v-for="metric in availableMetrics.filter(m => m.enabled)" :key="metric.key">
          <div class="flex items-center gap-4">
            <span class="w-24 text-sm">{{ metric.label }} 警告</span>
            <el-slider v-model="thresholds[metric.key].warning" :max="thresholds[metric.key].max" :min="0" class="flex-1" />
            <span class="w-16 text-sm text-right">{{ thresholds[metric.key].warning }}{{ thresholds[metric.key].unit }}</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="w-24 text-sm">{{ metric.label }} 严重</span>
            <el-slider v-model="thresholds[metric.key].critical" :max="thresholds[metric.key].max" :min="0" class="flex-1" />
            <span class="w-16 text-sm text-right">{{ thresholds[metric.key].critical }}{{ thresholds[metric.key].unit }}</span>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="showThresholdDialog = false">取消</el-button>
        <el-button type="primary" @click="saveThresholds">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '../stores/device'
import { useReportsStore } from '../stores/reports'

const deviceStore = useDeviceStore()
const reportsStore = useReportsStore()

const selectedApp = ref('')
const isCollecting = ref(false)
const isPaused = ref(false)
const collectionDuration = ref(0)
const showThresholdDialog = ref(false)

const enableDurationLimit = ref(false)
const testDuration = ref(5)
const durationUnit = ref<'minutes' | 'seconds'>('minutes')

const testDurationLabel = computed(() => {
  if (!enableDurationLimit.value) return '不限时长'
  const unit = durationUnit.value === 'minutes' ? '分钟' : '秒'
  return `${testDuration.value} ${unit}`
})

const testDurationInSeconds = computed(() => {
  if (!enableDurationLimit.value) return Infinity
  return durationUnit.value === 'minutes'
    ? testDuration.value * 60
    : testDuration.value
})

const progressPercentage = computed(() => {
  if (!enableDurationLimit.value || testDurationInSeconds.value === Infinity) return 0
  return Math.min(100, (collectionDuration.value / testDurationInSeconds.value) * 100)
})

const apps = ref<{ name: string; package: string }[]>([])

const metricDesc: Record<string, string> = {
  cpu: '应用进程占用的CPU时间百分比，通过/proc/pid/stat计算得出',
  memory: '应用进程的PSS（比例分摊内存），通过dumpsys meminfo获取',
  fps: '每秒渲染帧数，通过dumpsys gfxinfo统计总帧数差值计算',
  network: '应用进程的网络收发速率，通过/proc/pid/net/dev差值计算',
  battery: '设备当前电池电量百分比，通过dumpsys battery获取',
  temperature: '设备电池温度，通过dumpsys battery获取',
  gpu: 'GPU渲染负载百分比，通过dumpsys gfxinfo获取'
}

const availableMetrics = ref([
  { key: 'cpu', label: 'CPU 使用率', enabled: true },
  { key: 'memory', label: '内存占用', enabled: true },
  { key: 'fps', label: 'FPS 帧率', enabled: true },
  { key: 'network', label: '网络流量', enabled: true },
  { key: 'battery', label: '电池电量', enabled: false },
  { key: 'temperature', label: '温度', enabled: false },
  { key: 'gpu', label: 'GPU 使用率', enabled: false }
])

const thresholds = reactive<Record<string, { warning: number; critical: number; max: number; unit: string }>>({
  cpu: { warning: 80, critical: 95, max: 100, unit: '%' },
  memory: { warning: 500, critical: 800, max: 2000, unit: 'MB' },
  fps: { warning: 50, critical: 30, max: 60, unit: 'fps' },
  network: { warning: 5000, critical: 10000, max: 20000, unit: 'KB/s' },
  battery: { warning: 20, critical: 10, max: 100, unit: '%' },
  temperature: { warning: 40, critical: 45, max: 60, unit: '°C' },
  gpu: { warning: 80, critical: 95, max: 100, unit: '%' }
})

const HISTORY_SIZE = 40
const cpuHistory = shallowRef<number[]>(Array(HISTORY_SIZE).fill(0))
const memoryHistory = shallowRef<number[]>(Array(HISTORY_SIZE).fill(0))
const fpsHistory = shallowRef<number[]>(Array(HISTORY_SIZE).fill(0))
const networkHistory = shallowRef<number[]>(Array(HISTORY_SIZE).fill(0))
const batteryHistory = shallowRef<number[]>(Array(HISTORY_SIZE).fill(0))
const temperatureHistory = shallowRef<number[]>(Array(HISTORY_SIZE).fill(0))
const gpuHistory = shallowRef<number[]>(Array(HISTORY_SIZE).fill(0))
const timestamps = shallowRef<string[]>(Array(HISTORY_SIZE).fill(''))
const metricsHistory = ref<{ time: string; cpu: number; memory: number; fps: number; network: number; battery: number; temperature: number; gpu: number }[]>([])

const markers = ref<{ label: string; time: string; type: string; editing?: boolean }[]>([])

const isMetricEnabled = (key: string) => availableMetrics.value.find(m => m.key === key)?.enabled ?? false

const hoverInfo = ref<{ key: string; x: number; y: number; value: string; time: string } | null>(null)

const chartDefs = [
  { key: 'cpu', label: 'CPU 使用率', icon: 'mdi:chip', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', color: '#409EFF', unit: '%' },
  { key: 'memory', label: '内存占用', icon: 'mdi:memory', iconBg: 'bg-green-500/10', iconColor: 'text-green-500', color: '#67C23A', unit: 'MB' },
  { key: 'fps', label: 'FPS 帧率', icon: 'mdi:monitor-shimmer', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', color: '#E6A23C', unit: 'fps' },
  { key: 'network', label: '网络流量', icon: 'mdi:wifi', iconBg: 'bg-blue-600/10', iconColor: 'text-blue-600', color: '#3B82F6', unit: 'KB/s' },
  { key: 'battery', label: '电池电量', icon: 'mdi:battery', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', color: '#10B981', unit: '%' },
  { key: 'temperature', label: '温度', icon: 'mdi:thermometer', iconBg: 'bg-red-500/10', iconColor: 'text-red-500', color: '#EF4444', unit: '°C' },
  { key: 'gpu', label: 'GPU 使用率', icon: 'mdi:expansion-card', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500', color: '#8B5CF6', unit: '%' }
]

const historyMap: Record<string, { value: number[] }> = {
  cpu: cpuHistory, memory: memoryHistory, fps: fpsHistory, network: networkHistory,
  battery: batteryHistory, temperature: temperatureHistory, gpu: gpuHistory
}

const getYMax = (key: string) => {
  if (key === 'memory') return Math.max(100, ...memoryHistory.value) * 1.2 | 0
  if (key === 'network') return Math.max(10, ...networkHistory.value) * 1.2 | 0
  if (key === 'temperature') return Math.max(40, ...temperatureHistory.value) * 1.2 | 0
  if (key === 'fps') return 60
  return 100
}

const chartRefs = ref<Record<string, HTMLElement>>({})
const setChartRef = (el: any, key: string) => { if (el) chartRefs.value[key] = el }

const updateChartsDom = () => {
  for (const d of chartDefs) {
    const container = chartRefs.value[d.key]
    if (!container) continue
    const polyline = container.querySelector('polyline')
    const valueEl = container.querySelector('[data-value]')
    const yMaxEl = container.querySelector('[data-ymax]')
    const yMidEl = container.querySelector('[data-ymid]')
    const tsStartEl = container.querySelector('[data-ts-start]')
    const tsEndEl = container.querySelector('[data-ts-end]')
    if (!polyline) continue
    const history = historyMap[d.key]?.value
    if (!history) continue
    const yMax = getYMax(d.key)
    const points = history.map((v, i) => `${i},${yMax > 0 ? 100 - (v / yMax) * 100 : 100}`).join(' ')
    polyline.setAttribute('points', points)
    const current = history[history.length - 1] || 0
    if (valueEl) {
      valueEl.textContent = `${current}${d.unit}`
      let cls = 'text-xl font-semibold text-[hsl(var(--foreground))]'
      if (d.key === 'cpu') cls = `text-xl font-semibold ${getCpuClass(current)}`
      else if (d.key === 'fps') cls = `text-xl font-semibold ${getFpsClass(current)}`
      valueEl.className = cls
    }
    if (yMaxEl) yMaxEl.textContent = String(yMax)
    if (yMidEl) yMidEl.textContent = String(Math.round(yMax / 2))
    if (tsStartEl) tsStartEl.textContent = timestamps.value[0] || ''
    if (tsEndEl) tsEndEl.textContent = timestamps.value[HISTORY_SIZE - 1] || ''
  }
}

let _hoverRaf = 0
const onChartHover = (event: MouseEvent, key: string) => {
  if (_hoverRaf) return
  _hoverRaf = requestAnimationFrame(() => {
    _hoverRaf = 0
    const svg = (event.currentTarget as HTMLElement)?.querySelector('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = event.clientX - rect.left
    const idx = Math.round((x / rect.width) * (HISTORY_SIZE - 1))
    if (idx < 0 || idx >= HISTORY_SIZE) { hoverInfo.value = null; return }
    const arr = historyMap[key]?.value
    hoverInfo.value = {
      key,
      x: event.offsetX + 10,
      y: event.offsetY - 30,
      value: String(arr ? arr[idx] ?? 0 : 0),
      time: timestamps.value[idx] || ''
    }
  })
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const getCpuClass = (cpu: number) => {
  if (cpu > 95) return 'text-[hsl(var(--destructive))]'
  if (cpu > 80) return 'text-[hsl(var(--warning))]'
  return 'text-[hsl(var(--foreground))]'
}

const getFpsClass = (fps: number) => {
  if (fps < 30) return 'text-[hsl(var(--destructive))]'
  if (fps < 50) return 'text-[hsl(var(--warning))]'
  return 'text-[hsl(var(--success))]'
}

let durationTimer: number

watch(collectionDuration, (newVal) => {
  if (enableDurationLimit.value && newVal >= testDurationInSeconds.value) {
    stopCollection()
    ElMessage.success('已达到设定的测试时长，采集已自动停止')
  }
})

const loadApps = async () => {
  const device = deviceStore.selectedDevice
  if (!device || device.platform !== 'android' || device.status !== 'online') return
  const api = (window as any).electronAPI
  if (api?.getInstalledApps) {
    apps.value = await api.getInstalledApps(device.id)
  }
}

const handlePerfData = (_event: any, payload: { deviceId: string; metric: any }) => {
  if (isPaused.value) return
  const m = payload.metric

  const timeLabel = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  timestamps.value.push(timeLabel)
  timestamps.value.shift()

  cpuHistory.value.push(parseFloat(m.cpu.toFixed(1)))
  cpuHistory.value.shift()
  memoryHistory.value.push(Math.round(m.memory))
  memoryHistory.value.shift()
  fpsHistory.value.push(m.fps)
  fpsHistory.value.shift()
  networkHistory.value.push(m.network)
  networkHistory.value.shift()
  batteryHistory.value.push(m.battery || 0)
  batteryHistory.value.shift()
  temperatureHistory.value.push(m.temperature || 0)
  temperatureHistory.value.shift()
  gpuHistory.value.push(m.gpu || 0)
  gpuHistory.value.shift()

  metricsHistory.value.push({
    time: new Date().toISOString(),
    cpu: parseFloat(m.cpu.toFixed(1)),
    memory: Math.round(m.memory),
    fps: m.fps,
    network: m.network,
    battery: m.battery || 0,
    temperature: m.temperature || 0,
    gpu: m.gpu || 0
  })

  if (m.cpu > thresholds.cpu.critical) {
    markers.value.push({ label: `CPU ${m.cpu.toFixed(0)}%`, time: formatDuration(collectionDuration.value), type: 'auto' })
  }

  requestAnimationFrame(updateChartsDom)
}

const startCollection = async () => {
  const device = deviceStore.selectedDevice
  if (!device) {
    ElMessage.warning('请先选择设备')
    return
  }
  if (!selectedApp.value) {
    ElMessage.warning('请先选择应用')
    return
  }
  const api = (window as any).electronAPI
  if (!api) return

  const result = await api.startPerfCollection(device.id, selectedApp.value)
  if (!result.success) {
    ElMessage.error(result.error || '启动采集失败')
    return
  }

  isCollecting.value = true
  isPaused.value = false
  collectionDuration.value = 0
  metricsHistory.value = []
  cpuHistory.value = Array(HISTORY_SIZE).fill(0)
  memoryHistory.value = Array(HISTORY_SIZE).fill(0)
  fpsHistory.value = Array(HISTORY_SIZE).fill(0)
  networkHistory.value = Array(HISTORY_SIZE).fill(0)
  batteryHistory.value = Array(HISTORY_SIZE).fill(0)
  temperatureHistory.value = Array(HISTORY_SIZE).fill(0)
  gpuHistory.value = Array(HISTORY_SIZE).fill(0)
  timestamps.value = Array(HISTORY_SIZE).fill('')
  requestAnimationFrame(updateChartsDom)
  markers.value = [{ label: '开始采集', time: '00:00', type: 'auto' }]
  durationTimer = window.setInterval(() => {
    if (!isPaused.value) collectionDuration.value++
  }, 1000)
}

const stopCollection = async () => {
  const device = deviceStore.selectedDevice
  const api = (window as any).electronAPI
  if (api && device) {
    await api.stopPerfCollection(device.id)
  }
  isCollecting.value = false
  isPaused.value = false
  clearInterval(durationTimer)

  if (metricsHistory.value.length > 0 && device) {
    const hasWarning = markers.value.some(m => m.type === 'auto')
    reportsStore.addReport({
      id: Date.now().toString(),
      name: `${selectedApp.value} 性能测试`,
      type: 'performance',
      device: device.name,
      app: selectedApp.value,
      status: hasWarning ? 'warning' : 'passed',
      duration: formatDuration(collectionDuration.value),
      createdAt: new Date().toLocaleString('zh-CN'),
      metrics: [...metricsHistory.value],
      markers: [...markers.value]
    })
  }
}

const toggleCollection = () => {
  if (isCollecting.value) stopCollection()
  else startCollection()
}

const pauseCollection = () => {
  isPaused.value = !isPaused.value
}

const addMarker = () => {
  if (!isCollecting.value) {
    ElMessage.warning('请先开始采集')
    return
  }
  markers.value.push({
    label: '',
    time: formatDuration(collectionDuration.value),
    type: 'manual',
    editing: true
  })
}

const finishMarkerEdit = (index: number, value: string) => {
  const m = markers.value[index]
  if (m) {
    m.label = value || '用户标记'
    m.editing = false
  }
}

const exportReport = async () => {
  if (metricsHistory.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  const api = (window as any).electronAPI
  if (!api) return
  const { canceled, filePath } = await api.showSaveDialog({
    title: '导出性能报告',
    defaultPath: `perf-report-${Date.now()}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  if (canceled || !filePath) return
  const header = 'Time,CPU(%),Memory(MB),FPS,Network(KB/s)\n'
  const rows = metricsHistory.value.map(m => `${m.time},${m.cpu},${m.memory},${m.fps},${m.network}`).join('\n')
  await api.saveFile(filePath, new TextEncoder().encode(header + rows))
  ElMessage.success('报告导出成功')
}

const saveThresholds = () => {
  showThresholdDialog.value = false
  ElMessage.success('阈值设置已保存')
}

watch(() => deviceStore.selectedDeviceId, () => { loadApps() })

onMounted(() => {
  const api = (window as any).electronAPI
  if (api?.onPerfData) api.onPerfData(handlePerfData)
  loadApps()
})

onUnmounted(() => {
  clearInterval(durationTimer)
  const api = (window as any).electronAPI
  if (api?.offPerfData) api.offPerfData()
  if (isCollecting.value) stopCollection()
})
</script>
