const { EstateModel } = require('../models/estates')

/* GraphQL queries and mutations */

const queries = {

	// Get all estates
	estates: (_, args) => {
		return EstateModel
			.find(estateToMongoMapper(args))
			.transform(estateFromMongoMapper).exec()
	}

	/* Get a single estate
	estateByID: (_, {id}) => {
		return EstateModel
			.findById(id)
			.transform(estateFromMongoMapper).exec()
	},

	// Get estates by immoweb code
	estatesByImmowebCode: (root, {immowebCode}) => {
		return EstateModel
			.find({immowebCode})
			.transform(estateFromMongoMapper).exec()
	}*/
}

const mutations = {
	createEstate: (_, args) => {
		return new EstateModel(args).save()
	}
}

module.exports = {
	Query: queries,
	/*Mutation: mutations*/
}

/* How to fill each fields to be returned to the client from the MongoDB structure ? */

function estateFromMongoMapper(estates) {
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
		agencyLogo:			estate.rawMetadata.customers[0].logoUrl,
		geolocation:		estate.geolocation,
		street:				estate.rawMetadata.property.location.street,
		isAuction:			estate.rawMetadata.flags.isPublicSale,
		isSold:				estate.rawMetadata.flags.isSoldOrRented,
		isUnderOption:		estate.rawMetadata.flags.isUnderOption
	}))
}

/* What arguments are accepted from the client and how they are compared against the MongoDB data ? */

const estateArgsToMongoMapper = {
	id:				v => ({key: 'id'										, value: v							}),
	immowebCode:	v => ({key: 'immowebCode'								, value: v							}),
	priceRange: 	v => ({key: 'rawMetadata.price.mainValue'				, value: {$gte: v[0], $lte: v[1]}	}),
	zipCodes: 		v => ({key:	'rawMetadata.property.location.postalCode'	, value: {$in: v}					}),
	onlyWithGarden:	v => ({key:	'rawMetadata.property.hasGarden'			, value: v || null					}),
	minGardenArea:	v => ({key:	'rawMetadata.property.gardenSurface'		, value: {$gte: v}				 	}), // TODO : include gardens without area -> needs refactor
	// TODO : onlyStillAvailable filter -> needs to refactor this method which is not flexible enough
}

function estateToMongoMapper(args) {
	let result = {}
	for(let propName in estateArgsToMongoMapper) {
		if(args[propName] !== undefined) {
			const {key, value} = estateArgsToMongoMapper[propName](args[propName])
			if(result[key] !== undefined) {
				if(result['$and'] !== undefined) {
					result['$and'].push({[key]: value})
				} else {
					result['$and'] = [{[key]: result[key]}, {[key]: value}]
					result[key] = undefined
				}
			} else {
				result[key] = value
			}
		}
	}
	return result
}
