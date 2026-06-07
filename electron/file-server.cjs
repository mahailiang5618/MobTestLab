const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')

function getLocalIp() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return '127.0.0.1'
}

class FileServer {
  constructor() {
    this.server = null
  }

  start(filePath) {
    return new Promise((resolve, reject) => {
      const fileName = path.basename(filePath)
      const fileSize = fs.statSync(filePath).size
      const sizeStr = fileSize < 1024 * 1024 ? (fileSize / 1024).toFixed(1) + ' KB' : (fileSize / 1024 / 1024).toFixed(1) + ' MB'

      this.server = http.createServer((req, res) => {
        const encodedName = encodeURIComponent(fileName)
        if (req.url === '/download/' + encodedName || req.url === '/download/' + fileName) {
          const stat = fs.statSync(filePath)
          res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodedName}"`,
            'Content-Length': stat.size
          })
          fs.createReadStream(filePath).pipe(res)
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>文件下载</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#f5f5f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:360px;width:100%}
.icon{font-size:48px;margin-bottom:16px}.name{font-size:16px;font-weight:600;word-break:break-all;margin-bottom:8px}.size{color:#888;font-size:14px;margin-bottom:24px}
.btn{display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:16px;font-weight:500}
.btn:active{background:#1e3a8a}.done{color:#16a34a;font-size:14px;margin-top:16px;display:none}</style></head>
<body><div class="card"><div class="icon">📄</div><div class="name">${fileName}</div><div class="size">${sizeStr}</div>
<a class="btn" href="/download/${encodedName}" id="dl">下载文件</a><div class="done" id="done">✓ 下载已开始，请查看通知栏</div></div>
<script>document.getElementById('dl').onclick=function(){setTimeout(function(){document.getElementById('done').style.display='block'},500)}</script></body></html>`)
        }
      })
      this.server.listen(0, () => {
        const port = this.server.address().port
        const ip = getLocalIp()
        resolve({ port, url: `http://${ip}:${port}/`, ip })
      })
      this.server.on('error', reject)
    })
  }

  stop() {
    if (this.server) {
      this.server.close()
      this.server = null
    }
  }
}

module.exports = { FileServer, getLocalIp }
