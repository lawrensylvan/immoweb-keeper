const { getAuthenticatedUser, registerUser, loginUser, markEstateAsLiked, markEstateAsVisited } = require('./users')
const { findAllLocalities, findEstateByImmowebCode, findEstates, findEstatesNear, fetchPriceHistory } = require('./estates')

module.exports = {

	Query: {

        localities: () => findAllLocalities(),

        estateByImmowebCode: (parent, args) => findEstateByImmowebCode(args.immowebCode),

        estatesNear: async (parent, args) => {
            const {location, distanceMeters, ...filters} = args
            return findEstatesNear(location, distanceMeters, filters)
        },

        estates: async (parent, args, context, info) => {
            const {orderBy, offset, limit, ...filters} = args
            const user = await getAuthenticatedUser(context.user)
            const fields = info // TODO : return all fields from query in info
            return findEstates(filters, orderBy, fields, offset, limit, user)
        }

	},

    Mutation: {

        register: (parent, {name, password}) => registerUser(name, password),
    
        login: (parent, {name, password}, {SECRET}) => loginUser(name, password, SECRET),

        markAsLiked: (parent, {immowebCode, isLiked}, {user}) => markEstateAsLiked(user, immowebCode, isLiked),

        markAsVisited: (parent, {immowebCode, isVisited}, {user}) => markEstateAsVisited(user, immowebCode, isVisited)

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
		description:		e => e.rawMetadata.property.alternativeDescriptions
									? e.rawMetadata.property.alternativeDescriptions.fr || e.rawMetadata.property.description
									: e.rawMetadata.property.description,
		livingArea:			e => e.rawMetadata.property.netHabitableSurface,
		streetNumber:		e => e.rawMetadata.property.location.number,
		bedroomCount:		e => e.rawMetadata.property.bedroomCount,

		priceHistory:		e => fetchPriceHistory(e),

        isLiked:            e => e.isLiked,
        isVisited:          e => e.isVisited
	},

}