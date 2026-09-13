const mongoose = require('mongoose')

const routineScheduleSchema = new mongoose.Schema({
    _id:            String,
    enabled:        Boolean,
    cronExpression: String
}, { versionKey: false, collection: 'routineSchedule' })

const routineRunSchema = new mongoose.Schema({
    trigger:      { type: String, enum: ['scheduled', 'manual'] },
    status:       { type: String, enum: ['running', 'success', 'failed', 'interrupted'] },
    startedAt:    Date,
    finishedAt:   Date,
    errorSummary: String,
    totals: {
        added:                Number,
        updated:              Number,
        disappeared:          Number,
        disappearanceChecked: Boolean
    }
}, { versionKey: false, collection: 'routineRuns' })

const RoutineScheduleModel = mongoose.model('RoutineSchedule', routineScheduleSchema)
const RoutineRunModel = mongoose.model('RoutineRun', routineRunSchema)

module.exports = {RoutineScheduleModel, RoutineRunModel}
