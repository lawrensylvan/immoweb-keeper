const cron = require('node-cron')
const Path = require('path')
const { spawn } = require('child_process')
const { PROPERTY_TYPES, RoutineScheduleModel, RoutineRunModel } = require('../models/routine')
const postalCodeCatalog = require('../data/belgianPostalCodes.json')

const SCHEDULE_ID = 'routine'
const DEFAULT_CRON = '0 4 * * *'
const TIMEZONE = 'Europe/Brussels'
const MAX_ERROR_LENGTH = 2000
const VALID_POSTAL_CODES = new Set(postalCodeCatalog.map(item => item.code))

let scheduledTask = null
let activeRun = null
let activeChild = null

function validateCronExpression(expression) {
    return typeof expression === 'string' && cron.validate(expression.trim())
}

function stopScheduledTask() {
    if(scheduledTask) {
        scheduledTask.destroy()
        scheduledTask = null
    }
}

function configureScheduledTask(schedule) {
    stopScheduledTask()
    if(!schedule.enabled) return

    scheduledTask = cron.schedule(schedule.cronExpression, () => {
        startRoutine('scheduled').catch(error => console.error('Unable to start scheduled routine:', error))
    }, { timezone: TIMEZONE })
}

async function getOrCreateSchedule() {
    let schedule = await RoutineScheduleModel.findById(SCHEDULE_ID)
    if(!schedule) {
        schedule = await RoutineScheduleModel.create({
            _id: SCHEDULE_ID,
            enabled: false,
            cronExpression: DEFAULT_CRON,
            postalCodes: [],
            propertyTypes: ['HOUSE']
        })
    } else if(schedule.postalCodes == null || schedule.propertyTypes == null) {
        schedule.postalCodes = schedule.postalCodes || []
        schedule.propertyTypes = schedule.propertyTypes || ['HOUSE']
        await schedule.save()
    }
    return schedule
}

async function initializeRoutineScheduler() {
    await RoutineRunModel.updateMany(
        {status: 'running'},
        {$set: {status: 'interrupted', finishedAt: new Date(), errorSummary: 'Application restarted before the routine completed.'}}
    )
    const schedule = await getOrCreateSchedule()
    configureScheduledTask(schedule)
    console.log(`✓ Routine schedule ${schedule.enabled ? `enabled (${schedule.cronExpression}, ${TIMEZONE})` : 'disabled'}`)
}

async function getRoutineSchedule() {
    const schedule = await getOrCreateSchedule()
    return {
        ...schedule.toObject(),
        timezone: TIMEZONE,
        nextRunAt: scheduledTask ? scheduledTask.getNextRun() : null
    }
}

async function updateRoutineSchedule({enabled, cronExpression, postalCodes, propertyTypes}) {
    const current = await getOrCreateSchedule()
    const nextExpression = cronExpression == null ? current.cronExpression : cronExpression.trim()
    if(!validateCronExpression(nextExpression)) {
        throw new Error('Invalid cron expression. Use a five-field cron expression such as "0 4 * * *".')
    }

    const nextPostalCodes = postalCodes == null ? current.postalCodes : [...new Set(postalCodes)].sort((a, b) => a - b)
    const nextPropertyTypes = propertyTypes == null ? current.propertyTypes : [...new Set(propertyTypes)]
    if(nextPostalCodes.some(code => !VALID_POSTAL_CODES.has(code))) throw new Error('One or more postal codes are not valid Belgian postal codes.')
    if(nextPropertyTypes.some(type => !PROPERTY_TYPES.includes(type))) throw new Error('Property types must be HOUSE and/or APARTMENT.')
    if(!nextPostalCodes.length || !nextPropertyTypes.length) {
        throw new Error('The routine needs at least one postal code and one property type.')
    }

    current.enabled = enabled == null ? current.enabled : enabled
    current.cronExpression = nextExpression
    current.postalCodes = nextPostalCodes
    current.propertyTypes = nextPropertyTypes
    await current.save()
    configureScheduledTask(current)
    return getRoutineSchedule()
}

async function startRoutine(trigger) {
    if(activeRun) return {started: false, run: activeRun}

    const schedule = await getOrCreateSchedule()
    if(!schedule.postalCodes.length || !schedule.propertyTypes.length) throw new Error('Configure postal codes and property types before running the routine.')
    const run = await RoutineRunModel.create({
        trigger,
        status: 'running',
        startedAt: new Date(),
        requestedPostalCodes: schedule.postalCodes,
        requestedPropertyTypes: schedule.propertyTypes,
        coverage: []
    })
    activeRun = run

    const routinePath = Path.resolve(__dirname, '../../routine/src/routine.js')
    const child = spawn(process.execPath, [routinePath], {
        cwd: Path.resolve(__dirname, '../..'),
        env: {
            ...process.env,
            ROUTINE_RUN_ID: run.id,
            ROUTINE_TARGETS: JSON.stringify({postalCodes: schedule.postalCodes, propertyTypes: schedule.propertyTypes})
        },
        stdio: ['ignore', 'pipe', 'pipe']
    })
    activeChild = child

    let errorOutput = ''
    child.stdout.on('data', data => process.stdout.write(`[routine ${run.id}] ${data}`))
    child.stderr.on('data', data => {
        const text = data.toString()
        process.stderr.write(`[routine ${run.id}] ${text}`)
        errorOutput = (errorOutput + text).slice(-MAX_ERROR_LENGTH)
    })

    let finished = false
    const finish = async (status, errorSummary) => {
        if(finished) return
        finished = true
        run.status = status
        run.finishedAt = new Date()
        run.errorSummary = errorSummary || null
        await run.save()
        activeRun = null
        activeChild = null
    }

    child.on('error', error => {
        finish('failed', error.message).catch(saveError => console.error('Unable to save routine failure:', saveError))
    })
    child.on('close', async code => {
        const storedRun = await RoutineRunModel.findById(run.id)
        const successes = storedRun.coverage.filter(item => item.status === 'success').length
        const failures = storedRun.coverage.filter(item => item.status === 'failed').length
        const status = code === 0 ? 'success' : successes && failures ? 'partial' : 'failed'
        const summary = code === 0 ? null : (errorOutput.trim() || `Routine exited with code ${code}.`)
        finish(status, summary).catch(error => console.error('Unable to save routine result:', error))
    })

    return {started: true, run}
}

function getActiveRun() {
    return activeRun
}

function stopRoutineScheduler() {
    stopScheduledTask()
    if(activeChild) activeChild.kill('SIGTERM')
}

module.exports = {
    TIMEZONE,
    initializeRoutineScheduler,
    getRoutineSchedule,
    updateRoutineSchedule,
    startRoutine,
    getActiveRun,
    stopRoutineScheduler
}
