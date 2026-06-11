<template>
  <div class="flex h-full gap-4 overflow-hidden">
    <aside class="w-64 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden">
      <div class="p-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon icon="mdi:speedometer" class="w-4 h-4 text-[hsl(var(--primary))]" />
          <span class="text-sm font-medium">速度评测</span>
        </div>
        <button class="p-1.5 rounded hover:bg-[hsl(var(--accent))]" @click="activeStage = 'config'">
          <Icon icon="mdi:plus" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-2">
        <div
          v-for="task in store.tasks"
          :key="task.id"
          :class="[
            'p-3 rounded-lg cursor-pointer border transition-colors',
            task.id === store.currentTaskId
              ? 'bg-[hsl(var(--primary)/0.12)] border-[hsl(var(--primary)/0.28)]'
              : 'border-transparent hover:bg-[hsl(var(--accent))]'
          ]"
          @click="store.selectTask(task.id)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm font-medium truncate">{{ task.name }}</div>
              <div class="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate">{{ scenarioLabel(task.scenario) }}</div>
            </div>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded border shrink-0', statusClass(task.status)]">
              {{ statusLabel(task.status) }}
            </span>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-3 text-center">
            <div class="rounded bg-[hsl(var(--secondary)/0.65)] py-1">
              <div class="text-xs font-semibold">{{ task.iterations }}</div>
              <div class="text-[10px] text-[hsl(var(--muted-foreground))]">轮次</div>
            </div>
            <div class="rounded bg-[hsl(var(--secondary)/0.65)] py-1">
              <div class="text-xs font-semibold">{{ task.recording.fps }}</div>
              <div class="text-[10px] text-[hsl(var(--muted-foreground))]">FPS</div>
            </div>
            <div class="rounded bg-[hsl(var(--secondary)/0.65)] py-1">
              <div class="text-xs font-semibold">{{ task.recording.resolution }}</div>
              <div class="text-[10px] text-[hsl(var(--muted-foreground))]">录屏</div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
      <section class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button
              v-for="stage in stages"
              :key="stage.key"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                activeStage === stage.key
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
              ]"
              @click="activeStage = stage.key"
            >
              <Icon :icon="stage.icon" class="w-4 h-4" />
              <span>{{ stage.label }}</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <el-button @click="activeStage = 'annotation'">
              <Icon icon="mdi:tag-outline" class="w-4 h-4 mr-1" />
              标注
            </el-button>
            <el-button type="primary" @click="startSpeedTest">
              <Icon icon="mdi:play" class="w-4 h-4 mr-1" />
              开始评测
            </el-button>
          </div>
        </div>
      </section>

      <section v-if="activeStage === 'config'" class="flex-1 min-h-0 grid grid-cols-[1.1fr_0.9fr] gap-4 overflow-hidden">
        <div class="flex flex-col gap-4 overflow-y-auto pr-1">
          <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4">
            <div class="flex items-center gap-2 mb-4">
              <Icon icon="mdi:tune-variant" class="w-4 h-4 text-[hsl(var(--primary))]" />
              <h2 class="text-sm font-semibold">任务配置</h2>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <label class="flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">任务名称</span>
                <el-input :model-value="currentTask?.name" @update:model-value="updateTaskName" />
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">场景类型</span>
                <el-select :model-value="currentTask?.scenario" @update:model-value="updateScenario">
                  <el-option v-for="item in scenarios" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">应用包名</span>
                <el-input :model-value="currentTask?.appPackage" @update:model-value="updateAppPackage" />
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">运行次数</span>
                <el-input-number :model-value="currentTask?.iterations || 1" :min="1" :max="50" class="w-full" @update:model-value="updateIterations" />
              </label>
            </div>
          </div>

          <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Icon icon="mdi:record-rec" class="w-4 h-4 text-[hsl(var(--destructive))]" />
                <h2 class="text-sm font-semibold">录屏采集</h2>
              </div>
              <span class="text-xs text-[hsl(var(--muted-foreground))]">{{ recordingSummary }}</span>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <label class="flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">分辨率</span>
                <el-select :model-value="currentTask?.recording.resolution" @update:model-value="updateResolution">
                  <el-option v-for="item in resolutions" :key="item" :label="item" :value="item" />
                </el-select>
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">帧率</span>
                <el-select :model-value="currentTask?.recording.fps" @update:model-value="updateFps">
                  <el-option v-for="item in frameRates" :key="item" :label="`${item} fps`" :value="item" />
                </el-select>
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">码率</span>
                <el-select :model-value="currentTask?.recording.bitrate" @update:model-value="updateBitrate">
                  <el-option v-for="item in bitrates" :key="item" :label="item" :value="item" />
                </el-select>
              </label>
            </div>
          </div>

        </div>

        <div class="flex flex-col gap-4 overflow-y-auto">
          <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Icon icon="mdi:file-code-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
                <h2 class="text-sm font-semibold">自动化脚本</h2>
              </div>
              <span :class="['text-[10px] px-1.5 py-0.5 rounded border', currentScript ? 'text-[hsl(var(--success))] border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.1)]' : 'text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.1)]']">
                {{ currentScript ? '已选择' : '待选择' }}
              </span>
            </div>

            <div class="space-y-3">
              <label class="flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">选择自动化 Tab 中的脚本</span>
                <el-select :model-value="currentTask?.scriptId" placeholder="请选择自动化脚本" filterable @update:model-value="updateScript">
                  <el-option v-for="script in automationStore.scripts" :key="script.id" :label="script.name" :value="script.id" />
                </el-select>
              </label>

              <div class="grid grid-cols-2 gap-2">
                <el-button @click="goAutomationScriptSelect">
                  <Icon icon="mdi:playlist-check" class="w-4 h-4 mr-1" />
                  选择脚本
                </el-button>
                <el-button type="primary" @click="goAutomationScriptCreate">
                  <Icon icon="mdi:plus" class="w-4 h-4 mr-1" />
                  新增脚本
                </el-button>
              </div>

              <div v-if="currentScript" class="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                <div class="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))]">
                  <div class="min-w-0">
                    <div class="text-sm font-medium truncate">{{ currentScript.name }}</div>
                    <div class="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{{ scriptSourceLabel(currentScript.source) }} · {{ currentScript.steps.length }} 步</div>
                  </div>
                  <Icon icon="mdi:robot-outline" class="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                </div>
                <pre class="h-52 overflow-auto bg-[hsl(222,47%,9%)] p-3 text-xs leading-5 text-[hsl(var(--foreground))]"><code>{{ currentScript.content }}</code></pre>
              </div>

              <div v-else class="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-center">
                <Icon icon="mdi:file-code-outline" class="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]" />
                <div class="mt-2 text-sm font-medium">未选择自动化脚本</div>
                <div class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">速度评测会在运行前引用自动化 Tab 中维护的脚本资产。</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="activeStage === 'annotation'" class="flex-1 min-h-0 grid grid-cols-[0.85fr_1.15fr] gap-4 overflow-hidden">
        <div class="flex flex-col gap-4 overflow-hidden">
          <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4">
            <div class="flex items-center gap-2 mb-4">
              <Icon icon="mdi:chart-box-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
              <h2 class="text-sm font-semibold">评测汇总</h2>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div v-for="item in summaryCards" :key="item.label" class="rounded-lg bg-[hsl(var(--secondary)/0.55)] p-3">
                <div class="text-xs text-[hsl(var(--muted-foreground))]">{{ item.label }}</div>
                <div class="text-xl font-semibold mt-1">{{ item.value }}</div>
              </div>
            </div>
          </div>

          <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4 flex-1 min-h-0 flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <Icon icon="mdi:playlist-check" class="w-4 h-4 text-[hsl(var(--primary))]" />
                <h2 class="text-sm font-semibold">运行轮次</h2>
              </div>
              <el-select :model-value="currentTask?.algorithmId" size="small" style="width: 150px" @update:model-value="updateAlgorithm">
                <el-option v-for="item in algorithms" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </div>
            <div class="overflow-y-auto space-y-2">
              <button
                v-for="run in currentTask?.runs"
                :key="run.id"
                :class="[
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  selectedRunId === run.id
                    ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.1)]'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                ]"
                @click="selectedRunId = run.id"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-sm font-medium">第 {{ run.index }} 轮</span>
                  <span :class="['text-[10px] px-1.5 py-0.5 rounded', runStatusClass(run.status)]">{{ runStatusLabel(run.status) }}</span>
                </div>
                <div class="mt-2 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                  <span>{{ run.durationMs ? `${run.durationMs} ms` : '待标注' }}</span>
                  <span>{{ run.confidence ? `置信度 ${Math.round(run.confidence * 100)}%` : annotationModeLabel(run.annotationMode) }}</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4 flex flex-col overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Icon icon="mdi:filmstrip-box-multiple" class="w-4 h-4 text-[hsl(var(--primary))]" />
              <h2 class="text-sm font-semibold">首尾帧标注</h2>
            </div>
            <div class="flex items-center gap-2">
              <el-button size="small" @click="applyAlgorithmSuggestion">
                <Icon icon="mdi:auto-fix" class="w-4 h-4 mr-1" />
                算法建议
              </el-button>
              <el-button size="small" type="primary" @click="saveManualAnnotation">
                <Icon icon="mdi:content-save" class="w-4 h-4 mr-1" />
                保存标注
              </el-button>
            </div>
          </div>

          <div class="grid grid-cols-[1fr_220px] gap-4 min-h-0 flex-1">
            <div class="flex flex-col min-w-0">
              <div class="rounded-lg bg-[hsl(222,47%,8%)] border border-[hsl(var(--border))] h-72 flex items-center justify-center relative overflow-hidden">
                <div class="w-48 h-64 rounded-2xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] overflow-hidden">
                  <div :class="['h-12 transition-colors', previewFrame < 18 ? 'bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--primary))]']"></div>
                  <div class="p-3 space-y-3">
                    <div :class="['h-16 rounded-lg transition-all', previewFrame < 35 ? 'bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--primary)/0.25)] border border-[hsl(var(--primary)/0.35)]']"></div>
                    <div class="h-8 rounded bg-[hsl(var(--secondary))]"></div>
                    <div :class="['h-8 rounded transition-all', previewFrame < 50 ? 'bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--success)/0.28)]']"></div>
                    <div class="h-10 rounded bg-[hsl(var(--primary))]"></div>
                  </div>
                </div>
                <div class="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 text-white text-xs">Frame {{ previewFrame }}</div>
              </div>

              <div class="mt-4">
                <div class="flex items-center justify-between mb-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <span>0 ms</span>
                  <span>{{ Math.round(frames.length * (1000 / (currentTask?.recording.fps || 30))) }} ms</span>
                </div>
                <div class="grid grid-cols-30 gap-1">
                  <button
                    v-for="frame in frames"
                    :key="frame"
                    :class="[
                      'h-12 rounded border transition-colors relative',
                      frame === startFrame ? 'border-[hsl(var(--success))] bg-[hsl(var(--success)/0.28)]' :
                      frame === endFrame ? 'border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.25)]' :
                      frame === previewFrame ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.18)]' :
                      'border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.55)] hover:bg-[hsl(var(--accent))]'
                    ]"
                    @click="previewFrame = frame"
                  >
                    <span v-if="frame === startFrame" class="absolute -top-2 -right-1 text-[9px] px-1 rounded bg-[hsl(var(--success))] text-white">S</span>
                    <span v-if="frame === endFrame" class="absolute -top-2 -right-1 text-[9px] px-1 rounded bg-[hsl(var(--destructive))] text-white">E</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div class="rounded-lg bg-[hsl(var(--secondary)/0.55)] p-3">
                <div class="text-xs text-[hsl(var(--muted-foreground))] mb-2">当前轮次</div>
                <div class="text-lg font-semibold">第 {{ selectedRun?.index || 1 }} 轮</div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button class="p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-left" @click="startFrame = previewFrame">
                  <div class="text-xs text-[hsl(var(--muted-foreground))]">首帧</div>
                  <div class="text-lg font-semibold text-[hsl(var(--success))]">{{ startFrame }}</div>
                </button>
                <button class="p-3 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] text-left" @click="endFrame = previewFrame">
                  <div class="text-xs text-[hsl(var(--muted-foreground))]">尾帧</div>
                  <div class="text-lg font-semibold text-[hsl(var(--destructive))]">{{ endFrame }}</div>
                </button>
              </div>
              <div class="rounded-lg bg-[hsl(var(--secondary)/0.55)] p-3">
                <div class="text-xs text-[hsl(var(--muted-foreground))]">首尾帧耗时</div>
                <div class="text-2xl font-semibold mt-1">{{ annotationDuration }} ms</div>
              </div>
              <div class="rounded-lg border border-[hsl(var(--border))] p-3">
                <div class="text-xs text-[hsl(var(--muted-foreground))] mb-2">标注方式</div>
                <el-segmented v-model="annotationMode" :options="annotationModeOptions" size="small" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="flex-1 min-h-0 grid grid-cols-[0.9fr_1.1fr] gap-4 overflow-hidden">
        <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4">
          <div class="flex items-center gap-2 mb-4">
            <Icon icon="mdi:file-chart-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
            <h2 class="text-sm font-semibold">报告模板</h2>
          </div>
          <div class="space-y-3">
            <button
              v-for="template in reportTemplates"
              :key="template.value"
              :class="[
                'w-full p-3 rounded-lg border text-left transition-colors',
                currentTask?.reportTemplateId === template.value
                  ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.1)]'
                  : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
              ]"
              @click="store.updateCurrentTask({ reportTemplateId: template.value })"
            >
              <div class="flex items-center gap-2 text-sm font-medium">
                <Icon :icon="template.icon" class="w-4 h-4 text-[hsl(var(--primary))]" />
                <span>{{ template.label }}</span>
              </div>
              <div class="text-xs text-[hsl(var(--muted-foreground))] mt-1">{{ template.meta }}</div>
            </button>
          </div>
        </div>

        <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4 flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Icon icon="mdi:file-eye-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
              <h2 class="text-sm font-semibold">报告预览</h2>
            </div>
            <div class="flex items-center gap-2">
              <el-button>
                <Icon icon="mdi:code-json" class="w-4 h-4 mr-1" />
                JSON
              </el-button>
              <el-button type="primary">
                <Icon icon="mdi:export" class="w-4 h-4 mr-1" />
                导出 HTML
              </el-button>
            </div>
          </div>

          <div class="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 overflow-auto">
            <div class="flex items-start justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
              <div>
                <div class="text-xs text-[hsl(var(--muted-foreground))]">MobTestLab Speed Report</div>
                <h3 class="text-xl font-semibold mt-1">{{ currentTask?.name }}</h3>
                <div class="text-sm text-[hsl(var(--muted-foreground))] mt-1">{{ scenarioLabel(currentTask?.scenario || '') }} · {{ currentTask?.recording.resolution }} · {{ currentTask?.recording.fps }} fps</div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-semibold text-[hsl(var(--primary))]">{{ store.summary.average }} ms</div>
                <div class="text-xs text-[hsl(var(--muted-foreground))]">平均耗时</div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-3 mt-4">
              <div v-for="item in summaryCards.slice(1)" :key="item.label" class="rounded-lg bg-[hsl(var(--secondary)/0.55)] p-3">
                <div class="text-xs text-[hsl(var(--muted-foreground))]">{{ item.label }}</div>
                <div class="text-lg font-semibold mt-1">{{ item.value }}</div>
              </div>
            </div>

            <div class="mt-5 space-y-2">
              <div v-for="run in currentTask?.runs" :key="run.id" class="grid grid-cols-[80px_1fr_90px] gap-3 items-center text-sm">
                <span class="text-[hsl(var(--muted-foreground))]">第 {{ run.index }} 轮</span>
                <div class="h-2 rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                  <div class="h-full bg-[hsl(var(--primary))]" :style="{ width: run.durationMs ? Math.min(100, run.durationMs / 25) + '%' : '8%' }"></div>
                </div>
                <span class="text-right">{{ run.durationMs ? `${run.durationMs} ms` : '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'
import { useSpeedTestStore, type AnnotationMode, type TaskStatus } from '@/stores/speedTest'
import { useAutomationStore, type ScriptSource } from '@/stores/automation'

const store = useSpeedTestStore()
const automationStore = useAutomationStore()
const router = useRouter()

const activeStage = ref<'config' | 'annotation' | 'report'>('config')
const selectedRunId = ref('run-3')
const previewFrame = ref(24)
const startFrame = ref(12)
const endFrame = ref(67)
const annotationMode = ref<AnnotationMode>('mixed')

const currentTask = computed(() => store.currentTask)
const currentScript = computed(() => automationStore.getScriptById(currentTask.value?.scriptId))
const selectedRun = computed(() => currentTask.value?.runs.find(run => run.id === selectedRunId.value) || currentTask.value?.runs[0])

const stages = [
  { key: 'config', label: '配置', icon: 'mdi:tune-variant' },
  { key: 'annotation', label: '标注', icon: 'mdi:filmstrip-box-multiple' },
  { key: 'report', label: '报告', icon: 'mdi:file-chart-outline' }
] as const

const scenarios = [
  { label: 'APP 冷启动', value: 'cold_start' },
  { label: 'APP 热启动', value: 'hot_start' },
  { label: '页面打开', value: 'page_open' },
  { label: '自定义链路', value: 'custom' }
]

const resolutions = ['original', '1080p', '720p', '480p']
const frameRates = [60, 30, 15]
const bitrates = ['4Mbps', '8Mbps', '12Mbps', '20Mbps']
const algorithms = [
  { label: '视觉差分', value: 'visual-diff' },
  { label: '稳定帧检测', value: 'stable-frame' },
  { label: '模板匹配', value: 'template-match' },
  { label: '人工标注', value: 'manual' }
]

const reportTemplates = [
  { label: '默认完整模板', value: 'default', icon: 'mdi:file-document-outline', meta: '汇总、趋势、明细、首尾帧证据' },
  { label: '紧凑管理模板', value: 'compact', icon: 'mdi:file-table-outline', meta: '核心指标和异常轮次' },
  { label: '证据归档模板', value: 'evidence', icon: 'mdi:image-multiple-outline', meta: '突出录屏和帧截图材料' }
]

const annotationModeOptions = [
  { label: '人工', value: 'manual' },
  { label: '算法', value: 'algorithm' },
  { label: '混合', value: 'mixed' }
]

const frames = Array.from({ length: 60 }, (_, index) => index + 1)

const recordingSummary = computed(() => {
  const recording = currentTask.value?.recording
  if (!recording) return ''
  return `${recording.resolution} / ${recording.fps}fps / ${recording.bitrate}`
})

const annotationDuration = computed(() => {
  const fps = currentTask.value?.recording.fps || 30
  return Math.max(0, Math.round((endFrame.value - startFrame.value) * (1000 / fps)))
})

const summaryCards = computed(() => [
  { label: '有效轮次', value: `${store.summary.annotated}/${store.summary.total}` },
  { label: '平均耗时', value: `${store.summary.average} ms` },
  { label: 'P50', value: `${store.summary.p50} ms` },
  { label: 'P90', value: `${store.summary.p90} ms` },
  { label: '成功率', value: `${store.summary.successRate}%` },
  { label: '标注算法', value: algorithmLabel(currentTask.value?.algorithmId || '') }
])

watch(selectedRun, run => {
  if (!run) return
  startFrame.value = run.startFrame || 12
  endFrame.value = run.endFrame || 67
  annotationMode.value = run.annotationMode || 'mixed'
}, { immediate: true })

const updateTaskName = (value: string | number) => {
  store.updateCurrentTask({ name: String(value) })
}

const updateScenario = (value: string | number) => {
  store.updateCurrentTask({ scenario: String(value) })
}

const updateAppPackage = (value: string | number) => {
  store.updateCurrentTask({ appPackage: String(value) })
}

const updateIterations = (value: number | undefined) => {
  store.updateCurrentTask({ iterations: Number(value || 1) })
}

const updateResolution = (value: string | number) => {
  store.updateRecording({ resolution: String(value) })
}

const updateFps = (value: string | number) => {
  store.updateRecording({ fps: Number(value) })
}

const updateBitrate = (value: string | number) => {
  store.updateRecording({ bitrate: String(value) })
}

const updateScript = (value: string | number) => {
  const scriptId = String(value)
  store.updateCurrentTask({ scriptId })
  automationStore.setCurrentScript(scriptId)
}

const updateAlgorithm = (value: string | number) => {
  store.updateCurrentTask({ algorithmId: String(value) })
}

const scenarioLabel = (value: string) => scenarios.find(item => item.value === value)?.label || '自定义链路'
const algorithmLabel = (value: string) => algorithms.find(item => item.value === value)?.label || '未选择'
const scriptSourceLabel = (value: ScriptSource) => {
  const labels: Record<ScriptSource, string> = {
    visual_model: '可视化点选',
    gui_agent: 'GUI Agent',
    mixed: '混合脚本'
  }
  return labels[value]
}

const statusLabel = (status: TaskStatus) => {
  const labels: Record<TaskStatus, string> = {
    draft: '草稿',
    running: '运行中',
    annotating: '标注中',
    completed: '完成',
    failed: '失败'
  }
  return labels[status]
}

const statusClass = (status: TaskStatus) => {
  if (status === 'running') return 'text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.1)]'
  if (status === 'completed') return 'text-[hsl(var(--success))] border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.1)]'
  if (status === 'failed') return 'text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.1)]'
  return 'text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.1)]'
}

const runStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: '待运行',
    running: '运行中',
    recorded: '待标注',
    annotated: '已标注',
    failed: '失败'
  }
  return labels[status] || status
}

