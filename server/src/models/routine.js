const mongoose = require('mongoose')

const PROPERTY_TYPES = ['HOUSE', 'APARTMENT']

const routineScheduleSchema = new mongoose.Schema({
    _id:            String,
    enabled:        Boolean,
    cronExpression: String,
    postalCodes:    [Number],
    propertyTypes:  [{type: String, enum: PROPERTY_TYPES}]
}, { versionKey: false, collection: 'routineSchedule' })

const coverageSchema = new mongoose.Schema({
    postalCode:   Number,
    propertyType: {type: String, enum: PROPERTY_TYPES},
    status:       {type: String, enum: ['success', 'failed']},
    added:        Number,
    updated:      Number,
    disappeared:  Number,
    errorSummary: String
}, {_id: false})

const routineRunSchema = new mongoose.Schema({
    trigger:      { type: String, enum: ['scheduled', 'manual', 'migration'] },
    status:       { type: String, enum: ['running', 'success', 'failed', 'partial', 'interrupted'] },
    startedAt:    Date,
    finishedAt:   Date,
    requestedPostalCodes: [Number],
    requestedPropertyTypes: [{type: String, enum: PROPERTY_TYPES}],
    coverage: [coverageSchema],
    errorSummary: String,
    totals: {
        added:                Number,
        updated:              Number,
        disappeared:          Number,
        disappearanceChecked: Boolean
    },
    migrationMetadata: {
        source: String,
        timingAccuracy: String,
        scheduledHourUtc: Number
    }
}, { versionKey: false, collection: 'routineRuns' })

routineRunSchema.index({'coverage.postalCode': 1, 'coverage.propertyType': 1, startedAt: -1})

const RoutineScheduleModel = mongoose.model('RoutineSchedule', routineScheduleSchema)
const RoutineRunModel = mongoose.model('RoutineRun', routineRunSchema)

module.exports = {PROPERTY_TYPES, RoutineScheduleModel, RoutineRunModel}
