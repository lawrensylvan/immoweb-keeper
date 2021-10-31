const { EstateModel } = require('../models/estates')

/* GraphQL queries and mutations */

module.exports = {

	Query: {

		// Find all estates applying filters (only most recent version of each estate)
		estates: (_, args) => EstateModel
								.aggregate([
									{ $match: {$and: mapFiltersToMongo(args)} },
									{ $sort: { immowebCode: 1, lastModificationDate: -1 } },
									{ $group: { _id: "$immowebCode", doc: { $first : "$$ROOT"}} },
									{ $replaceRoot: { newRoot: '$doc'} }
								])
								.exec(),
	
		// Find the most recent version of an estate from its immowebCode
		estateByImmowebCode: (_, {immowebCode}) => EstateModel
														.find({immowebCode})
														.sort({lastModificationDate: -1})
														.limit(1).exec()
		
	},

	Estate: {
		
		immowebCode: 		e => e.immowebCode,
		price: 				e => e.rawMetadata.price.mainValue,
		zipCode: 			e => e.rawMetadata.property.location.postalCode,
		locality: 			e => e.rawMetadata.property.location.locality,
		images:				e => e.images,
		creationDate:		e => e.creationDate,
		modificationDate: 	e => e.lastModificationDate,
		disappearanceDate:	e => e.disappearanceDate,
		hasGarden:			e => e.rawMetadata.property.hasGarden || false,
		gardenArea:			e => e.rawMetadata.property.gardenSurface,
		agencyName:			e => e.rawMetadata.customers[0].name,
		agencyLogo:			e => e.rawMetadata.customers[0].logoUrl,
		geolocation:		e => e.geolocation,
		street:				e => e.rawMetadata.property.location.street,
		isAuction:			e => e.rawMetadata.flags.isPublicSale || false,
		isSold:				e => e.rawMetadata.flags.isSoldOrRented || false,
		isUnderOption:		e => e.rawMetadata.flags.isUnderOption || false,

		// price history across all versions (only if price was changed at least once)
		priceHistory:		async e => {
			const result = await EstateModel
									.find({immowebCode: e.immowebCode})
									.sort({lastModificationDate: 1})
									.transform(r => r
										.map(h => ({
											date: h.lastModificationDate,
											price: h.rawMetadata.price.mainValue
										}))
									)
									.exec()
			const history = result.filter( (e,i,a) => i === a.findIndex(e2 => e.price === e2.price) )
			return history.length >= 2 ? history : null
		}

	}

}

/* What arguments are accepted from the client and how they are compared against the MongoDB data ? */

function mapFiltersToMongo(f) {
	let r = []

	if(f.immowebCode) {
		r.push({immowebCode: f.immowebCode})
	}

	if(f.priceRange && f.priceRange.length) {
		if(f.priceRange[0]) {
			r.push({'rawMetadata.price.mainValue': {$gte: f.priceRange[0]}})
		}
		if(f.priceRange[1]) {
			r.push({'rawMetadata.price.mainValue': {$lte: f.priceRange[1]}})
		}
	}

	if(f.zipCodes && f.zipCodes.length) {
		r.push({'rawMetadata.property.location.postalCode': {$in: f.zipCodes.map(e => e.toString())}})
	}

	if(f.onlyWithGarden) {
		r.push({'rawMetadata.property.hasGarden': f.onlyWithGarden})
		if(f.minGardenArea) {
			r.push({'rawMetadata.property.gardenSurface': {$gte: f.minGardenArea} })
		}
	}

	if(f.onlyStillAvailable) {
		r.push({'e.rawMetadata.flags.isPublicSale': null})
		r.push({'e.rawMetadata.flags.isSoldOrRented': null})
		r.push({'e.disappearanceDate': null})
	}

	console.dir(r)
	return r
}

/* Legacy (neater mappers, but not flexible enough) 

const estateArgsToMongoMapper = {
	immowebCode:	v => ({key: 'immowebCode'								, value: v								}),
	priceRange: 	v => ({key: 'rawMetadata.price.mainValue'				, value: {$gte: v[0], $lte: v[1]}		}),
	zipCodes: 		v => ({key:	'rawMetadata.property.location.postalCode'	, value: {$in: v.map(e=>e.toString())}	}),
	onlyWithGarden:	v => ({key:	'rawMetadata.property.hasGarden'			, value: v || null						}),
	minGardenArea:	v => ({key:	'rawMetadata.property.gardenSurface'		, value: {$gte: v}				 		}), // TODO : include gardens without area -> needs refactor
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
	console.dir(result)
	return result
}
*/