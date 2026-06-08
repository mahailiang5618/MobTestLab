const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const { execSync, spawn } = require('child_process')
const { getBinPath } = require('./paths.cjs')

const LOG_FILE = path.join(require('os').homedir(), 'mobtestlab-debug.log')
function log(msg) { fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${msg}\n`) }
log('=== App starting ===')

const { FileServer, getLocalIp } = require('./file-server.cjs')
const { ScrcpyClient } = require('./scrcpy-client.cjs')
const { AndroidPerfCollector } = require('./android-perf-collector.cjs')
const { AutomationRunner } = require('./automation-runner.cjs')
const { initDb, getAllReports, insertReport, deleteReport: dbDeleteReport } = require('./db.cjs')
let IosMirrorClient
try { IosMirrorClient = require('./ios-mirror-client.cjs').IosMirrorClient } catch (e) { log('ios-mirror load error: ' + e.message) }

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try { if (require('electron-squirrel-startup')) app.quit() } catch {}

const isDev = !app.isPackaged

let mainWindow
const mirrorProcesses = new Map()
const perfCollectors = new Map()
const automationRunner = new AutomationRunner()

const MOBTESTLAB_DIR = path.join(require('os').homedir(), '.mobtestlab')
const SCRIPTS_DIR = path.join(MOBTESTLAB_DIR, 'scripts')
const AI_CONFIG_PATH = path.join(MOBTESTLAB_DIR, 'ai-config.json')

const HDC_PATH = '/Users/mahailiang01/Library/OpenHarmony/Sdk/14/toolchains/hdc'

function getIosDevices() {
  try {
    const udids = execSync('idevice_id -l', { encoding: 'utf-8', timeout: 5000 }).trim().split('\n').filter(Boolean)
    return udids.map(udid => {
      let name = '', model = '', version = '', battery = 0
      try { name = execSync(`ideviceinfo -u ${udid} -k DeviceName`, { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      try { model = execSync(`ideviceinfo -u ${udid} -k ProductType`, { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      try { version = execSync(`ideviceinfo -u ${udid} -k ProductVersion`, { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      try {
        const batOut = execSync(`ideviceinfo -u ${udid} -q com.apple.mobile.battery`, { encoding: 'utf-8', timeout: 3000 })
        const match = batOut.match(/BatteryCurrentCapacity:\s*(\d+)/)
        if (match) battery = parseInt(match[1])
      } catch {}
      return {
        id: udid,
        name: name || model || udid,
        platform: 'ios',
        status: 'online',
        model: model || name,
        version: version ? `iOS ${version}` : '',
        resolution: '',
        cpuArch: '',
        storage: '',
        battery,
        connectionType: 'usb'
      }
    })
  } catch { return [] }
}

function getHarmonyDevices() {
  try {
    const output = execSync(`"${HDC_PATH}" list targets`, { encoding: 'utf-8', timeout: 5000 }).trim()
    const serials = output.split('\n').filter(s => s.trim() && !s.includes('[Empty]'))
    return serials.map(serial => {
      serial = serial.trim()
      let model = '', version = ''
      try { model = execSync(`"${HDC_PATH}" -t ${serial} shell param get const.product.model`, { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      try { version = execSync(`"${HDC_PATH}" -t ${serial} shell param get const.product.software.version`, { encoding: 'utf-8', timeout: 3000 }).trim() } catch {}
      return {
        id: serial,
        name: model || serial,
        platform: 'harmonyos',
        status: 'online',
        model: model || serial,
        version: version || 'HarmonyOS',
        resolution: '',
        cpuArch: '',
        storage: '',
        battery: 0,
        connectionType: serial.includes(':') ? 'wifi' : 'usb'
      }
    })
  } catch { return [] }
}

function getAdbDevices() {
  try {
    const output = execSync(`"${getBinPath('adb')}" devices -l`, { encoding: 'utf-8', timeout: 5000 })
    const lines = output.trim().split('\n').slice(1)
    return lines
      .filter(line => line.trim() && !line.startsWith('*'))
      .map(line => {
        const parts = line.trim().split(/\s+/)
        const id = parts[0]
        const status = parts[1]
        const props = {}
        parts.slice(2).forEach(p => {
          const [k, v] = p.split(':')
          if (k && v) props[k] = v
        })

        let model = props.model || props.device || id
        let version = ''
        let resolution = ''
        let cpuArch = ''
        let storage = ''
        let battery = 0
        if (status === 'device') {
          try {
            version = execSync(`"${getBinPath('adb')}" -s ${id} shell getprop ro.build.version.release`, { encoding: 'utf-8', timeout: 3000 }).trim()
          } catch {}
          try {
            resolution = execSync(`"${getBinPath('adb')}" -s ${id} shell wm size`, { encoding: 'utf-8', timeout: 3000 }).trim().split(':').pop().trim()
          } catch {}
          try {
            cpuArch = execSync(`"${getBinPath('adb')}" -s ${id} shell getprop ro.product.cpu.abi`, { encoding: 'utf-8', timeout: 3000 }).trim()
          } catch {}
          try {
            const dfOut = execSync(`"${getBinPath('adb')}" -s ${id} shell df /data | tail -1`, { encoding: 'utf-8', timeout: 3000 }).trim()
            const cols = dfOut.split(/\s+/)
            if (cols.length >= 2) storage = (parseInt(cols[1]) / 1048576).toFixed(0) + ' GB'
          } catch {}
          try {
            const batOut = execSync(`"${getBinPath('adb')}" -s ${id} shell dumpsys battery | grep level`, { encoding: 'utf-8', timeout: 3000 }).trim()
            const match = batOut.match(/(\d+)/)
            if (match) battery = parseInt(match[1])
          } catch {}
        }

        return {
          id,
          name: model.replace(/_/g, ' '),
          platform: 'android',
          status: status === 'device' ? 'online' : status === 'unauthorized' ? 'unauthorized' : 'offline',
          model: model.replace(/_/g, ' '),
          version: version ? `Android ${version}` : '',
          resolution,
          cpuArch,
          storage,
          battery,
          connectionType: id.includes(':') ? 'wifi' : 'usb',
          ip: id.includes(':') ? id : undefined
        }
      })
  } catch {
    return []
  }
}

const createWindow = () => {
  const iconPath = path.join(__dirname, isDev ? '../build/icon.icns' : '../build/icon.icns')

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    frame: false,
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    backgroundColor: '#0f172a'
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
  if (isDev) mainWindow.webContents.openDevTools()

  mainWindow.webContents.on('did-fail-load', (event, code, desc, url) => {
    log('did-fail-load: ' + code + ' ' + desc + ' ' + url)
  })

  // 捕获渲染进程错误
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[main] Renderer process gone:', details)
  })
  mainWindow.webContents.on('console-message', (event, level, message) => {
    log('[renderer] ' + message)
  })

  mainWindow.on('close', (e) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.destroy()
    }
  })

  ipcMain.on('close-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy()
    }
  })
}

async function getAllDevices() {
  return [...getAdbDevices(), ...getIosDevices(), ...getHarmonyDevices()]
}

ipcMain.handle('get-devices', () => {
  return getAllDevices()
})

ipcMain.handle('start-mirror', async (_event, deviceId, options = {}) => {
  if (mirrorProcesses.has(deviceId)) {
    return { success: false, error: '该设备已在投屏中' }
  }

  let platform = 'android'
  try {
    const devices = await getAllDevices()
    const device = devices.find(d => d.id === deviceId)
    if (device) platform = device.platform
  } catch {}

  let client
  if (platform === 'ios') {
    client = new IosMirrorClient(deviceId, {
      maxFps: Math.min(options.frameRate || 8, 10)
    })
  } else {
    const maxSizeMap = { '480p': 480, '720p': 720, '1080p': 1080, original: 0 }
    const maxSize = maxSizeMap[options.resolution] || 720
    const bitRateMap = { '480p': 4000000, '720p': 12000000, '1080p': 20000000, original: 32000000 }
    const bitRate = bitRateMap[options.resolution] || 12000000

    client = new ScrcpyClient(deviceId, {
      maxSize: maxSize || 720,
      maxFps: options.frameRate || 30,
      bitRate
    })
  }

  client.on('video-packet', (packet) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mirror-frame', packet)
    }
  })

  client.on('stopped', () => {
    mirrorProcesses.delete(deviceId)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mirror-stopped', deviceId)
    }
  })

  try {
    const result = await client.start()
    mirrorProcesses.set(deviceId, client)
    return result
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('stop-mirror', (_event, deviceId) => {
  const client = mirrorProcesses.get(deviceId)
  if (client) {
    client.stop()
    mirrorProcesses.delete(deviceId)
    return { success: true }
  }
  return { success: false, error: '未找到投屏进程' }
})

ipcMain.on('mirror-touch', (_event, deviceId, action, x, y, width, height) => {
  const client = mirrorProcesses.get(deviceId)
  if (client) client.injectTouch(action, x, y, width, height)
})

ipcMain.on('mirror-scroll', (_event, deviceId, x, y, width, height, scrollX, scrollY) => {
  const client = mirrorProcesses.get(deviceId)
  if (client) client.injectScroll(x, y, width, height, scrollX, scrollY)
})

ipcMain.on('mirror-key', (_event, deviceId, keyCode) => {
  const client = mirrorProcesses.get(deviceId)
  if (client) client.injectKeyCode(keyCode)
})

ipcMain.on('mirror-text', (_event, deviceId, text) => {
  const client = mirrorProcesses.get(deviceId)
  if (client) client.injectText(text)
})

ipcMain.handle('show-save-dialog', (_event, options) => {
  const { dialog } = require('electron')
  return dialog.showSaveDialog(mainWindow, options)
})

ipcMain.handle('show-open-dialog', (_event, options) => {
  const { dialog } = require('electron')
  return dialog.showOpenDialog(mainWindow, options)
})

ipcMain.handle('start-perf', async (_event, deviceId, appPackage) => {
  if (perfCollectors.has(deviceId)) {
    return { success: false, error: '该设备已在采集中' }
  }
  try {
    const collector = new AndroidPerfCollector(deviceId, appPackage)
    collector.on('data', (metric) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('perf-data', { deviceId, metric })
      }
    })
    await collector.start()
    perfCollectors.set(deviceId, collector)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('stop-perf', (_event, deviceId) => {
  const collector = perfCollectors.get(deviceId)
  if (collector) {
    collector.stop()
    perfCollectors.delete(deviceId)
    return { success: true }
  }
  return { success: false, error: '未找到采集进程' }
})

ipcMain.handle('get-installed-apps', async (_event, deviceId) => {
  if (!deviceId) return []
  try {
    const { execFile } = require('child_process')
    const output = await new Promise((resolve, reject) => {
      execFile(getBinPath('adb'), ['-s', deviceId, 'shell', 'pm', 'list', 'packages', '-3'], {
        encoding: 'utf-8', timeout: 8000
      }, (err, stdout) => err ? reject(err) : resolve(stdout))
    })
    return String(output).trim().split('\n')
      .filter(Boolean)
      .map(line => {
        const pkg = line.replace('package:', '').trim()
        return { name: pkg, package: pkg }
      })
  } catch { return [] }
})

ipcMain.handle('save-file', (_event, filePath, data) => {
  const fs = require('fs')
  fs.writeFileSync(filePath, Buffer.from(data))
  return { success: true }
})

ipcMain.handle('save-recording-mp4', async (_event, filePath, data) => {
  const { spawn } = require('child_process')
  const fs = require('fs')
  const os = require('os')
  const path = require('path')

  const tmpPath = path.join(os.tmpdir(), `mobtestlab_recording_${Date.now()}.webm`)
  fs.writeFileSync(tmpPath, Buffer.from(data))

  return new Promise((resolve) => {
    const ffmpeg = spawn(getBinPath('ffmpeg'), [
      '-y', '-i', tmpPath,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      filePath
    ])
    ffmpeg.stderr.on('data', () => {})
    ffmpeg.on('close', (code) => {
      fs.unlink(tmpPath, () => {})
      resolve({ success: code === 0 })
    })
    ffmpeg.on('error', () => {
      fs.unlink(tmpPath, () => {})
      resolve({ success: false })
    })
  })
})

// Automation
ipcMain.handle('run-automation', (_event, params) => {
  log('run-automation called, deviceId: ' + params.deviceId)
  automationRunner.run(params, (msg) => {
    log('automation msg: ' + JSON.stringify(msg))
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('automation-log', msg)
    }
  })
  return { success: true }
})

ipcMain.handle('stop-automation', () => {
  automationRunner.stop()
  return { success: true }
})

ipcMain.handle('get-ai-config', () => {
  try { return JSON.parse(fs.readFileSync(AI_CONFIG_PATH, 'utf-8')) } catch { return null }
})

ipcMain.handle('save-ai-config', (_event, config) => {
  fs.mkdirSync(MOBTESTLAB_DIR, { recursive: true })
  fs.writeFileSync(AI_CONFIG_PATH, JSON.stringify(config, null, 2))
  return { success: true }
})

ipcMain.handle('get-scripts', () => {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true })
  try {
    return fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.js')).map(f => ({
      name: f.replace('.js', ''),
      content: fs.readFileSync(path.join(SCRIPTS_DIR, f), 'utf-8')
    }))
  } catch { return [] }
})

ipcMain.handle('save-automation-script', (_event, name, content) => {
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true })
  fs.writeFileSync(path.join(SCRIPTS_DIR, `${name}.js`), content)
  return { success: true }
})

ipcMain.handle('delete-script', (_event, name) => {
  try { fs.unlinkSync(path.join(SCRIPTS_DIR, `${name}.js`)); return { success: true } } catch { return { success: false } }
})

// Reports DB
ipcMain.handle('get-reports', () => getAllReports())
ipcMain.handle('save-report', (_event, report) => { insertReport(report); return { success: true } })
ipcMain.handle('delete-report', (_event, id) => { dbDeleteReport(id); return { success: true } })

// File server for QR tools
const fileServer = new FileServer()

ipcMain.handle('start-file-server', async (_event, filePath) => {
  fileServer.stop()
  return await fileServer.start(filePath)
})

ipcMain.handle('stop-file-server', () => {
  fileServer.stop()
  return { success: true }
})

ipcMain.handle('get-local-ip', () => {
  return getLocalIp()
})

ipcMain.handle('install-app', async (_event, deviceId, platform, source) => {
  const os = require('os')
  const path = require('path')
  const https = require('https')
  const http = require('http')

  const sendProgress = (status, message, percent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('install-app-progress', { status, message, percent })
    }
  }
  let lastProgressTime = 0
  const sendProgressThrottled = (status, message, percent) => {
    const now = Date.now()
    if (now - lastProgressTime < 200 && percent < 100) return
    lastProgressTime = now
    sendProgress(status, message, percent)
  }

  const doDownload = (url, dest) => {
    return new Promise((resolve, reject) => {
      const follow = (targetUrl, redirects) => {
        if (redirects > 5) { reject(new Error('Too many redirects')); return }
        const mod = targetUrl.startsWith('https') ? https : http
        const req = mod.get(targetUrl, { headers: { 'User-Agent': 'MobTestLab/1.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume()
            follow(res.headers.location, redirects + 1)
            return
          }
          if (res.statusCode >= 400) {
            res.resume()
            reject(new Error(`HTTP ${res.statusCode}`))
            return
          }
          const total = parseInt(res.headers['content-length'] || '0')
          let downloaded = 0
          const file = fs.createWriteStream(dest)
          res.on('data', (chunk) => {
            downloaded += chunk.length
            if (total > 0) sendProgressThrottled('downloading', '正在下载安装包...', Math.round(downloaded / total * 100))
          })
          res.pipe(file)
          file.on('finish', () => { file.close(); resolve() })
          file.on('error', (e) => { fs.unlink(dest, () => {}); reject(e) })
        })
        req.on('error', reject)
      }
      follow(url, 0)
    })
  }

  // 立即返回，后台执行下载和安装
  const run = async () => {
    let filePath = source.path
    if (source.type === 'url') {
      const url = source.url
      const fileName = path.basename(new URL(url).pathname) || `install_${Date.now()}`
      filePath = path.join(os.tmpdir(), fileName)
      sendProgress('downloading', '正在下载安装包...', 0)
      try {
        await doDownload(url, filePath)
      } catch (err) {
        sendProgress('error', '下载失败: ' + err.message, 0)
        return
      }
    }

    sendProgress('installing', '正在安装应用...', 100)
    let cmd, args
    if (platform === 'android') {
      cmd = getBinPath('adb')
      args = ['-s', deviceId, 'install', '-r', filePath]
    } else if (platform === 'ios') {
      cmd = 'ideviceinstaller'
      args = ['-u', deviceId, '-i', filePath]
    } else if (platform === 'harmonyos') {
      cmd = HDC_PATH
      args = ['-t', deviceId, 'install', filePath]
    } else {
      sendProgress('error', '不支持的平台: ' + platform, 0)
      return
    }

    const child = spawn(cmd, args, { timeout: 120000 })
    let output = ''
    child.stdout.on('data', (d) => { output += d.toString() })
    child.stderr.on('data', (d) => { output += d.toString() })
    child.on('close', (code) => {
      if (source.type === 'url' && filePath) fs.unlink(filePath, () => {})
      if (code === 0 && !output.toLowerCase().includes('failure')) {
        sendProgress('success', '安装成功', 100)
      } else {
        sendProgress('error', output.trim().split('\n').pop() || '安装失败', 0)
      }
    })
    child.on('error', (err) => {
      sendProgress('error', '执行失败: ' + err.message, 0)
    })
  }

  run()
  return { success: true }
})

ipcMain.handle('get-mac-info', () => {
  const os = require('os')
  const totalMem = (os.totalmem() / 1073741824).toFixed(0)
  const freeMem = (os.freemem() / 1073741824).toFixed(1)

  let diskTotal = '', diskAvail = ''
  try {
    const dfOut = execSync("df -H / | tail -1", { encoding: 'utf-8', timeout: 3000 }).trim()
    const cols = dfOut.split(/\s+/)
    diskTotal = cols[1] || ''
    diskAvail = cols[3] || ''
  } catch {}

  let battery = '', charging = ''
  try {
    const pmOut = execSync("pmset -g batt", { encoding: 'utf-8', timeout: 3000 })
    const batMatch = pmOut.match(/(\d+)%/)
    if (batMatch) battery = batMatch[1] + '%'
    charging = pmOut.includes('AC Power') ? '充电中' : '未充电'
  } catch {}

  let networkType = '', networkStatus = ''
  try {
    const routeOut = execSync("route get default 2>/dev/null | grep interface", { encoding: 'utf-8', timeout: 3000 }).trim()
    const ifMatch = routeOut.match(/interface:\s*(\w+)/)
    if (ifMatch) {
      const dev = ifMatch[1]
      const ip = execSync(`ipconfig getifaddr ${dev} 2>/dev/null || echo ""`, { encoding: 'utf-8', timeout: 3000 }).trim()
      networkStatus = ip ? '已连接' : '未连接'
      const portOut = execSync(`networksetup -listallhardwareports 2>/dev/null | grep -B1 "Device: ${dev}"`, { encoding: 'utf-8', timeout: 3000 }).trim()
      const portMatch = portOut.match(/Hardware Port:\s*(.+)/)
      networkType = portMatch ? portMatch[1] : dev
    }
  } catch { networkType = '未知'; networkStatus = '未知' }

  let resolution = ''
  try {
    const dispOut = execSync("system_profiler SPDisplaysDataType 2>/dev/null | grep Resolution", { encoding: 'utf-8', timeout: 5000 })
    const resMatch = dispOut.match(/(\d+\s*x\s*\d+)/)
    if (resMatch) resolution = resMatch[1].replace(/\s/g, '')
  } catch {}

  const cpus = os.cpus()
  const cpuModel = cpus.length ? cpus[0].model.replace(/\s+/g, ' ').trim() : ''

  return [
    { label: '操作系统', icon: 'mdi:apple', value: 'macOS', sub: os.release() },
    { label: '处理器', icon: 'mdi:chip', value: cpuModel.split(' ').slice(0, 3).join(' '), sub: cpus.length + ' 核心' },
    { label: '内存', icon: 'mdi:memory', value: totalMem + ' GB', sub: '可用 ' + freeMem + ' GB' },
    { label: '磁盘', icon: 'mdi:harddisk', value: diskTotal, sub: '可用 ' + diskAvail },
    { label: '电池', icon: 'mdi:battery-charging', value: battery || '无电池', sub: charging },
    { label: '网络', icon: 'mdi:wifi', value: networkType, sub: networkStatus },
    { label: '屏幕', icon: 'mdi:monitor', value: resolution || '未知', sub: os.hostname() }
  ]
})

app.whenReady().then(async () => {
  log('app ready, isDev: ' + isDev + ', isPackaged: ' + app.isPackaged)
  await initDb()

  const menuTemplate = [
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: '关于 MobTestLab', role: 'about' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

  createWindow()
  log('window created')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  for (const client of mirrorProcesses.values()) {
    client.stop()
  }
  for (const collector of perfCollectors.values()) {
    collector.stop()
  }
  app.quit()
})
