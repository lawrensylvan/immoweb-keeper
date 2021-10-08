const express = require('express')
var { graphqlHTTP } = require('express-graphql')
var { buildSchema } = require('graphql')
const estateRoutes = express.Router()
const dbo = require('../db')
//const ObjectId = require('mongodb').ObjectId

var schema = buildSchema(`
  type Query {
    hello: String
  }
`)

var root = { hello: () => 'Hello world!' };

estateRoutes.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}))




estateRoutes.route('/estates').get(async function (req, res) {
  let db_connect = await dbo.getDB()
  console.dir(db_connect)
  db_connect
    .collection('estates')
    .find({})
    .toArray(function (err, result) {
      if (err) throw err
      res.json(result)
    })
})

/*
estateRoutes.route('/estate/:id').get(function (req, res) {
  let db_connect = dbo.getDb()
  let myquery = { _id: ObjectId( req.params.id )}
  db_connect
      .collection('estates')
      .findOne(myquery, function (err, result) {
        if (err) throw err
        res.json(result)
      })
})

estateRoutes.route('/estate/add').post(function (req, response) {
  let db_connect = dbo.getDb()
  let myobj = {
    person_name: req.body.person_name,
    person_position: req.body.person_position,
    person_level: req.body.person_level,
  }
  db_connect.collection('estates').insertOne(myobj, function (err, res) {
    if (err) throw err
    response.json(res)
  })
})

estateRoutes.route('/update/:id').post(function (req, response) {
  let db_connect = dbo.getDb()
  let myquery = { _id: ObjectId( req.params.id )}
  let newvalues = {
    $set: {
      person_name: req.body.person_name,
      person_position: req.body.person_position,
      person_level: req.body.person_level,
    },
  }
  db_connect
    .collection('estates')
    .updateOne(myquery, newvalues, function (err, res) {
      if (err) throw err
      console.log('1 document updated')
      response.json(res)
    })
})

estateRoutes.route('/:id').delete((req, response) => {
  let db_connect = dbo.getDb()
  let myquery = { _id: ObjectId( req.params.id )}
  db_connect.collection('estates').deleteOne(myquery, function (err, obj) {
    if (err) throw err
    console.log('1 document deleted')
    response.status(obj)
  })
})*/

module.exports = estateRoutes