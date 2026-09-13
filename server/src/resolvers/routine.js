const { AuthenticationError, UserInputError } = require('apollo-server-express')
const { getAuthenticatedUser } = require('./users')
const { RoutineRunModel } = require('../models/routine')
const {
    getRoutineSchedule,
    updateRoutineSchedule,
    startRoutine,
    getActiveRun
} = require('../services/routineScheduler')

async function requireUser(user) {
    const authenticatedUser = await getAuthenticatedUser(user)
    if(!authenticatedUser) throw new AuthenticationError('You must be signed in.')
    return authenticatedUser
}

async function findRoutineStatus(user) {
    await requireUser(user)
    const [schedule, lastRun, lastSuccessfulRun] = await Promise.all([
        getRoutineSchedule(),
        RoutineRunModel.findOne().sort({startedAt: -1}),
        RoutineRunModel.findOne({status: 'success'}).sort({finishedAt: -1})
    ])
    return {schedule, activeRun: getActiveRun(), lastRun, lastSuccessfulRun}
}

async function findRoutineRuns(user, limit = 10) {
    await requireUser(user)
    const safeLimit = Math.max(1, Math.min(limit, 100))
    return RoutineRunModel.find().sort({startedAt: -1}).limit(safeLimit)
}

async function findRoutineHistory(user) {
    await requireUser(user)
    const mongoose = require('mongoose')
    const queries = await mongoose.connection.collection('queries')
        .find({}, {projection: {url: 1, allRunDates: 1}}).toArray()

    return queries.map(query => ({
        queryId: query._id.toString(),
        label: query.url || query._id.toString(),
        periods: (query.allRunDates || []).map(period => Array.isArray(period)
            ? {start: period[0], end: period[1]}
            : {start: period, end: period})
    }))
}

async function saveRoutineSchedule(user, input) {
    await requireUser(user)
    try {
        return await updateRoutineSchedule(input)
    } catch(error) {
        throw new UserInputError(error.message)
    }
}

async function triggerRoutine(user) {
    await requireUser(user)
    return startRoutine('manual')
}

module.exports = {
    findRoutineStatus,
    findRoutineRuns,
    findRoutineHistory,
    saveRoutineSchedule,
    triggerRoutine
}
