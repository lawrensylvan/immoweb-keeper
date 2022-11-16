// This is a prototype

const needle = require('needle')
needle.defaults({follow: 3 })
require('dotenv').config({ path: 'config.env' })

async function fetchEstateInfo(bidditCode) {
    const estateURL = `https://www.biddit.be/api/dashboard/property/${bidditCode}`
    const html = await needle('get', estateURL)
    return html.body
}

async function fetchBidHistory(bidditCode) {
    const bidsURL = `https://www.biddit.be/api/dashboard/auction/bids?page=0&size=1000&propertyId=${bidditCode}`
    const html = await needle('get', bidsURL)
    return html.body.content
}

async function fetchBidditCodes(zipCode) {
    const searchPageURL = `https://www.biddit.be/api/dashboard/search/property?postalCodes=${zipCode}&page=0&size=1000&nonActive=true&sort=auction.biddingEndDate,asc`
    const html = await needle('get', searchPageURL)
    return html.body.content.map(e => Number(e.id))
}

const MongoClient = require('mongodb')
async function connectDB(uri, database) {
    const client = await MongoClient.connect(`${uri}/${database}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }) // the db included in the url is created if not yet
    const db = client.db()
    return db
}

const _  = require('lodash')
async function processEstate(bidditCode) {
    const estateInfo = await fetchEstateInfo(bidditCode)
    const bidHistory = await fetchBidHistory(bidditCode)

    const existingDoc = await db.collection('biddit').findOne({bidditCode})
    // if the doc already exists, we replace it entirely (no version control), except we don't want to erase bid history when item is sold
    if(existingDoc) {  
        await db.collection('biddit').updateOne({bidditCode}, {
            $set: {
                rawMetadata: estateInfo,
                ...(bidHistory.length && {rawBidHistory: bidHistory}) 
            }
        })
    } else {
        const geolocation = _.get(estateInfo, 'property.pointOnGlobe')
        const newDoc = {
            bidditCode: Number(estateInfo.id),
            fetchDate: new Date(),
            ...(geolocation && {geolocation}),
            rawMetadata: estateInfo,
            ...(bidHistory.length > 0 && {rawBidHistory: bidHistory})   // bid history only available during auction (not before, not after)
        }
        await db.collection('biddit').insertOne(newDoc)
    }

}

let db
(async function () {
    try {
        
        db = await connectDB(process.env.MONGODB_URL, process.env.MONGODB_DATABASE || 'immoweb')

        const zipCodes = [1000, 1020, 1030, 1040, 1050, 1060, 1070, 1080, 1081, 1082, 1083, 1090, 1120, 1130, 1140, 1200, 1210, 1150, 1160, 1170, 1180, 1190]
        for(let zipCode of zipCodes) {
            const bidditCodes = await fetchBidditCodes(zipCode)
            console.log(`Will save ${bidditCodes.length} biddit estates for zip code ${zipCode}`)
            for(let bidditCode of bidditCodes) {
                await processEstate(bidditCode)
                process.stdout.write('.')
            }
            console.log()
        }

    } catch(error) {
        console.error(error)
        process.exit(1)
    }

    process.exit(0)
})()

// Immoweb estates, when they are related to a biddit estate, have these fields set :
//      rawMetadata.displayFlags.secondary[0] = 'biddit_sale'
//      rawMetadata.hasSectionsArray.hasPublicSaleSection = true
//      rawMetadata.externalReference = null
//      rawMetadata.transaction.subtype = PUBLIC_SALE
//      rawMetadata.transaction.sale.publicSale.venue = https://www.biddit.be/catalog/detail/210059
//      rawMetadata.flags.isPublicSale = true
//      rawMetadata.flags.isNotarySale = true
//      rawMetadata.customers[0].type = NOTARY