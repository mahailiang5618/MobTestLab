const { execFile } = require('child_process')
const EventEmitter = require('events')
const { getBinPath } = require('./paths.cjs')

class AndroidPerfCollector extends EventEmitter {
  constructor(deviceId, packageName) {
    super()
    this.deviceId = deviceId
    this.packageName = packageName
    this.timer = null
    this.pid = null
    this.prevCpuStats = null
    this.prevNetStats = null
    this._prevFrameCount = null
    this._prevFrameTime = null
    this._collecting = false
  }

  async start() {
    await this._adb(`monkey -p ${this.packageName} -c android.intent.category.LAUNCHER 1`)
    for (let i = 0; i < 6; i++) {
      this.pid = await this._getPid()
      if (this.pid) break
      await new Promise(r => setTimeout(r, 500))
    }
    if (!this.pid) {
      throw new Error(`Process not found for package: ${this.packageName}`)
    }
    this.prevCpuStats = await this._readProcCpuStats()
    this.prevNetStats = await this._readNetStats()
    this.timer = setInterval(() => this._collect(), 1000)
    this._collect()
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.pid = null
    this.prevCpuStats = null
    this.prevNetStats = null
    this._prevFrameCount = null
    this._prevFrameTime = null
  }

  _adb(cmd) {
    return new Promise(resolve => {
      execFile(getBinPath('adb'), ['-s', this.deviceId, 'shell', cmd], {
        encoding: 'utf-8',
        timeout: 5000
      }, (err, stdout) => {
        resolve(err ? '' : (stdout || '').trim())
      })
    })
  }

  async _getPid() {
    const out = await this._adb(`pidof ${this.packageName}`)
    const pid = out.split(/\s+/)[0]
    return pid && /^\d+$/.test(pid) ? pid : null
  }

  async _collect() {
    if (this._collecting || !this.timer) return
    this._collecting = true
    try {
      const freshPid = await this._getPid()
      if (!freshPid) { this._collecting = false; return }
      if (freshPid !== this.pid) {
        this.pid = freshPid
        this.prevCpuStats = null
      }

      const [cpu, memory, fps, network, battery, temperature, gpu] = await Promise.all([
        this._collectCpu(),
        this._collectMemory(),
        this._collectFps(),
        this._collectNetwork(),
        this._collectBattery(),
        this._collectTemperature(),
        this._collectGpu()
      ])

      if (!this.timer) { this._collecting = false; return }
      this.emit('data', { timestamp: Date.now(), cpu, memory, fps, network, battery, temperature, gpu })
    } catch {}
    this._collecting = false
  }

  async _readProcCpuStats() {
    const [procStat, totalStat] = await Promise.all([
      this._adb(`cat /proc/${this.pid}/stat`),
      this._adb('cat /proc/stat')
    ])
    if (!procStat || !totalStat) return null
    const parts = procStat.split(/\s+/)
    const utime = parseInt(parts[13]) || 0
    const stime = parseInt(parts[14]) || 0
    const firstLine = totalStat.split('\n')[0] || ''
    const totalParts = firstLine.replace('cpu', '').trim().split(/\s+/)
    const totalTime = totalParts.reduce((s, v) => s + (parseInt(v) || 0), 0)
    return { procTime: utime + stime, totalTime }
  }

  async _collectCpu() {
    const current = await this._readProcCpuStats()
    if (!current) return 0
    if (!this.prevCpuStats) {
      this.prevCpuStats = current
      return 0
    }
    const procDelta = current.procTime - this.prevCpuStats.procTime
    const totalDelta = current.totalTime - this.prevCpuStats.totalTime
    this.prevCpuStats = current
    if (totalDelta <= 0) return 0
    const nproc = await this._adb('nproc')
    const numCores = parseInt(nproc) || 4
    return Math.min(100, (procDelta / totalDelta) * numCores * 100)
  }

  async _collectMemory() {
    const out = await this._adb(`dumpsys meminfo ${this.packageName}`)
    if (!out) return 0
    const pssMatch = out.match(/TOTAL PSS:\s*(\d+)/)
    if (pssMatch) return parseInt(pssMatch[1]) / 1024
    const totalMatch = out.match(/TOTAL\s+(\d+)/)
    return totalMatch ? parseInt(totalMatch[1]) / 1024 : 0
  }

  async _collectFps() {
    const out = await this._adb(`dumpsys gfxinfo ${this.packageName}`)
    if (!out) return 0
    const match = out.match(/Total frames rendered:\s*(\d+)/)
    if (!match) return 0
    const totalFrames = parseInt(match[1])
    if (this._prevFrameCount === null) {
      this._prevFrameCount = totalFrames
      this._prevFrameTime = Date.now()
      return 0
    }
    const dt = (Date.now() - this._prevFrameTime) / 1000
    const frameDelta = totalFrames - this._prevFrameCount
    this._prevFrameCount = totalFrames
    this._prevFrameTime = Date.now()
    if (dt <= 0 || frameDelta <= 0) return 0
    return Math.min(60, Math.round(frameDelta / dt))
  }

  async _readNetStats() {
    const out = await this._adb(`cat /proc/${this.pid}/net/dev`)
    if (!out) return { rx: 0, tx: 0, time: Date.now() }
    let rx = 0, tx = 0
    const lines = out.split('\n').slice(2)
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 10 && !parts[0].startsWith('lo')) {
        rx += parseInt(parts[1]) || 0
        tx += parseInt(parts[9]) || 0
      }
    }
    return { rx, tx, time: Date.now() }
  }

  async _collectNetwork() {
    const current = await this._readNetStats()
    if (!this.prevNetStats) {
      this.prevNetStats = current
      return 0
    }
    const dt = (current.time - this.prevNetStats.time) / 1000
    if (dt <= 0) return 0
    const rxRate = (current.rx - this.prevNetStats.rx) / 1024 / dt
    const txRate = (current.tx - this.prevNetStats.tx) / 1024 / dt
    this.prevNetStats = current
    return Math.max(0, Math.round(rxRate + txRate))
  }

  async _collectBattery() {
    const out = await this._adb('dumpsys battery')
    const match = out.match(/level:\s*(\d+)/)
    return match ? parseInt(match[1]) : 0
  }

  async _collectTemperature() {
    const out = await this._adb('dumpsys battery')
    const match = out.match(/temperature:\s*(\d+)/)
    return match ? parseInt(match[1]) / 10 : 0
  }

  async _collectGpu() {
    const out = await this._adb(`dumpsys gfxinfo ${this.packageName}`)
    if (!out) return 0
    const match = out.match(/Janky frames:\s*(\d+)\s*\(([^)]+)%\)/)
    return match ? parseFloat(match[2]) : 0
  }
}

module.exports = { AndroidPerfCollector }
