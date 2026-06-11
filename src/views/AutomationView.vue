<template>
  <div class="flex h-full gap-4 overflow-hidden">
    <!-- 脚本列表 -->
    <div class="w-56 shrink-0 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
      <div class="flex items-center justify-between p-3 border-b border-[hsl(var(--border))]">
        <span class="text-sm font-medium">脚本列表</span>
        <button class="p-1 rounded hover:bg-[hsl(var(--accent))]" @click="createScript">
          <Icon icon="mdi:plus" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="s in scripts"
          :key="s.name"
          :class="['flex items-center gap-2 p-2 rounded cursor-pointer text-sm group', currentScript === s.id ? 'bg-[hsl(var(--primary)/0.15)]' : 'hover:bg-[hsl(var(--accent))]']"
          @click="selectScript(s)"
          @dblclick="startRename(s.id)"
        >
          <Icon icon="mdi:file-code" class="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
          <input
            v-if="renamingScript === s.id"
            v-model="renameValue"
            class="flex-1 min-w-0 bg-transparent border border-[hsl(var(--border))] rounded px-1 text-sm outline-none"
            @click.stop
            @keyup.enter="confirmRename(s.id)"
            @keyup.escape="renamingScript = ''"
            @blur="confirmRename(s.id)"
            ref="renameInput"
          />
          <span v-else class="flex-1 truncate">{{ s.name }}</span>
          <el-dropdown trigger="click" @command="(cmd: string) => handleScriptAction(cmd, s.id)" @click.stop>
            <button class="p-0.5 rounded hover:bg-[hsl(var(--accent))] opacity-0 group-hover:opacity-100" @click.stop>
              <Icon icon="mdi:dots-vertical" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename"><Icon icon="mdi:pencil" class="w-3.5 h-3.5 mr-2" />重命名</el-dropdown-item>
                <el-dropdown-item command="duplicate"><Icon icon="mdi:content-copy" class="w-3.5 h-3.5 mr-2" />复制</el-dropdown-item>
                <el-dropdown-item command="delete" divided><Icon icon="mdi:delete" class="w-3.5 h-3.5 mr-2 text-[hsl(var(--destructive))]" />删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div v-if="scripts.length === 0" class="text-xs text-center text-[hsl(var(--muted-foreground))] py-4">
          暂无脚本，点击 + 创建
        </div>
      </div>
    </div>

    <!-- 工作区 -->
    <div class="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">
      <!-- 工具栏 -->
      <div class="flex items-center justify-between gap-3 p-3 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
        <div class="flex items-center gap-3 min-w-0">
          <el-segmented v-model="authoringMode" :options="authoringModeOptions" />
          <div v-if="isSelectingForSpeedTest" class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <Icon icon="mdi:speedometer" class="w-4 h-4 text-[hsl(var(--primary))]" />
            <span>选择或新建脚本后，可用于当前速度评测任务</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <el-button :type="isRunning ? 'danger' : 'primary'" @click="toggleRun" :disabled="!currentScript || !selectedDeviceId">
            <Icon :icon="isRunning ? 'mdi:stop' : 'mdi:play'" class="w-4 h-4 mr-1" />
            {{ isRunning ? '停止' : '运行' }}
          </el-button>
          <el-button v-if="isSelectingForSpeedTest" type="success" @click="useForSpeedTest" :disabled="!currentScript">
            <Icon icon="mdi:check" class="w-4 h-4 mr-1" />
            用于速度评测
          </el-button>
          <el-button size="small" @click="saveCurrentScript" :disabled="!currentScript">
            <Icon icon="mdi:content-save" class="w-4 h-4 mr-1" />
            保存
          </el-button>
          <el-button size="small" @click="showAiConfig = true">
            <Icon icon="mdi:cog" class="w-4 h-4 mr-1" />
            AI 配置
          </el-button>
        </div>
      </div>

      <template v-if="authoringMode === 'gui_agent'">
        <!-- GUI Agent 编辑器 -->
        <div class="flex-1 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden min-h-0">
          <div class="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border))]">
            <Icon icon="mdi:robot-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
            <span class="text-sm">{{ selectedScript?.name || '未选择脚本' }}</span>
          </div>
          <textarea
            v-model="editorContent"
            class="flex-1 bg-[hsl(222,47%,9%)] p-4 font-mono text-sm text-[hsl(var(--foreground))] resize-none outline-none"
            placeholder="// GUI Agent 自然语言脚本&#10;// agent 对象由运行环境自动注入&#10;// API: agent.aiAct / agent.aiAssert / agent.aiQuery / agent.aiWaitFor&#10;&#10;await agent.aiAct('打开浏览器');"
            spellcheck="false"
          ></textarea>
        </div>
      </template>

      <template v-else>
        <!-- UI 模型建模 -->
        <div class="flex-1 min-h-0 grid grid-cols-[minmax(300px,360px)_minmax(280px,320px)_minmax(320px,1fr)] gap-4 overflow-hidden">
          <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] p-4 min-h-0 flex flex-col overflow-hidden">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Icon icon="mdi:cellphone-screenshot" class="w-4 h-4 text-[hsl(var(--primary))]" />
                <h2 class="text-sm font-semibold">设备画面</h2>
              </div>
              <div class="flex items-center gap-1">
                <button
                  v-for="tool in airtestTools"
                  :key="tool.key"
                  :class="[
                    'p-1.5 rounded border transition-colors',
                    selectedAction === tool.key
                      ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.12)]'
                      : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                  ]"
                  :title="tool.label"
                  @click="selectedAction = tool.key"
                >
                  <Icon :icon="tool.icon" class="w-4 h-4 text-[hsl(var(--primary))]" />
                </button>
                <button class="p-1.5 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))] disabled:opacity-50" title="抓取" :disabled="isCapturingUiModel" @click="captureUiModel">
                  <Icon :icon="isCapturingUiModel ? 'mdi:loading' : 'mdi:refresh'" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>
            </div>

            <div ref="deviceCanvasRef" class="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
              <div
                class="relative rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(222,47%,8%)] p-3 shrink-0"
                :style="phoneFrameStyle"
              >
                <div class="absolute inset-3 rounded-[1.25rem] overflow-hidden bg-[hsl(var(--background))]">
                  <img
                    v-if="uiScreenshotDataUrl"
                    :src="uiScreenshotDataUrl"
                    class="absolute inset-0 w-full h-full object-fill"
                    alt="device screenshot"
                    draggable="false"
                  />
                  <template v-else>
                    <div class="h-[11%] bg-[hsl(var(--secondary))] flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">Demo App</div>
                    <div class="p-3 space-y-3">
                      <div class="h-20 rounded-lg bg-[hsl(var(--primary)/0.16)] border border-[hsl(var(--primary)/0.25)]"></div>
                      <div class="space-y-2">
                        <div class="h-9 rounded bg-[hsl(var(--secondary))]"></div>
                        <div class="h-9 rounded bg-[hsl(var(--secondary))]"></div>
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        <div class="h-16 rounded bg-[hsl(var(--accent))]"></div>
                        <div class="h-16 rounded bg-[hsl(var(--accent))]"></div>
                      </div>
                      <div class="h-10 rounded bg-[hsl(var(--primary))]"></div>
                    </div>
                  </template>

                  <button
                    v-for="node in visualNodes"
                    :key="node.id"
                    :class="[
                      'absolute border rounded transition-all',
                      selectedNodeId === node.id
                        ? 'border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.18)] ring-1 ring-[hsl(var(--warning))]'
                        : 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)] hover:bg-[hsl(var(--primary)/0.22)]'
                    ]"
                    :style="nodeOverlayStyle(node)"
                    @click="selectedNodeId = node.id"
                  >
                    <span class="absolute -top-5 left-0 max-w-36 truncate text-[10px] px-1 rounded bg-black/70 text-white whitespace-nowrap">{{ node.label }}</span>
                  </button>

                  <div v-if="isCapturingUiModel" class="absolute inset-0 bg-black/45 flex items-center justify-center text-xs text-white">
                    正在抓取...
                  </div>
                  <div v-else-if="visualNodes.length === 0" class="absolute inset-0 bg-black/35 flex items-center justify-center text-xs text-white">
                    未采集到控件树
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div v-for="item in deviceStats" :key="item.label" class="rounded bg-[hsl(var(--secondary)/0.55)] py-2">
                <div class="text-xs font-semibold">{{ item.value }}</div>
                <div class="text-[10px] text-[hsl(var(--muted-foreground))]">{{ item.label }}</div>
              </div>
            </div>
          </div>

          <div class="bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] min-h-0 flex flex-col overflow-hidden">
            <div class="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))]">
              <Icon icon="mdi:cursor-default-click-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
              <h2 class="text-sm font-semibold">操作生成</h2>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto p-4">
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="action in airtestTools"
                  :key="action.key"
                  :class="[
                    'flex h-[54px] flex-col items-center justify-center gap-1 rounded-md border text-xs transition-colors',
                    selectedAction === action.key
                      ? 'border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.1)]'
                      : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                  ]"
                  @click="selectedAction = action.key"
                >
                  <Icon :icon="action.icon" class="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span>{{ action.label }}</span>
                </button>
              </div>

              <label class="mt-4 flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">定位方式</span>
                <el-segmented v-model="locatorMode" :options="locatorModeOptions" size="small" />
              </label>
              <label class="mt-4 flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">目标元素</span>
                <el-input :model-value="selectedNode.label" size="small" readonly />
              </label>
              <label v-if="locatorMode === 'poco'" class="mt-3 flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">Poco 选择器</span>
                <el-input :model-value="selectedNode.poco" size="small" readonly />
              </label>
              <div v-else-if="locatorMode === 'image'" class="mt-3 rounded-md border border-[hsl(var(--border))] p-3">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="shrink-0 text-xs text-[hsl(var(--muted-foreground))]">图像模板</span>
                  <span class="min-w-0 truncate text-[10px] text-[hsl(var(--muted-foreground))]" :title="selectedNode.template">{{ selectedNode.template || '-' }}</span>
                </div>
                <div class="h-16 rounded bg-[hsl(222,47%,9%)] border border-[hsl(var(--border))] flex items-center justify-center">
                  <img v-if="selectedNode.templateDataUrl" :src="selectedNode.templateDataUrl" class="max-w-full max-h-full object-contain" alt="template" />
                  <div
                    v-else
                    class="rounded border border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.16)]"
                    :style="{ width: Math.max(48, Math.min(160, selectedNode.width / 2)) + 'px', height: Math.max(24, Math.min(64, selectedNode.height / 2)) + 'px' }"
                  ></div>
                </div>
              </div>
              <div v-else class="mt-3 grid grid-cols-2 gap-2">
                <label class="flex flex-col gap-1.5">
                  <span class="text-xs text-[hsl(var(--muted-foreground))]">X</span>
                  <el-input-number :model-value="selectedNodeCenter.x" size="small" controls-position="right" disabled class="w-full" />
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-xs text-[hsl(var(--muted-foreground))]">Y</span>
                  <el-input-number :model-value="selectedNodeCenter.y" size="small" controls-position="right" disabled class="w-full" />
                </label>
              </div>
              <label v-if="selectedAction === 'input'" class="mt-3 flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">输入内容</span>
                <el-input v-model="visualInputText" size="small" />
              </label>
              <label v-if="selectedAction === 'wait' || selectedAction === 'assertExists'" class="mt-3 flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">超时时间</span>
                <el-input-number v-model="visualTimeout" size="small" :min="1" :max="60" controls-position="right" class="w-full" />
              </label>
              <label v-if="locatorMode === 'image'" class="mt-3 flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">识别阈值</span>
                <el-slider v-model="imageThreshold" :min="0.5" :max="0.99" :step="0.01" size="small" />
              </label>
              <label class="mt-3 flex flex-col gap-1.5">
                <span class="text-xs text-[hsl(var(--muted-foreground))]">脚本格式</span>
                <el-select v-model="visualScriptFormat" size="small">
                  <el-option v-for="format in scriptFormats" :key="format.value" :label="format.label" :value="format.value" />
                </el-select>
              </label>

              <div class="mt-4 rounded-md bg-[hsl(var(--secondary)/0.55)] p-3">
                <div class="text-xs text-[hsl(var(--muted-foreground))]">生成代码</div>
                <code class="block mt-1 text-[11px] leading-5 break-all">{{ visualStepCode }}</code>
              </div>
            </div>

            <el-button class="m-4 shrink-0" type="primary" @click="appendVisualStep" :disabled="!currentScript || !selectedNode.id">
              <Icon icon="mdi:plus" class="w-4 h-4 mr-1" />
              添加到脚本
            </el-button>
          </div>

          <div class="grid grid-rows-[1fr_220px] gap-4 min-h-0 overflow-hidden">
            <div class="flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden min-h-0">
              <div class="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))]">
                <div class="flex items-center gap-2">
                  <Icon icon="mdi:file-code-outline" class="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span class="text-sm">{{ selectedScript?.name || '未选择脚本' }}</span>
                </div>
                <span class="text-xs text-[hsl(var(--muted-foreground))]">{{ scriptFormatLabel }}</span>
              </div>
              <textarea
                v-model="editorContent"
                class="flex-1 bg-[hsl(222,47%,9%)] p-4 font-mono text-sm text-[hsl(var(--foreground))] resize-none outline-none"
                placeholder="// 通过 UI 模型点选生成结构化自动化脚本"
                spellcheck="false"
              ></textarea>
            </div>

            <div class="flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden min-h-0">
              <div class="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))]">
                <span class="text-sm font-medium">录制步骤</span>
                <span class="text-xs text-[hsl(var(--muted-foreground))]">{{ editorSteps.length }} steps</span>
              </div>
              <div class="flex-1 overflow-y-auto p-2 space-y-2">
                <div v-for="step in editorSteps" :key="step.id" class="p-2 rounded bg-[hsl(var(--secondary)/0.55)]">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-medium truncate">{{ step.description }}</span>
                    <div class="flex items-center gap-1">
                      <span class="text-[10px] text-[hsl(var(--muted-foreground))]">{{ actionLabel(step.action) }}</span>
                      <button
                        v-if="authoringMode === 'ui_model'"
                        class="p-0.5 rounded hover:bg-[hsl(var(--accent))]"
                        :aria-label="`删除步骤 ${step.description}`"
                        title="删除步骤"
                        @click="removeUiModelStep(step.id)"
                      >
                        <Icon icon="mdi:close" class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      </button>
                    </div>
                  </div>
                  <code class="block mt-1 text-[11px] text-[hsl(var(--muted-foreground))] truncate">{{ step.code }}</code>
                </div>
                <div v-if="editorSteps.length === 0" class="text-xs text-center text-[hsl(var(--muted-foreground))] py-4">
                  点选屏幕元素后添加步骤
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- 执行日志 -->
      <div class="h-52 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))]">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">执行日志</span>
            <template v-if="report">
              <span class="flex items-center gap-1 text-xs"><span class="w-2 h-2 rounded-full bg-[hsl(var(--success))]"></span>通过: {{ report.passed }}</span>
              <span class="flex items-center gap-1 text-xs"><span class="w-2 h-2 rounded-full bg-[hsl(var(--destructive))]"></span>失败: {{ report.failed }}</span>
              <span class="text-xs text-[hsl(var(--muted-foreground))]">耗时: {{ report.duration }}</span>
            </template>
          </div>
          <button class="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" @click="logs = []; report = null">清空</button>
        </div>
        <div ref="logContainer" class="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1">
          <div v-for="(log, i) in logs" :key="i" class="flex items-start gap-2">
            <Icon :icon="logIcon(log.status)" :class="['w-3.5 h-3.5 mt-0.5 flex-shrink-0', logColor(log.status)]" />
            <span class="text-[hsl(var(--muted-foreground))]">{{ log.step ? `[${log.step}]` : '' }}</span>
            <span :class="logColor(log.status)">{{ log.message }}</span>
            <span v-if="log.duration" class="text-[hsl(var(--muted-foreground))] ml-auto">{{ log.duration }}</span>
          </div>
          <div v-if="logs.length === 0" class="text-[hsl(var(--muted-foreground))] text-center py-4">等待执行...</div>
        </div>
      </div>
    </div>

    <!-- AI 配置对话框 -->
    <el-dialog v-model="showAiConfig" title="AI 模型配置" width="480px">
      <div class="space-y-4">
        <div>
          <label class="text-sm mb-1 block">Base URL</label>
          <el-input v-model="aiConfig.baseUrl" placeholder="https://api.openai.com/v1" />
        </div>
        <div>
          <label class="text-sm mb-1 block">API Key</label>
          <el-input v-model="aiConfig.apiKey" placeholder="sk-..." type="password" show-password />
        </div>
        <div>
          <label class="text-sm mb-1 block">Model Name</label>
          <el-input v-model="aiConfig.modelName" placeholder="gpt-4o" />
        </div>
        <div>
          <label class="text-sm mb-1 block">Model Family</label>
          <el-input v-model="aiConfig.modelFamily" placeholder="openai (必填，如 openai / qwen-vl / gemini)" />
          <p class="text-xs text-[hsl(var(--muted-foreground))] mt-1">需为支持视觉的模型系列，默认 openai</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="showAiConfig = false">取消</el-button>
        <el-button type="primary" @click="saveAiConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '../stores/device'
