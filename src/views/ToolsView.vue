<template>
  <div class="flex h-full gap-4">
    <!-- 工具列表 -->
    <div class="w-56 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
      <div class="p-3 border-b border-[hsl(var(--border))]">
        <span class="text-sm font-medium">工具列表</span>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="tool in tools"
          :key="tool.id"
          :class="['flex items-center gap-2 p-2.5 rounded-lg cursor-pointer text-sm transition-all', activeTool === tool.id ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] font-medium' : 'hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]']"
          @click="activeTool = tool.id"
        >
          <Icon :icon="tool.icon" class="w-4.5 h-4.5 flex-shrink-0" />
          <span class="flex-1 truncate">{{ tool.label }}</span>
        </div>
      </div>
    </div>

    <!-- 工具内容区 -->
    <div class="flex-1 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden">
      <!-- 二维码生成器 -->
      <div v-if="activeTool === 'qrcode'" class="flex flex-col h-full">
        <!-- 顶部标题 + 样式 Tab -->
        <div class="px-6 pt-5 pb-0">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">二维码生成</h2>
          </div>
          <!-- 样式 Tab: 普通 / 艺术 / 动态 -->
          <div class="flex gap-1 p-1 bg-[hsl(var(--secondary))] rounded-lg w-fit">
            <button
              v-for="s in styles"
              :key="s.value"
              :class="['px-4 py-1.5 rounded-md text-sm transition-all', qrStyle === s.value ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm font-medium' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]']"
              @click="qrStyle = s.value"
            >{{ s.label }}</button>
          </div>
        </div>

        <!-- 主体内容 -->
        <div class="flex flex-1 min-h-0 px-6 py-5 gap-6">
          <!-- 左侧：输入区 -->
          <div class="flex-1 flex flex-col gap-4">
            <!-- 内容类型切换 -->
            <div class="flex items-center gap-3">
              <span class="text-sm text-[hsl(var(--muted-foreground))]">内容类型</span>
              <div class="flex gap-1 p-0.5 bg-[hsl(var(--secondary))] rounded-md">
                <button
                  v-for="m in modes"
                  :key="m.value"
                  :class="['px-3 py-1 rounded text-xs transition-all', mode === m.value ? 'bg-[hsl(var(--card))] shadow-sm font-medium' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]']"
                  @click="mode = m.value"
                >{{ m.label }}</button>
              </div>
            </div>

            <!-- 文本/网址输入 -->
            <template v-if="mode === 'text'">
              <div class="flex-1 flex flex-col gap-2">
                <label class="text-sm font-medium">输入内容</label>
                <textarea
                  v-model="textInput"
                  class="flex-1 resize-none rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary)/0.3)] transition-all placeholder:text-[hsl(var(--muted-foreground)/0.6)]"
                  placeholder="输入文本、网址或任意内容..."
                ></textarea>
                <div class="text-xs text-[hsl(var(--muted-foreground))]">{{ textInput.length }} 字符</div>
              </div>
            </template>

            <!-- 文件选择 -->
            <template v-else>
              <div class="flex flex-col gap-3">
                <label class="text-sm font-medium">选择文件</label>
                <div
                  class="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--primary)/0.02)] transition-all cursor-pointer"
                  @click="pickFile"
                >
                  <Icon icon="mdi:cloud-upload-outline" class="w-8 h-8 text-[hsl(var(--muted-foreground)/0.5)]" />
                  <span class="text-sm text-[hsl(var(--muted-foreground))]">点击选择文件</span>
                  <span class="text-xs text-[hsl(var(--muted-foreground)/0.6)]">同局域网设备扫码即可下载</span>
                </div>
                <div v-if="selectedFile" class="flex items-center gap-2 p-3 rounded-lg bg-[hsl(var(--secondary))]">
                  <Icon icon="mdi:file-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span class="text-sm flex-1 truncate">{{ selectedFile.name }}</span>
                  <button class="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" @click="stopServer">
                    <Icon icon="mdi:close" class="w-4 h-4" />
                  </button>
                </div>
                <div v-if="fileServerInfo" class="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span class="text-xs text-green-600 dark:text-green-400 flex-1 break-all">{{ fileServerInfo.url }}</span>
                </div>
              </div>
            </template>

            <!-- 艺术二维码提示 -->
            <div v-if="qrStyle === 'art'" class="p-3 rounded-lg bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.1)]">
              <div class="flex items-center gap-2 text-sm text-[hsl(var(--primary))]">
                <Icon icon="mdi:palette-outline" class="w-4 h-4" />
                <span class="font-medium">艺术二维码</span>
              </div>
              <p class="text-xs text-[hsl(var(--muted-foreground))] mt-1">基于普通二维码美化样式，添加圆角和渐变色彩</p>
            </div>
            <div v-if="qrStyle === 'dynamic'" class="p-3 rounded-lg bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.1)]">
              <div class="flex items-center gap-2 text-sm text-[hsl(var(--primary))]">
                <Icon icon="mdi:motion-outline" class="w-4 h-4" />
                <span class="font-medium">动态二维码</span>
              </div>
              <p class="text-xs text-[hsl(var(--muted-foreground))] mt-1">生成带有呼吸动画效果的二维码，更加吸引注意力</p>
            </div>
          </div>

          <!-- 右侧：二维码预览 -->
          <div class="w-72 flex flex-col items-center gap-5">
            <div class="text-sm font-medium text-[hsl(var(--muted-foreground))] self-start">预览</div>
            <!-- QR 展示卡片 -->
            <div :class="['relative rounded-2xl p-6 flex items-center justify-center', qrDataUrl ? 'bg-white shadow-lg' : 'border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)]']" style="width: 240px; height: 240px;">
              <template v-if="qrDataUrl">
                <img
                  :src="qrDataUrl"
                  :class="['w-full h-full object-contain', qrStyle === 'dynamic' ? 'animate-qr-breathe' : '']"
                  :style="qrStyle === 'art' ? 'border-radius: 12px' : ''"
                />
              </template>
              <div v-else class="flex flex-col items-center gap-2 text-[hsl(var(--muted-foreground)/0.5)]">
                <Icon icon="mdi:qrcode" class="w-12 h-12" />
                <span class="text-xs">输入内容生成二维码</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div v-if="qrDataUrl" class="flex gap-3">
              <button class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm hover:opacity-90 transition-opacity" @click="saveQr">
                <Icon icon="mdi:download" class="w-4 h-4" />
                <span>保存图片</span>
              </button>
              <button class="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[hsl(var(--border))] text-sm hover:bg-[hsl(var(--accent))] transition-colors" @click="copyContent">
                <Icon icon="mdi:content-copy" class="w-4 h-4" />
                <span>复制内容</span>
              </button>
            </div>

            <!-- 样式标识 -->
            <div v-if="qrDataUrl" class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
              <Icon :icon="qrStyle === 'normal' ? 'mdi:qrcode' : qrStyle === 'art' ? 'mdi:palette' : 'mdi:motion'" class="w-3.5 h-3.5" />
              <span>{{ styles.find(s => s.value === qrStyle)?.label }}二维码</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import QRCode from 'qrcode'

