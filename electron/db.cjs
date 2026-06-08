const path = require('path')
const os = require('os')
const fs = require('fs')

const DB_DIR = path.join(os.homedir(), '.mobtestlab')
const DB_PATH = path.join(DB_DIR, 'reports.db')

let db

async function initDb() {
  fs.mkdirSync(DB_DIR, { recursive: true })
  const initSqlJs = require('sql.js')
  const SQL = await initSqlJs()
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    device TEXT,
    app TEXT,
    status TEXT,
    duration TEXT,
    createdAt TEXT,
    metrics TEXT,
    htmlContent TEXT
  )`)
  saveToFile()
}

function saveToFile() {
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

function getAllReports() {
  const stmt = db.prepare('SELECT * FROM reports ORDER BY createdAt DESC')
  const rows = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    row.metrics = row.metrics ? JSON.parse(row.metrics) : undefined
    rows.push(row)
  }
  stmt.free()
  return rows
}

function insertReport(report) {
  db.run(
    `INSERT OR REPLACE INTO reports (id, name, type, device, app, status, duration, createdAt, metrics, htmlContent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [report.id, report.name, report.type, report.device, report.app, report.status, report.duration, report.createdAt, report.metrics ? JSON.stringify(report.metrics) : null, report.htmlContent || null]
  )
  saveToFile()
}

function deleteReport(id) {
  db.run('DELETE FROM reports WHERE id = ?', [id])
  saveToFile()
}

module.exports = { initDb, getAllReports, insertReport, deleteReport }