import { useReportsStore } from '../stores/reports'
import { useAutomationStore, type AutomationScriptAsset, type AutomationStep } from '../stores/automation'
import { useSpeedTestStore } from '../stores/speedTest'
import {
  actionLabel,
  buildUiModelScript,
  createUiModelStep,
  demoUiModelNodes,
  generateUiModelStepCode,
  getNodeCenter,
  inferUiModelAction,
  inferUiModelScriptFormat,
  parseUiModelSteps,
  uiModelLocatorModes,
  uiModelScriptFormats,
  uiModelTools,
  validateUiModelStepParams,
  type UiModelAction,
  type UiModelLocatorMode,
  type UiModelNode,
  type UiModelScriptFormat,
  type UiModelStep
} from '../utils/uiModel'

const deviceStore = useDeviceStore()
const reportsStore = useReportsStore()
const automationStore = useAutomationStore()
const speedTestStore = useSpeedTestStore()
const route = useRoute()
const router = useRouter()
const selectedDeviceId = computed(() => deviceStore.selectedDeviceId)

type AuthoringMode = 'gui_agent' | 'ui_model'

const scripts = computed(() => automationStore.scripts)
const currentScript = computed(() => automationStore.currentScriptId)
const selectedScript = computed(() => automationStore.currentScript)
const editorContent = ref('')
const authoringMode = ref<AuthoringMode>('gui_agent')
const isRunning = ref(false)
const logs = ref<{ message: string; status: string; step?: number; duration?: string }[]>([])
const report = ref<{ passed: number; failed: number; total: number; duration: string } | null>(null)
const logContainer = ref<HTMLElement>()
const deviceCanvasRef = ref<HTMLElement>()
const selectedNodeId = ref('node-login')
const selectedAction = ref<UiModelAction>('tap')
const visualInputText = ref('13800138000')
const visualTimeout = ref(10)
const imageThreshold = ref(0.85)
const uiModelSteps = ref<UiModelStep[]>([])
const isCapturingUiModel = ref(false)
const uiScreenshotDataUrl = ref('')
const uiScreenshotPath = ref('')
const uiScreen = ref({ width: 180, height: 396 })
const deviceCanvasSize = ref({ width: 260, height: 420 })

