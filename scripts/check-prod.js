const fs = require('fs')
const path = require('path')
const {spawnSync} = require('child_process')

const projectRoot = path.resolve(__dirname, '..')
const configPath = path.join(projectRoot, 'deploy', 'config.prod.env')
const searchesPath = path.join(projectRoot, 'deploy', 'searches.prod.json')
const errors = []

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

let config = {}
if(!fs.existsSync(configPath)) {
    errors.push('Missing deploy/config.prod.env (copy it from config.prod.env.example).')
} else {
    config = parseEnvFile(configPath)
    if(!config.JWT_SECRET || config.JWT_SECRET.includes('replace-with')) {
        errors.push('JWT_SECRET is missing or still contains the example placeholder.')
    }
}

const imagesPath = config.PROD_IMAGES_PATH

if(!imagesPath) {
    errors.push('PROD_IMAGES_PATH is missing from deploy/config.prod.env.')
} else if(!path.isAbsolute(imagesPath)) {
    errors.push('PROD_IMAGES_PATH must be an absolute path.')
} else if(!fs.existsSync(imagesPath)) {
    errors.push(`Production image directory does not exist: ${imagesPath}`)
} else {
    try {
        if(!fs.statSync(imagesPath).isDirectory()) {
            errors.push(`Production image path is not a directory: ${imagesPath}`)
        } else {
            fs.accessSync(imagesPath, fs.constants.R_OK | fs.constants.W_OK)
        }
    } catch(error) {
        errors.push(`Production image directory is not readable and writable: ${error.message}`)
    }
}

if(!fs.existsSync(searchesPath)) {
    errors.push('Missing deploy/searches.prod.json (copy it from searches.prod.example.json).')
} else {
    try {
        const searches = JSON.parse(fs.readFileSync(searchesPath, 'utf8'))
        const searchURLs = Array.isArray(searches.searchURLs) ? searches.searchURLs : []
        const searchQueries = Array.isArray(searches.searchQueries) ? searches.searchQueries : []
        if(searchURLs.length === 0 && searchQueries.length === 0) {
            errors.push('deploy/searches.prod.json does not contain any searches.')
        }
    } catch(error) {
        errors.push(`deploy/searches.prod.json is invalid JSON: ${error.message}`)
    }
}

const dockerInfo = spawnSync('docker', ['info'], {stdio: 'ignore'})
if(dockerInfo.status !== 0) {
    errors.push('Docker Desktop is not running or is not accessible.')
}

if(errors.length > 0) {
    console.error('Production preflight failed:')
    for(const error of errors) console.error(`- ${error}`)
    process.exit(1)
}

console.log('Production preflight passed.')
console.log(`Images: ${imagesPath}`)
console.log('Application exposure: loopback only')
