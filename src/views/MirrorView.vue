<template>
  <div class="flex gap-4 h-full">
    <!-- 投屏画面区域 -->
    <div class="flex-1 flex flex-col">
      <!-- 工具栏 -->
      <div class="flex items-center justify-between mb-4 p-3 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <div class="flex items-center gap-2">
          <el-tooltip content="截图 (Ctrl+S)" placement="top">
            <button class="toolbar-btn" @click="takeScreenshot">
              <Icon icon="mdi:camera" class="w-4 h-4" />
            </button>
          </el-tooltip>
          <el-tooltip content="录屏" placement="top">
            <button 
              :class="['toolbar-btn', isRecording && 'recording']"
              @click="toggleRecording"
            >
              <Icon :icon="isRecording ? 'mdi:stop' : 'mdi:record'" class="w-4 h-4" />
            </button>
          </el-tooltip>
          <div class="w-px h-5 bg-[hsl(var(--border))] mx-1"></div>
          <el-tooltip content="旋转屏幕" placement="top">
            <button class="toolbar-btn" @click="rotateScreen">
              <Icon icon="mdi:screen-rotation" class="w-4 h-4" />
            </button>
          </el-tooltip>
          <el-tooltip content="全屏" placement="top">
            <button class="toolbar-btn" @click="toggleFullscreen">
              <Icon icon="mdi:fullscreen" class="w-4 h-4" />
            </button>
          </el-tooltip>
          <div class="w-px h-5 bg-[hsl(var(--border))] mx-1"></div>
          <el-tooltip :content="isMirroring ? '停止投屏' : '开始投屏'" placement="top">
            <button
              :class="['toolbar-btn', isMirroring && 'recording']"
              @click="isMirroring ? stopMirror() : startMirror()"
              :disabled="!selectedDevice || selectedDevice.status !== 'online'"
            >
              <Icon :icon="isMirroring ? 'mdi:stop-circle' : 'mdi:play-circle'" class="w-4 h-4" />
            </button>
          </el-tooltip>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- 画质设置 -->
          <el-dropdown trigger="click">
            <button class="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[hsl(var(--accent))] transition-colors text-sm text-[hsl(var(--muted-foreground))]">
              <Icon icon="mdi:quality-high" class="w-4 h-4" />
              <span>{{ qualityLabel }}</span>
              <Icon icon="mdi:chevron-down" class="w-4 h-4" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="q in qualityOptions" :key="q.value" @click="quality = q.value">
                  {{ q.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 帧率设置 -->
          <el-dropdown trigger="click">
            <button class="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-[hsl(var(--accent))] transition-colors text-sm text-[hsl(var(--muted-foreground))]">
              <Icon icon="mdi:speedometer" class="w-4 h-4" />
              <span>{{ frameRate }}fps</span>
              <Icon icon="mdi:chevron-down" class="w-4 h-4" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="opt in (isIosDevice ? iosFrameRateOptions : androidFrameRateOptions)" :key="opt.value" @click="frameRate = opt.value">
                  {{ opt.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 投屏画面 -->
      <div ref="screenContainer" class="flex-1 flex items-center justify-center bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden relative">
        <!-- Canvas 投屏画面 -->
        <canvas
          v-show="isMirroring"
          ref="mirrorCanvas"
          class="max-w-full max-h-full object-contain cursor-crosshair"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
          @wheel.prevent="onWheel"
          @contextmenu.prevent
        ></canvas>

        <!-- 未投屏时的占位 -->
        <div v-if="!isMirroring && selectedDevice && selectedDevice.status === 'online'" class="text-center py-12">
          <Icon icon="mdi:cellphone-link" class="w-16 h-16 mx-auto text-[hsl(var(--muted-foreground)/0.3)] mb-4" />
          <p class="text-[hsl(var(--muted-foreground))]">点击工具栏 ▶ 开始投屏</p>
          <p class="text-xs text-[hsl(var(--muted-foreground)/0.7)] mt-2">{{ selectedDevice.name }}</p>
        </div>

        <!-- 未选择设备或设备离线 -->
        <div v-if="!isMirroring && (!selectedDevice || selectedDevice.status !== 'online')" class="text-center py-12">
          <Icon icon="mdi:cellphone-off" class="w-20 h-20 mx-auto text-[hsl(var(--muted-foreground)/0.3)] mb-4" />
          <p class="text-[hsl(var(--muted-foreground))]">
            {{ selectedDevice ? '设备离线' : '请选择要投屏的设备' }}
          </p>
          <p class="text-sm text-[hsl(var(--muted-foreground)/0.7)] mt-2">
            从左侧设备列表选择一台已连接的设备
          </p>
        </div>

        <!-- 投屏状态指示 -->
        <div v-if="isMirroring" class="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>{{ currentFps }} fps</span>
          <span v-if="isRecording" class="flex items-center gap-1 ml-1">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span class="text-red-400">{{ recordingDuration }}</span>
          </span>
        </div>
      </div>

      <!-- 快捷操作栏 -->
      <div class="mt-4 p-3 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <div class="flex items-center justify-center gap-2">
          <el-tooltip v-for="btn in quickActions" :key="btn.key" :content="btn.label" placement="top">
            <button 
              class="p-2.5 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors"
              @click="handleQuickAction(btn.key)"
            >
              <Icon :icon="btn.icon" class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
            </button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- 设备信息面板 -->
    <div class="w-72 flex flex-col gap-4">
      <!-- 设备信息卡片 -->
      <div class="p-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <h3 class="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">设备信息</h3>
        <div v-if="selectedDevice" class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">型号</span>
            <span class="text-[hsl(var(--foreground))]">{{ selectedDevice.model }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">系统</span>
            <span class="text-[hsl(var(--foreground))]">{{ selectedDevice.version }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">分辨率</span>
            <span class="text-[hsl(var(--foreground))]">{{ selectedDevice.resolution }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">CPU</span>
            <span class="text-[hsl(var(--foreground))]">{{ selectedDevice.cpuArch }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">存储</span>
            <span class="text-[hsl(var(--foreground))]">{{ selectedDevice.storage }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">电量</span>
            <div class="flex items-center gap-1.5">
              <div class="w-20 h-2 bg-[hsl(var(--secondary))] rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all"
                  :class="selectedDevice.battery > 20 ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive))]'"
                  :style="{ width: selectedDevice.battery + '%' }"
                ></div>
              </div>
              <span class="text-[hsl(var(--foreground))] text-xs">{{ selectedDevice.battery }}%</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-4 text-[hsl(var(--muted-foreground))] text-sm">
          请选择设备
        </div>
      </div>

      <!-- 投屏状态卡片 -->
      <div class="p-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <h3 class="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">投屏状态</h3>
        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">帧率</span>
            <span class="text-[hsl(var(--success))]">{{ currentFps }} fps</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">延迟</span>
            <span :class="latency < 70 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--warning))]'">{{ latency }} ms</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">码率</span>
            <span class="text-[hsl(var(--foreground))]">{{ bitrate }} Mbps</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[hsl(var(--muted-foreground))]">编码</span>
            <span class="text-[hsl(var(--foreground))]">{{ encodingLabel }}</span>
          </div>
        </div>
      </div>

      <!-- 快捷输入 -->
      <div class="p-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <h3 class="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">快捷输入</h3>
        <div class="space-y-2">
          <el-input 
            v-model="quickInput" 
            placeholder="输入文本后按回车发送" 
            size="small"
            @keyup.enter="sendText"
          >
            <template #append>
              <el-button @click="sendText">
                <Icon icon="mdi:send" class="w-4 h-4" />
              </el-button>
            </template>
          </el-input>
          <div class="flex flex-wrap gap-1.5">
            <button 
              v-for="preset in presetTexts" 
              :key="preset"
              class="px-2 py-1 text-xs bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--accent))] rounded transition-colors text-[hsl(var(--muted-foreground))]"
              @click="quickInput = preset"
            >
              {{ preset }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useDeviceStore } from '@/stores/device'
import { storeToRefs } from 'pinia'

const deviceStore = useDeviceStore()
const { selectedDevice } = storeToRefs(deviceStore)

const mirrorCanvas = ref<HTMLCanvasElement | null>(null)
const screenContainer = ref<HTMLElement | null>(null)
const isMirroring = ref(false)
const isRecording = ref(false)
const quality = ref('1080p')
const frameRate = ref(30)
const currentFps = ref(0)
const latency = ref(0)
const bitrate = ref(8)
const quickInput = ref('')
const isPointerDown = ref(false)

let decoder: any = null
let mediaRecorder: any = null
let recordedChunks: Blob[] = []
let recordingStartTime = 0
let recordingTimer: number
const recordingDuration = ref('')
let frameCount = 0
let fpsTimer: number
let deviceWidth = 0
let deviceHeight = 0

const qualityOptions = [
  { label: '原始画质', value: 'original' },
  { label: '1080p', value: '1080p' },
  { label: '720p', value: '720p' },
  { label: '480p', value: '480p' }
]

const qualityLabel = computed(() =>
  qualityOptions.find(q => q.value === quality.value)?.label || '720p'
)

const encodingLabel = computed(() => {
  if (!isMirroring.value) return '-'
  return selectedDevice.value?.platform === 'ios' ? 'JPEG' : 'H.264'
})

const iosFrameRateOptions = [
  { label: '10fps', value: 10 },
  { label: '8fps', value: 8 },
  { label: '5fps', value: 5 }
]

const androidFrameRateOptions = [
  { label: '60fps', value: 60 },
  { label: '30fps', value: 30 },
  { label: '15fps', value: 15 }
]

const isIosDevice = computed(() => selectedDevice.value?.platform === 'ios')

const quickActions = [
  { key: 'home', label: '主页', icon: 'mdi:home' },
  { key: 'back', label: '返回', icon: 'mdi:arrow-left' },
  { key: 'recent', label: '最近任务', icon: 'mdi:view-grid' },
  { key: 'volumeUp', label: '音量+', icon: 'mdi:volume-plus' },
  { key: 'volumeDown', label: '音量-', icon: 'mdi:volume-minus' },
  { key: 'power', label: '电源', icon: 'mdi:power' },
  { key: 'notification', label: '通知栏', icon: 'mdi:bell' }
]

const presetTexts = ['13800138000', '123456', 'test@example.com', '测试文本']

let configData: Uint8Array | null = null

const api = (window as any).electronAPI

function handleJpegFrame(data: Uint8Array) {
  const canvas = mirrorCanvas.value
  if (!canvas) return
  const blob = new Blob([data.slice().buffer as ArrayBuffer], { type: 'image/jpeg' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      deviceWidth = img.naturalWidth
      deviceHeight = img.naturalHeight
    }
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    frameCount++
  }
  img.onerror = () => { URL.revokeObjectURL(url) }
  img.src = url
}

function initDecoder() {
  decoder = new (window as any).VideoDecoder({
    output: (frame: any) => {
      const canvas = mirrorCanvas.value
      if (!canvas) { frame.close(); return }
      if (canvas.width !== frame.displayWidth || canvas.height !== frame.displayHeight) {
        canvas.width = frame.displayWidth
        canvas.height = frame.displayHeight
        deviceWidth = frame.displayWidth
        deviceHeight = frame.displayHeight
      }
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(frame, 0, 0)
      frame.close()
      frameCount++
    },
    error: (e: any) => console.error('Decoder error:', e)
  })
  decoder.configure({
    codec: 'avc1.640028',
    optimizeForLatency: true
  })
}

function destroyDecoder() {
  if (decoder && decoder.state !== 'closed') {
    decoder.close()
  }
  decoder = null
}

const startMirror = async () => {
  if (!selectedDevice.value || isMirroring.value) return
  const isIos = selectedDevice.value.platform === 'ios'
  const result = await api?.startMirror(selectedDevice.value.id, {
    resolution: quality.value,
    frameRate: isIos ? Math.min(frameRate.value, 10) : frameRate.value,
    bitrate: `${bitrate.value}`,
    deviceName: selectedDevice.value.name
  })
  if (result?.success || result?.error === '该设备已在投屏中') {
    isMirroring.value = true
    if (!isIos) initDecoder()
  }
}

const stopMirror = async () => {
  if (!selectedDevice.value) return
  await api?.stopMirror(selectedDevice.value.id)
  isMirroring.value = false
  if (selectedDevice.value.platform !== 'ios') destroyDecoder()
}

const restartMirror = async () => {
  if (!isMirroring.value) return
  await stopMirror()
  await startMirror()
}

watch([quality, frameRate], () => { restartMirror() })

// 选中设备变更时自动开启/停止投屏
watch(() => selectedDevice.value?.id, async (newId, oldId) => {
  // 旧设备停止投屏
  if (oldId && isMirroring.value) {
    await api?.stopMirror(oldId)
    isMirroring.value = false
    destroyDecoder()
  }
  // 新设备在线时自动开启投屏
  if (newId && selectedDevice.value?.status === 'online') {
    await startMirror()
  }
})

function getDeviceCoords(e: PointerEvent) {
  const canvas = mirrorCanvas.value
  if (!canvas || !deviceWidth) return null
  const rect = canvas.getBoundingClientRect()
  const scaleX = deviceWidth / rect.width
  const scaleY = deviceHeight / rect.height
  return {
    x: Math.round((e.clientX - rect.left) * scaleX),
    y: Math.round((e.clientY - rect.top) * scaleY)
  }
}

const onPointerDown = (e: PointerEvent) => {
  if (!isMirroring.value) return
  isPointerDown.value = true
  const coords = getDeviceCoords(e)
  if (coords) {
    api?.sendTouch(selectedDevice.value!.id, 0, coords.x, coords.y, deviceWidth, deviceHeight)
  }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

const onPointerMove = (e: PointerEvent) => {
  if (!isMirroring.value || !isPointerDown.value) return
  const coords = getDeviceCoords(e)
  if (coords) {
    api?.sendTouch(selectedDevice.value!.id, 2, coords.x, coords.y, deviceWidth, deviceHeight)
  }
}

const onPointerUp = (e: PointerEvent) => {
  if (!isMirroring.value || !isPointerDown.value) return
  isPointerDown.value = false
  const coords = getDeviceCoords(e)
  if (coords) {
    api?.sendTouch(selectedDevice.value!.id, 1, coords.x, coords.y, deviceWidth, deviceHeight)
  }
}

const onWheel = (e: WheelEvent) => {
  if (!isMirroring.value) return
  const canvas = mirrorCanvas.value
  if (!canvas || !deviceWidth) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = deviceWidth / rect.width
  const scaleY = deviceHeight / rect.height
  const x = Math.round((e.clientX - rect.left) * scaleX)
  const y = Math.round((e.clientY - rect.top) * scaleY)
  const scrollX = e.deltaX > 0 ? -1 : e.deltaX < 0 ? 1 : 0
  const scrollY = e.deltaY > 0 ? -1 : e.deltaY < 0 ? 1 : 0
  api?.sendScroll(selectedDevice.value!.id, x, y, deviceWidth, deviceHeight, scrollX, scrollY)
}

const takeScreenshot = () => {
  if (!mirrorCanvas.value) return
  const link = document.createElement('a')
  link.download = `screenshot_${Date.now()}.png`
  link.href = mirrorCanvas.value.toDataURL('image/png')
  link.click()
}

const toggleRecording = async () => {
  if (!isRecording.value) {
    const canvas = mirrorCanvas.value
    if (!canvas || !isMirroring.value) return
    recordedChunks = []
    recordingStartTime = Date.now()
    const stream = canvas.captureStream(30)
    // 尝试直接录 MP4，不支持则回退 WebM
    const mp4Type = 'video/mp4;codecs=avc1'
    const supportedTypes = (window as any).MediaRecorder.isTypeSupported?.bind((window as any).MediaRecorder)
    const mimeType = supportedTypes?.(mp4Type) ? mp4Type : 'video/webm;codecs=vp9'
    mediaRecorder = new (window as any).MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000
    })
    mediaRecorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) recordedChunks.push(e.data)
    }
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: mimeType })
      const buffer = await blob.arrayBuffer()
      const uint8 = new Uint8Array(buffer)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultName = `recording_${timestamp}.mp4`
      const result = await api?.showSaveDialog({
        title: '保存录屏',
        defaultPath: defaultName,
        filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
      })
      if (result.filePath) {
        if (mimeType.includes('mp4')) {
          // 原生 MP4，直接保存
          await api?.saveFile(result.filePath, uint8)
        } else {
          // WebM 需转码为 MP4
          await api?.saveRecordingAsMp4(result.filePath, uint8)
        }
      }
      recordedChunks = []
    }
    mediaRecorder.start(1000)
    isRecording.value = true
    const formatDuration = (ms: number) => {
      const s = Math.floor(ms / 1000)
      const m = Math.floor(s / 60)
      const ss = String(s % 60).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      return `${mm}:${ss}`
    }
    recordingTimer = window.setInterval(() => {
      recordingDuration.value = formatDuration(Date.now() - recordingStartTime)
    }, 500)
  } else {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    isRecording.value = false
    clearInterval(recordingTimer)
    recordingDuration.value = ''
  }
}
const rotateScreen = () => { console.log('Rotating screen...') }
const toggleFullscreen = () => {
  screenContainer.value?.requestFullscreen?.()
}

const ANDROID_KEYCODES: Record<string, number> = {
  home: 3,
  back: 4,
  recent: 187,
  volumeUp: 24,
  volumeDown: 25,
  power: 26,
}

const handleQuickAction = (key: string) => {
  if (!selectedDevice.value || !isMirroring.value) return
  const keyCode = ANDROID_KEYCODES[key]
  if (keyCode) {
    api?.sendKey(selectedDevice.value.id, keyCode)
  } else if (key === 'notification') {
    // Swipe down from top to open notification panel
    const w = deviceWidth || 720
    const h = deviceHeight || 1280
    const devId = selectedDevice.value.id
    api?.sendTouch(devId, 0, Math.round(w / 2), 0, w, h)
    setTimeout(() => api?.sendTouch(devId, 2, Math.round(w / 2), Math.round(h / 3), w, h), 50)
    setTimeout(() => api?.sendTouch(devId, 1, Math.round(w / 2), Math.round(h / 3), w, h), 100)
  }
}

const sendText = () => {
  if (quickInput.value && selectedDevice.value && isMirroring.value) {
    api?.sendText(selectedDevice.value.id, quickInput.value)
    quickInput.value = ''
  }
}

onMounted(() => {
  fpsTimer = window.setInterval(() => {
    currentFps.value = frameCount
    frameCount = 0
  }, 1000)

  // 自动开启投屏
  if (selectedDevice.value?.status === 'online') {
    startMirror()
  }

  api?.onMirrorFrame?.((_e: any, packet: any) => {
    if (packet.type === 'jpeg') {
      handleJpegFrame(packet.data)
      return
    }

    if (!decoder || decoder.state === 'closed') return
    const data = new Uint8Array(packet.data)

    if (packet.type === 'configuration') {
      configData = data
      return
    }

    // For keyframes, prepend SPS/PPS config
    let frameData = data
    if (packet.keyframe && configData) {
      const merged = new Uint8Array(configData.length + data.length)
      merged.set(configData, 0)
      merged.set(data, configData.length)
      frameData = merged
    }

    try {
      const chunk = new (window as any).EncodedVideoChunk({
        type: packet.keyframe ? 'key' : 'delta',
        timestamp: packet.pts || performance.now() * 1000,
        data: frameData
      })
      decoder.decode(chunk)
    } catch {}
  })

  api?.onMirrorStopped?.((_e: any, deviceId: string) => {
    if (selectedDevice.value?.id === deviceId) {
      isMirroring.value = false
      if (selectedDevice.value && selectedDevice.value.platform !== 'ios') destroyDecoder()
    }
  })
})

onUnmounted(() => {
  clearInterval(fpsTimer)
  clearInterval(recordingTimer)
  if (isMirroring.value && selectedDevice.value) {
    api?.stopMirror(selectedDevice.value.id)
  }
  destroyDecoder()
})
</script>


