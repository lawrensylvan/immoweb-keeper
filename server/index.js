/*

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

// Initialize express server

const express = require('express')
const app = express()

const cors = require('cors')
app.use(cors())
app.use(express.json())

// Connect to MongoDB database

require('dotenv').config({ path: 'config.env' })
const mongoDbURL = process.env.MONGODB_URL
const mongoDbDatabase = process.env.MONGODB_DATABASE

const mongoose = require('mongoose')
mongoose.connect(mongoDbURL + '/' + mongoDbDatabase)
        .then(() => console.log('Connected to database'))
        .catch(err => console.error(err))

// Modelize schema as MongoDB and GraphQL

const EstateModel = mongoose.model('estate', {
  immowebCode: String
})

const { GraphQLID, GraphQLString, GraphQLList, GraphQLType, GraphQLSchema, GraphQLNonNull, GraphQLObjectType, GraphQLInt } = require('graphql')
const EstateType = new GraphQLObjectType({
  name: 'Estate',
  fields: {
    id: {type : GraphQLID },
    immowebCode: {type: GraphQLString }
  }
})

// Define GraphQL queries and mutators

const schema = new GraphQLSchema({
	query: new GraphQLObjectType({
		name: 'Query',
		fields: {
			// Get all estates
			estates: {
				type: GraphQLList(EstateType),
				resolve: (root, args, context, info) => {
					return EstateModel.find().exec()
				}
			},
			// Get a single estate
			estateByID: {
				type: EstateType,
				args: {
					id: { type: GraphQLNonNull(GraphQLID) }
				},
				resolve: (root, args, context, info) => {
					return EstateModel.findById(args.id).exec()
				}
			},
      // Get estates by zip code
			estatesByImmowebCode: {
				type: GraphQLList(EstateType),
				args: { 
					immowebCode: { type: GraphQLInt } 
				},
				resolve: (root, args, context, info) => {
					return EstateModel.find({'immowebCode':args.immowebCode}).exec();
				}
			},
			// Get estates by zip code
			estatesByZipCode: {
				type: GraphQLList(EstateType),
				args: { 
					zipCode: { type: GraphQLInt } 
				},
				resolve: (root, args, context, info) => {
					return EstateModel.find({'zipCode':args.zipCode}).exec();
				}
			}
		}
	}),

	mutation: new GraphQLObjectType({
		name: "Create",
		fields: {
			estate: {
				type: EstateType,
				args: {
					immowebCode: { type: GraphQLInt }
				},
				resolve: (root, args, context, info) => {
					let estate = new EstateModel(args)
					return estate.save()
				}
			}
		}
	})
})

// Activate GraphQL endpoints

const expressGraphQl = require('express-graphql')
app.use('/graphql',	expressGraphQl.graphqlHTTP({schema, graphiql: true}))

const port = process.env.PORT || 5000
app.listen(port, () => {
	console.log('server running at ' + port)
})
