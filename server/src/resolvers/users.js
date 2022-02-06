const { UserModel } = require('../models/users')
const { UserInputError } = require('apollo-server-express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

async function registerUser(name, password) {
    const hash = await bcrypt.hash(password, 12)
    return UserModel.create({name: name, password: hash})
}

async function loginUser(name, password, SECRET) {
    
    const user = await UserModel.findOne({name})
    if(!user) throw new UserInputError(`No such user '${name}'`)

    const isValid = await bcrypt.compare(password, user.password)
    if(!isValid) throw new UserInputError(`Invalid password for user '${name}'`)
    
    const token = jwt.sign(
        {user: {name: user.name}},
        SECRET,
        {expiresIn: '1y'}
    )
    
    return token
}

async function getAuthenticatedUser(token) {
    if(!token || !token.name) return null
    return await UserModel.findOne({name: token.name}).exec()
}

async function markEstateAsLiked(user, immowebCode, isLiked) {
    if(isLiked === false) {
        await UserModel.updateOne({name: user.name}, {$pull: {likedEstates: immowebCode}})
    } else {
        await UserModel.updateOne({name: user.name}, {$push: {likedEstates: immowebCode}})
    }
    return isLiked
}

async function markEstateAsVisited(user, immowebCode, isVisited) {
    if(isVisited === false) {
        await UserModel.updateOne({name: user.name}, {$pull: {visitedEstates: immowebCode}})
    } else {
        await UserModel.updateOne({name: user.name}, {$push: {visitedEstates: immowebCode}})
    }
    return isVisited
}

module.exports = {registerUser, loginUser, getAuthenticatedUser, markEstateAsLiked, markEstateAsVisited}
