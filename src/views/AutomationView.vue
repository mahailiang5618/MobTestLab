<template>
  <div class="flex h-full gap-4">
    <!-- 脚本列表 -->
    <div class="w-56 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
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
          :class="['flex items-center gap-2 p-2 rounded cursor-pointer text-sm group', currentScript === s.name ? 'bg-[hsl(var(--primary)/0.15)]' : 'hover:bg-[hsl(var(--accent))]']"
          @click="selectScript(s)"
          @dblclick="startRename(s.name)"
        >
          <Icon icon="mdi:file-code" class="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
          <input
            v-if="renamingScript === s.name"
            v-model="renameValue"
            class="flex-1 min-w-0 bg-transparent border border-[hsl(var(--border))] rounded px-1 text-sm outline-none"
            @click.stop
            @keyup.enter="confirmRename(s.name)"
            @keyup.escape="renamingScript = ''"
            @blur="confirmRename(s.name)"
            ref="renameInput"
          />
          <span v-else class="flex-1 truncate">{{ s.name }}</span>
          <el-dropdown trigger="click" @command="(cmd: string) => handleScriptAction(cmd, s.name)" @click.stop>
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

    <!-- 编辑器 + 日志 -->
    <div class="flex-1 flex flex-col gap-4">
      <!-- 工具栏 -->
      <div class="flex items-center gap-3 p-3 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
          <el-button :type="isRunning ? 'danger' : 'primary'" @click="toggleRun" :disabled="!currentScript || !selectedDeviceId">
            <Icon :icon="isRunning ? 'mdi:stop' : 'mdi:play'" class="w-4 h-4 mr-1" />
            {{ isRunning ? '停止' : '运行' }}
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

      <!-- 编辑器 -->
      <div class="flex-1 flex flex-col bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] overflow-hidden min-h-0">
        <div class="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border))]">
          <Icon icon="mdi:file-code" class="w-4 h-4 text-[hsl(var(--primary))]" />
          <span class="text-sm">{{ currentScript || '未选择脚本' }}</span>
        </div>
        <textarea
          v-model="editorContent"
          class="flex-1 bg-[hsl(222,47%,9%)] p-4 font-mono text-sm text-[hsl(var(--foreground))] resize-none outline-none"
          placeholder="// 在此编写自动化脚本&#10;// agent 对象由运行环境自动注入&#10;// API:&#10;//   agent.aiAct(指令) - AI驱动操作（点击、滑动等）&#10;//   agent.aiAct('在搜索框中输入 hello') - 文本输入&#10;//   agent.aiAssert(条件) - 断言页面状态&#10;//   agent.aiQuery(schema) - 提取页面数据&#10;//   agent.aiWaitFor(条件) - 等待条件满足&#10;&#10;await agent.aiAct('打开浏览器');"
          spellcheck="false"
        ></textarea>
      </div>

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
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'
import { useDeviceStore } from '../stores/device'
import { useReportsStore } from '../stores/reports'

const deviceStore = useDeviceStore()
const reportsStore = useReportsStore()
const selectedDeviceId = computed(() => deviceStore.selectedDeviceId)

const scripts = ref<{ name: string; content: string }[]>([])
const currentScript = ref('')
const editorContent = ref('')
const isRunning = ref(false)
const logs = ref<{ message: string; status: string; step?: number; duration?: string }[]>([])
const report = ref<{ passed: number; failed: number; total: number; duration: string } | null>(null)
const logContainer = ref<HTMLElement>()

const showAiConfig = ref(false)
const aiConfig = reactive({ baseUrl: '', apiKey: '', modelName: '', modelFamily: '' })

const api = () => (window as any).electronAPI

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
  const a = api()
  if (a?.getScripts) scripts.value = await a.getScripts()
}

const selectScript = (s: { name: string; content: string }) => {
  currentScript.value = s.name
  editorContent.value = s.content
}

const createScript = async () => {
  const name = `脚本_${Date.now().toString(36)}`
  const content = `// agent 对象由运行环境自动注入\n// API: agent.aiAct(指令) / agent.aiAssert(条件) / agent.aiQuery(schema) / agent.aiWaitFor(条件)\n\nawait agent.aiAct('打开浏览器');\nawait agent.aiWaitFor('浏览器已打开');\n`
  const a = api()
  if (a?.saveAutomationScript) await a.saveAutomationScript(name, content)
  await loadScripts()
  currentScript.value = name
  editorContent.value = content
}

const saveCurrentScript = async () => {
  if (!currentScript.value) return
  const a = api()
  if (a?.saveAutomationScript) await a.saveAutomationScript(currentScript.value, editorContent.value)
  ElMessage.success('已保存')
  await loadScripts()
}

const deleteScript = async (name: string) => {
  const a = api()
  if (a?.deleteScript) await a.deleteScript(name)
  if (currentScript.value === name) { currentScript.value = ''; editorContent.value = '' }
  await loadScripts()
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
  const a = api()
  const script = scripts.value.find(s => s.name === oldName)
  if (a?.saveAutomationScript && a?.deleteScript && script) {
    await a.saveAutomationScript(newName, script.content)
    await a.deleteScript(oldName)
    if (currentScript.value === oldName) currentScript.value = newName
    await loadScripts()
  }
  renamingScript.value = ''
}

const duplicateScript = async (name: string) => {
  const script = scripts.value.find(s => s.name === name)
  if (!script) return
  const newName = `${name}_副本`
  const a = api()
  if (a?.saveAutomationScript) await a.saveAutomationScript(newName, script.content)
  await loadScripts()
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
  if (a?.stopAutomation) await a.stopAutomation()
  isRunning.value = false
}

let runStartTime = 0

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

const loadAiConfig = async () => {
  const a = api()
  if (a?.getAiConfig) {
    const cfg = await a.getAiConfig()
    if (cfg) Object.assign(aiConfig, cfg)
  }
}

onMounted(() => {
  loadScripts()
  loadAiConfig()
  const a = api()
  if (a?.onAutomationLog) a.onAutomationLog(handleLog)
})

onUnmounted(() => {
  const a = api()
  if (a?.offAutomationLog) a.offAutomationLog()
  if (isRunning.value) stopRun()
})
</script>