const path = require('path')
const { app } = require('electron')

function getBinPath(name) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', name)
  }
  const devPaths = {
    adb: 'adb',
    ffmpeg: '/opt/homebrew/bin/ffmpeg',
    'scrcpy-server': '/opt/homebrew/share/scrcpy/scrcpy-server'
  }
  return devPaths[name] || name
}

module.exports = { getBinPath }
