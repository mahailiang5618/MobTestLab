<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[hsl(var(--background))]">
    <!-- 顶部标题栏 -->
    <div class="fixed top-0 left-0 right-0 z-50">
      <TitleBar />
    </div>

    <!-- 主体区域 -->
    <div class="flex w-full pt-10">
      <!-- 左侧导航栏 -->
      <aside class="w-20 flex flex-col items-center py-4 border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] h-[calc(100vh-40px)]">
        <!-- Logo -->
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] flex items-center justify-center mb-8 shadow-lg">
          <Icon icon="mdi:cellphone-link" class="w-5 h-5 text-white" />
        </div>

        <!-- 主导航 -->
        <nav class="flex-1 flex flex-col items-center gap-3">
          <router-link
            v-for="nav in navItems"
            :key="nav.path"
            :to="nav.path"
            v-slot="{ isActive }"
          >
            <button
              :class="[
                'w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all',
                isActive
                  ? 'bg-[hsl(var(--primary))] text-white shadow-md'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
              ]"
            >
              <Icon :icon="nav.icon" class="w-5 h-5" />
              <span class="text-[10px] leading-none">{{ nav.label }}</span>
            </button>
          </router-link>
        </nav>

        <!-- 底部操作 -->
        <div class="flex flex-col items-center gap-3">
          <button
            class="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-all"
            @click="showSettings = true"
          >
            <Icon icon="mdi:cog-outline" class="w-5 h-5" />
            <span class="text-[10px] leading-none">设置</span>
          </button>
          <button
            class="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-all"
            @click="toggleTheme"
          >
            <Icon :icon="isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'" class="w-5 h-5" />
            <span class="text-[10px] leading-none">主题</span>
          </button>
        </div>
      </aside>

      <!-- 主内容区 -->
      <div class="flex flex-1 flex-col overflow-hidden h-[calc(100vh-40px)]">
        <!-- 主工作区 -->
        <main class="flex-1 overflow-auto p-4">
          <router-view />
        </main>

        <!-- 底部状态栏 -->
        <StatusBar />
      </div>
    </div>

    <!-- 设置对话框 -->
    <el-dialog v-model="showSettings" title="设置" width="500px">
      <SettingsPanel />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import TitleBar from '@/components/layout/TitleBar.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import SettingsPanel from '@/components/layout/SettingsPanel.vue'

const showSettings = ref(false)
const isDark = ref(true)

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  document.documentElement.classList.toggle('light', !isDark.value)
}

const navItems = [
  { label: '投屏', path: '/mirror', icon: 'mdi:cellphone-screenshot' },
  { label: '性能', path: '/performance', icon: 'mdi:chart-line' },
  { label: '自动化', path: '/automation', icon: 'mdi:robot' },
  { label: '报告', path: '/reports', icon: 'mdi:file-document-outline' },
  { label: '助手', path: '/assistant', icon: 'mdi:chat-outline' }
]
</script>

<style>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