const activeTool = ref('qrcode')
const tools = [{ id: 'qrcode', label: '二维码生成', icon: 'mdi:qrcode' }]
const styles = [{ label: '普通', value: 'normal' }, { label: '艺术', value: 'art' }, { label: '动态', value: 'dynamic' }]
const modes = [{ label: '文本/网址', value: 'text' }, { label: '文件', value: 'file' }]
const qrStyle = ref('normal')
const mode = ref('text')
const textInput = ref('')
const qrDataUrl = ref('')
const selectedFile = ref<{ name: string; path: string } | null>(null)
const fileServerInfo = ref<{ url: string; port: number } | null>(null)

let debounceTimer: ReturnType<typeof setTimeout>

const generateQr = async (content: string) => {
  if (!content.trim()) { qrDataUrl.value = ''; return }
  const opts: QRCode.QRCodeToDataURLOptions = { width: 384, margin: 2 }
  if (qrStyle.value === 'art') {
    opts.color = { dark: '#1e40af', light: '#ffffff' }
    opts.errorCorrectionLevel = 'H'
  }
  qrDataUrl.value = await QRCode.toDataURL(content.trim(), opts)
}

watch(textInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => generateQr(val), 300)
})

watch(qrStyle, () => {
  if (mode.value === 'text' && textInput.value) generateQr(textInput.value)
  else if (mode.value === 'file' && fileServerInfo.value) generateQr(fileServerInfo.value.url)
})

watch(mode, () => {
  qrDataUrl.value = ''
  selectedFile.value = null
  stopServer()
})

const pickFile = async () => {
  const { filePaths } = await (window as any).electronAPI.showOpenDialog({ properties: ['openFile'] })
  if (!filePaths?.length) return
  const filePath = filePaths[0]
  selectedFile.value = { name: filePath.split('/').pop()!, path: filePath }
  const res = await (window as any).electronAPI.startFileServer(filePath)
  if (res?.url) {
    fileServerInfo.value = res
    await generateQr(res.url)
  }
}

const stopServer = async () => {
  await (window as any).electronAPI.stopFileServer()
  fileServerInfo.value = null
  selectedFile.value = null
  if (mode.value === 'file') qrDataUrl.value = ''
}

const saveQr = async () => {
  const { filePath } = await (window as any).electronAPI.showSaveDialog({
    defaultPath: 'qrcode.png',
    filters: [{ name: 'PNG', extensions: ['png'] }]
  })
  if (!filePath) return
  const base64 = qrDataUrl.value.replace(/^data:image\/png;base64,/, '')
  await (window as any).electronAPI.saveFile(filePath, Uint8Array.from(atob(base64), c => c.charCodeAt(0)))
}

const copyContent = () => {
  const content = mode.value === 'text' ? textInput.value : fileServerInfo.value?.url || ''
  if (content) navigator.clipboard.writeText(content)
}

onUnmounted(() => { stopServer() })
</script>

<style scoped>
@keyframes qr-breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.03); opacity: 0.9; }
}
.animate-qr-breathe {
  animation: qr-breathe 2.5s ease-in-out infinite;
}
</style>
