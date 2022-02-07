const { EstateModel } = require('../models/estates')
const { queryHasField } = require('./utils')
const _ = require('lodash')

// Useful building blocks for MongoDB aggregation pipeline
const filter = (filters) => !filters || !filters.length ? null : filters.length > 1 ? { $match: {$and: filters} } : { $match: filters[0] }
const sort = (orderBy) => orderBy ? { $sort: orderBy } : null
const skip = (offset) => offset ? { $skip: offset } : null
const trim = (limit) => limit >= 0 ? { $limit: limit } : null
const count = () => ({ $count: 'totalCount'})
const limitToValue = (field, treshold, order) => ({ $match: {[field]: {[order ? '$lte' : '$gte']: treshold}} })
const onlyKeepField = (field) => field ? { $project: {[field]: 1} } : null
const onlyKeepFields = (fields) => fields && fields.length ? { $project: Object.fromEntries(fields.map(f => [f, 1])) } : null

const pickMostRecentByImmowebCode = () => ([
    { $sort: { immowebCode: 1, lastModificationDate: -1 } },
    { $group: { _id: "$immowebCode", doc: { $first : "$$ROOT"}} },
    { $replaceRoot: { newRoot: '$doc'} }
])
const paginatedResult = (offset, limit) => ({ $facet: {
    totalCount: [count()],
    page:       [skip(offset), trim(limit)].filter(e=>e)
} })

// Useful to apply pipeline
function applyPipeline(pipeline) {
    console.debug('Performing the following MongoDB aggregation :')
    pipeline.forEach(stage => console.debug('   ' + JSON.stringify(stage, null, 0)))
    console.debug()
    return EstateModel.aggregate(pipeline.filter(e=>e)).exec().catch(e => {
        if(e.codeName === 'QueryExceededMemoryLimitNoDiskUseAllowed') {
            throw new Error('↑ Too much to load from database ! Please refine your search criterias ↑')
        } else {
            throw e
        }
    })
}

// Finds all the localities that exist in the estate collection
function findAllLocalities() {
    return EstateModel.aggregate([
        { $group: { _id: "$rawMetadata.property.location.postalCode", name: { $first: "$rawMetadata.property.location.locality" } } },
        { $project: { _id: 0, zipCode: "$_id", name: "$name" } },
        { $sort: {zipCode: 1} }
    ]).exec()
}

// Finds the most recent version of an estate ad
function findEstateByImmowebCode(immowebCode) {
    return applyPipeline([
        filter([{immowebCode}]),
        sort({lastModificationDate:'descend'}),
        trim(1)
    ])[0]
}

// Finds all estate ads that match specific criteria (only the most recent version for each immowebCode)
async function findEstates(filtersInput, orderByInput, fields/*Input*/, offset, limit, user) {
    const filters = await mapFiltersToMongo(filtersInput, user)
    //const fields = await mapFieldsToMongo(fields)
    const orderBy = mapSorterToMongo(orderByInput)
    const orderByField = Object.entries(orderBy)[0][0]

    let aggregation = (await applyPipeline([
        filter(filters), // D A C H G B a E
        onlyKeepFields(['immowebCode', orderByField, 'lastModificationDate']),
        ...pickMostRecentByImmowebCode(), // D A C H G B E,
        onlyKeepFields(['immowebCode', orderByField]),
        sort(orderBy), // A B C D E G H     {_id: abcf7F4Cba, immowebCode: 3892137, lastModificationDate: 2021_32_1209°}
        {$facet: {
            totalCount: [{$count: 'count'}],
            ids: [
                onlyKeepField('_id'),   // {_id: abdkfzefh}
                skip(offset+1),
                trim(limit)
            ]
        }}
    ]))
    let totalCount = aggregation[0].totalCount[0].count
    let page = await applyPipeline([
        filter([{_id: {$in: aggregation[0].ids.map(e => e._id)}}]),
        sort(orderBy)
    ])
    
    let results = {totalCount, page}

    // Lazy fetch missing fields (TODO: could be done in aggregation pipeline ?)
    if(queryHasField(fields, 'Estate', 'isLiked')) {
        if(!user) throw new Error('Cannot fetch liked estates since no user is logged in')
        results = {
            ...results,
            page: results.page.map(e => ({
                ...e,
                isLiked: user.likedEstates.includes(e.immowebCode)
            }))
        }
    }
    if(queryHasField(fields, 'Estate', 'isVisited')) {
        if(!user) throw new Error('Cannot fetch visited estates since no user is logged in')
        results = {
            ...results,
            page: results.page.map(e => ({
                ...e,
                isVisited: user.visitedEstates.includes(e.immowebCode)
            }))
        }
    }

    return results
}

