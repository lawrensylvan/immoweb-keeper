const { GraphQLID, GraphQLString, GraphQLList, GraphQLSchema, GraphQLNonNull, GraphQLObjectType, GraphQLInt, GraphQLBoolean } = require('graphql')
const { GraphQLDateTime } = require('graphql-iso-date')
const { EstateModel } = require('./mongoose')

/* What does the data returned to the client look like ?  */

const estateFields = {
	id: 				{type: GraphQLID },
	immowebCode: 		{type: GraphQLString },
	price: 				{type: GraphQLInt},
	zipCode:			{type: GraphQLInt},
	locality:			{type: GraphQLString},
	images:				{type: GraphQLList(GraphQLString)},
	creationDate:		{type: GraphQLDateTime},
	modificationDate:	{type: GraphQLDateTime},
	hasGarden:			{type: GraphQLBoolean},
	gardenArea:			{type: GraphQLInt},
	agencyName:			{type: GraphQLString},
	agencyLogo:			{type: GraphQLString}
}

const EstateType = new GraphQLObjectType({name: 'Estate', fields: estateFields})

/* How to fill each fields to be returned to the client from the MongoDB structure ? */

function estateMongooseToGraphQLMapper(estates) {
	return estates.map(estate => ({
		id: 				estate.id,
		immowebCode: 		estate.immowebCode,
		price: 				estate.rawMetadata.price.mainValue,
		zipCode:			estate.rawMetadata.property.location.postalCode,
		locality:			estate.rawMetadata.property.location.locality,
		images:				estate.images,
		creationDate:		estate.creationDate,
		modificationDate:	estate.lastModificationDate,
		hasGarden:			estate.rawMetadata.property.hasGarden,
		gardenArea:			estate.rawMetadata.property.gardenSurface,
		agencyName:			estate.rawMetadata.customers[0].name,
		agencyLogo:			estate.rawMetadata.customers[0].logoUrl
	}))
}

/* What arguments are accepted from the client and how they are compared against the MongoDB data ? */

const estateGraphQLArgsToMongooseMapping = {
	id:				v => ({key: 'id'										, value: v							}),
	immowebCode:	v => ({key: 'immowebCode'								, value: v							}),
	priceRange: 	v => ({key: 'rawMetadata.price.mainValue'				, value: {$gte: v[0], $lte: v[1]}	}),
	zipCodes: 		v => ({key:	'rawMetadata.property.location.postalCode'	, value: {$in: v}					}),
	onlyWithGarden:	v => ({key:	'rawMetadata.property.hasGarden'			, value: v || null					}),
	minGardenArea:	v => ({key:	'rawMetadata.property.gardenSurface'		, value: {$gte: v}				 	}), // TODO : include gardens without area
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
					immowebCode: 	{type: GraphQLInt },
					priceRange: 	{type: GraphQLList(GraphQLInt)},
					zipCodes: 		{type: GraphQLList(GraphQLInt)},
					onlyWithGarden: {type: GraphQLBoolean},
					minGardenArea:	{type: GraphQLInt}
				},
				resolve: (root, args) => {
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
				resolve: (root, args) => {
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
				resolve: (root, args) => {
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
				resolve: (root, args) => {
					let estate = new EstateModel(args)
					return estate.save()
				}
			}
		}
	})
})

module.exports = { schema }
