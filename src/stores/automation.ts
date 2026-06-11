import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { inferUiModelAction } from '@/utils/uiModel'

export type ScriptSource = 'visual_model' | 'gui_agent' | 'mixed'

export interface AutomationStep {
  id: string
  action: 'tap' | 'input' | 'swipe' | 'wait' | 'waitFor' | 'assertExists' | 'assertVisible' | 'snapshot'
  target: string
  description: string
  code: string
}

export interface AutomationScriptAsset {
  id: string
  name: string
  source: ScriptSource
  extension: 'js' | 'py'
  content: string
  steps: AutomationStep[]
  updatedAt: string
}

const nowLabel = () => new Date().toLocaleString('zh-CN', { hour12: false })

const defaultScriptContent = () => [
  '// agent 对象由运行环境自动注入',
  '// API: agent.aiAct(指令) / agent.aiAssert(条件) / agent.aiQuery(schema) / agent.aiWaitFor(条件)',
  '',
  "await agent.aiAct('打开浏览器');",
  "await agent.aiWaitFor('浏览器已打开');"
].join('\n')

const demoScripts: AutomationScriptAsset[] = [
  {
    id: 'script-cold-start-agent',
    name: '冷启动 - GUI Agent',
    source: 'gui_agent',
    extension: 'js',
    updatedAt: nowLabel(),
    content: [
      "await agent.aiAct('回到桌面')",
      "await agent.aiAct('点击 MobTestLab Demo 应用图标')",
      "await agent.aiWaitFor('首页核心内容已经展示')"
    ].join('\n'),
    steps: [
      {
        id: 'step-agent-1',
        action: 'tap',
        target: '桌面',
        description: '回到桌面',
        code: "await agent.aiAct('回到桌面')"
      },
      {
        id: 'step-agent-2',
        action: 'tap',
        target: 'MobTestLab Demo 图标',
        description: '点击应用图标',
        code: "await agent.aiAct('点击 MobTestLab Demo 应用图标')"
      },
      {
        id: 'step-agent-3',
        action: 'waitFor',
        target: '首页核心内容',
        description: '等待首页稳定',
        code: "await agent.aiWaitFor('首页核心内容已经展示')"
      }
    ]
  },
  {
    id: 'script-login-visual',
    name: '登录链路 - 可视化点选',
    source: 'visual_model',
    extension: 'py',
    updatedAt: nowLabel(),
    content: [
      "await agent.aiAct('点击文本为“登录”的按钮')",
      "await agent.aiAct('在手机号输入框中输入 13800138000')",
      "await agent.aiAct('点击文本为“继续”的按钮')",
      "await agent.aiAssert('页面上显示“欢迎回来”')"
    ].join('\n'),
    steps: [
      {
        id: 'step-visual-1',
        action: 'tap',
        target: '登录按钮',
        description: '点选登录按钮生成点击动作',
        code: "await agent.aiAct('点击文本为“登录”的按钮')"
      },
      {
        id: 'step-visual-2',
        action: 'input',
        target: '手机号输入框',
        description: '输入手机号',
        code: "await agent.aiAct('在手机号输入框中输入 13800138000')"
      },
      {
        id: 'step-visual-3',
        action: 'tap',
        target: '继续按钮',
        description: '提交登录',
        code: "await agent.aiAct('点击文本为“继续”的按钮')"
      }
    ]
  }
]

const api = () => (window as any).electronAPI

