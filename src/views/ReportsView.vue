<template>
  <div class="flex flex-col h-full gap-4">
    <!-- 筛选栏 -->
    <div class="flex items-center justify-between p-3 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
      <div class="flex items-center gap-3">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="default"
        />
        <el-select v-model="filterDevice" placeholder="筛选设备" style="width: 150px" clearable>
          <el-option label="全部设备" value="" />
          <el-option v-for="d in deviceOptions" :key="d" :label="d" :value="d" />
        </el-select>
        <el-select v-model="filterType" placeholder="报告类型" style="width: 120px" clearable>
          <el-option label="全部类型" value="" />
          <el-option label="性能测试" value="performance" />
          <el-option label="自动化测试" value="automation" />
        </el-select>
      </div>
      <div class="flex items-center gap-2">
        <el-input 
          v-model="searchQuery" 
          placeholder="搜索报告..." 
          style="width: 200px"
          clearable
        >
          <template #prefix>
            <Icon icon="mdi:magnify" class="w-4 h-4" />
          </template>
        </el-input>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-4 gap-4">
      <div class="p-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.15)] flex items-center justify-center">
            <Icon icon="mdi:file-document-multiple" class="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <div class="text-2xl font-semibold">{{ stats.total }}</div>
            <div class="text-xs text-[hsl(var(--muted-foreground))]">总报告数</div>
          </div>
        </div>
      </div>
      <div class="p-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-[hsl(var(--success)/0.15)] flex items-center justify-center">
            <Icon icon="mdi:check-circle" class="w-5 h-5 text-[hsl(var(--success))]" />
          </div>
          <div>
            <div class="text-2xl font-semibold text-[hsl(var(--success))]">{{ stats.passed }}</div>
            <div class="text-xs text-[hsl(var(--muted-foreground))]">测试通过</div>
          </div>
        </div>
      </div>
      <div class="p-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-[hsl(var(--destructive)/0.15)] flex items-center justify-center">
            <Icon icon="mdi:close-circle" class="w-5 h-5 text-[hsl(var(--destructive))]" />
          </div>
          <div>
            <div class="text-2xl font-semibold text-[hsl(var(--destructive))]">{{ stats.failed }}</div>
            <div class="text-xs text-[hsl(var(--muted-foreground))]">测试失败</div>
          </div>
        </div>
      </div>
      <div class="p-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-[hsl(var(--warning)/0.15)] flex items-center justify-center">
            <Icon icon="mdi:alert" class="w-5 h-5 text-[hsl(var(--warning))]" />
          </div>
          <div>
            <div class="text-2xl font-semibold text-[hsl(var(--warning))]">{{ stats.warnings }}</div>
            <div class="text-xs text-[hsl(var(--muted-foreground))]">性能告警</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 报告列表 -->
    <div class="flex-1 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden">
      <el-table :data="reports" style="width: 100%" height="100%">
        <el-table-column prop="name" label="报告名称" min-width="250">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <Icon 
                :icon="row.type === 'performance' ? 'mdi:chart-line' : 'mdi:robot'" 
                :class="['w-4 h-4', row.type === 'performance' ? 'text-[hsl(var(--primary))]' : 'text-purple-400']" 
              />
              <span class="font-medium">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="device" label="设备" width="150" />
        <el-table-column prop="app" label="应用" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <span 
              :class="[
                'px-2 py-1 rounded text-xs',
                getStatusClass(row.status)
              ]"
            >
              {{ getStatusText(row.status) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="时长" width="100" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center gap-1">
              <el-tooltip content="查看详情" placement="top">
                <button class="p-1.5 rounded hover:bg-[hsl(var(--accent))]" @click="viewReport(row)">
                  <Icon icon="mdi:eye" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                </button>
              </el-tooltip>
              <el-tooltip content="导出 HTML" placement="top">
                <button class="p-1.5 rounded hover:bg-[hsl(var(--accent))]" @click="exportHtml(row)">
                  <Icon icon="mdi:file-code" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                </button>
              </el-tooltip>
              <el-tooltip content="导出 PDF" placement="top">
                <button class="p-1.5 rounded hover:bg-[hsl(var(--accent))]" @click="exportPdf(row)">
                  <Icon icon="mdi:file-pdf-box" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                </button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <button class="p-1.5 rounded hover:bg-[hsl(var(--accent))]" @click="deleteReport(row)">
                  <Icon icon="mdi:delete" class="w-4 h-4 text-[hsl(var(--destructive))]" />
                </button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 报告详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="报告详情" width="800px">
      <div v-if="selectedReport" class="space-y-4">
        <!-- 概览 -->
        <div class="grid grid-cols-3 gap-4">
          <div class="p-3 bg-[hsl(var(--secondary))] rounded-lg">
            <div class="text-xs text-[hsl(var(--muted-foreground))]">设备</div>
            <div class="text-sm font-medium mt-1">{{ selectedReport.device }}</div>
          </div>
          <div class="p-3 bg-[hsl(var(--secondary))] rounded-lg">
            <div class="text-xs text-[hsl(var(--muted-foreground))]">应用</div>
            <div class="text-sm font-medium mt-1">{{ selectedReport.app }}</div>
          </div>
          <div class="p-3 bg-[hsl(var(--secondary))] rounded-lg">
            <div class="text-xs text-[hsl(var(--muted-foreground))]">测试时长</div>
            <div class="text-sm font-medium mt-1">{{ selectedReport.duration }}</div>
          </div>
        </div>

        <!-- 性能摘要 -->
        <div v-if="reportSummary" class="p-4 border border-[hsl(var(--border))] rounded-lg">
          <h4 class="text-sm font-medium mb-3">性能摘要</h4>
          <div class="grid grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-2xl font-semibold text-[hsl(var(--primary))]">{{ reportSummary.cpu }}%</div>
              <div class="text-xs text-[hsl(var(--muted-foreground))]">平均 CPU</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-semibold text-[hsl(var(--success))]">{{ reportSummary.memory }} MB</div>
              <div class="text-xs text-[hsl(var(--muted-foreground))]">平均内存</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-semibold text-[hsl(var(--warning))]">{{ reportSummary.fps }}</div>
              <div class="text-xs text-[hsl(var(--muted-foreground))]">平均 FPS</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-semibold">{{ reportSummary.count }}</div>
              <div class="text-xs text-[hsl(var(--muted-foreground))]">采样点数</div>
            </div>
          </div>
        </div>
        <div v-else-if="!selectedReport.htmlContent" class="p-4 border border-[hsl(var(--border))] rounded-lg text-center text-[hsl(var(--muted-foreground))] text-sm">
          暂无性能数据
        </div>

        <!-- 告警列表 -->
        <div v-if="selectedReport?.markers?.length" class="p-4 border border-[hsl(var(--border))] rounded-lg">
          <h4 class="text-sm font-medium mb-3">告警事件</h4>
          <div class="space-y-2">
            <div v-for="marker in selectedReport.markers" :key="marker.time" class="flex items-center gap-3 p-2 bg-[hsl(var(--warning)/0.1)] rounded">
              <Icon icon="mdi:alert" class="w-4 h-4 text-[hsl(var(--warning))]" />
              <span class="text-sm">{{ marker.label }}</span>
              <span class="text-xs text-[hsl(var(--muted-foreground))] ml-auto">{{ marker.time }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
        <el-button v-if="selectedReport?.htmlContent" type="primary" @click="showHtmlReport = true">查看 HTML 报告</el-button>
        <el-button v-else type="primary" @click="exportHtml(selectedReport!)">导出报告</el-button>
      </template>
    </el-dialog>

    <!-- HTML 测试报告对话框 -->
    <el-dialog v-model="showHtmlReport" title="Midscene 测试报告" width="90%" top="5vh" destroy-on-close>
      <iframe :srcdoc="selectedReport?.htmlContent" class="w-full border-0" style="height: 75vh"></iframe>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useReportsStore, type PerfReport } from '@/stores/reports'
import { ElMessageBox } from 'element-plus'

const reportsStore = useReportsStore()

const dateRange = ref<[Date, Date] | null>(null)
const filterDevice = ref('')
const filterType = ref('')
const searchQuery = ref('')
const showDetailDialog = ref(false)
const showHtmlReport = ref(false)
const selectedReport = ref<PerfReport | null>(null)

const stats = computed(() => reportsStore.stats)
const deviceOptions = computed(() => [...new Set(reportsStore.reports.map(r => r.device))])
const reports = computed(() => {
  let list = reportsStore.reports
  if (filterType.value) list = list.filter(r => r.type === filterType.value)
  if (filterDevice.value) list = list.filter(r => r.device === filterDevice.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(q) || r.app.toLowerCase().includes(q))
  }
  return list
})

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    passed: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
    failed: 'bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]'
  }
  return classes[status] || ''
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    passed: '通过',
    failed: '失败',
    warning: '警告'
  }
  return texts[status] || status
}

const viewReport = (report: PerfReport) => {
  selectedReport.value = report
  showDetailDialog.value = true
}

const exportHtml = (report: PerfReport) => {
  console.log('Exporting HTML:', report.name)
}

const exportPdf = (report: PerfReport) => {
  console.log('Exporting PDF:', report.name)
}

const deleteReport = async (report: PerfReport) => {
  await ElMessageBox.confirm('确定删除该报告？', '提示', { type: 'warning' })
  reportsStore.deleteReport(report.id)
}

const reportSummary = computed(() => {
  if (!selectedReport.value?.metrics?.length) return null
  const m = selectedReport.value.metrics
  const avg = (fn: (x: typeof m[0]) => number) => (m.reduce((s, x) => s + fn(x), 0) / m.length).toFixed(1)
  return { cpu: avg(x => x.cpu), memory: avg(x => x.memory), fps: avg(x => x.fps), count: m.length }
})
</script>