// price history across all versions (only if price was changed at least once)
async function fetchPriceHistory(estate) {
    const result = await EstateModel
        .find({immowebCode: estate.immowebCode})
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

/* What arguments are accepted from the client and how they are compared against the MongoDB data ? */

async function mapFiltersToMongo(f, user) {
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

	if(f.minLivingArea) {
		r.push({'rawMetadata.property.netHabitableSurface': {$gte: f.minLivingArea} })
	}

	if(f.minBedroomCount) {
		r.push({'rawMetadata.property.bedroomCount': {$gte: f.minBedroomCount} })
	}

	if(f.onlyStillAvailable) {
		r.push({'$or': [{'rawMetadata.flags.isPublicSale': false}, {'rawMetadata.flags.isPublicSale': null}]})
		r.push({'$or': [{'rawMetadata.flags.isSoldOrRented': false}, {'rawMetadata.flags.isSoldOrRented': null}]})
		r.push({'disappearanceDate': null})
	}

	if(f.freeText) {
		r.push({$or: [
			{'rawMetadata.customers[0].name': {$regex: new RegExp(f.freeText, "i")}},
			{'rawMetadata.property.description': {$regex: new RegExp(f.freeText, "i")}},
			{'rawMetadata.property.location.street': {$regex: new RegExp(f.freeText, "i")}}
		]})
	}

    if(f.onlyLiked) {
        if(!user) throw new Error('Cannot fetch liked estates since no user is logged in')
        r.push({immowebCode: {$in: user.likedEstates}})
    }

    if(f.onlyVisited) {
        if(!user) throw new Error('Cannot fetch visited estates since no user is logged in')
        r.push({immowebCode: {$in: user.visitedEstates}})
    }

	return r
}

function mapSorterToMongo(orderBy) {
    if(!orderBy) return null

    const basicFieldMapping = {
        price: 					'rawMetadata.price.mainValue',
		gardenArea: 			'rawMetadata.property.gardenSurface',
		livingArea: 			'rawMetadata.property.netHabitableSurface',
		modificationDate:		'lastModificationDate',
		creationDate: 			'creationDate',
		disappearanceDate: 		'disappearanceDate',
		street:					'rawMetadata.property.location.street'
	}

	const sortOrderMapping = {
		'descend': -1,
		'none': 0,
		'ascend': 1
	}
	
    return { [basicFieldMapping[orderBy.field]]: sortOrderMapping[orderBy.order] }
}

/*function mapFieldsToMongo(fields) {
    ;
}

// A field needs those fields from MongoDB
const fieldDependenciesMapping = {
    immowebCode: 		'immowebCode',
    price: 				'rawMetadata.price.mainValue',
    zipCode: 			'rawMetadata.property.location.postalCode',
    locality: 			'rawMetadata.property.location.locality',
    images:				'images',
    creationDate:		'creationDate',
    modificationDate: 	'lastModificationDate',
    disappearanceDate:	'disappearanceDate',
    hasGarden:			'rawMetadata.property.hasGarden',
    gardenArea:			'rawMetadata.property.gardenSurface',
    agencyName:			'rawMetadata.customers[0].name',
    agencyLogo:			'rawMetadata.customers[0].logoUrl',
    geolocation:		'geolocation',
    street:				'rawMetadata.property.location.street',
    isAuction:			'rawMetadata.flags.isPublicSale',
    isSold:				'rawMetadata.flags.isSoldOrRented',
    isUnderOption:		'rawMetadata.flags.isUnderOption',
    description:		['rawMetadata.property.alternativeDescriptions', 'rawMetadata.property.alternativeDescriptions.fr', 'rawMetadata.property.description'],
    livingArea:			'rawMetadata.property.netHabitableSurface',
    streetNumber:		'rawMetadata.property.location.number',
    bedroomCount:		'rawMetadata.property.bedroomCount',
}*/

module.exports = {findAllLocalities, findEstates, findEstateByImmowebCode, fetchPriceHistory}
