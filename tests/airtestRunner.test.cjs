const test = require('node:test')
const assert = require('node:assert/strict')
const { injectDeviceSetup, packageNamesForMissingModules, stripAnsi } = require('../electron/airtest-runner.cjs')

test('injectDeviceSetup replaces plain auto_setup with selected device', () => {
  const script = [
    'from airtest.core.api import *',
    'auto_setup(__file__)',
    'touch((100, 200))'
  ].join('\n')
  const result = injectDeviceSetup(script, 'emulator-5554')

  assert.match(result, /auto_setup\(__file__, devices=\["Android:\/\/\/emulator-5554"\]\)/)
  assert.match(result, /touch\(\(100, 200\)\)/)
})

test('injectDeviceSetup prepends a complete Airtest header when absent', () => {
  const result = injectDeviceSetup('touch((1, 2))', '127.0.0.1:5555')

  assert.match(result, /from airtest\.core\.api import \*/)
  assert.match(result, /AndroidUiautomationPoco/)
  assert.match(result, /Android:\/\/\/127\.0\.0\.1:5555/)
  assert.match(result, /touch\(\(1, 2\)\)/)
})

test('injectDeviceSetup keeps scripts that already declare devices', () => {
  const script = 'auto_setup(__file__, devices=["Android:///abc"])\ntouch((3, 4))'
  assert.equal(injectDeviceSetup(script, 'xyz'), script)
})

test('maps missing Python modules to installable packages', () => {
  assert.deepEqual(packageNamesForMissingModules(['airtest', 'poco', 'poco']), ['airtest', 'pocoui'])
})

test('stripAnsi removes colored traceback escape sequences', () => {
  assert.equal(stripAnsi('\u001b[35mModuleNotFoundError\u001b[0m: No module named airtest'), 'ModuleNotFoundError: No module named airtest')
})
