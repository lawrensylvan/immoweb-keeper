const fs = require('fs')
const path = require('path')
const {spawn} = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const configPath = path.join(projectRoot, 'deploy', 'config.prod.env')

function parseEnvFile(filePath) {
    const values = {}
    const contents = fs.readFileSync(filePath, 'utf8')
    for(const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim()
        if(!line || line.startsWith('#')) continue
        const separator = line.indexOf('=')
        if(separator === -1) continue
        const key = line.slice(0, separator).trim()
        let value = line.slice(separator + 1).trim()
        if((value.startsWith('"') && value.endsWith('"')) ||
           (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
        }
        values[key] = value
    }
    return values
}

if(!fs.existsSync(configPath)) {
    console.error('Missing deploy/config.prod.env.')
    process.exit(1)
}

const config = parseEnvFile(configPath)
if(!config.PROD_LOGS_PATH) {
    console.error('PROD_LOGS_PATH is missing from deploy/config.prod.env.')
    process.exit(1)
}

const routineLogDirectory = path.join(config.PROD_LOGS_PATH, 'routine')
if(!fs.existsSync(routineLogDirectory)) {
    console.error(`Routine log directory does not exist: ${routineLogDirectory}`)
    process.exit(1)
}

const logs = fs.readdirSync(routineLogDirectory, {withFileTypes: true})
    .filter(entry => entry.isFile() && entry.name.endsWith('.log'))
    .map(entry => {
        const filePath = path.join(routineLogDirectory, entry.name)
        return {filePath, modifiedAt: fs.statSync(filePath).mtimeMs}
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt)

if(!logs.length) {
    console.error(`No routine log files found in ${routineLogDirectory}.`)
    process.exit(1)
}

const lines = process.env.ROUTINE_LOG_TAIL_LINES || '100'
if(!/^\d+$/.test(lines) || Number(lines) < 1) {
    console.error('ROUTINE_LOG_TAIL_LINES must be a positive integer.')
    process.exit(1)
}

const latestLog = logs[0].filePath
console.log(`Following ${latestLog}`)
console.log('Press Ctrl+C to stop.\n')

const tail = spawn('tail', ['-n', lines, '-F', latestLog], {stdio: 'inherit'})

tail.on('error', error => {
    console.error(`Unable to start tail: ${error.message}`)
    process.exit(1)
})

tail.on('close', code => {
    process.exitCode = code == null ? 1 : code
})

for(const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => tail.kill(signal))
}
