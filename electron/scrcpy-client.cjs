const EventEmitter = require('events')
const fs = require('fs')
const { getBinPath } = require('./paths.cjs')

const DEVICE_SERVER_PATH = '/data/local/tmp/scrcpy-server.jar'

let _modules = null
async function loadModules() {
  if (_modules) return _modules
  const [adbMod, adbServerMod, adbScrcpyMod, streamMod] = await Promise.all([
    import('@yume-chan/adb'),
    import('@yume-chan/adb-server-node-tcp'),
    import('@yume-chan/adb-scrcpy'),
    import('@yume-chan/stream-extra')
  ])
  _modules = { ...adbMod, ...adbServerMod, ...adbScrcpyMod, ...streamMod }
  return _modules
}

class ScrcpyClient extends EventEmitter {
  constructor(deviceId, options = {}) {
    super()
    this.deviceId = deviceId
    this.maxSize = options.maxSize || 720
    this.maxFps = options.maxFps || 30
    this.bitRate = options.bitRate || 8000000
    this.running = false
    this._scrcpyClient = null
    this._adb = null
  }

  async start() {
    const m = await loadModules()

    const connector = new m.AdbServerNodeTcpConnector({ host: '127.0.0.1', port: 5037 })
    const client = new m.AdbServerClient(connector)

    const transport = await client.createTransport({ serial: this.deviceId })
    this._adb = new m.Adb(transport)

    // Push scrcpy-server
    const serverBuf = fs.readFileSync(getBinPath('scrcpy-server'))
    const serverStream = new m.ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(serverBuf))
        controller.close()
      }
    })
    await m.AdbScrcpyClient.pushServer(this._adb, serverStream)

    // Start scrcpy
    const options = new m.AdbScrcpyOptions3_2({
      video: true,
      audio: false,
      control: true,
      maxSize: this.maxSize,
      maxFps: this.maxFps,
      videoBitRate: this.bitRate,
    })

    this._scrcpyClient = await m.AdbScrcpyClient.start(this._adb, DEVICE_SERVER_PATH, options)
    this.running = true

    // Read video stream
    const videoStream = await this._scrcpyClient.videoStream
    const reader = videoStream.stream.getReader()
    this._readLoop(reader)

    return { success: true }
  }

  async _readLoop(reader) {
    try {
      while (this.running) {
        const { done, value } = await reader.read()
        if (done) break
        // value is ScrcpyMediaStreamPacket: { type: "configuration"|"data", data: Uint8Array, keyframe?, pts? }
        this.emit('video-packet', {
          type: value.type,
          keyframe: value.keyframe || false,
          pts: value.pts ? Number(value.pts) : 0,
          data: Buffer.from(value.data)
        })
      }
    } catch (e) {
      if (this.running) console.error('[scrcpy] read error:', e.message)
    }
    if (this.running) this.stop()
  }

  async injectTouch(action, x, y, width, height) {
    if (!this._scrcpyClient?.controller) return
    try {
      await this._scrcpyClient.controller.injectTouch({
        action,
        pointerId: -1n,
        pointerX: x,
        pointerY: y,
        videoWidth: width,
        videoHeight: height,
        pressure: action === 1 ? 0 : 1.0,
        actionButton: 0,
        buttons: 0,
      })
    } catch {}
  }

  async injectText(text) {
    if (!this._scrcpyClient?.controller) return
    try {
      // ASCII text can use injectText directly; non-ASCII needs clipboard paste
      if (/^[\x00-\x7F]*$/.test(text)) {
        await this._scrcpyClient.controller.injectText(text)
      } else {
        await this._scrcpyClient.controller.setClipboard({ content: text, paste: true, sequence: 0n })
      }
    } catch {}
  }

  async injectKeyCode(keyCode) {
    if (!this._scrcpyClient?.controller) return
    try {
      await this._scrcpyClient.controller.injectKeyCode({ action: 0, keyCode, repeat: 0, metaState: 0 })
      await this._scrcpyClient.controller.injectKeyCode({ action: 1, keyCode, repeat: 0, metaState: 0 })
    } catch {}
  }

  async injectScroll(x, y, width, height, scrollX, scrollY) {
    if (!this._scrcpyClient?.controller) return
    try {
      await this._scrcpyClient.controller.injectScroll({
        pointerX: x,
        pointerY: y,
        videoWidth: width,
        videoHeight: height,
        scrollX,
        scrollY,
        buttons: 0,
      })
    } catch {}
  }

  stop() {
    this.running = false
    try { this._scrcpyClient?.close() } catch {}
    try { this._adb?.close() } catch {}
    this._scrcpyClient = null
    this._adb = null
    this.emit('stopped')
  }
}

module.exports = { ScrcpyClient }


