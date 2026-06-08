<template>
  <header class="relative h-11 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] select-none">
    <!-- 左侧：macOS 交通灯按钮区域（不可拖拽） -->
    <div class="w-[76px] flex-shrink-0 app-no-drag"></div>

    <!-- 中间标题（可拖拽） -->
    <div class="flex-1 absolute inset-0 flex items-center justify-center app-drag pointer-events-none">
      <span class="text-base font-bold tracking-widest uppercase bg-gradient-to-r from-[hsl(var(--primary))] via-blue-400 to-cyan-400 bg-clip-text text-transparent">
        MobTestLab
      </span>
    </div>

    <!-- 右侧操作按钮 -->
    <div class="flex items-center gap-1 pr-3 app-no-drag">
      <!-- 设备下拉 -->
      <el-popover placement="bottom-end" :width="400" trigger="click">
        <template #reference>
          <button class="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-[hsl(var(--accent))] transition-colors relative">
            <Icon icon="mdi:cellphone" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <span class="text-xs text-[hsl(var(--muted-foreground))]">{{ selectedDevice?.name || (onlineCount > 0 ? '设备' : '暂无设备') }}</span>
            <Icon icon="mdi:chevron-down" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            <span
              v-if="onlineCount > 0"
              class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[hsl(var(--success))] text-white text-[8px] rounded-full flex items-center justify-center"
            >{{ onlineCount }}</span>
          </button>
        </template>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-[hsl(var(--muted-foreground))]">设备列表 ({{ devices.length }})</span>
            <div class="flex gap-1">
              <button class="p-1 rounded hover:bg-[hsl(var(--accent))]" @click="refreshDevices">
                <Icon icon="mdi:refresh" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              </button>
              <button class="p-1 rounded hover:bg-[hsl(var(--accent))]" @click="showAddDialog = true">
                <Icon icon="mdi:plus" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>
          </div>
          <!-- 筛选 -->
          <div class="flex gap-1 mb-2">
            <button
              v-for="f in filters"
              :key="f.value"
              :class="['px-2 py-0.5 text-[10px] rounded', activeFilter === f.value ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]']"
              @click="activeFilter = f.value"
            >{{ f.label }}</button>
          </div>
          <!-- 设备列表 -->
          <div class="max-h-80 overflow-y-auto space-y-1">
            <div
              v-for="d in filteredDevices"
              :key="d.id"
              :class="['flex items-center gap-2 p-2 rounded cursor-pointer', d.id === deviceStore.selectedDeviceId ? 'bg-[hsl(var(--primary)/0.15)]' : 'hover:bg-[hsl(var(--accent))]']"
              @click="deviceStore.selectDevice(d.id)"
            >
              <div class="relative flex-shrink-0">
                <Icon :icon="getPlatformIcon(d.platform)" class="w-4 h-4 text-[hsl(var(--foreground))]" />
                <span :class="['absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full', d.status === 'online' ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--muted-foreground))]']"></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium truncate">{{ d.name }}</div>
                <div class="text-[10px] text-[hsl(var(--muted-foreground))]">{{ d.version }}</div>
              </div>
              <Icon v-if="d.id === deviceStore.selectedDeviceId" icon="mdi:check" class="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <div v-if="filteredDevices.length === 0" class="text-xs text-center text-[hsl(var(--muted-foreground))] py-4">暂无设备</div>
          </div>
        </div>
      </el-popover>
    </div>

    <!-- 添加设备对话框 -->
    <el-dialog v-model="showAddDialog" title="添加设备" width="360px">
      <el-form label-position="top" size="default">
        <el-form-item label="设备 IP 地址">
          <el-input v-model="addIp" placeholder="例如：192.168.1.100:5555" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="showAddDialog = false">连接</el-button>
      </template>
    </el-dialog>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useDeviceStore } from '@/stores/device'

const deviceStore = useDeviceStore()

const showAddDialog = ref(false)
const addIp = ref('')
const activeFilter = ref('all')

const filters = [
  { label: '全部', value: 'all' },
  { label: 'Android', value: 'android' },
  { label: 'iOS', value: 'ios' }
]

const devices = computed(() => deviceStore.devices)
const onlineCount = computed(() => devices.value.filter(d => d.status === 'online').length)
const selectedDevice = computed(() => devices.value.find(d => d.id === deviceStore.selectedDeviceId))
const filteredDevices = computed(() => {
  if (activeFilter.value === 'all') return devices.value
  return devices.value.filter(d => d.platform === activeFilter.value)
})

const getPlatformIcon = (platform: string) => {
  const icons: Record<string, string> = { android: 'mdi:android', ios: 'mdi:apple', harmonyos: 'simple-icons:huawei' }
  return icons[platform] || 'mdi:cellphone'
}

const refreshDevices = () => { deviceStore.refreshDevices() }
</script>

<style scoped>
.app-drag {
  -webkit-app-region: drag;
}
.app-no-drag {
  -webkit-app-region: no-drag;
}
</style>