const showAiConfig = ref(false)
const aiConfig = reactive({ baseUrl: '', apiKey: '', modelName: '', modelFamily: '' })
const isSelectingForSpeedTest = computed(() => route.query.from === 'speed-test')
const locatorMode = ref<UiModelLocatorMode>('image')
const visualScriptFormat = ref<UiModelScriptFormat>('airtest')

const api = () => (window as any).electronAPI

const authoringModeOptions = [
  { label: 'GUI Agent', value: 'gui_agent' },
  { label: 'UI 模型', value: 'ui_model' }
]

const scriptFormats = uiModelScriptFormats
const locatorModeOptions = uiModelLocatorModes
const airtestTools = uiModelTools
const visualNodes = ref<UiModelNode[]>(demoUiModelNodes.map(node => ({ ...node })))
const emptyUiModelNode: UiModelNode = {
  id: '',
  label: '未选择元素',
  poco: '',
  template: '',
  x: 0,
  y: 0,
  width: 0,
  height: 0
}

const isUiModelScriptContent = (content = '') =>
  /from airtest\.core\.api|AndroidUiautomationPoco|# MTL_STEP|poco\("/.test(content)

const isGuiAgentScriptContent = (content = '') =>
  /agent\.ai(Act|Assert|Query|WaitFor)/.test(content)

