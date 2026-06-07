import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Device {
  id: string
  name: string
  platform: 'android' | 'ios' | 'harmonyos'
  status: 'online' | 'offline' | 'connecting' | 'unauthorized'
  model: string
  version: string
  resolution: string
  cpuArch: string
  storage: string
  battery: number
  connectionType: 'usb' | 'wifi'
  ip?: string
}

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([])
  const selectedDeviceId = ref<string | null>(null)

  const selectedDevice = computed(() =>
    devices.value.find(d => d.id === selectedDeviceId.value)
  )

  const onlineDevices = computed(() =>
    devices.value.filter(d => d.status === 'online')
  )

  const selectDevice = (id: string) => {
    selectedDeviceId.value = id
  }

  const updateDeviceStatus = (id: string, status: Device['status']) => {
    const device = devices.value.find(d => d.id === id)
    if (device) {
      device.status = status
    }
  }

  const refreshDevices = async () => {
    if ((window as any).electronAPI) {
      const result = await (window as any).electronAPI.getDevices()
      devices.value = result
      if (result.length > 0 && !selectedDeviceId.value) {
        selectedDeviceId.value = result[0].id
      }
    }
  }

  // Poll for devices every 3 seconds
  let pollTimer: number | undefined
  const startPolling = () => {
    refreshDevices()
    pollTimer = window.setInterval(refreshDevices, 3000)
  }
  const stopPolling = () => {
    if (pollTimer) clearInterval(pollTimer)
  }

  startPolling()

  return {
    devices,
    selectedDeviceId,
    selectedDevice,
    onlineDevices,
    selectDevice,
    updateDeviceStatus,
    refreshDevices,
    stopPolling
  }
})
