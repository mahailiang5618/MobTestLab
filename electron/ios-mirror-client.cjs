const EventEmitter = require('events')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')

const VENV_PYTHON = '/Users/mahailiang01/MobTestLab/.venv/bin/python3'
const IOS_MIRROR_SCRIPT = path.join(__dirname, 'ios-mirror-helper.py')
const TIDEVICE = '/opt/homebrew/bin/tidevice'

const KEYCODE_TO_WDA_BUTTON = {
  3: 'home',       // Android HOME -> iOS home
  24: 'volumeUp',  // Android VOLUME_UP
  25: 'volumeDown', // Android VOLUME_DOWN
  26: 'lock',       // Android POWER -> iOS lock
}

class IosMirrorClient extends EventEmitter {
  constructor(deviceId, options = {}) {
    super()
    this.deviceId = deviceId
    this.maxFps = options.maxFps || 8
    this.running = false
    this._wdaProcess = null
    this._wdaPort = 8100
    this._wdaSessionId = null
    this._screenshotProcess = null
    this._deviceScreenWidth = 390
    this._deviceScreenHeight = 844
    this._pendingTouch = null
  }

  async start() {
    this.running = true
    try {
      await this._startWdaProxy()
      await this._waitForWda()
      await this._createWdaSession()
      await this._fetchScreenSize()
      this._startScreenshotPolling()
      return { success: true }
    } catch (err) {
      this.running = false
      this._cleanup()
      return { success: false, error: err.message }
    }
  }

  async _startWdaProxy() {
    return new Promise((resolve, reject) => {
      const proc = spawn(TIDEVICE, ['wdaproxy', '--udid', this.deviceId, '--port', String(this._wdaPort)], {
        stdio: ['ignore', 'pipe', 'pipe']
      })
      this._wdaProcess = proc

      let stderr = ''
      proc.stderr.on('data', (chunk) => { stderr += chunk.toString() })

      proc.on('error', (err) => {
        reject(new Error(`Failed to start tidevice wdaproxy: ${err.message}`))
      })

      // Give it a moment to start, then resolve
      setTimeout(() => resolve(), 1000)
    })
  }

  async _waitForWda(maxRetries = 60) {
    for (let i = 0; i < maxRetries; i++) {
      if (!this.running) throw new Error('Cancelled while waiting for WDA')
      try {
        await this._wdaRequest('GET', '/status', null, 3000)
        return
      } catch {
        await new Promise(r => setTimeout(r, 500))
      }
    }
    throw new Error('WDA 启动超时，请确认设备上已安装 WebDriverAgent')
  }

  async _createWdaSession() {
    const caps = {
      capabilities: {
        alwaysMatch: { platformName: 'iOS', automationName: 'XCUITest' },
        firstMatch: []
      }
    }
    const res = await this._wdaRequest('POST', '/session', caps)
    this._wdaSessionId = res.value?.sessionId || res.sessionId
    if (!this._wdaSessionId) {
      throw new Error('Failed to create WDA session')
    }
  }

  async _fetchScreenSize() {
    try {
      const res = await this._wdaRequest('GET', `/session/${this._wdaSessionId}/window/size`)
      this._deviceScreenWidth = res.value?.width || 390
      this._deviceScreenHeight = res.value?.height || 844
    } catch {
      // fallback to defaults
    }
  }

