export type UiModelAction = 'tap' | 'input' | 'swipe' | 'wait' | 'assertExists' | 'snapshot'
export type UiModelLocatorMode = 'image' | 'poco' | 'coord'
export type UiModelScriptFormat = 'airtest' | 'poco'

export interface UiModelNode {
  id: string
  label: string
  poco: string
  template: string
  templateDataUrl?: string
  className?: string
  text?: string
  contentDesc?: string
  resourceId?: string
  clickable?: boolean
  x: number
  y: number
  width: number
  height: number
}

export interface UiModelStep {
  id: string
  action: UiModelAction
  nodeId: string
  nodeLabel: string
  poco: string
  template: string
  locatorMode: UiModelLocatorMode
  scriptFormat: UiModelScriptFormat
  inputText?: string
  timeout?: number
  threshold?: number
  center: { x: number; y: number }
  code: string
  createdAt: string
}

export interface CreateUiModelStepParams {
  action: UiModelAction
  node: UiModelNode
  locatorMode: UiModelLocatorMode
  scriptFormat: UiModelScriptFormat
  inputText?: string
  timeout?: number
  threshold?: number
}

export const uiModelTools: { key: UiModelAction; label: string; icon: string }[] = [
  { key: 'tap', label: '点击', icon: 'mdi:gesture-tap' },
  { key: 'input', label: '输入', icon: 'mdi:form-textbox' },
  { key: 'swipe', label: '滑动', icon: 'mdi:gesture-swipe' },
  { key: 'wait', label: '等待', icon: 'mdi:timer-sand' },
  { key: 'assertExists', label: '断言', icon: 'mdi:check-circle-outline' },
  { key: 'snapshot', label: '截图', icon: 'mdi:camera-outline' }
]

export const uiModelLocatorModes: { label: string; value: UiModelLocatorMode }[] = [
  { label: '图像', value: 'image' },
  { label: 'Poco', value: 'poco' },
  { label: '坐标', value: 'coord' }
]

export const uiModelScriptFormats: { label: string; value: UiModelScriptFormat }[] = [
  { label: 'Airtest', value: 'airtest' },
  { label: 'Poco', value: 'poco' }
]

export const demoUiModelNodes: UiModelNode[] = [
  { id: 'node-hero', label: '首页横幅', poco: 'home.banner', template: 'tpl_home_banner.png', x: 12, y: 58, width: 156, height: 80 },
  { id: 'node-phone', label: '手机号输入框', poco: 'login.phone_input', template: 'tpl_phone_input.png', x: 24, y: 158, width: 132, height: 36 },
  { id: 'node-code', label: '验证码输入框', poco: 'login.code_input', template: 'tpl_code_input.png', x: 24, y: 202, width: 132, height: 36 },
  { id: 'node-login', label: '登录按钮', poco: 'login.submit', template: 'tpl_login_button.png', x: 24, y: 314, width: 132, height: 40 }
]

export const getNodeCenter = (node: UiModelNode) => ({
  x: Math.round(node.x + node.width / 2),
  y: Math.round(node.y + node.height / 2)
})

export const actionLabel = (action: string) => {
  const labels: Record<string, string> = {
    tap: '点击',
    input: '输入',
    swipe: '滑动',
    wait: '等待',
    waitFor: '等待',
    assertExists: '断言',
    assertVisible: '断言',
    snapshot: '截图'
  }
  return labels[action] || action
}

export const buildUiModelScriptHeader = () => [
  '# -*- encoding=utf8 -*-',
  'from airtest.core.api import *',
  'from poco.drivers.android.uiautomation import AndroidUiautomationPoco',
  '',
  'auto_setup(__file__)',
  'poco = AndroidUiautomationPoco(use_airtest_input=True, screenshot_each_action=False)',
  ''
].join('\n')

const escapePythonString = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const buildTemplateExpr = (node: UiModelNode, threshold: number) =>
  `Template(r"${node.template}", threshold=${threshold.toFixed(2)})`

export const validateUiModelStepParams = (params: CreateUiModelStepParams) => {
  const errors: string[] = []
  if (!params.node?.id) errors.push('未选择目标元素')
  if (params.action === 'input' && !params.inputText?.trim()) errors.push('请输入文本内容')
  if ((params.action === 'wait' || params.action === 'assertExists') && (params.timeout || 0) <= 0) errors.push('超时时间必须大于 0')
  if (params.locatorMode === 'image') {
    const threshold = params.threshold ?? 0
    if (threshold < 0.5 || threshold > 0.99) errors.push('识别阈值需要在 0.50 到 0.99 之间')
  }
  return errors
}

