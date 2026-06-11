const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const RUNS_DIR = path.join(os.homedir(), '.mobtestlab', 'airtest-runs')
const AIRTEST_VENV_DIR = path.join(os.homedir(), '.mobtestlab', 'airtest-venv')

function venvPythonPath() {
  return process.platform === 'win32'
    ? path.join(AIRTEST_VENV_DIR, 'Scripts', 'python.exe')
    : path.join(AIRTEST_VENV_DIR, 'bin', 'python')
}

function stripAnsi(value) {
  return String(value || '').replace(/\x1b\[[0-9;]*m/g, '')
}

function findPython() {
  const candidates = [
    process.env.MOBTESTLAB_PYTHON,
    process.env.PYTHON,
    'python3',
    'python'
  ].filter(Boolean)

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf-8', timeout: 5000 })
    if (result.status === 0) return candidate
  }
  return null
}

function checkAirtestRuntime(python) {
  const result = spawnSync(python, [
    '-c',
    'import importlib.util; missing=[m for m in ("airtest","poco") if importlib.util.find_spec(m) is None]; print(",".join(missing)); raise SystemExit(1 if missing else 0)'
  ], { encoding: 'utf-8', timeout: 10000 })

  if (result.status === 0) return { success: true }
  const missing = String(result.stdout || '').trim().split(',').filter(Boolean)
  const output = stripAnsi(`${result.stderr || ''}${result.stdout || ''}`).trim()
  return {
    success: false,
    missing,
    error: missing.length ? `缺少 Python 包: ${missing.join(', ')}` : (output || '当前 Python 环境未安装 airtest / pocoui')
  }
}

function packageNamesForMissingModules(modules) {
  const packageMap = { airtest: 'airtest', poco: 'pocoui' }
  return [...new Set(modules.map(name => packageMap[name] || name))]
}

function runProcess(command, args, onLog, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...(options.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    let stdoutRest = ''
    let stderrRest = ''

    child.stdout.on('data', (data) => {
      output += data.toString()
      stdoutRest = appendLines(stdoutRest, data, (message) => onLog?.({ type: 'log', status: 'running', message }))
    })
    child.stderr.on('data', (data) => {
      output += data.toString()
      stderrRest = appendLines(stderrRest, data, (message) => onLog?.({ type: 'log', status: 'warning', message }))
    })
    child.on('error', (err) => {
      resolve({ success: false, error: err.message, output })
    })
    child.on('close', (code) => {
      if (stdoutRest.trim()) onLog?.({ type: 'log', status: 'running', message: stdoutRest.trim() })
      if (stderrRest.trim()) onLog?.({ type: 'log', status: 'warning', message: stderrRest.trim() })
      resolve({ success: code === 0, code, output })
    })
  })
}

async function prepareAirtestPython(onLog) {
  const configuredPython = process.env.MOBTESTLAB_PYTHON || process.env.PYTHON
  if (configuredPython && checkAirtestRuntime(configuredPython).success) return { success: true, python: configuredPython }

  const venvPython = venvPythonPath()
  if (fs.existsSync(venvPython) && checkAirtestRuntime(venvPython).success) {
    return { success: true, python: venvPython }
  }

  const basePython = findPython()
  if (!basePython) {
    return { success: false, error: '未找到 Python，请安装 python3 或配置 MOBTESTLAB_PYTHON' }
  }

  fs.mkdirSync(path.dirname(AIRTEST_VENV_DIR), { recursive: true })
  if (!fs.existsSync(venvPython)) {
    onLog?.({ type: 'log', status: 'running', message: '正在初始化 Airtest 独立 Python 环境...' })
    const venvResult = await runProcess(basePython, ['-m', 'venv', AIRTEST_VENV_DIR], onLog)
    if (!venvResult.success) {
      return { success: false, error: `创建 Airtest Python 环境失败: ${stripAnsi(venvResult.output || venvResult.error).trim()}` }
    }
  }

  let runtime = checkAirtestRuntime(venvPython)
  if (runtime.success) return { success: true, python: venvPython }

  const packages = packageNamesForMissingModules(runtime.missing?.length ? runtime.missing : ['airtest', 'poco'])
  onLog?.({ type: 'log', status: 'running', message: `正在安装 Airtest 依赖: ${packages.join(', ')}` })
  const pipResult = await runProcess(venvPython, ['-m', 'pip', 'install', '-U', ...packages], onLog)
  if (!pipResult.success) {
    const installCommand = `"${venvPython}" -m pip install -U ${packages.join(' ')}`
    return {
      success: false,
      error: `Airtest 依赖安装失败，请检查网络后重试，或手动执行: ${installCommand}`
    }
  }

  runtime = checkAirtestRuntime(venvPython)
  if (!runtime.success) {
    return { success: false, error: `Airtest 环境初始化失败: ${runtime.error}` }
  }

  return { success: true, python: venvPython }
}

