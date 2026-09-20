const { EstateModel } = require('../models/estates')
const { queryHasField } = require('./utils')

// Useful building blocks for MongoDB aggregation pipeline
const filter = (filters) => !filters || !filters.length ? null : filters.length > 1 ? { $match: {$and: filters} } : { $match: filters[0] }
const sort = (orderBy) => orderBy ? { $sort: orderBy } : null
const skip = (offset) => offset ? { $skip: offset } : null
const trim = (limit) => limit >= 0 ? { $limit: limit } : null
const count = () => ({ $count: 'totalCount'})
const limitToValue = (field, treshold, order) => ({ $match: {[field]: {[order ? '$lte' : '$gte']: treshold}} })
const onlyKeepField = (field) => field ? { $project: {[field]: 1} } : null
const onlyKeepFields = (fields) => fields && fields.length ? { $project: Object.fromEntries(fields.map(f => [f, 1])) } : null
const onlyWithinBounds = ([west, south, east, north]) => ({
    $match: {
        geolocation: {
            $geoWithin: {
                $geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [west, south],
                        [east, south],
                        [east, north],
                        [west, north],
                        [west, south]
                    ]]
                }
            }
        }
    }
})

const validBounds = bounds => Array.isArray(bounds)
    && bounds.length === 4
    && bounds.every(Number.isFinite)
    && bounds[0] < bounds[2]
    && bounds[1] < bounds[3]

const MAX_MAP_POINTS = 2000
const SEARCH_CACHE_TTL_MS = 30 * 1000
const SEARCH_CACHE_MAX_ENTRIES = 50
const searchIdCache = new Map()

const pickMostRecentByImmowebCode = () => ([
    { $group: {
        _id: '$immowebCode',
        doc: { $top: {sortBy: {lastModificationDate: -1}, output: '$$ROOT'} }
    } },
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
    return EstateModel.aggregate(pipeline.filter(e=>e)).allowDiskUse(true).exec().catch(e => {
        if(e.codeName === 'QueryExceededMemoryLimitNoDiskUseAllowed') {
            throw new Error('↑ Too much to load from database ! Please refine your search criterias ↑')
        } else {
            throw e
        }
    })
}

function searchCacheKey(filtersInput, orderByInput, user) {
    return JSON.stringify({
        filtersInput,
        orderByInput,
        likedEstates: filtersInput.onlyLiked ? user?.likedEstates : undefined,
        visitedEstates: filtersInput.onlyVisited ? user?.visitedEstates : undefined
    })
}

function cacheSearchIds(key, ids) {
    searchIdCache.set(key, {ids, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS})
    while(searchIdCache.size > SEARCH_CACHE_MAX_ENTRIES) {
        searchIdCache.delete(searchIdCache.keys().next().value)
    }
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

// Finds the most recent estates in the visible map bounds (only returns the id and location)
async function findEstatesNear(bounds, filtersInput, user) {
    console.log('findEstatesNear')
    if(bounds && !validBounds(bounds)) {
        throw new Error('Map bounds must contain west, south, east and north coordinates')
    }

    const filters = await mapFiltersToMongo(filtersInput, user)
    const points = await applyPipeline([
        bounds ? onlyWithinBounds(bounds) : null,
        filter(filters),
        onlyKeepFields([
            'immowebCode',
            'geolocation',
            'rawMetadata.property.type',
            'lastModificationDate',
            'disappearanceDate',
            'rawMetadata.price.mainValue',
            'rawMetadata.property.netHabitableSurface',
            'rawMetadata.property.gardenSurface',
            'rawMetadata.property.hasGarden',
            'rawMetadata.flags.isSoldOrRented',
            'rawMetadata.flags.isUnderOption'
        ]),
        ...pickMostRecentByImmowebCode(),
        onlyKeepFields([
            'immowebCode',
            'geolocation',
            'rawMetadata.property.type',
            'lastModificationDate',
            'disappearanceDate',
            'rawMetadata.price.mainValue',
            'rawMetadata.property.netHabitableSurface',
            'rawMetadata.property.gardenSurface',
            'rawMetadata.property.hasGarden',
            'rawMetadata.flags.isSoldOrRented',
            'rawMetadata.flags.isUnderOption'
        ]),
        trim(MAX_MAP_POINTS + 1)
    ])

    return {
        points: points.slice(0, MAX_MAP_POINTS),
        truncated: points.length > MAX_MAP_POINTS,
        limit: MAX_MAP_POINTS
    }
}

// Finds all estate ads that match specific criteria (only the most recent version for each immowebCode)
async function findEstates(filtersInput, orderByInput, fields/*Input*/, offset, limit, user) {
    console.log('findEstates')
    const filters = await mapFiltersToMongo(filtersInput, user)
    //const fields = await mapFieldsToMongo(fields)
    const orderBy = mapSorterToMongo(orderByInput)
    const orderByField = Object.entries(orderBy)[0][0]

    const cacheKey = searchCacheKey(filtersInput, orderByInput, user)
    let cachedSearch = searchIdCache.get(cacheKey)
    if(!cachedSearch || cachedSearch.expiresAt <= Date.now()) {
        const ids = (await applyPipeline([
            filter(filters),
            onlyKeepFields(['immowebCode', orderByField, 'lastModificationDate']),
            ...pickMostRecentByImmowebCode(),
            onlyKeepFields(['immowebCode', orderByField]),
            sort(orderBy),
            onlyKeepField('_id')
        ])).map(result => result._id)
        cacheSearchIds(cacheKey, ids)
        cachedSearch = searchIdCache.get(cacheKey)
    }

    const pageIds = cachedSearch.ids.slice(offset || 0, (offset || 0) + limit)
    const pageDocuments = await applyPipeline([
        filter([{_id: {$in: pageIds}}])
    ])
    const documentsById = new Map(pageDocuments.map(document => [document._id.toString(), document]))
    const page = pageIds.map(id => documentsById.get(id.toString())).filter(Boolean)
    const totalCount = cachedSearch.ids.length
    
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

    if(f.bounds) {
        if(!validBounds(f.bounds)) throw new Error('Map bounds must contain west, south, east and north coordinates')
        r.push(onlyWithinBounds(f.bounds).$match)
    }

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

	if(f.propertyTypes && f.propertyTypes.length) {
		r.push({'rawMetadata.property.type': {$in: f.propertyTypes}})
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

    if(f.availabilityDateRange?.length === 2) {
        const [rangeStart, rangeEnd] = f.availabilityDateRange.map(value => new Date(value))
        if(Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime()) || rangeStart > rangeEnd) {
            throw new Error('Availability date range must contain a valid start and end date')
        }
        r.push({creationDate: {$lte: rangeEnd}})
        r.push({$or: [
            {disappearanceDate: {$gte: rangeStart}},
            {
                disappearanceDate: null,
                $or: [
                    {'rawMetadata.flags.isSoldOrRented': false},
                    {'rawMetadata.flags.isSoldOrRented': null}
                ]
            }
        ]})
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

module.exports = {findAllLocalities, findEstates, findEstateByImmowebCode, findEstatesNear, fetchPriceHistory}
