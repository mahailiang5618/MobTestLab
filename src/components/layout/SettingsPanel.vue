<template>
  <div class="space-y-4">
    <!-- 外观设置 -->
    <div>
      <h3 class="text-sm font-medium mb-3 text-[hsl(var(--foreground))]">外观</h3>
      <div class="flex items-center justify-between">
        <span class="text-sm text-[hsl(var(--muted-foreground))]">深色模式</span>
        <el-switch v-model="isDarkMode" @change="toggleTheme" />
      </div>
    </div>
    
    <el-divider />
    
    <!-- ADB 设置 -->
    <div>
      <h3 class="text-sm font-medium mb-3 text-[hsl(var(--foreground))]">ADB 配置</h3>
      <el-form label-position="top" size="default">
        <el-form-item label="ADB 路径">
          <el-input v-model="settings.adbPath" placeholder="自动检测" />
        </el-form-item>
      </el-form>
    </div>
    
    <el-divider />
    
    <!-- 投屏设置 -->
    <div>
      <h3 class="text-sm font-medium mb-3 text-[hsl(var(--foreground))]">投屏</h3>
      <el-form label-position="top" size="default">
        <el-form-item label="默认分辨率">
          <el-select v-model="settings.resolution" class="w-full">
            <el-option label="720p" value="720" />
            <el-option label="1080p" value="1080" />
            <el-option label="原始分辨率" value="native" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认帧率">
          <el-select v-model="settings.fps" class="w-full">
            <el-option label="30 FPS" :value="30" />
            <el-option label="60 FPS" :value="60" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    
    <el-divider />
    
    <!-- 关于 -->
    <div>
      <h3 class="text-sm font-medium mb-3 text-[hsl(var(--foreground))]">关于</h3>
      <div class="flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] flex items-center justify-center shadow">
          <Icon icon="mdi:cellphone-link" class="w-5 h-5 text-white" />
        </div>
        <div>
          <div class="text-sm font-semibold text-[hsl(var(--foreground))]">MobTestLab</div>
          <div class="text-xs text-[hsl(var(--muted-foreground))]">一站式移动端测试工作台</div>
        </div>
      </div>
      <div class="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
        <div class="flex justify-between">
          <span>版本</span>
          <span>1.0.0</span>
        </div>
        <div class="flex justify-between">
          <span>Electron</span>
          <span>33.0.0</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Icon } from '@iconify/vue'

const isDarkMode = ref(true)

const settings = reactive({
  adbPath: '',
  resolution: '1080',
  fps: 60
})

const toggleTheme = (dark: boolean) => {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

onMounted(() => {
  isDarkMode.value = document.documentElement.classList.contains('dark')
})
</script>