function deviceUri(deviceId) {
  return `Android:///${String(deviceId || '').replace(/"/g, '\\"')}`
}

function injectDeviceSetup(script, deviceId) {
  const uri = deviceUri(deviceId)
  if (/auto_setup\(\s*__file__\s*,\s*devices\s*=/.test(script)) return script
  if (/auto_setup\(\s*__file__\s*\)/.test(script)) {
    return script.replace(/auto_setup\(\s*__file__\s*\)/, `auto_setup(__file__, devices=["${uri}"])`)
  }

  const header = [
    '# -*- encoding=utf8 -*-',
    'from airtest.core.api import *',
    'from poco.drivers.android.uiautomation import AndroidUiautomationPoco',
    '',
    `auto_setup(__file__, devices=["${uri}"])`,
    'poco = AndroidUiautomationPoco(use_airtest_input=True, screenshot_each_action=False)',
    ''
  ].join('\n')
  return `${header}\n${script}`
}

function appendLines(buffer, chunk, callback) {
  const text = buffer + chunk.toString()
  const lines = text.split(/\r?\n/)
  const rest = lines.pop() || ''
  for (const line of lines) {
    const message = line.trim()
    if (message) callback(message)
  }
  return rest
}

class AirtestRunner {
  constructor() {
    this.child = null
    this.onLog = null
  }

  async run({ script, deviceId }, onLog) {
    if (this.child) this.stop()
    this.onLog = onLog

    if (!deviceId) {
      this.emit({ type: 'error', status: 'error', message: '未选择设备' })
      return { success: false, error: '未选择设备' }
    }
    if (!script || !String(script).trim()) {
      this.emit({ type: 'error', status: 'error', message: '脚本内容为空' })
      return { success: false, error: '脚本内容为空' }
    }

    const runtime = await prepareAirtestPython((msg) => this.emit(msg))
    if (!runtime.success) {
      const error = runtime.error
      this.emit({ type: 'error', status: 'error', message: error })
      return { success: false, error }
    }
    const python = runtime.python

    fs.mkdirSync(RUNS_DIR, { recursive: true })
    const runDir = path.join(RUNS_DIR, `run_${Date.now()}`)
    fs.mkdirSync(runDir, { recursive: true })
    const scriptPath = path.join(runDir, 'script.py')
    fs.writeFileSync(scriptPath, injectDeviceSetup(String(script), deviceId))

    this.emit({ type: 'log', status: 'running', message: `Airtest 启动: ${path.basename(scriptPath)}` })
    this.child = spawn(python, [scriptPath], {
      cwd: runDir,
      env: { ...process.env, ANDROID_SERIAL: deviceId },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdoutRest = ''
    let stderrRest = ''

    this.child.stdout.on('data', (data) => {
      stdoutRest = appendLines(stdoutRest, data, (message) => {
        this.emit({ type: 'log', status: 'running', message })
      })
    })

    this.child.stderr.on('data', (data) => {
      stderrRest = appendLines(stderrRest, data, (message) => {
        this.emit({ type: 'log', status: 'warning', message })
      })
    })

    this.child.on('error', (err) => {
      this.emit({ type: 'error', status: 'error', message: `Airtest 执行失败: ${err.message}` })
      this.child = null
    })

    this.child.on('close', (code, signal) => {
      if (stdoutRest.trim()) this.emit({ type: 'log', status: 'running', message: stdoutRest.trim() })
      if (stderrRest.trim()) this.emit({ type: 'log', status: 'warning', message: stderrRest.trim() })
      this.child = null
      if (signal) {
        this.emit({ type: 'error', status: 'error', message: `Airtest 已停止: ${signal}` })
      } else if (code === 0) {
        this.emit({ type: 'done', status: 'done', message: 'Airtest 脚本执行完毕' })
      } else {
        this.emit({ type: 'error', status: 'error', message: `Airtest 退出，code: ${code}` })
      }
    })

    return { success: true }
  }

  stop() {
    if (this.child) {
      this.child.kill('SIGTERM')
      this.child = null
    }
  }

  emit(message) {
    if (this.onLog) this.onLog(message)
  }
}

module.exports = {
  AirtestRunner,
  checkAirtestRuntime,
  findPython,
  injectDeviceSetup,
  packageNamesForMissingModules,
  stripAnsi
}
