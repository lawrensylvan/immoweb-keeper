
/* Server entry point */

(async function() {

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
            .then(() => console.log('✓ Connected to mongodb'))
            .catch(err => console.error('ⓧ Unable to connect to mongodb : ' + err))

    // Activate GraphQL endpoints
    const { loadSchema } = require('@graphql-tools/load')
    const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader')
    const { makeExecutableSchema } = require('@graphql-tools/schema')
    const typeDefs = await loadSchema('src/graphql/schema.graphql', { loaders: [new GraphQLFileLoader()] })
    const resolvers = require('./resolvers/estate')
    const schema = makeExecutableSchema({typeDefs, resolvers})
    const expressGraphQl = require('express-graphql')
    app.use('/graphql',	expressGraphQl.graphqlHTTP({schema, graphiql: true}))

    // Serve static photos
    const path = require('path')
    console.log(__dirname)
    const dir = path.join(__dirname, '../routine/images') // TODO : remove absolute path
    app.use(express.static(dir))

    // Run server
    const port = process.env.PORT || 5000
    app.listen(port, () => {
        console.log('✓ Server is running at ' + port)
    })
})()