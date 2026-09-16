const {AuthenticationError, UserInputError} = require('apollo-server-express')
const {getAuthenticatedUser} = require('./users')
const {RoutineRunModel} = require('../models/routine')
const postalCodes = require('../data/belgianPostalCodes.json')
const {getRoutineSchedule, updateRoutineSchedule, startRoutine, getActiveRun} = require('../services/routineScheduler')

async function requireUser(user) {
    if(!await getAuthenticatedUser(user)) throw new AuthenticationError('You must be signed in.')
}

async function findRoutineStatus(user) {
    await requireUser(user)
    const [schedule, lastRun, lastSuccessfulRun] = await Promise.all([
        getRoutineSchedule(),
        RoutineRunModel.findOne().sort({startedAt: -1}),
        RoutineRunModel.findOne({status: {$in: ['success', 'partial']}}).sort({finishedAt: -1})
    ])
    return {schedule, activeRun: getActiveRun(), lastRun, lastSuccessfulRun}
}

async function findRoutineRuns(user, limit = 10, postalCode, propertyType) {
    await requireUser(user)
    const scope = {...(postalCode != null && {postalCode}), ...(propertyType && {propertyType})}
    const filter = Object.keys(scope).length ? {coverage: {$elemMatch: scope}} : {}
    return RoutineRunModel.find(filter).sort({startedAt: -1}).limit(Math.max(1, Math.min(limit, 100)))
}

async function findRoutineHistory(user, postalCode, propertyType) {
    await requireUser(user)
    if(postalCode == null || !propertyType) return []
    const runs = await RoutineRunModel.find({coverage: {$elemMatch: {postalCode, propertyType, status: 'success'}}})
        .select({startedAt: 1}).sort({startedAt: 1}).lean()
    return runs.map(run => ({date: run.startedAt.toISOString().slice(0, 10), runId: run._id.toString()}))
}

async function saveRoutineSchedule(user, input) {
    await requireUser(user)
    try { return await updateRoutineSchedule(input) }
    catch(error) { throw new UserInputError(error.message) }
}

async function triggerRoutine(user) {
    await requireUser(user)
    try { return await startRoutine('manual') }
    catch(error) { throw new UserInputError(error.message) }
}

async function findPostalCodes(user) {
    await requireUser(user)
    return postalCodes
}

module.exports = {findRoutineStatus, findRoutineRuns, findRoutineHistory, saveRoutineSchedule, triggerRoutine, findPostalCodes}
