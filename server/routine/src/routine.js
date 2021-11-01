const _  = require('lodash')
const fs = require('fs')
const Path = require('path')
const https = require('follow-redirects').https
const moment = require('moment')
const { JSDOM } = require('jsdom')
const needle = require('needle')
const MongoClient = require('mongodb')
const ObjectId  = MongoClient.ObjectID;
const config = require('../config.json')
require('dotenv').config({ path: 'config.env' })

needle.defaults({follow: 3 })

const RESULTS_PER_PAGE = 30

let imageRepository
let db
const today = moment().format('YYYY-MM-DD')
const yesterday = moment().add(-1, 'day')

mainRoutine()

async function initDBAndImageRepository() {

    // Create the image repository if it doesnt exist yet
    if(!config.imageRepository) {
        console.info('No image repository specified : will use current directory')
        imageRepository = './images'
    } else imageRepository = config.imageRepository
    if(!fs.existsSync(imageRepository)) {
        console.info('Creating image repository')
        await fs.promises.mkdir(imageRepository, {recursive: true})
    }

    // Initialize db connection
    try {
        db = await connectDB(process.env.MONGODB_URL, process.env.MONGODB_DATABASE)
    } catch(error) {
        console.error('Unable to connect to your mongodb database : ' + error)
        process.exit(1)
    }

}

// Downloads all Immoweb estates that comply to the search criterias specified in the config
async function mainRoutine() {
    
    await initDBAndImageRepository()

    // Parse JSON criterias to search urls and add them to other defined search urls
    const {searchURLs, searchQueries} = config
    if((!searchURLs || searchURLs.length === 0) && (!searchQueries || searchQueries.length === 0)) {
        console.error('No search URL or query specified !')
        process.exit(1)
    }
    const queriesURLs = (searchURLs || []).concat(searchQueries ? searchQueries.map(q => buildURLFromQuery(q)) : [])

    for(let queryURL of queriesURLs) {
        await processQuery(queryURL)
    }

    process.exit(0)
}

async function processQuery(queryURL) {
    console.info()
    console.info(`****************************************************************`)
    console.info(`Search query : ${queryURL}`)

    // Load first page of results to get page count and normalized url
    const {normalizedQuery, normalizedQueryURL, totalResultCount} = await parseResultsPage(queryURL)
    
    // Get last time at which this search's results were saved
    let dbQuery = await db.collection('queries').findOne({criteria: normalizedQuery})
    if(!dbQuery) {
        const id = await db.collection('queries').insertOne({
            url: normalizedQueryURL,
            criteria: normalizedQuery,
            lastRun: null,
            allRunDates: null
        })
        dbQuery = await db.collection('queries').findOne({ _id : ObjectId(id) })
    }

    const lastRunDate = moment(dbQuery.lastRun)
    const nextLastRunDate = new Date()
    console.info(lastRunDate ? `Last run for this query was on ${lastRunDate}` : `This is the first run for this query`)

    const pageCount = Math.ceil(totalResultCount / RESULTS_PER_PAGE)
    const pageNumbers = _.range(1, pageCount + 1)

    // Process each page of results
    console.info(`Will process up to ${totalResultCount} results (${pageCount} pages)`)
    let newEstateCount = 0
    let updatedEstateCount = 0
    let shouldOnlyCollectImmowebCodes = false
    let seenImmowebCodes = []
    for(let page of pageNumbers) {
        const result = await processPage(normalizedQueryURL, page, shouldOnlyCollectImmowebCodes, lastRunDate, dbQuery._id)
        seenImmowebCodes.push(...result.immowebCodes)
        newEstateCount += result.newEstateCount
        updatedEstateCount += result.updatedEstateCount
        if(!result.shouldContinue) shouldOnlyCollectImmowebCodes = true
    }
    
    // Update the query last run date + all run dates list (or persist the new query)
    if(dbQuery) {
        await db.collection('queries').updateOne({url: dbQuery.url},
            { $set: {
                lastRun: nextLastRunDate,
                allRunDates: computeNewAllRunDates(dbQuery.allRunDates)
            }
        })
    }

    // Check for estates in the db that were not seen in Immoweb anymore to put a disappearanceDate
    
    const allImmowebCodes = (await db.collection('estates')
                                     .find({
                                         queryId: dbQuery._id,
                                         disappearanceDate: null
                                     }).toArray())
                            .map(e => e.immowebCode)
    
    const notSeenImmowebCodes = _.difference(allImmowebCodes, seenImmowebCodes)

    await db.collection('estates').updateMany({ immowebCode: { $in: seenImmowebCodes} }, { $set: { lastSeen: today } })
    await db.collection('estates').updateMany({ immowebCode: { $in: notSeenImmowebCodes} }, { $set: { disappearanceDate: today } })

    console.info(`${newEstateCount} new estates saved, ${updatedEstateCount} estates updated, ${notSeenImmowebCodes.length} estates disappeared`)
}

function computeNewAllRunDates(allRunDates) {
    // [] or null
    if(!allRunDates) {
        return [today]
    }

    const lastItem = allRunDates[allRunDates.length - 1]
    
    // [..., [a day, yesterday]]
    if(_.isArray(lastItem) && lastItem[1] === yesterday) {
        return [...allRunDates.slice(0, allRunDates.length - 1), [lastItem[0], today]]
    }

    // [..., yesterday]
    if(allRunDates[allRunDates.length - 1] === yesterday) {
        return [...allRunDates.slice(0, allRunDates.length - 1), [yesterday, today]]
    }

    // [..., [a day, today]]
    if(_.isArray(lastItem) && lastItem[1] === today) {
        return allRunDates
    }

    // [..., today]
    if(allRunDates[allRunDates.length - 1] === today) {
        return allRunDates
    }

    // [..., a day] or [..., [a day, other day]]
    return [...allRunDates, today]
}

