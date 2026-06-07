<template>
  <div class="flex flex-col h-full">
    <!-- 头部 -->
    <div class="flex items-center justify-between p-3 border-b border-[hsl(var(--sidebar-border))]">
      <h2 class="text-sm font-semibold text-[hsl(var(--foreground))]">设备列表</h2>
      <div class="flex items-center gap-1">
        <el-tooltip content="刷新设备" placement="top">
          <button 
            class="p-1.5 rounded hover:bg-[hsl(var(--accent))] transition-colors"
            @click="refreshDevices"
          >
            <Icon icon="mdi:refresh" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </el-tooltip>
        <el-tooltip content="添加设备" placement="top">
          <button 
            class="p-1.5 rounded hover:bg-[hsl(var(--accent))] transition-colors"
            @click="showAddDialog = true"
          >
            <Icon icon="mdi:plus" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </el-tooltip>
        <el-tooltip content="收起" placement="top">
          <button 
            class="p-1.5 rounded hover:bg-[hsl(var(--accent))] transition-colors"
            @click="$emit('close')"
          >
            <Icon icon="mdi:chevron-left" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- 设备筛选 -->
    <div class="p-2 border-b border-[hsl(var(--sidebar-border))]">
      <div class="flex gap-1">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          :class="[
            'px-2 py-1 text-xs rounded transition-colors',
            activeFilter === filter.value 
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
          ]"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- 设备列表 -->
    <div class="flex-1 overflow-y-auto p-2">
      <div
        v-for="device in filteredDevices"
        :key="device.id"
        :class="[
          'p-2.5 rounded-lg cursor-pointer mb-1.5 transition-all',
          device.id === selectedDeviceId 
            ? 'bg-[hsl(var(--primary)/0.15)] border border-[hsl(var(--primary)/0.3)]' 
            : 'hover:bg-[hsl(var(--accent))] border border-transparent'
        ]"
        @click="selectDevice(device.id)"
      >
        <div class="flex items-center gap-2.5">
          <!-- 设备图标 -->
          <div class="relative flex-shrink-0">
            <div class="w-9 h-9 rounded-lg bg-[hsl(var(--secondary))] flex items-center justify-center">
              <Icon 
                :icon="getPlatformIcon(device.platform)" 
                class="w-4 h-4 text-[hsl(var(--foreground))]" 
              />
            </div>
            <span 
              :class="[
                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[hsl(var(--sidebar))]',
                getStatusClass(device.status)
              ]"
            ></span>
          </div>
          
          <!-- 设备信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-medium text-[hsl(var(--foreground))] truncate">
                {{ device.name }}
              </span>
              <Icon 
                v-if="device.connectionType === 'wifi'"
                icon="mdi:wifi" 
                class="w-3 h-3 text-[hsl(var(--muted-foreground))]" 
              />
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[10px] text-[hsl(var(--muted-foreground))]">{{ device.version }}</span>
              <span 
                :class="[
                  'text-[10px] px-1 py-0.5 rounded',
                  getStatusBadgeClass(device.status)
                ]"
              >
                {{ getStatusText(device.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredDevices.length === 0" class="flex flex-col items-center justify-center py-6 text-center">
        <Icon icon="mdi:cellphone-off" class="w-10 h-10 text-[hsl(var(--muted-foreground)/0.5)] mb-2" />
        <p class="text-xs text-[hsl(var(--muted-foreground))]">暂无设备</p>
      </div>
    </div>

    <!-- 添加设备对话框 -->
    <el-dialog v-model="showAddDialog" title="添加设备" width="360px">
      <el-form label-position="top" size="default">
        <el-form-item label="连接方式">
          <el-radio-group v-model="addForm.type">
            <el-radio value="wifi">WiFi 连接</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="设备 IP 地址">
          <el-input v-model="addForm.ip" placeholder="例如：192.168.1.100:5555" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="addDevice">连接</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useDeviceStore } from '@/stores/device'
import { storeToRefs } from 'pinia'

defineEmits<{
  close: []
}>()

const deviceStore = useDeviceStore()
const { devices, selectedDeviceId } = storeToRefs(deviceStore)
const { selectDevice } = deviceStore

const activeFilter = ref('all')
const showAddDialog = ref(false)
const addForm = ref({
  type: 'wifi',
  ip: ''
})

const filters = [
  { label: '全部', value: 'all' },
  { label: 'Android', value: 'android' },
  { label: 'iOS', value: 'ios' }
]

const filteredDevices = computed(() => {
  if (activeFilter.value === 'all') return devices.value
  return devices.value.filter(d => d.platform === activeFilter.value)
})

const getPlatformIcon = (platform: string) => {
  const icons: Record<string, string> = {
    android: 'mdi:android',
    ios: 'mdi:apple',
    harmonyos: 'simple-icons:huawei'
  }
  return icons[platform] || 'mdi:cellphone'
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    online: 'bg-[hsl(var(--success))]',
    offline: 'bg-[hsl(var(--muted-foreground))]',
    connecting: 'bg-[hsl(var(--warning))]',
    unauthorized: 'bg-yellow-500'
  }
  return classes[status] || 'bg-[hsl(var(--muted-foreground))]'
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    online: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
    offline: 'bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]',
    connecting: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]',
    unauthorized: 'bg-yellow-500/15 text-yellow-500'
  }
  return classes[status] || ''
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    online: '已连接',
    offline: '离线',
    connecting: '连接中',
    unauthorized: '未授权'
  }
  return texts[status] || status
}

const refreshDevices = () => {
  deviceStore.refreshDevices()
}

const addDevice = () => {
  console.log('Adding device:', addForm.value)
  showAddDialog.value = false
}
</script>
