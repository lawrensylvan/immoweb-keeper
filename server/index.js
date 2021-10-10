// Initialize express server
const express = require('express')
const app = express()
const cors = require('cors')
app.use(cors())
app.use(express.json())

// Load mongodb config
require('dotenv').config({ path: 'config.env' })
const mongoDbURL = process.env.MONGODB_URL
const mongoDbDatabase = process.env.MONGODB_DATABASE

// Connect to mongodb database
const mongoose = require('mongoose')
mongoose.connect(mongoDbURL + '/' + mongoDbDatabase)
        .then(() => console.log('✓ Connected to mongodb database'))
        .catch(err => console.error('ⓧ Got error : ' + err))

// Activate GraphQL endpoints
const {schema} = require('./graphql')
const expressGraphQl = require('express-graphql')
app.use('/graphql',	expressGraphQl.graphqlHTTP({schema,  graphiql: true}))

// Serve static photos
const path = require('path')
const dir = path.join(__dirname, 'routine/images') // TODO : remove absolute path
app.use(express.static(dir))

// Run server
const port = process.env.PORT || 5000
app.listen(port, () => {
	console.log('✓ Server is running at ' + port)
})

/* Investigation about name mappings across mongodb/mongoose/graphql :

- mongodb
    - database :        immoweb
    - collection :      estates
    - fields :          _id, immowebCode, fetchDate, lastModificationDate, creationDate, expirationDate, geolocation, images, rawMetadata

- mongoose (EstateModel)
    - model name :      estate        (should ref mongodb database, but why does it work without the 's' ?)
    - fields :          immowebCode

- graphql server (EstateType)
    - type name :       Estate
    - query set name :  Query
    - query name :      estates

- graphql client
    - query name :    estates
    - query collect : estates
    - query fields :  id, immowebCode

*/