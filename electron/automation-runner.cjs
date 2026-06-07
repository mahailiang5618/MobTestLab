const { fork, execSync } = require('child_process')
const path = require('path')

function getNodePath() {
  try { return execSync('which node', { encoding: 'utf-8' }).trim() } catch { return 'node' }
}

class AutomationRunner {
  constructor() {
    this.worker = null
    this.onLog = null
  }

  run({ script, deviceId, aiConfig }, onLog) {
    if (this.worker) this.stop()
    this.onLog = onLog

    const workerPath = path.join(__dirname, 'automation-worker.cjs')
    this.worker = fork(workerPath, [], {
      silent: true,
      execPath: getNodePath()
    })

    this.worker.stdout.on('data', (data) => {
      if (this.onLog) this.onLog({ type: 'log', message: data.toString().trim(), status: 'done' })
    })

    this.worker.stderr.on('data', (data) => {
      if (this.onLog) this.onLog({ type: 'log', message: data.toString().trim(), status: 'warning' })
    })

    this.worker.on('message', (msg) => {
      if (this.onLog) this.onLog(msg)
    })

    this.worker.on('error', (err) => {
      if (this.onLog) this.onLog({ type: 'error', message: `Worker error: ${err.message}` })
      this.worker = null
    })

    this.worker.on('exit', (code) => {
      if (code && code !== 0 && this.onLog) {
        this.onLog({ type: 'error', message: `Worker 退出，code: ${code}` })
      }
      this.worker = null
    })

    this.worker.send({ type: 'run', script, deviceId, aiConfig })
  }

  stop() {
    if (this.worker) {
      this.worker.kill()
      this.worker = null
    }
  }
}

module.exports = { AutomationRunner }
