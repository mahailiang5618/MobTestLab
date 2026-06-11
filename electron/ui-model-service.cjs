const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync, spawnSync } = require('child_process')
const { getBinPath } = require('./paths.cjs')

const ASSETS_DIR = path.join(os.homedir(), '.mobtestlab', 'ui-model-assets')

function safeName(value) {
  return String(value || 'node').replace(/[^\w.-]+/g, '_').slice(0, 80)
}

function parseBounds(bounds) {
  const match = String(bounds || '').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
  if (!match) return null
  const left = Number(match[1])
  const top = Number(match[2])
  const right = Number(match[3])
  const bottom = Number(match[4])
  if (right <= left || bottom <= top) return null
  return { x: left, y: top, width: right - left, height: bottom - top }
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function parseAttributes(raw) {
  const attrs = {}
  const attrPattern = /([\w:-]+)="([^"]*)"/g
  let match
  while ((match = attrPattern.exec(raw))) attrs[match[1]] = decodeXml(match[2])
  return attrs
}

function parseUiAutomatorXml(xml) {
  const nodes = []
  const nodePattern = /<node\b([^>]*)>/g
  let match
  let index = 0
  while ((match = nodePattern.exec(xml))) {
    const attrs = parseAttributes(match[1])
    const bounds = parseBounds(attrs.bounds)
    if (!bounds) continue
    const text = attrs.text || ''
    const desc = attrs['content-desc'] || ''
    const resourceId = attrs['resource-id'] || ''
    const className = attrs.class || ''
    const label = text || desc || resourceId.split('/').pop() || className.split('.').pop() || `node_${index + 1}`
    const clickable = attrs.clickable === 'true'
    const enabled = attrs.enabled !== 'false'
    if (!enabled || (!label && !clickable)) continue
    const id = `node-${index + 1}`
    const poco = resourceId || desc || text || id
    nodes.push({
      id,
      label,
      poco,
      template: '',
      className,
      text,
      contentDesc: desc,
      resourceId,
      clickable,
      ...bounds
    })
    index += 1
  }
  return nodes
}

function getScreenSize(deviceId) {
  try {
    const output = execFileSync(getBinPath('adb'), ['-s', deviceId, 'shell', 'wm', 'size'], { encoding: 'utf-8', timeout: 5000 })
    const match = output.match(/(\d+)x(\d+)/)
    if (match) return { width: Number(match[1]), height: Number(match[2]) }
  } catch {}
  return { width: 1080, height: 2400 }
}

function cropTemplate(screenshotPath, node, outputPath) {
  const x = Math.max(0, Math.round(node.x))
  const y = Math.max(0, Math.round(node.y))
  const width = Math.max(1, Math.round(node.width))
  const height = Math.max(1, Math.round(node.height))
  try {
    const result = spawnSync(getBinPath('ffmpeg'), [
      '-y',
      '-i', screenshotPath,
      '-vf', `crop=${width}:${height}:${x}:${y}`,
      outputPath
    ], { encoding: 'utf-8', timeout: 8000 })
    return result.status === 0 && fs.existsSync(outputPath)
  } catch {
    return false
  }
}

function captureUiModel(deviceId) {
  if (!deviceId) return { success: false, error: '未选择设备' }
  const sessionDir = path.join(ASSETS_DIR, `${Date.now()}_${safeName(deviceId)}`)
  fs.mkdirSync(sessionDir, { recursive: true })

  let screenshot
  try {
    screenshot = execFileSync(getBinPath('adb'), ['-s', deviceId, 'exec-out', 'screencap', '-p'], {
      encoding: 'buffer',
      timeout: 10000,
      maxBuffer: 30 * 1024 * 1024
    })
  } catch (err) {
    return { success: false, error: `设备截图失败: ${err.message}` }
  }

  const screenshotPath = path.join(sessionDir, 'screen.png')
  fs.writeFileSync(screenshotPath, screenshot)

  let xml = ''
  try {
    execFileSync(getBinPath('adb'), ['-s', deviceId, 'shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml'], { encoding: 'utf-8', timeout: 10000 })
    xml = execFileSync(getBinPath('adb'), ['-s', deviceId, 'exec-out', 'cat', '/sdcard/window_dump.xml'], { encoding: 'utf-8', timeout: 10000, maxBuffer: 10 * 1024 * 1024 })
  } catch (err) {
    xml = ''
  }

  const screen = getScreenSize(deviceId)
  const nodes = parseUiAutomatorXml(xml)
    .filter(node => node.width >= 8 && node.height >= 8)
    .filter(node => node.x < screen.width && node.y < screen.height)
    .filter(node => !(node.width >= screen.width * 0.95 && node.height >= screen.height * 0.95 && !node.clickable))
    .sort((a, b) => {
      const aScore = (a.clickable ? 0 : 10) + (a.text || a.contentDesc ? 0 : 2)
      const bScore = (b.clickable ? 0 : 10) + (b.text || b.contentDesc ? 0 : 2)
      return aScore - bScore
    })
    .slice(0, 80)
    .map((node, index) => {
      const templatePath = path.join(sessionDir, `${String(index + 1).padStart(2, '0')}_${safeName(node.label)}.png`)
      const cropped = cropTemplate(screenshotPath, node, templatePath)
      const finalTemplatePath = cropped ? templatePath : screenshotPath
      return {
        ...node,
        template: finalTemplatePath,
        templateDataUrl: cropped ? `data:image/png;base64,${fs.readFileSync(finalTemplatePath).toString('base64')}` : ''
      }
    })

  return {
    success: true,
    screenshotPath,
    screenshotDataUrl: `data:image/png;base64,${screenshot.toString('base64')}`,
    screen,
    nodes
  }
}

module.exports = {
  captureUiModel,
  parseBounds,
  parseUiAutomatorXml
}