// Load all estate data of that result page and returns the new and updated estate count + whether we should stop browsing more pages or not
async function processPage(url, pageNumber, shouldOnlyCollectImmowebCodes, lastRunDate, queryId) {
    
    // Sort results from newest to oldest to be able to stop as soon as we encounter an estate with no updates
    const queryURL = `${url}&orderBy=newest&page=${pageNumber}`    
    const {results} = await parseResultsPage(queryURL)
    if(!results.length) {
        console.warn(`Page ${pageNumber} is not there anymore : will stop here`)
        return {newEstateCount: 0, updatedEstateCount: 0, shouldContinue: true}
    }
    
    const immowebCodes = results.map(r => r.id)
    if(shouldOnlyCollectImmowebCodes) {
        return {newEstateCount: 0, updatedEstateCount: 0, shouldContinue: false, immowebCodes}
    }

    console.info(`Page ${pageNumber} : will process these immoweb codes : ${immowebCodes}`)
    
    let newEstateCount = 0
    let updatedEstateCount = 0
    let shouldContinue = true
    for(let immowebCode of immowebCodes) {
        try {
            const {wasPersisted, isUpdate, reachedEnd} = await processEstate(immowebCode, lastRunDate, queryId)
            if(reachedEnd) {
                shouldContinue = false
                break
            }
            if(!wasPersisted) {
                continue
            }
            isUpdate ? newEstateCount++ : updatedEstateCount++
        } catch(error) {
            console.error(`Error while processing immoweb code ${immowebCode} !`)
        }
    }
    
    process.stdout.write('\n\r')
    return {newEstateCount, updatedEstateCount, shouldContinue, immowebCodes}
}

// Load estate data from immoweb (returns if the estate was persisted in db, if it was an update instead of an insert, and if we reached the end of results)
async function processEstate(immowebCode, lastRunDate, queryId) {
    const estateData = await parseEstatePage(immowebCode) // estateData.publication.lastModificationDate => string "2020-05-30T16:35:25.607+0000"
    const fetchDate = new Date()
    // test if the estate last modif date is earlier than the last time this script has runned 
    // since we are browsing results by lastModifDate desc, it would mean we reached the end of new/updated estates
    const lastModif = parseImmowebDate(estateData.publication.lastModificationDate, 'YYYY-MM-DDThh:mm:ss.SSS') // lastModif = moment : 2020-05-30T16:56:08.770+0000 (with date : Sat May 30 2020 16:56:08 GMT+0200)
    if(lastRunDate && lastModif.isBefore(lastRunDate)) {
        console.info(' (reached end of results)')
        return {wasPersisted: false, reachedEnd: true}
    }
    // at this point, the estate is either still unknown by the db or has been updated since then
    
    // double check with modification date of what we have in db (in case of just-added estate)
    const dbEstate = await db.collection('estates').find({immowebCode}).limit(1).toArray()
    if(dbEstate.length > 0 && moment(dbEstate[0].lastModificationDate).isSame(lastModif) ) {
        console.debug(`Skipping estate ${immowebCode} (same modification date as in database)`)
        return {wasPersisted: false, reachedEnd: false}
    }
    // save the images to the repo (only the new ones, doesn't check for differences inside image file)
    const imageURLs = estateData.media.pictures.map(p => p.largeUrl || p.mediumUrl || p.smallUrl)
    const imageNames = []
    for(let imageURL of imageURLs) {
        const fileName = Path.basename(imageURL.replace(/\?[^/]*$/, ''))
        const outputPath = `${imageRepository}/${immowebCode}/${fileName}`
        if(!fs.existsSync(outputPath)) {
            await downloadFile(imageURL, outputPath)
        }
        imageNames.push(fileName)
    }
    
    // save the estate JSON as a new document in the db (we might have multiple docs with same immoweb code)
    const [long, lat] = [_.get(estateData, 'property.location.longitude'), _.get(estateData, 'property.location.latitude')]
    await db.collection('estates').insertOne({
        immowebCode,
        queryId,
        fetchDate,
        lastModificationDate: lastModif.toDate(),
        creationDate: parseImmowebDate(_.get(estateData, 'publication.creationDate')).toDate(),
        expirationDate: parseImmowebDate(_.get(estateData, 'publication.expirationDate')).toDate(),
        ...(long && lat && {geolocation: [long, lat]}),
        images: imageNames,
        rawMetadata: estateData
    })

    process.stdout.write('.')

    return {wasPersisted: true, isUpdate: dbEstate.length > 0, reachedEnd: false}
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
            const html = await needle('get', searchPageURL)
            const dom = new JSDOM(html.body)
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
    const html = await needle('get', estateURL)
    const dom = new JSDOM(html.body)
    const scripts = [...dom.window.document.querySelectorAll('script')]
    const script = scripts.filter(s => s.textContent.includes('window.classified = {"'))[0]
    return JSON.parse(script.textContent.replace(/window\.classified = ({.*});/gm, '$1'))
}

/**
 *  MongoDB access (estates)
 */

async function connectDB(uri, database) {
    const client = await MongoClient.connect(`${uri}/${database}`, {
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
 