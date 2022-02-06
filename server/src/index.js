
/* Server entry point */

(async function() {

    const port = process.env.PORT || 5000
    
    // Connect to MongoDB using config

    require('dotenv').config({ path: 'config.env' })
    const mongoDbURL = process.env.MONGODB_URL
    const mongoDbDatabase = process.env.MONGODB_DATABASE || 'immoweb'

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

    const path = require('path')
    
    const isProduction = process.env.NODE__ENV === 'production'
    
    // Serve React code (if in production)

    if(isProduction) {
        const root = path.resolve(__dirname, '../..', 'client', 'build')
        app.use(express.static(root))
        app.get('*', (req, res) => {
            res.sendFile(path.join(root, 'index.html'))
        })
    }

    // Serve static photos (if in development)
    
    if(process.env.SHOULD_SERVE_IMAGES === 'true') {
        const path = require('path')
        const dir = path.join(__dirname, process.env.IMAGE_SOURCE_PATH || '')
        app.use(express.static(dir))
        console.log(`✓ Serving static images at /{immowebCode}/{imageName} on port ${port}`)
    }

    // Init Apollo server with GraphQL schema and resolvers
    
    const { loadSchema } = require('@graphql-tools/load')
    const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader')
    const typeDefs = await loadSchema('src/graphql/schema.graphql', { loaders: [new GraphQLFileLoader()] })
    const resolvers = require('./resolvers')
    
    const { ApolloServer } = require('apollo-server-express')
    const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core')
    
    const jwt = require('jsonwebtoken')
    const SECRET = process.env.JWT_SECRET
    if(!SECRET) {
        throw new Error('Missing secret in env variables : please add a config.env in /server folder with JWT_SECRET=<random string>')
    }
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
    console.log(`🚀 GraphQL server ready at ${server.graphqlPath} on port ${port}`)

})()