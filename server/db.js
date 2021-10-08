const MongoClient = require('mongodb').MongoClient
const mongoDbURL = process.env.MONGODB_URL
const mongoDbDatabase = process.env.MONGODB_DATABASE

let db = null

module.exports = {getDB: async function getDB() {
  
  if(!mongoDbURL) throw 'No MongoDB url specified in process.env file !'
  if(!mongoDbDatabase) throw 'No MongoDB database name specified in process.env file !'

  if(!db) {
    const client = await MongoClient.connect(`${mongoDbURL}/${mongoDbDatabase}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    db = client.db()
  }
  return db
}}
