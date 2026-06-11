const test = require('node:test')
const assert = require('node:assert/strict')
const { parseBounds, parseUiAutomatorXml } = require('../electron/ui-model-service.cjs')

test('parseBounds parses Android uiautomator bounds', () => {
  assert.deepEqual(parseBounds('[12,34][112,134]'), {
    x: 12,
    y: 34,
    width: 100,
    height: 100
  })
})

test('parseBounds rejects malformed or empty rectangles', () => {
  assert.equal(parseBounds('bad'), null)
  assert.equal(parseBounds('[10,10][10,20]'), null)
  assert.equal(parseBounds('[10,10][20,10]'), null)
})

test('parseUiAutomatorXml extracts labels, selectors, and metadata', () => {
  const xml = `
    <hierarchy>
      <node index="0" text="" resource-id="com.demo:id/root" class="android.widget.FrameLayout" bounds="[0,0][1080,2400]" clickable="false" enabled="true" />
      <node index="1" text="登录" content-desc="" resource-id="com.demo:id/login" class="android.widget.Button" bounds="[100,200][400,280]" clickable="true" enabled="true" />
      <node index="2" text="" content-desc="关闭" resource-id="" class="android.widget.ImageButton" bounds="[900,40][1040,180]" clickable="true" enabled="true" />
      <node index="3" text="禁用" resource-id="com.demo:id/disabled" bounds="[0,0][10,10]" clickable="true" enabled="false" />
    </hierarchy>
  `
  const nodes = parseUiAutomatorXml(xml)

  assert.equal(nodes.length, 3)
  assert.equal(nodes[1].label, '登录')
  assert.equal(nodes[1].poco, 'com.demo:id/login')
  assert.equal(nodes[1].clickable, true)
  assert.equal(nodes[2].label, '关闭')
  assert.equal(nodes[2].poco, '关闭')
  assert.equal(nodes.some(node => node.label === '禁用'), false)
})