const runStatusClass = (status: string) => {
  if (status === 'annotated') return 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
  if (status === 'running') return 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]'
  if (status === 'failed') return 'bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]'
  return 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
}

const annotationModeLabel = (mode?: AnnotationMode) => {
  if (mode === 'manual') return '人工'
  if (mode === 'algorithm') return '算法'
  if (mode === 'mixed') return '混合'
  return '未标注'
}

const applyAlgorithmSuggestion = () => {
  startFrame.value = 10
  endFrame.value = 64
  annotationMode.value = 'algorithm'
  previewFrame.value = 64
  ElMessage.success('已应用算法建议')
}

const saveManualAnnotation = () => {
  if (!selectedRun.value) return
  if (endFrame.value <= startFrame.value) {
    ElMessage.error('尾帧必须晚于首帧')
    return
  }
  store.applyRunAnnotation(selectedRun.value.id, startFrame.value, endFrame.value, annotationMode.value)
  ElMessage.success('标注已保存')
}

const goAutomationScriptSelect = () => {
  router.push({
    path: '/automation',
    query: {
      from: 'speed-test',
      taskId: currentTask.value?.id || '',
      scriptId: currentTask.value?.scriptId || ''
    }
  })
}

const goAutomationScriptCreate = async () => {
  const script = await automationStore.createScript()
  if (script) store.updateCurrentTask({ scriptId: script.id })
  router.push({
    path: '/automation',
    query: {
      from: 'speed-test',
      taskId: currentTask.value?.id || '',
      scriptId: script?.id || ''
    }
  })
}

const startSpeedTest = () => {
  if (!currentScript.value) {
    activeStage.value = 'config'
    ElMessage.warning('请先从自动化 Tab 新增或选择自动化脚本')
    return
  }
  store.simulateStart()
}

onMounted(async () => {
  await automationStore.loadScripts()
})
</script>
