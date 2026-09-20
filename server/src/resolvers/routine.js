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
    const [schedule, lastRun, lastSuccessfulRun, firstRun] = await Promise.all([
        getRoutineSchedule(),
        RoutineRunModel.findOne().sort({startedAt: -1}),
        RoutineRunModel.findOne({status: {$in: ['success', 'partial']}}).sort({finishedAt: -1}),
        RoutineRunModel.findOne({startedAt: {$ne: null}}).sort({startedAt: 1}).select({startedAt: 1})
    ])
    return {schedule, activeRun: getActiveRun(), lastRun, lastSuccessfulRun, firstRunAt: firstRun?.startedAt}
}

async function findRoutineRuns(user, limit = 10, postalCodes, propertyType) {
    await requireUser(user)
    const requestedCodes = [...new Set(postalCodes || [])]
    const scope = {...(requestedCodes.length && {postalCode: {$in: requestedCodes}}), ...(propertyType && {propertyType})}
    const filter = Object.keys(scope).length ? {coverage: {$elemMatch: scope}} : {}
    const runs = await RoutineRunModel.find(filter).sort({startedAt: -1}).limit(100)
    return runs.filter(run => !requestedCodes.length || requestedCodes.every(postalCode =>
        run.coverage.some(item => item.postalCode === postalCode && (!propertyType || item.propertyType === propertyType))
    )).slice(0, Math.max(1, Math.min(limit, 100)))
}

async function findRoutineHistory(user, postalCodes, propertyType) {
    await requireUser(user)
    const requestedCodes = [...new Set(postalCodes || [])]
    if(!requestedCodes.length || !propertyType) return []
    const runs = await RoutineRunModel.find({coverage: {$elemMatch: {postalCode: {$in: requestedCodes}, propertyType, status: 'success'}}})
        .select({startedAt: 1, coverage: 1}).sort({startedAt: 1}).lean()
    return runs.flatMap(run => {
        const coverage = run.coverage.filter(item => requestedCodes.includes(item.postalCode) && item.propertyType === propertyType && item.status === 'success')
        if(!requestedCodes.every(postalCode => coverage.some(item => item.postalCode === postalCode))) return []
        return {
            date: run.startedAt.toISOString().slice(0, 10),
            runId: run._id.toString(),
            postalCodes: requestedCodes,
            propertyType,
            added: coverage.reduce((sum, item) => sum + (item.added || 0), 0),
            updated: coverage.reduce((sum, item) => sum + (item.updated || 0), 0),
            disappeared: coverage.reduce((sum, item) => sum + (item.disappeared || 0), 0)
        }
    })
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
