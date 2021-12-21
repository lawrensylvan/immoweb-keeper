const { EstateModel } = require('../models/estates')
const { UserModel } = require('../models/users')
const gql = require('graphql-tag')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { UserInputError } = require('apollo-server-express')

/* GraphQL queries and mutations */

module.exports = {

	Query: {

		// Find all estates applying filters and sorter
		estates: async (parent, args, context) => {

            let estates = await EstateModel
                .aggregate([
                    // apply filter
                    { $match: {$and: await mapFiltersToMongo(args, context)} },
                    // keep most recent version for each immowebCode
                    { $sort: { immowebCode: 1, lastModificationDate: -1 } },
                    { $group: { _id: "$immowebCode", doc: { $first : "$$ROOT"}} },
                    { $replaceRoot: { newRoot: '$doc'} },
                    // apply sorter
                    { $sort: args.orderBy ? mapSorterToMongo(args) : {price: 1} }
                ])
                .exec()
            
            // lazy load user's liked/visited items if isLiked/isVisited field is requested
            // TODO : consider if there is a cleaner way of fetching it (from the field resolver but with a single query)
            const query = gql`${context.query}`
            const selectedFields = query.definitions[0].selectionSet.selections[0].selectionSet.selections
            if(selectedFields.some(e => e.name.value === 'isLiked')) {
                if(!context.user) throw new Error('Cannot fetch liked estates since no user is logged in')
                const user = await UserModel.findOne({name: context.user.name}).exec()
                estates = estates.map(e => ({
                    ...e,
                    isLiked: user.likedEstates.includes(e.immowebCode)
                }))
            }
            if(selectedFields.some(e => e.name.value === 'isVisited')) {
                if(!context.user) throw new Error('Cannot fetch visited estates since no user is logged in')
                const user = await UserModel.findOne({name: context.user.name}).exec()
                estates = estates.map(e => ({
                    ...e,
                    isVisited: user.visitedEstates.includes(e.immowebCode)
                }))
            }

            return estates
        },
	
		// Find the most recent version of an estate from its immowebCode
		estateByImmowebCode: (_, {immowebCode}) => EstateModel
														.find({immowebCode})
														.sort({lastModificationDate: -1})
														.limit(1).exec()

		/* Find all users
		users: () => UserModel.find().exec(),

		// Find a user by name
		userByName: (_, {name}) => UserModel.findOne({name}).exec()*/
		
	},

    Mutation: {

        register: async (parent, {name, password}) => {
            const hash = await bcrypt.hash(password, 12)
            return UserModel.create({name: name, password: hash})
        },
    
        login: async (parent, {name, password}, {SECRET}) => {
            const user = await UserModel.findOne({name})
            if(!user) {
                throw new UserInputError(`No such user '${name}'`)
            }
            const isValid = await bcrypt.compare(password, user.password)
            if(!isValid) {
                throw new UserInputError(`Invalid password for user '${name}'`)
            }
            
            const token = jwt.sign(
                {user: {name: user.name}},
                SECRET,
                {expiresIn: '1y'}
            )
            
            return token
        },

        markAsLiked: async (parent, {immowebCode, isLiked}, {user}) => {
            if(isLiked === false) {
                await UserModel.updateOne({name: user.name}, {$pull: {likedEstates: immowebCode}})
            }
            else {
                await UserModel.updateOne({name: user.name}, {$push: {likedEstates: immowebCode}})
            }
            return isLiked
        },

        markAsVisited: async (parent, {immowebCode, isVisited}, {user}) => {
            if(isVisited === false) {
                await UserModel.updateOne({name: user.name}, {$pull: {visitedEstates: immowebCode}})
            }
            else {
                await UserModel.updateOne({name: user.name}, {$push: {visitedEstates: immowebCode}})
            }
            return isVisited
        }

    },

	/*User: {
		name:				u => u.name,
		likedEstates:		u => EstateModel.aggregate([
									// apply filter
									{ $match: {immowebCode: {$in: u.likedEstates}} },
									// keep most recent version for each immowebCode
									{ $sort: { immowebCode: 1, lastModificationDate: -1 } },
									{ $group: { _id: "$immowebCode", doc: { $first : "$$ROOT"}} },
									{ $replaceRoot: { newRoot: '$doc'} }
								]).exec(),
		visitedEstates:		u => EstateModel.aggregate([
									// apply filter
									{ $match: {immowebCode: {$in: u.visitedEstates}} },
									// keep most recent version for each immowebCode
									{ $sort: { immowebCode: 1, lastModificationDate: -1 } },
									{ $group: { _id: "$immowebCode", doc: { $first : "$$ROOT"}} },
									{ $replaceRoot: { newRoot: '$doc'} }
								]).exec()
	},
    */
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
		description:		e => e.rawMetadata.property.alternativeDescriptions
									? e.rawMetadata.property.alternativeDescriptions.fr || e.rawMetadata.property.description
									: e.rawMetadata.property.description,
		livingArea:			e => e.rawMetadata.property.netHabitableSurface,
		streetNumber:		e => e.rawMetadata.property.location.number,
		bedroomCount:		e => e.rawMetadata.property.bedroomCount,

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
		},

        isLiked: e => e.isLiked,
        isVisited: e => e.isVisited

	},

}

/* What arguments are accepted from the client and how they are compared against the MongoDB data ? */

async function mapFiltersToMongo(f, context) {
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
        if(!context.user) throw new Error('Cannot fetch liked estates since no user is logged in')
        const user = await UserModel.findOne({name: context.user.name}).exec()
        r.push({immowebCode: {$in: user.likedEstates}})
    }

    if(f.onlyVisited) {
        if(!context.user) throw new Error('Cannot fetch visited estates since no user is logged in')
        const user = await UserModel.findOne({name: context.user.name}).exec()
        r.push({immowebCode: {$in: user.visitedEstates}})
    }

	return r
}

function mapSorterToMongo({orderBy}) {

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
