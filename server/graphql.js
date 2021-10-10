const { GraphQLID, GraphQLString, GraphQLList, GraphQLSchema, GraphQLNonNull, GraphQLObjectType, GraphQLInt } = require('graphql')
const { GraphQLDateTime } = require('graphql-iso-date')
const { EstateModel } = require('./mongoose')

/* GraphQL types */

const estateFields = {
	id: 			{type: GraphQLID },
	immowebCode: 	{type: GraphQLString },
	price: 			{type: GraphQLInt},
	zipCode:		{type: GraphQLInt},
	locality:		{type: GraphQLString},
	images:			{type: GraphQLList(GraphQLString)},
	creationDate:	{type: GraphQLDateTime}
}

const EstateType = new GraphQLObjectType({name: 'Estate', fields: estateFields})

function estateMongooseToGraphQLMapper(estates) {
	return estates.map(estate => ({
		id: 				estate.id,
		immowebCode: 		estate.immowebCode,
		price: 				estate.rawMetadata.price.mainValue,
		zipCode:			estate.rawMetadata.property.location.postalCode,
		locality:			estate.rawMetadata.property.location.locality,
		images:				estate.images,
		creationDate:		estate.creationDate
	}))
}

const estateGraphQLArgsToMongooseMapping = {
	id:				v => ({key: 'id'										, value: v								}),
	immowebCode:	v => ({key: 'immowebCode'								, value: v								}),
	priceRange: 	v => ({key: 'rawMetadata.price.mainValue'				, value: {$gte: v[0], $lte: v[1]}		}),
	zipCode: 		v => ({key:	'rawMetadata.property.location.postalCode'	, value: v								})
}

function estateGraphQLToMongooseMapper(args) {
	let result = {}
	for(let propName in estateGraphQLArgsToMongooseMapping) {
		if(args[propName] !== undefined) {
			const {key, value} = estateGraphQLArgsToMongooseMapping[propName](args[propName])
			result[key] = value
		}
	}
	return result
}

/* GraphQL queries and mutators */

const schema = new GraphQLSchema({
	query: new GraphQLObjectType({
		name: 'Query',
		fields: {
			// Get all estates
			estates: {
				type: GraphQLList(EstateType),
				args: {
					immowebCode: { type: GraphQLInt },
					priceRange: { type:GraphQLList(GraphQLInt) },
					zipCode: {type: GraphQLInt}
				},
				resolve: (root, args, context, info) => {
					return EstateModel
						 	.find(estateGraphQLToMongooseMapper(args))
							.transform(estateMongooseToGraphQLMapper).exec()
				}
			},
			// Get a single estate
			estateByID: {
				type: EstateType,
				args: {
					id: { type: GraphQLNonNull(GraphQLID) }
				},
				resolve: (root, args, context, info) => {
					return EstateModel
							.findById(args.id)
							.transform(estateMongooseToGraphQLMapper).exec()
				}
			},
      		// Get estates by immoweb code
			estatesByImmowebCode: {
				type: GraphQLList(EstateType),
				args: { 
					immowebCode: { type: GraphQLInt } 
				},
				resolve: (root, args, context, info) => {
					return EstateModel
							.find(args)
							.transform(estateMongooseToGraphQLMapper).exec()
				}
			},
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