export const generateUiModelStepCode = (params: CreateUiModelStepParams) => {
  const node = params.node
  const center = getNodeCenter(node)
  const timeout = params.timeout ?? 10
  const threshold = params.threshold ?? 0.85
  const template = buildTemplateExpr(node, threshold)
  const airtestTarget = params.locatorMode === 'coord' ? `(${center.x}, ${center.y})` : template
  const pocoTarget = `poco("${escapePythonString(node.poco)}")`
  const inputText = escapePythonString(params.inputText || '')
  const label = escapePythonString(node.label)

  if (params.scriptFormat === 'poco') {
    if (params.action === 'input') return `${pocoTarget}.set_text("${inputText}")`
    if (params.action === 'swipe') return `${pocoTarget}.swipe('up')`
    if (params.action === 'wait') return `${pocoTarget}.wait_for_appearance(timeout=${timeout})`
    if (params.action === 'assertExists') return `assert ${pocoTarget}.exists(), "${label} not found"`
    if (params.action === 'snapshot') return `snapshot(filename="${node.id}.png", msg="${label}")`
    return `${pocoTarget}.click()`
  }

  if (params.action === 'input') return `touch(${airtestTarget})\ntext("${inputText}")`
  if (params.action === 'swipe') return `swipe((${center.x}, ${center.y + 220}), (${center.x}, ${Math.max(0, center.y - 220)}))`
  if (params.action === 'wait') return `wait(${template}, timeout=${timeout})`
  if (params.action === 'assertExists') return `assert_exists(${template}, "${label}")`
  if (params.action === 'snapshot') return `snapshot(filename="${node.id}.png", msg="${label}")`
  return `touch(${airtestTarget})`
}

export const createUiModelStep = (params: CreateUiModelStepParams): UiModelStep => {
  const center = getNodeCenter(params.node)
  return {
    id: `ui-step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    action: params.action,
    nodeId: params.node.id,
    nodeLabel: params.node.label,
    poco: params.node.poco,
    template: params.node.template,
    locatorMode: params.locatorMode,
    scriptFormat: params.scriptFormat,
    inputText: params.inputText,
    timeout: params.timeout,
    threshold: params.threshold,
    center,
    code: generateUiModelStepCode(params),
    createdAt: new Date().toISOString()
  }
}

export const serializeUiModelStep = (step: UiModelStep) =>
  `# MTL_STEP ${JSON.stringify({ ...step, code: undefined })}\n${step.code}`

export const buildUiModelScript = (steps: UiModelStep[]) => {
  const body = steps.map(serializeUiModelStep).join('\n\n')
  return body ? `${buildUiModelScriptHeader()}\n${body}\n` : buildUiModelScriptHeader()
}

export const parseUiModelSteps = (content: string): UiModelStep[] => {
  const lines = content.split('\n')
  const steps: UiModelStep[] = []
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line.startsWith('# MTL_STEP ')) continue
    try {
      const meta = JSON.parse(line.slice('# MTL_STEP '.length))
      const codeLines: string[] = []
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const next = lines[cursor]
        if (next.trim().startsWith('# MTL_STEP ')) break
        if (!next.trim() && codeLines.length > 0) break
        if (next.trim()) codeLines.push(next)
      }
      steps.push({ ...meta, code: codeLines.join('\n') })
    } catch {
      // Ignore malformed step markers; the editor remains the source of truth.
    }
  }
  return steps
}

export const inferUiModelAction = (line: string): UiModelAction | 'waitFor' | 'assertVisible' => {
  if (/snapshot|截图/.test(line)) return 'snapshot'
  if (/assert_exists|exists|断言|显示/.test(line)) return 'assertExists'
  if (/aiWaitFor|等待/.test(line)) return 'waitFor'
  if (/wait|等待/.test(line)) return 'wait'
  if (/set_text|text\(|输入/.test(line)) return 'input'
  if (/swipe|滑动/.test(line)) return 'swipe'
  return 'tap'
}

export const inferUiModelScriptFormat = (content: string): UiModelScriptFormat =>
  /poco\("[^"]+"\)\.(click|set_text|swipe|wait_for_appearance|exists)/.test(content) ? 'poco' : 'airtest'
