<template>
  <div class="flex flex-col gap-5 h-full overflow-y-auto">
    <!-- 第一行：天气 + 日期 + 名言 横向布局 -->
    <div class="grid grid-cols-3 gap-4">
      <!-- 天气卡 -->
      <div class="p-5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-xs text-[hsl(var(--muted-foreground))] mb-1">今日天气</div>
            <div class="text-3xl font-bold">{{ weather.temp }}°C</div>
            <div class="text-sm text-[hsl(var(--muted-foreground))] mt-1">{{ weather.desc }}</div>
          </div>
          <Icon :icon="weather.icon" class="w-14 h-14 text-[hsl(var(--primary)/0.6)]" />
        </div>
        <div class="flex gap-4 mt-4 pt-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
          <span>湿度 {{ weather.humidity }}%</span>
          <span>风速 {{ weather.wind }}</span>
          <span>{{ weather.aqi }}</span>
        </div>
      </div>

      <!-- 日期卡 -->
      <div class="p-5 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)] text-white relative overflow-hidden flex flex-col justify-between">
        <div class="relative z-10">
          <div class="text-sm opacity-70">{{ greeting }}</div>
          <div class="text-xl font-bold mt-3">{{ fullDate }}</div>
          <div class="text-base opacity-70 mt-1">{{ weekday }}</div>
        </div>
        <div class="absolute right-3 bottom-3 opacity-15">
          <Icon icon="mdi:calendar-month" class="w-16 h-16" />
        </div>
      </div>

      <!-- 名人名言卡 -->
      <div class="p-5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex flex-col justify-between">
        <div>
          <div class="text-xs text-[hsl(var(--muted-foreground))] mb-2">每日一言</div>
          <p class="text-base leading-relaxed italic transition-opacity duration-500" :class="quoteFading ? 'opacity-0' : 'opacity-100'">"{{ currentQuote.text }}"</p>
        </div>
        <div class="text-sm text-[hsl(var(--muted-foreground))] text-right mt-3 transition-opacity duration-500" :class="quoteFading ? 'opacity-0' : 'opacity-100'">—— {{ currentQuote.author }}</div>
      </div>
    </div>

    <!-- 第二行：设备信息（本机 Mac）横向布局 -->
    <div class="flex-1 min-h-0">
      <div class="flex items-center gap-2 mb-3">
        <Icon icon="mdi:laptop" class="w-4 h-4 text-[hsl(var(--primary))]" />
        <span class="text-sm font-medium">设备信息</span>
      </div>
      <div class="grid grid-cols-4 gap-3">
        <div v-for="info in macInfo" :key="info.label" class="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center">
              <Icon :icon="info.icon" class="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <span class="text-xs text-[hsl(var(--muted-foreground))]">{{ info.label }}</span>
          </div>
          <div class="text-base font-bold">{{ info.value }}</div>
          <div v-if="info.sub" class="text-xs text-[hsl(var(--muted-foreground))] mt-1">{{ info.sub }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'

const hour = new Date().getHours()
const greeting = hour < 12 ? '上午好 ☀️' : hour < 18 ? '下午好 🌤️' : '晚上好 🌙'
const now = new Date()
const fullDate = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
const weekday = now.toLocaleDateString('zh-CN', { weekday: 'long' })

const quotes = [
  { text: '测试是证明软件存在缺陷的过程，而非证明没有缺陷。', author: 'Edsger Dijkstra' },
  { text: '先让它工作，再让它正确，最后让它快。', author: 'Kent Beck' },
  { text: '简单是可靠的先决条件。', author: 'Edsger Dijkstra' },
  { text: '好的测试告诉一个故事。', author: 'Roy Osherove' },
  { text: '质量不是一个行为，而是一种习惯。', author: '亚里士多德' },
  { text: '代码是写给人看的，顺便能在机器上运行。', author: 'Harold Abelson' },
  { text: '任何可能出错的事情终将出错。', author: '墨菲定律' },
  { text: '过早优化是万恶之源。', author: 'Donald Knuth' }
]

const quoteIndex = ref(0)
const quoteFading = ref(false)
const currentQuote = ref(quotes[0])

let quoteTimer: ReturnType<typeof setInterval>
onMounted(() => {
  quoteTimer = setInterval(() => {
    quoteFading.value = true
    setTimeout(() => {
      quoteIndex.value = (quoteIndex.value + 1) % quotes.length
      currentQuote.value = quotes[quoteIndex.value]
      quoteFading.value = false
    }, 500)
  }, 10000)
})
onUnmounted(() => clearInterval(quoteTimer))

const weather = ref({ temp: '--', desc: '加载中...', icon: 'mdi:weather-cloudy', humidity: '--', wind: '--', aqi: '--' })

const macInfo = ref([
  { label: '操作系统', icon: 'mdi:apple', value: '加载中...', sub: '' },
  { label: '处理器', icon: 'mdi:chip', value: '加载中...', sub: '' },
  { label: '内存', icon: 'mdi:memory', value: '加载中...', sub: '' },
  { label: '磁盘', icon: 'mdi:harddisk', value: '加载中...', sub: '' },
  { label: '电池', icon: 'mdi:battery-charging', value: '加载中...', sub: '' },
  { label: '网络', icon: 'mdi:wifi', value: '加载中...', sub: '' },
  { label: '屏幕', icon: 'mdi:monitor', value: '加载中...', sub: '' }
])

onMounted(async () => {
  try {
    const res = await fetch('https://wttr.in/?format=j1')
    const data = await res.json()
    const cur = data.current_condition[0]
    const code = parseInt(cur.weatherCode)
    let icon = 'mdi:weather-cloudy'
    if (code === 113) icon = 'mdi:weather-sunny'
    else if (code === 116) icon = 'mdi:weather-partly-cloudy'
    else if (code === 119 || code === 122) icon = 'mdi:weather-cloudy'
    else if (code >= 176 && code <= 356) icon = 'mdi:weather-rainy'
    else if (code >= 368 && code <= 395) icon = 'mdi:weather-snowy'
    weather.value = { temp: cur.temp_C, desc: cur.lang_zh?.[0]?.value || cur.weatherDesc[0].value, icon, humidity: cur.humidity, wind: cur.windspeedKmph + 'km/h', aqi: cur.uvIndex ? 'UV ' + cur.uvIndex : '良' }
  } catch {
    weather.value = { temp: '25', desc: '晴', icon: 'mdi:weather-sunny', humidity: '60', wind: '12km/h', aqi: '良' }
  }

  if ((window as any).electronAPI?.getMacInfo) {
    const info = await (window as any).electronAPI.getMacInfo()
    if (info) macInfo.value = info
  }
})
</script>
