import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildUiModelScript,
  createUiModelStep,
  demoUiModelNodes,
  generateUiModelStepCode,
  parseUiModelSteps,
  validateUiModelStepParams
} from '../src/utils/uiModel.ts'

const loginNode = demoUiModelNodes.find(node => node.id === 'node-login')!

test('generates Airtest image touch code', () => {
  const code = generateUiModelStepCode({
    action: 'tap',
    node: loginNode,
    locatorMode: 'image',
    scriptFormat: 'airtest',
    threshold: 0.86
  })
  assert.equal(code, 'touch(Template(r"tpl_login_button.png", threshold=0.86))')
})

test('generates Airtest coordinate input code', () => {
  const phoneNode = demoUiModelNodes.find(node => node.id === 'node-phone')!
  const code = generateUiModelStepCode({
    action: 'input',
    node: phoneNode,
    locatorMode: 'coord',
    scriptFormat: 'airtest',
    inputText: '13800138000',
    threshold: 0.85
  })
  assert.match(code, /^touch\(\(\d+, \d+\)\)\ntext\("13800138000"\)$/)
})

test('generates Poco click and wait code', () => {
  assert.equal(
    generateUiModelStepCode({
      action: 'tap',
      node: loginNode,
      locatorMode: 'poco',
      scriptFormat: 'poco'
    }),
    'poco("login.submit").click()'
  )
  assert.equal(
    generateUiModelStepCode({
      action: 'wait',
      node: loginNode,
      locatorMode: 'poco',
      scriptFormat: 'poco',
      timeout: 12
    }),
    'poco("login.submit").wait_for_appearance(timeout=12)'
  )
})

test('validates input and image threshold parameters', () => {
  assert.deepEqual(
    validateUiModelStepParams({
      action: 'input',
      node: loginNode,
      locatorMode: 'image',
      scriptFormat: 'airtest',
      inputText: '',
      threshold: 0.2
    }),
    ['请输入文本内容', '识别阈值需要在 0.50 到 0.99 之间']
  )
})

test('serializes and parses structured UI model steps', () => {
  const step = createUiModelStep({
    action: 'assertExists',
    node: loginNode,
    locatorMode: 'image',
    scriptFormat: 'airtest',
    timeout: 10,
    threshold: 0.85
  })
  const script = buildUiModelScript([step])
  assert.match(script, /from airtest\.core\.api import \*/)
  assert.match(script, /# MTL_STEP /)

  const parsed = parseUiModelSteps(script)
  assert.equal(parsed.length, 1)
  assert.equal(parsed[0].action, 'assertExists')
  assert.equal(parsed[0].nodeId, 'node-login')
  assert.equal(parsed[0].code, 'assert_exists(Template(r"tpl_login_button.png", threshold=0.85), "登录按钮")')
})