  _startScreenshotPolling() {
    const args = [IOS_MIRROR_SCRIPT, '--udid', this.deviceId, '--fps', String(this.maxFps)]
    const proc = spawn(VENV_PYTHON, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'binary' }
    })
    this._screenshotProcess = proc

    let stderrBuf = ''
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString()
      if (stderrBuf.length > 500) stderrBuf = stderrBuf.slice(-500)
    })

    proc.on('error', (err) => {
      console.error('[ios-mirror] helper error:', err.message)
      if (this.running) this.stop()
    })

    proc.on('exit', (code) => {
      if (this.running) {
        console.error(`[ios-mirror] helper exited with code ${code}`)
        this.stop()
      }
    })

    // Read length-prefixed JPEG frames from stdout
    let buffer = Buffer.alloc(0)

    proc.stdout.on('data', (chunk) => {
      if (!this.running) return
      buffer = Buffer.concat([buffer, chunk])

      while (buffer.length >= 4) {
        const frameLen = buffer.readUInt32LE(0)

        if (frameLen === 0) {
          // Error frame: read error message
          buffer = buffer.subarray(4)
          if (buffer.length >= 4) {
            const errLen = buffer.readUInt32LE(0)
            if (buffer.length >= 4 + errLen) {
              console.error('[ios-mirror] helper error:', buffer.subarray(4, 4 + errLen).toString())
              buffer = buffer.subarray(4 + errLen)
            }
          }
          continue
        }

        if (buffer.length < 4 + frameLen) break

        const frameData = buffer.subarray(4, 4 + frameLen)
        buffer = buffer.subarray(4 + frameLen)

        this.emit('video-packet', {
          type: 'jpeg',
          data: frameData,
          pts: Date.now() * 1000
        })
      }
    })
  }

  async injectTouch(action, x, y, width, height) {
    if (!this._wdaPort || !this._wdaSessionId) return

    const scaleX = this._deviceScreenWidth / width
    const scaleY = this._deviceScreenHeight / height
    const scaledX = Math.round(x * scaleX)
    const scaledY = Math.round(y * scaleY)

    if (action === 0) {
      this._pendingTouch = { x: scaledX, y: scaledY }
    } else if (action === 2) {
      this._pendingTouch = { x: scaledX, y: scaledY }
    } else if (action === 1 && this._pendingTouch) {
      const startX = this._pendingTouch.x
      const startY = this._pendingTouch.y
      const distance = Math.hypot(scaledX - startX, scaledY - startY)

      try {
        if (distance < 10) {
          await this._wdaRequest('POST', `/session/${this._wdaSessionId}/wda/tap`, {
            x: scaledX, y: scaledY
          })
        } else {
          await this._wdaRequest('POST', `/session/${this._wdaSessionId}/wda/dragfromtoforduration`, {
            fromX: startX, fromY: startY,
            toX: scaledX, toY: scaledY,
            duration: 0.3
          })
        }
      } catch (e) {
        console.error('[ios-mirror] touch error:', e.message)
      }
      this._pendingTouch = null
    }
  }

  async injectScroll(x, y, width, height, scrollX, scrollY) {
    if (!this._wdaPort || !this._wdaSessionId) return

    const scaleX = this._deviceScreenWidth / width
    const scaleY = this._deviceScreenHeight / height
    const fromX = Math.round(x * scaleX)
    const fromY = Math.round(y * scaleY)
    const toX = fromX + scrollX * 100
    const toY = fromY + scrollY * 300

    try {
      await this._wdaRequest('POST', `/session/${this._wdaSessionId}/wda/dragfromtoforduration`, {
        fromX, fromY, toX, toY, duration: 0.2
      })
    } catch (e) {
      console.error('[ios-mirror] scroll error:', e.message)
    }
  }

  async injectKeyCode(keyCode) {
    if (!this._wdaPort || !this._wdaSessionId) return

    const button = KEYCODE_TO_WDA_BUTTON[keyCode]
    if (!button) return

    try {
      await this._wdaRequest('POST', `/session/${this._wdaSessionId}/wda/pressButton`, {
        name: button
      })
    } catch (e) {
      console.error('[ios-mirror] key error:', e.message)
    }
  }

  async injectText(text) {
    if (!this._wdaPort || !this._wdaSessionId) return

    try {
      await this._wdaRequest('POST', `/session/${this._wdaSessionId}/wda/keys`, {
        value: text.split('')
      })
    } catch (e) {
      console.error('[ios-mirror] text error:', e.message)
    }
  }

  _wdaRequest(method, apiPath, body = null, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const url = `http://127.0.0.1:${this._wdaPort}${apiPath}`
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        timeout
      }
      const req = http.request(url, options, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch { resolve({}) }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error(`WDA request timeout: ${method} ${apiPath}`))
      })
      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  }

  _cleanup() {
    if (this._screenshotProcess) {
      try { this._screenshotProcess.kill('SIGKILL') } catch {}
      this._screenshotProcess = null
    }
    if (this._wdaProcess) {
      try { this._wdaProcess.kill('SIGKILL') } catch {}
      this._wdaProcess = null
    }
    this._wdaSessionId = null
    this._pendingTouch = null
  }

  stop() {
    this.running = false
    this._cleanup()
    this.emit('stopped')
  }
}

module.exports = { IosMirrorClient }
