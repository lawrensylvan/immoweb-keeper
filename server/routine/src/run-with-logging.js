const fs = require('fs')
const Path = require('path')
const {spawn} = require('child_process')

const DEFAULT_RETENTION_DAYS = 90
const logDirectory = Path.resolve(process.env.ROUTINE_LOG_DIR || Path.resolve(__dirname, '../logs'))
const retentionDays = parseRetentionDays(process.env.ROUTINE_LOG_RETENTION_DAYS)
const runId = process.env.ROUTINE_RUN_ID || 'manual'
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const logPath = Path.join(logDirectory, `${timestamp}-${runId}.log`)

function parseRetentionDays(value) {
    if(value == null || value.trim() === '') return DEFAULT_RETENTION_DAYS
    const parsed = Number(value)
    if(!Number.isInteger(parsed) || parsed < 1) {
        throw new Error('ROUTINE_LOG_RETENTION_DAYS must be a positive integer.')
    }
    return parsed
}

function removeExpiredLogs() {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000
    for(const entry of fs.readdirSync(logDirectory, {withFileTypes: true})) {
        if(!entry.isFile() || !entry.name.endsWith('.log')) continue
        const filePath = Path.join(logDirectory, entry.name)
        if(fs.statSync(filePath).mtimeMs < cutoff) fs.unlinkSync(filePath)
    }
}

fs.mkdirSync(logDirectory, {recursive: true})
removeExpiredLogs()

const log = fs.createWriteStream(logPath, {flags: 'a'})
const routinePath = Path.resolve(__dirname, 'routine.js')
const child = spawn(process.execPath, [routinePath], {
    cwd: Path.resolve(__dirname, '../..'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
})

const startedAt = new Date().toISOString()
log.write(`Routine ${runId} started at ${startedAt}\n`)
console.info(`Routine log: ${logPath}`)

let finished = false
function finish(exitCode, message) {
    if(finished) return
    finished = true
    log.end(message, () => process.exit(exitCode))
}

child.stdout.on('data', data => {
    process.stdout.write(data)
    log.write(data)
})

child.stderr.on('data', data => {
    process.stderr.write(data)
    log.write(data)
})

child.on('error', error => {
    const message = `Unable to start routine: ${error.stack || error.message}\n`
    process.stderr.write(message)
    finish(1, message)
})

child.on('close', (code, signal) => {
    const finishedAt = new Date().toISOString()
    const result = signal ? `signal ${signal}` : `exit code ${code}`
    finish(code == null ? 1 : code, `\nRoutine ${runId} finished at ${finishedAt} with ${result}\n`)
})

for(const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal))
}
