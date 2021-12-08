/*const { UserModel } = require('../models/estates')

/* GraphQL queries and mutations 

module.exports = {

	Query: {

		// Find all users
		users: () => UserModel.find().exec(),

        // Find a user by name
		userByName: (_, {name}) => UserModel
									.findOne({name})
                                    .populate('estate') // lazy load instead and ref other resolver
									.limit(1).exec()
		
	}

	/*User: {
		name: 		        e => e.name,
		likedEstates: 		e => e.likedEstates,
		visitedEstates:     e => e.visitedEstates
	}

}
*/