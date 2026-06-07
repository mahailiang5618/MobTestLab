<template>
  <footer class="h-8 flex items-center justify-between px-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs">
    <!-- 左侧：连接状态 -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full" :class="connectionStatusClass"></span>
        <span class="text-[hsl(var(--muted-foreground))]">
          {{ onlineCount }} 台设备已连接
        </span>
      </div>
      <div v-if="selectedDevice" class="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
        <Icon icon="mdi:cellphone" class="w-3.5 h-3.5" />
        <span>{{ selectedDevice.name }}</span>
      </div>
    </div>

    <!-- 中间：性能概览 -->
    <div v-if="isCollecting" class="flex items-center gap-4">
      <div class="flex items-center gap-1.5">
        <span class="text-[hsl(var(--muted-foreground))]">CPU</span>
        <span :class="getCpuClass(currentCpu)">{{ currentCpu }}%</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[hsl(var(--muted-foreground))]">内存</span>
        <span class="text-[hsl(var(--foreground))]">{{ currentMemory }} MB</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-[hsl(var(--muted-foreground))]">FPS</span>
        <span :class="getFpsClass(currentFps)">{{ currentFps }}</span>
      </div>
    </div>

    <!-- 右侧：AI Token 用量 -->
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
        <Icon icon="mdi:robot" class="w-3.5 h-3.5" />
        <span>Token: {{ tokenUsage.toLocaleString() }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
        <Icon icon="mdi:clock-outline" class="w-3.5 h-3.5" />
        <span>{{ currentTime }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useDeviceStore } from '@/stores/device'
import { usePerformanceStore } from '@/stores/performance'
import { storeToRefs } from 'pinia'

const deviceStore = useDeviceStore()
const performanceStore = usePerformanceStore()

const { selectedDevice, onlineDevices } = storeToRefs(deviceStore)
const { isCollecting } = storeToRefs(performanceStore)

const currentTime = ref('')
const tokenUsage = ref(12580)

// Mock performance data
const currentCpu = ref(45)
const currentMemory = ref(312)
const currentFps = ref(58)

const onlineCount = computed(() => onlineDevices.value.length)

const connectionStatusClass = computed(() => 
  onlineCount.value > 0 ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive))]'
)

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

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

let timer: number

onMounted(() => {
  updateTime()
  timer = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>
