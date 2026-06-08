const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Device management
  getDevices: () => ipcRenderer.invoke('get-devices'),
  connectDevice: (deviceId) => ipcRenderer.invoke('connect-device', deviceId),
  disconnectDevice: (deviceId) => ipcRenderer.invoke('disconnect-device', deviceId),

  // Screen mirroring
  startMirror: (deviceId, options) => ipcRenderer.invoke('start-mirror', deviceId, options),
  stopMirror: (deviceId) => ipcRenderer.invoke('stop-mirror', deviceId),

  // Performance collection
  startPerfCollection: (deviceId, appPackage) => ipcRenderer.invoke('start-perf', deviceId, appPackage),
  stopPerfCollection: (deviceId) => ipcRenderer.invoke('stop-perf', deviceId),
  getInstalledApps: (deviceId) => ipcRenderer.invoke('get-installed-apps', deviceId),

  // Automation
  runAutomation: (params) => ipcRenderer.invoke('run-automation', params),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  onAutomationLog: (callback) => ipcRenderer.on('automation-log', callback),
  offAutomationLog: () => ipcRenderer.removeAllListeners('automation-log'),
  getAiConfig: () => ipcRenderer.invoke('get-ai-config'),
  saveAiConfig: (config) => ipcRenderer.invoke('save-ai-config', config),
  getScripts: () => ipcRenderer.invoke('get-scripts'),
  saveAutomationScript: (name, content) => ipcRenderer.invoke('save-automation-script', name, content),
  deleteScript: (name) => ipcRenderer.invoke('delete-script', name),

  // Input forwarding
  sendTouch: (deviceId, action, x, y, width, height) =>
    ipcRenderer.send('mirror-touch', deviceId, action, x, y, width, height),
  sendScroll: (deviceId, x, y, width, height, scrollX, scrollY) =>
    ipcRenderer.send('mirror-scroll', deviceId, x, y, width, height, scrollX, scrollY),
  sendKey: (deviceId, keyCode) =>
    ipcRenderer.send('mirror-key', deviceId, keyCode),
  sendText: (deviceId, text) =>
    ipcRenderer.send('mirror-text', deviceId, text),

  // Events
  onDeviceConnected: (callback) => ipcRenderer.on('device-connected', callback),
  onDeviceDisconnected: (callback) => ipcRenderer.on('device-disconnected', callback),
  onPerfData: (callback) => ipcRenderer.on('perf-data', callback),
  offPerfData: () => ipcRenderer.removeAllListeners('perf-data'),
  onMirrorFrame: (callback) => ipcRenderer.on('mirror-frame', callback),
  onMirrorStopped: (callback) => ipcRenderer.on('mirror-stopped', callback),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // File dialog
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  saveFile: (filePath, data) => ipcRenderer.invoke('save-file', filePath, data),
  saveRecordingAsMp4: (filePath, data) => ipcRenderer.invoke('save-recording-mp4', filePath, data),

  // File server (QR tools)
  startFileServer: (filePath) => ipcRenderer.invoke('start-file-server', filePath),
  stopFileServer: () => ipcRenderer.invoke('stop-file-server'),
  getLocalIp: () => ipcRenderer.invoke('get-local-ip'),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  getMacInfo: () => ipcRenderer.invoke('get-mac-info'),

  // Reports DB
  getReports: () => ipcRenderer.invoke('get-reports'),
  saveReport: (report) => ipcRenderer.invoke('save-report', report),
  deleteReportFromDb: (id) => ipcRenderer.invoke('delete-report', id),

  // App installation
  installApp: (deviceId, platform, source) => ipcRenderer.invoke('install-app', deviceId, platform, source),
  onInstallProgress: (callback) => ipcRenderer.on('install-app-progress', callback),
  offInstallProgress: () => ipcRenderer.removeAllListeners('install-app-progress')
})
