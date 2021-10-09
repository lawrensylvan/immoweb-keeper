const { GraphQLID, GraphQLString, GraphQLList, GraphQLSchema, GraphQLNonNull, GraphQLObjectType, GraphQLInt } = require('graphql')
const { EstateModel } = require('./model')

/* GraphQL types */

const EstateType = new GraphQLObjectType({
    name: 'Estate',
    fields: {
        id: 			{type: GraphQLID },
        immowebCode: 	{type: GraphQLString },
		price: 			{type: GraphQLInt},
		zipCode:		{type: GraphQLInt},
		locality:		{type: GraphQLString}
    }
})

const estateMongooseToGraphQLMapper = estates => {
	console.dir(estates[0])
	return estates.map(estate => ({
		id: 			estate.id,
		immowebCode: 	estate.immowebCode,
		price: 			(!estate.rawMetadata || !estate.rawMetadata.price) ? 100 : estate.rawMetadata.price.mainValue,
		zipCode:		estate.rawMetadata.property.location.postalCode,
		locality:		estate.rawMetadata.property.location.locality
	}))
}

/* GraphQL queries and mutators */

const schema = new GraphQLSchema({
	query: new GraphQLObjectType({
		name: 'Query',
		fields: {
			// Get all estates
			estates: {
				type: GraphQLList(EstateType),
				resolve: (root, args, context, info) => {
					return EstateModel.find().transform(estateMongooseToGraphQLMapper).exec()
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
      		// Get estates by immoweb code
			estatesByImmowebCode: {
				type: GraphQLList(EstateType),
				args: { 
					immowebCode: { type: GraphQLInt } 
				},
				resolve: (root, args, context, info) => {
					return EstateModel.find({'immowebCode':args.immowebCode}).exec()
				}
			},
			// Get estates by zip code
			estatesByZipCode: {
				type: GraphQLList(EstateType),
				args: { 
					zipCode: { type: GraphQLInt } 
				},
				resolve: (root, args, context, info) => {
					return EstateModel.find({'zipCode':args.zipCode}).exec()
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

module.exports = { schema }