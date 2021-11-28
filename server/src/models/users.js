const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name:           String,
    likedEstates:   [Number],
    visitedEstates: [Number]
}, { typeKey: '$type' })

const UserModel = mongoose.model('user', userSchema)

module.exports = {UserModel}