const inferSource = (name: string, content: string): ScriptSource => {
  if (/可视化|UI模型|UI 模型|visual|ui model/i.test(name)) return 'visual_model'
  if (/from airtest\.core\.api|AndroidUiautomationPoco|# MTL_STEP|poco\("/.test(content)) return 'visual_model'
  if (/aiAct|aiAssert|aiQuery|aiWaitFor|GUI Agent/i.test(content)) return 'gui_agent'
  return 'mixed'
}

const inferAction = (line: string): AutomationStep['action'] => {
  return inferUiModelAction(line)
}

const buildSteps = (content: string): AutomationStep[] => {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .map((line, index) => ({
      id: `step-${index + 1}`,
      action: inferAction(line),
      target: '',
      description: line.replace(/^await\s+/, '').replace(/;$/, ''),
      code: line
    }))
}

const normalizeScript = (script: { name: string; content: string; extension?: 'js' | 'py' }): AutomationScriptAsset => ({
  id: script.name,
  name: script.name,
  source: inferSource(script.name, script.content),
  extension: script.extension || (inferSource(script.name, script.content) === 'visual_model' ? 'py' : 'js'),
  content: script.content,
  steps: buildSteps(script.content),
  updatedAt: nowLabel()
})

const uniqueName = (baseName: string, names: string[]) => {
  if (!names.includes(baseName)) return baseName
  let index = 2
  while (names.includes(`${baseName}_${index}`)) index += 1
  return `${baseName}_${index}`
}

export const useAutomationStore = defineStore('automation', () => {
  const scripts = ref<AutomationScriptAsset[]>([])
  const currentScriptId = ref('')
  const loaded = ref(false)

  const currentScript = computed(() =>
    scripts.value.find(script => script.id === currentScriptId.value) || scripts.value[0] || null
  )

  const getScriptById = (scriptId?: string) =>
    scripts.value.find(script => script.id === scriptId) || null

  const setCurrentScript = (scriptId: string) => {
    currentScriptId.value = scriptId
  }

  const loadScripts = async () => {
    const electronApi = api()
    if (electronApi?.getScripts) {
      const loadedScripts = await electronApi.getScripts()
      scripts.value = loadedScripts.map(normalizeScript)
    } else {
      scripts.value = demoScripts.map(script => ({ ...script, steps: script.steps.map(step => ({ ...step })) }))
    }
    if (!currentScriptId.value || !scripts.value.some(script => script.id === currentScriptId.value)) {
      currentScriptId.value = scripts.value[0]?.id || ''
    }
    loaded.value = true
  }

  const saveScript = async (name: string, content: string, options: { source?: ScriptSource; extension?: 'js' | 'py' } = {}) => {
    const electronApi = api()
    const extension = options.extension || (options.source === 'visual_model' || inferSource(name, content) === 'visual_model' ? 'py' : 'js')
    if (electronApi?.saveAutomationScript) {
      await electronApi.saveAutomationScript(name, content, { extension })
      await loadScripts()
    } else {
      const nextScript = normalizeScript({ name, content, extension })
      const index = scripts.value.findIndex(script => script.id === name)
      if (index >= 0) scripts.value[index] = nextScript
      else scripts.value.unshift(nextScript)
    }
    currentScriptId.value = name
  }

  const createScript = async () => {
    const name = uniqueName(`脚本_${Date.now().toString(36)}`, scripts.value.map(script => script.name))
    const content = defaultScriptContent()
    await saveScript(name, content)
    return getScriptById(name)
  }

  const deleteScript = async (name: string) => {
    const electronApi = api()
    if (electronApi?.deleteScript) {
      await electronApi.deleteScript(name)
      await loadScripts()
    } else {
      scripts.value = scripts.value.filter(script => script.id !== name)
    }
    if (currentScriptId.value === name) currentScriptId.value = scripts.value[0]?.id || ''
  }

  const renameScript = async (oldName: string, newName: string) => {
    const script = getScriptById(oldName)
    if (!script || !newName || newName === oldName) return
    const electronApi = api()
    if (electronApi?.saveAutomationScript && electronApi?.deleteScript) {
      await electronApi.saveAutomationScript(newName, script.content, { extension: script.extension })
      await electronApi.deleteScript(oldName)
      await loadScripts()
    } else {
      scripts.value = scripts.value.map(item => item.id === oldName ? normalizeScript({ name: newName, content: script.content }) : item)
    }
    currentScriptId.value = newName
  }

  const duplicateScript = async (name: string) => {
    const script = getScriptById(name)
    if (!script) return
    const newName = uniqueName(`${name}_副本`, scripts.value.map(item => item.name))
    await saveScript(newName, script.content)
  }

  return {
    scripts,
    currentScriptId,
    currentScript,
    loaded,
    loadScripts,
    getScriptById,
    setCurrentScript,
    saveScript,
    createScript,
    deleteScript,
    renameScript,
    duplicateScript
  }
})
