const _  = require('lodash')
const fs = require('fs')
const Path = require('path')
const https = require('https')
const moment = require('moment')
const { JSDOM } = require('jsdom')
const MongoClient = require('mongodb').MongoClient

const CONFIG_FILE = './config.json'

mainRoutine()

/**
 * Main routine : expect the config file to be present
 */
async function mainRoutine() {
    
    // Read config file
    let {imageRepository, mongoDBUrl, searchURLs, searchQueries} = await readConfig()
    if((!searchURLs || searchURLs.length === 0) && (!searchQueries || searchQueries.length === 0)) {
        console.error('No search URL or query specified !')
        process.exit(1)
    }
    if(!mongoDBUrl) {
        console.error('No MongoDB url specified !')
        process.exit(1)
    }
    if(!imageRepository) {
        console.info('No image repository specified : will use current directory')
        imageRepository = './images'
    }

    // Initialize db connection and image repository

    if(!fs.existsSync(imageRepository)) {
        console.info(`Creating image repository`)
        await fs.promises.mkdir(imageRepository, {recursive: true})
    }

    const db = await connectDB(mongoDBUrl)
    
    // Convert JSON queries to searchURLs and mixing everything
    const queriesURLs = (searchURLs ? searchURLs : [])
        .concat(searchQueries ? searchQueries.map(q=>buildURLFromQuery(q)) : [])
    
    //const queries = searchURLs.map(u => Url.parse(u,true).query).concat(searchQueries)
    for(let queryURL of queriesURLs) {
        console.info()
        console.info(`****************************************************************`)
        console.info(`Search query : ${queryURL}`)

        // Load first page of results to get page count and normalized url
        //const queryURL = buildURLFromQuery({...query, orderBy: 'newest', page: 1})
        const {normalizedQuery, normalizedQueryURL, totalResultCount} = await parseResultsPage(queryURL)
        
        // Get last time at which this search's results were saved
        //const normalizedQueryURL = buildURLFromQuery(normalizedQuery)
        const dbQuery = await db.collection('queries').findOne({url: normalizedQueryURL})
        const lastRun = dbQuery ? moment(dbQuery.lastRun) : null
        const nextLastRun = new Date()
        console.info(lastRun ? `Last run for this query was on ${lastRun}` : `This is the first run for this query`)

        const pageCount = Math.ceil(totalResultCount / 30)
        const pageNumbers = _.range(1, pageCount+1)//.reverse()

        let newEstateCount = 0
        let updatedEstateCount = 0
        let downloadedImageCount = 0
        
        console.info(`Will process up to ${totalResultCount} results (${pageCount} pages)`)
        for(let page of pageNumbers) {
            //const queryAtPage = {...normalizedQuery, orderBy: 'newest', page}
            //const queryURL = buildURLFromQuery(queryAtPage)
            const queryURL = `${normalizedQueryURL}&orderBy=newest&page=${page}`
            const {results} = await parseResultsPage(queryURL)
            if(results.length === 0) {
                console.warn(`Page ${page} is not there anymore : will stop here`)
                break // if reverse() is uncommented, should be continue
            }
            const immowebCodes = results.map(r => r.id)
            console.info(`Page ${page} : will process these immoweb codes : ${immowebCodes}`)
            let noNewEstate = false
            for(let immowebCode of immowebCodes) {
                try {
                    // estateData.publication.lastModificationDate = string "2020-05-30T16:35:25.607+0000"
                    const estateData = await parseEstatePage(immowebCode)
                    const fetchDate = new Date()
                    // test if the estate last modif date is earlier than the last time this script has runned 
                    // since we are browsing results by lastModifDate desc, it would mean we reached the end of new/updated estates
                    const lastModif = parseImmowebDate(estateData.publication.lastModificationDate, 'YYYY-MM-DDThh:mm:ss.SSS')
                    // lastModif = moment : 2020-05-30T16:56:08.770+0000 (with date : Sat May 30 2020 16:56:08 GMT+0200)
                    if(lastRun && lastModif.isBefore(lastRun)) {
                        console.info(' (reached end of results)')
                        noNewEstate = true
                        break
                    }
                    // at this point, the estate is either still unknown by the db or has been updated since then
                    
                    // double check with modification date of what we have in db (in case of just-added estate)
                    const dbEstate = await db.collection('estates').find({immowebCode}).limit(1).toArray()
                    if(dbEstate.length > 0 && moment(dbEstate[0].lastModificationDate).isSame(lastModif) ) {
                        console.debug(`Skipping estate ${immowebCode} (same modification date as in database)`)
                        continue
                    }
                    // save the images to the repo (only the new ones, doesn't check for difference inside image file)
                    const imageURLs = estateData.media.pictures.map(p => p.largeUrl || p.mediumUrl || p.smallUrl)
                    const imageNames = []
                    for(let imageURL of imageURLs) {
                        const fileName = Path.basename(imageURL.replace(/\?[^/]*$/, ''))
                        const outputPath = `${imageRepository}/${immowebCode}/${fileName}`
                        if(!fs.existsSync(outputPath)) {
                            await downloadFile(imageURL, outputPath)
                            downloadedImageCount++
                        }
                        imageNames.push(fileName)
                    }
                    /* Option 1 : wrap the raw data in an object along with computed normalized properties */
                    // save the estate JSON as a new document in the db (we might have multiple docs with same immoweb code)
                    const [long, lat] = [_.get(estateData, 'property.location.longitude'), _.get(estateData, 'property.location.latitude')]
                    await db.collection('estates').insertOne({
                        immowebCode,
                        fetchDate,
                        lastModificationDate: lastModif.toDate(),
                        creationDate: parseImmowebDate(_.get(estateData, 'publication.creationDate')).toDate(),
                        expirationDate: parseImmowebDate(_.get(estateData, 'publication.expirationDate')).toDate(),
                        ...(long && lat && {geolocation: [long, lat]}),
                        images: imageNames,
                        rawMetadata: estateData
                    })
                    if(dbEstate.length > 0) updatedEstateCount++
                    else newEstateCount++

                    process.stdout.write('.')
                } catch(error) {
                    console.error(`Error while processing immoweb code ${immowebCode} !`)
                }
            }
            if(noNewEstate) break
            process.stdout.write('\n\r')
        }
        
        // Save this query's last run date to db
        if(dbQuery) {
            await db.collection('queries').updateOne({url: dbQuery.url},
                { $set: {
                    'lastRun': new Date()
                }
            })
        } else {
            await db.collection('queries').insertOne({
                url: normalizedQueryURL,
                lastRun: nextLastRun,
                criteria: normalizedQuery,
            })
        }

        console.info(`${newEstateCount} new estates saved, ${updatedEstateCount} estates updated ans ${downloadedImageCount} images downloaded`)
        
    }
    process.exit(0)
}

