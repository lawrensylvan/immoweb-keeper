const https = require('https')
const { JSDOM } = require('jsdom')
const moment = require('moment')
const fs = require('fs')
const Path = require('path')
const MongoClient = require('mongodb').MongoClient

const CONFIG_FILE = './config.json'
const LAST_RUN_DATE_FILE = './lastRunDate.txt'

routine()

/**
 * Main routine : expects the config file to be present
 */
async function routine() {
    const lastRun = await fetchLastRunDate()
    const imageRepositoryPath = await fetchImageRepositoryPath()
    const mongodbUrl = await fetchMongoDBUrl()
    const db = await connectDB(mongodbUrl)
    
    // read immoweb search queries from config.json
    const searchQueries = (await fetchSearchQueries()).map(q => ({...q, orderBy: 'newest'}))
    
    for(let searchQuery of searchQueries) {
        console.info('Processing next query...')
        let page = 1
        let noNewEstate = false
        while(!noNewEstate) {
            const searchQueryAtPage = {...searchQuery, orderBy: 'newest', page: page}
            const url = buildURLFromSearchQuery(searchQueryAtPage)
            const searchResultsData = await parseImmowebSearchResultsPage(url)
            if(searchResultsData.length === 0) {
                console.info('Reached end of all results for that query !')
                break
            }
            const immowebCodes = searchResultsData.map(r => r.id)
            console.info(`Downloading estates of page ${page} : ${immowebCodes}...`)
            for(let immowebCode of immowebCodes) {
                const estateData = await parseImmowebEstatePage(immowebCode)
                // test if the estate last modif date is earlier than the last time this script has runned 
                // since we are browsing results by lastModifDate desc, it would mean we reached the end of new/updated estates
                const lastModif = moment(estateData.publication.lastModificationDate, 'YYYY-MM-DDThh:mm:ss.SSS')
                if(lastRun && lastModif.isBefore(lastRun)) {
                    console.info('Reached end of new/updated results for that query !')
                    noNewEstate = true
                    break
                }
                // the estate is either still unknown by the db or has been updated since then
                // save the images to the repo (only the new ones, doesn't check for difference inside image file)
                const imageURLs = estateData.media.pictures.map(p => p.largeUrl || p.mediumUrl || p.smallUrl)
                for(let i in imageURLs) {
                    const imageURL = imageURLs[i]
                    const fileName = Path.basename(imageURL.replace(/\?[^\/]*$/, ''))
                    const outputPath = `${imageRepositoryPath}/${immowebCode}/${fileName}`
                    await downloadFile(imageURL, outputPath)
                    estateData.media.pictures[i] = fileName
                }
                // save the estate JSON to as a new document in the db (we might have multiple docs with same immoweb code)
                await saveEstateData(estateData, db)
                process.stdout.write('.')
            }
            process.stdout.write('\n\r')
            page++
        }
    }
    console.log('End.')
    process.exit(0)
}

function buildURLFromSearchQuery(searchQuery) {
    const criterias = Object.keys(searchQuery).map(c => c + '=' + searchQuery[c])
    return encodeURI(`https://www.immoweb.be/en/search/?${criterias.join('&')}`)
}

async function parseImmowebSearchResultsPage(searchPageURL) {
    const html = await fetchHTMLFromURL(searchPageURL)
    const dom = new JSDOM(html)
    const json = dom.window.document.querySelector('iw-search').getAttribute(':results')
    const results = JSON.parse(json)
    return results
}

async function parseImmowebEstatePage(immowebCode) {
    const estateURL = `https://www.immoweb.be/en/classified/${immowebCode}`
    const html = await fetchHTMLFromURL(estateURL)
    const dom = new JSDOM(html)
    const scripts = [...dom.window.document.querySelectorAll('script')]
    const script = scripts.filter(s => s.textContent.includes('window.classified = {"'))[0]
    return JSON.parse(script.textContent.replace(/window\.classified = ({.*});/gm, '$1'))
}

/**
 *  Last run date access (./lastRunDate.txt)
 */

async function fetchLastRunDate() {
    if(!fs.existsSync(LAST_RUN_DATE_FILE)) return null
    const date = await fs.promises.readFile(LAST_RUN_DATE_FILE)
    return moment(date, 'YYYY-MM-DD HH:mm:ss')
}

async function updateLastRunDate() {
    const date = moment().format('YYYY-MM-DDThh:mm:ss.SSSZ')
    await fs.promises.writeFile(LAST_RUN_DATE_FILE, date)
}

/**
 *  Config file access (./config.json)
 */

async function fetchMongoDBUrl() {
    const config = await fs.promises.readFile(CONFIG_FILE)
    return JSON.parse(config).mongoDBUrl
}

async function fetchSearchQueries() {
    const config = await fs.promises.readFile(CONFIG_FILE)
    return JSON.parse(config).searchQueries
}

async function fetchImageRepositoryPath() {
    const config = await fs.promises.readFile(CONFIG_FILE)
    const path = JSON.parse(config).imagesRepository
    if(!fs.existsSync(path)) {
        await fs.promises.mkdir(path, {recursive: true})
    }
    return path
}

/**
 *  MongoDB access (estates)
 */

async function connectDB(url) {
    const client = await MongoClient.connect(`${url}/immoweb`, {useNewUrlParser:true}) // the db included in the url is created if not yet
    const db = client.db()
    return db
}

async function saveEstateData(estateData, db) {
    const collection = db.collection('estates')
    return await collection.insertOne(estateData)
}

/**
 * GET file download and html download utilities 
 */

async function downloadFile(url, outputPath) {
    const dir = Path.dirname(outputPath)
    if(!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, {recursive: true})
    }
    if(fs.existsSync(outputPath)) return
    const file = fs.createWriteStream(outputPath)
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            res.pipe(file)
            file.on('finish', () => {
                file.close()
                resolve()
            })
        }).on('error', err => {
            fs.unlink(outputPath)
            reject(err.message)
        })
    })
}

async function fetchHTMLFromURL(url) {
    if(url.startsWith('https://')) url = url.substring(8)
    const [host, ...path] = url.split('/')

    return new Promise((resolve,reject) => {
        https.get({
            host: host,
            port: 443,
            path: '/' + path.join('/'),
            method: 'GET'
        }, res => {
            if(res.statusCode === 200) {
                let html = ''
                res.on('data', data => {
                    html += data
                })
                res.on('end', () => {
                    resolve(html)
                })
            } else if(res.statusCode === 302) {
                const newurl = res.headers.location
                fetchHTMLFromURL(newurl).then(value => resolve(value))
            }
        }).on('error', e => {
            reject(e.message)
        })
    })

}


/**
 * TODO :
 * 
 * Bugs :
 * 
 * - Sometimes is stuck on an estate (for instance https://www.immoweb.be/en/classified/house/for-sale/-/1030/8546839?searchId=5ed01de890b98)
 *  -> find cause for this specific estate
 *  -> add a Promise.race to implement a timeout with 3 retries in case of being stuck ?
 * 
 * - Some exotic estate types don't work with just the url https://www.immoweb.be/en/classified/4772757
 *   -> we need the full url for them so maybe start off from the <a> elements of the search page instead of JSON
 * 
 * Features :
 * 
 * - Allow for full search URLs in config.json in addition to broken down search queries 
 * - Test the strategy of image in database directly (and give user the choice in config.json)
 * - Encode the date in a native MongoDB format for better analysis ?
 */
 