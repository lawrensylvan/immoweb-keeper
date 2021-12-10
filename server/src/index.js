
/* Server entry point */

(async function() {

    const port = process.env.PORT || 5000
    
    // Connect to MongoDB using config

    require('dotenv').config({ path: 'config.env' })
    const mongoDbURL = process.env.MONGODB_URL
    const mongoDbDatabase = process.env.MONGODB_DATABASE

    const mongoose = require('mongoose')
    mongoose.connect(mongoDbURL + '/' + mongoDbDatabase)
            .then(() => console.log('✓ Connected to MongoDB'))
            .catch(err => console.error('ⓧ Unable to connect to mongodb : ' + err))

    // Init express server
    
    const express = require('express')
    const app = express()
    const cors = require('cors')
    app.use(cors())
    app.use(express.json())

    const http = require('http')
    const httpServer = http.createServer(app)

    // Serve React server if in production

    const path = require('path')
    if(process.env.NODE__ENV === 'production') {
        app.use(express.static('client/build'))
        app.get('*', (req, res) => {
            res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
        })
    }

    // Serve static photos

    /*const path = require('path')
    const dir = path.join(__dirname, '../routine/images') // TODO : remove absolute path
    app.use(express.static(dir))
    console.log(`✓ Serving static images at http://localhost:${port}/{immowebCode}/{imageName}`)*/

    // Init Apollo server with GraphQL schema and resolvers
    
    const { loadSchema } = require('@graphql-tools/load')
    const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader')
    const typeDefs = await loadSchema('src/graphql/schema.graphql', { loaders: [new GraphQLFileLoader()] })
    const resolvers = require('./resolvers/estate')
    
    const { ApolloServer } = require('apollo-server-express')
    const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
    
    const jwt = require('jsonwebtoken')
    const SECRET = process.env.JWT_SECRET // TODO : should be env specific and not pushed to Git
    const addUserMiddleware = async req => {
        const token = req.headers.authentication
        if(token && token != 'null' && token != 'undefined') {
            try {
                const {user} = await jwt.verify(token, SECRET)
                req.user = user
            } catch(err) {
                console.log(err)
            }
        }
        req.next()
    }
    app.use(addUserMiddleware)

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        plugins: [ApolloServerPluginDrainHttpServer({httpServer})],
        context: ({req}) => ({
            SECRET,
            user: req.user,
            query: req.body.query
        })
    })

    // Start Apollo server with Express as middleware
    
    await server.start()
    server.applyMiddleware({
        app,
        path: '/graphql/'
    })
    await new Promise(resolve => httpServer.listen({port}, resolve))
    console.log(`🚀 GraphQL server ready at http://localhost:${port}${server.graphqlPath}`)

})()