function buildURLFromQuery(searchQuery) {
    const criterias = Object.keys(searchQuery).map(c => c + '=' + searchQuery[c])
    return encodeURI(`https://www.immoweb.be/en/search/?${criterias.join('&')}`)
}

function parseImmowebDate(string) {
    return moment(string, 'YYYY-MM-DDThh:mm:ss.SSS')
}

async function parseResultsPage(searchPageURL) {
    for(let retries = 0; retries < 3; ++retries) {
        try {
            const html = await fetchHTMLFromURL(searchPageURL)
            const dom = new JSDOM(html)
            const iwsearch = dom.window.document.querySelector('iw-search')
            return {
                normalizedQuery:    JSON.parse(iwsearch.getAttribute(':criteria')),
                normalizedQueryURL: dom.window.document.querySelector('meta[property="og:url"]').getAttribute('content'),
                totalResultCount:   JSON.parse(iwsearch.getAttribute(':result-count')),
                results:            JSON.parse(iwsearch.getAttribute(':results'))
            }
        } catch(err) {
            console.error(`Retrying after error when fetching results page : ${err}`)
        }
    }
}

async function parseEstatePage(immowebCode) {
    const estateURL = `https://www.immoweb.be/en/classified/${immowebCode}`
    const html = await fetchHTMLFromURL(estateURL)
    const dom = new JSDOM(html)
    const scripts = [...dom.window.document.querySelectorAll('script')]
    const script = scripts.filter(s => s.textContent.includes('window.classified = {"'))[0]
    return JSON.parse(script.textContent.replace(/window\.classified = ({.*});/gm, '$1'))
}

/**
 *  Config file access (./config.json)
 */

async function readConfig() {
    const config = await fs.promises.readFile(CONFIG_FILE)
    return JSON.parse(config)
}

/**
 *  MongoDB access (estates)
 */

async function connectDB(url) {
    const client = await MongoClient.connect(`${url}/immoweb`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }) // the db included in the url is created if not yet
    const db = client.db()
    return db
}
/**
 * GET file download and html download utilities 
 */

async function downloadFile(url, outputPath) {
    const dir = Path.dirname(outputPath)
    if(!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, {recursive: true})
    }
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
            } else if(res.statusCode === 302) { // redirection
                const newurl = res.headers.location
                fetchHTMLFromURL(newurl).then(value => resolve(value))
            } else if(res.statusCode === 404) {
                reject('Error 404')
            } else {
                reject(`Unexpected status code : ${res.statusCode}`)
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
 