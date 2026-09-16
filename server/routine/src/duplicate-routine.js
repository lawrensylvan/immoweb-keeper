// DRAFT

const {MongoClient} = require('mongodb')
async function connectDB(uri, database) {
    const client = await MongoClient.connect(`${uri}/${database}`) // the db included in the url is created if not yet
    const db = client.db()
    return db
}

const _  = require('lodash')

let db
(async function () {
    try {
        
        db = await connectDB(process.env.MONGODB_URL, process.env.MONGODB_DATABASE || 'immoweb')

        const estates = await db.collection('estates').find().limit(10).toArray()

        const object = estates[0]
        console.dir(object)
        //const keys = Object.keys(object)
        getNestedKeys(object, 0)

    } catch(error) {
        console.error(error)
        process.exit(1)
    }

    process.exit(0)
})()

function getNestedKeys(object, level) {
    if(typeof object === 'object') {
        for(let [key, value] of Object.entries(object)) {
            console.log(level + ': ' + key)
            getNestedKeys(value, level+1)
        }
    }
}

// Immoweb estates, when they are related to a biddit estate, have these fields set :
//      rawMetadata.displayFlags.secondary[0] = 'biddit_sale'
//      rawMetadata.hasSectionsArray.hasPublicSaleSection = true
//      rawMetadata.externalReference = null
//      rawMetadata.transaction.subtype = PUBLIC_SALE
//      rawMetadata.transaction.sale.publicSale.venue = https://www.biddit.be/catalog/detail/210059
//      rawMetadata.flags.isPublicSale = true
//      rawMetadata.flags.isNotarySale = true
//      rawMetadata.customers[0].type = NOTARY
