// DRAFT

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

let db
(async function () {
    try {
        
        db = await connectDB('mongodb+srv://heroku:aristote@cluster0.zqf3d.gcp.mongodb.net', process.env.MONGODB_DATABASE || 'immoweb')

        const estates = await new Promise(function(resolve, reject) {
            db.collection('estates').find().limit(10).toArray(function(err, docs) {
                if (err) return reject(err)
                return resolve(docs)
            })
        })

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