const isScriptForMode = (script: AutomationScriptAsset | null | undefined, mode: AuthoringMode) => {
  if (!script) return false
  if (mode === 'ui_model') {
    return (script.extension === 'py' || script.source === 'visual_model' || isUiModelScriptContent(script.content)) && !isGuiAgentScriptContent(script.content)
  }
  return script.extension === 'js' && script.source !== 'visual_model' && !isUiModelScriptContent(script.content)
}

const deviceStats = computed(() => [
  { label: '分辨率', value: `${uiScreen.value.width}x${uiScreen.value.height}` },
  { label: '方向', value: uiScreen.value.width > uiScreen.value.height ? '横屏' : '竖屏' },
  { label: '控件', value: `${visualNodes.value.length}` }
])

const selectedNode = computed(() =>
  visualNodes.value.find(node => node.id === selectedNodeId.value) || visualNodes.value[0] || emptyUiModelNode
)

const selectedNodeCenter = computed(() => getNodeCenter(selectedNode.value))

const phoneFrameStyle = computed(() => {
  const aspect = Math.max(0.25, Math.min(2.5, uiScreen.value.width / Math.max(1, uiScreen.value.height)))
  const maxWidth = Math.max(80, Math.min(280, deviceCanvasSize.value.width - 8))
  const maxHeight = Math.max(80, deviceCanvasSize.value.height - 8)
  const width = Math.min(maxWidth, maxHeight * aspect)
  const height = width / aspect
  return {
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`,
    aspectRatio: `${uiScreen.value.width} / ${uiScreen.value.height}`
  }
})

const visualStepParams = computed(() => ({
  action: selectedAction.value,
  node: selectedNode.value,
  locatorMode: locatorMode.value,
  scriptFormat: visualScriptFormat.value,
  inputText: visualInputText.value,
  timeout: visualTimeout.value,
  threshold: imageThreshold.value
}))

const visualStepCode = computed(() => selectedNode.value.id ? generateUiModelStepCode(visualStepParams.value) : '')

const scriptFormatLabel = computed(() =>
  scriptFormats.find(format => format.value === visualScriptFormat.value)?.label || 'Airtest'
)

const editorSteps = computed<AutomationStep[]>(() =>
  authoringMode.value === 'ui_model'
    ? uiModelSteps.value.map(step => ({
      id: step.id,
      action: step.action,
      target: step.nodeLabel,
      description: `${actionLabel(step.action)} ${step.nodeLabel}`,
      code: step.code
    }))
    : editorContent.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'))
      .map((line, index) => ({
        id: `editor-step-${index + 1}`,
        action: inferUiModelAction(line),
        target: '',
        description: line.replace(/^await\s+/, '').replace(/;$/, ''),
        code: line
      }))
)

const nodeOverlayStyle = (node: UiModelNode) => {
  const screenWidth = Math.max(1, uiScreen.value.width)
  const screenHeight = Math.max(1, uiScreen.value.height)
  const left = Math.max(0, Math.min(100, (node.x / screenWidth) * 100))
  const top = Math.max(0, Math.min(100, (node.y / screenHeight) * 100))
  const width = Math.max(0.8, Math.min(100 - left, (node.width / screenWidth) * 100))
  const height = Math.max(0.8, Math.min(100 - top, (node.height / screenHeight) * 100))
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`
  }
}

const captureUiModel = async () => {
  if (!selectedDeviceId.value) {
    ElMessage.warning('请先选择设备')
    return
  }
  const a = api()
  if (!a?.captureUiModel) {
    ElMessage.error('当前运行环境不支持设备 UI 采集')
    return
  }
  isCapturingUiModel.value = true
  try {
    const result = await a.captureUiModel(selectedDeviceId.value)
    if (!result?.success) {
      ElMessage.error(result?.error || 'UI 模型抓取失败')
      return
    }
    uiScreenshotDataUrl.value = result.screenshotDataUrl || ''
    uiScreenshotPath.value = result.screenshotPath || ''
    uiScreen.value = result.screen || uiScreen.value
    visualNodes.value = Array.isArray(result.nodes) ? result.nodes : []
    selectedNodeId.value = visualNodes.value[0]?.id || ''
    ElMessage.success(visualNodes.value.length ? `已抓取 ${visualNodes.value.length} 个控件` : '已抓取截图，未发现控件树')
  } finally {
    isCapturingUiModel.value = false
  }
}

const syncUiModelStepsFromContent = () => {
  uiModelSteps.value = parseUiModelSteps(editorContent.value)
  visualScriptFormat.value = inferUiModelScriptFormat(editorContent.value)
}

const rebuildUiModelScriptFromSteps = () => {
  editorContent.value = buildUiModelScript(uiModelSteps.value)
}

const appendVisualStep = () => {
  if (!currentScript.value) return
  const errors = validateUiModelStepParams(visualStepParams.value)
  if (errors.length) {
    ElMessage.warning(errors[0])
    return
  }
  const step = createUiModelStep(visualStepParams.value)
  uiModelSteps.value.push(step)
  rebuildUiModelScriptFromSteps()
}

const removeUiModelStep = (stepId: string) => {
  uiModelSteps.value = uiModelSteps.value.filter(step => step.id !== stepId)
  rebuildUiModelScriptFromSteps()
}

const logIcon = (status: string) => {
  if (status === 'passed' || status === 'done') return 'mdi:check-circle'
  if (status === 'failed' || status === 'error') return 'mdi:close-circle'
  return 'mdi:loading'
}
const logColor = (status: string) => {
  if (status === 'passed' || status === 'done') return 'text-[hsl(var(--success))]'
  if (status === 'failed' || status === 'error') return 'text-[hsl(var(--destructive))]'
  return 'text-[hsl(var(--primary))]'
}

const loadScripts = async () => {
  await automationStore.loadScripts()
  const routeScriptId = typeof route.query.scriptId === 'string' ? route.query.scriptId : ''
  if (routeScriptId && automationStore.getScriptById(routeScriptId)) {
    automationStore.setCurrentScript(routeScriptId)
  }
  editorContent.value = automationStore.currentScript?.content || ''
  authoringMode.value = automationStore.currentScript?.source === 'visual_model' ? 'ui_model' : 'gui_agent'
  if (authoringMode.value === 'ui_model') syncUiModelStepsFromContent()
}

const selectScript = (s: AutomationScriptAsset) => {
  automationStore.setCurrentScript(s.id)
  editorContent.value = s.content
  authoringMode.value = s.source === 'visual_model' ? 'ui_model' : 'gui_agent'
  if (authoringMode.value === 'ui_model') syncUiModelStepsFromContent()
}

const selectScriptForEditing = (script: AutomationScriptAsset) => {
  automationStore.setCurrentScript(script.id)
  editorContent.value = script.content
  if (authoringMode.value === 'ui_model') syncUiModelStepsFromContent()
}

const createUiModelScript = async () => {
  const name = `UI模型_${Date.now().toString(36)}`
  uiModelSteps.value = []
  await automationStore.saveScript(name, buildUiModelScript(uiModelSteps.value), { source: 'visual_model', extension: 'py' })
  editorContent.value = automationStore.currentScript?.content || ''
  syncUiModelStepsFromContent()
}

const ensureScriptForMode = async (mode: AuthoringMode) => {
  const current = automationStore.currentScript
  if (isScriptForMode(current, mode)) {
    editorContent.value = current?.content || ''
    if (mode === 'ui_model') syncUiModelStepsFromContent()
    return
  }

  const matchedScript = scripts.value.find(script => isScriptForMode(script, mode))
  if (matchedScript) {
    selectScriptForEditing(matchedScript)
    return
  }

  if (mode === 'ui_model') {
    await createUiModelScript()
    return
  }

  const script = await automationStore.createScript()
  editorContent.value = script?.content || automationStore.currentScript?.content || ''
}

let isSwitchingAuthoringMode = false
watch(authoringMode, async (mode) => {
  if (isSwitchingAuthoringMode) return
  isSwitchingAuthoringMode = true
  try {
    await ensureScriptForMode(mode)
    if (mode === 'ui_model') setupDeviceCanvasObserver()
    else {
      deviceCanvasObserver?.disconnect()
      deviceCanvasObserver = null
    }
  } finally {
    isSwitchingAuthoringMode = false
  }
})

const createScript = async () => {
  if (authoringMode.value === 'ui_model') {
    await createUiModelScript()
    return
  }
  const script = await automationStore.createScript()
  editorContent.value = script?.content || ''
}

const saveCurrentScript = async () => {
  if (!currentScript.value) return
  if (authoringMode.value === 'ui_model') syncUiModelStepsFromContent()
  await automationStore.saveScript(
    currentScript.value,
    editorContent.value,
    authoringMode.value === 'ui_model' ? { source: 'visual_model', extension: 'py' } : { source: 'gui_agent', extension: 'js' }
  )
  ElMessage.success('已保存')
}

const deleteScript = async (name: string) => {
  await automationStore.deleteScript(name)
  editorContent.value = automationStore.currentScript?.content || ''
}

const renamingScript = ref('')
const renameValue = ref('')

const startRename = (name: string) => {
  renamingScript.value = name
  renameValue.value = name
  nextTick(() => {
    const input = document.querySelector('input[class*="bg-transparent"]') as HTMLInputElement
    input?.focus()
    input?.select()
  })
}

const confirmRename = async (oldName: string) => {
  const newName = renameValue.value.trim()
  if (!newName || newName === oldName) { renamingScript.value = ''; return }
  await automationStore.renameScript(oldName, newName)
  renamingScript.value = ''
}

const duplicateScript = async (name: string) => {
  await automationStore.duplicateScript(name)
  editorContent.value = automationStore.currentScript?.content || ''
}

const handleScriptAction = (cmd: string, name: string) => {
  if (cmd === 'rename') startRename(name)
  else if (cmd === 'duplicate') duplicateScript(name)
  else if (cmd === 'delete') deleteScript(name)
}

const toggleRun = () => {
  if (isRunning.value) stopRun()
  else startRun()
}

const startRun = async () => {
  if (authoringMode.value === 'ui_model') {
    if (!selectedDeviceId.value) {
      ElMessage.warning('请先选择设备')
      return
    }
    await saveCurrentScript()
    logs.value = []
    report.value = null
    isRunning.value = true
    runStartTime = Date.now()
    const a = api()
    if (a?.runAirtestAutomation) {
      const result = await a.runAirtestAutomation({
        deviceId: selectedDeviceId.value,
        script: editorContent.value,
        screenshotPath: uiScreenshotPath.value
      })
      if (!result?.success) {
        isRunning.value = false
        if (result?.error) ElMessage.error(result.error)
      }
    } else {
      isRunning.value = false
      ElMessage.error('当前运行环境不支持 Airtest 执行')
    }
    return
  }
  if (!aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.modelName) {
    ElMessage.warning('请先配置 AI 模型')
    showAiConfig.value = true
    return
  }
  logs.value = []
  report.value = null
  isRunning.value = true
  runStartTime = Date.now()
  const a = api()
  if (a?.runAutomation) {
    await a.runAutomation({
      deviceId: selectedDeviceId.value,
      script: editorContent.value,
      aiConfig: { baseUrl: aiConfig.baseUrl, apiKey: aiConfig.apiKey, modelName: aiConfig.modelName, modelFamily: aiConfig.modelFamily }
    })
  }
}

const stopRun = async () => {
  const a = api()
  if (authoringMode.value === 'ui_model' && a?.stopAirtestAutomation) await a.stopAirtestAutomation()
  else if (a?.stopAutomation) await a.stopAutomation()
  isRunning.value = false
}

let runStartTime = 0
let deviceCanvasObserver: ResizeObserver | null = null

const updateDeviceCanvasSize = () => {
  if (!deviceCanvasRef.value) return
  const rect = deviceCanvasRef.value.getBoundingClientRect()
  deviceCanvasSize.value = {
    width: Math.max(80, rect.width),
    height: Math.max(80, rect.height)
  }
}

const setupDeviceCanvasObserver = () => {
  deviceCanvasObserver?.disconnect()
  deviceCanvasObserver = null
  nextTick(() => {
    updateDeviceCanvasSize()
    if (typeof ResizeObserver !== 'undefined' && deviceCanvasRef.value) {
      deviceCanvasObserver = new ResizeObserver(updateDeviceCanvasSize)
      deviceCanvasObserver.observe(deviceCanvasRef.value)
    }
  })
}

const handleLog = (_event: any, msg: any) => {
  logs.value.push(msg)
  if (msg.type === 'done' || msg.type === 'error') {
    isRunning.value = false
    const passed = logs.value.filter(l => l.status === 'passed').length
    const failed = logs.value.filter(l => l.status === 'failed').length
    const elapsed = ((Date.now() - runStartTime) / 1000).toFixed(1)
    report.value = { passed, failed, total: passed + failed, duration: `${elapsed}s` }
    reportsStore.addReport({
      id: Date.now().toString(36),
      name: currentScript.value || '未命名脚本',
      type: 'automation',
      device: selectedDeviceId.value || '',
      app: '',
      status: msg.type === 'error' ? 'failed' : (failed > 0 ? 'failed' : 'passed'),
      duration: `${elapsed}s`,
      createdAt: new Date().toLocaleString(),
      htmlContent: msg.reportHtml || ''
    })
  }
  nextTick(() => { if (logContainer.value) logContainer.value.scrollTop = logContainer.value.scrollHeight })
}

const saveAiConfig = async () => {
  const a = api()
  if (a?.saveAiConfig) await a.saveAiConfig({ ...aiConfig })
  showAiConfig.value = false
  ElMessage.success('AI 配置已保存')
}

const useForSpeedTest = async () => {
  if (!currentScript.value) return
  await saveCurrentScript()
  const taskId = typeof route.query.taskId === 'string' ? route.query.taskId : ''
  if (taskId) speedTestStore.selectTask(taskId)
  speedTestStore.updateCurrentTask({ scriptId: currentScript.value })
  ElMessage.success('已选择速度评测脚本')
  router.push('/speed-test')
}

const loadAiConfig = async () => {
  const a = api()
  if (a?.getAiConfig) {
    const cfg = await a.getAiConfig()
    if (cfg) Object.assign(aiConfig, cfg)
  }
}

onMounted(() => {
  loadScripts().then(() => {
    if (authoringMode.value === 'ui_model') setupDeviceCanvasObserver()
  })
  loadAiConfig()
  const a = api()
  if (a?.onAutomationLog) a.onAutomationLog(handleLog)
})

onUnmounted(() => {
  deviceCanvasObserver?.disconnect()
  deviceCanvasObserver = null
  const a = api()
  if (a?.offAutomationLog) a.offAutomationLog()
  if (isRunning.value) stopRun()
})
</script>
