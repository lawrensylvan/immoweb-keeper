import moment from 'moment'

const DAY_IN_MS = 24 * 60 * 60 * 1000
const TARGET_INTERVALS = 10

const STEP_OPTIONS = [
    {amount: 1, unit: 'day', approximateDays: 1},
    {amount: 2, unit: 'days', approximateDays: 2},
    {amount: 3, unit: 'days', approximateDays: 3},
    {amount: 1, unit: 'week', approximateDays: 7},
    {amount: 2, unit: 'weeks', approximateDays: 14},
    {amount: 1, unit: 'month', approximateDays: 30.44},
    {amount: 3, unit: 'months', approximateDays: 91.31},
    {amount: 6, unit: 'months', approximateDays: 182.63},
    {amount: 1, unit: 'year', approximateDays: 365.25},
    {amount: 2, unit: 'years', approximateDays: 730.5},
    {amount: 5, unit: 'years', approximateDays: 1826.25},
    {amount: 10, unit: 'years', approximateDays: 3652.5}
]

export const dateToDay = value => Math.floor(moment.utc(value).startOf('day').valueOf() / DAY_IN_MS)
export const dayToDate = value => moment(value * DAY_IN_MS).utc()

export function dateSliderStops(firstDay, lastDay) {
    if(firstDay == null || lastDay == null) return []
    if(lastDay <= firstDay) return [firstDay]

    const rangeDays = lastDay - firstDay
    const interval = STEP_OPTIONS.reduce((best, option) =>
        Math.abs(rangeDays / option.approximateDays - TARGET_INTERVALS) <
        Math.abs(rangeDays / best.approximateDays - TARGET_INTERVALS) ? option : best
    )

    const firstDate = dayToDate(firstDay)
    const stops = [firstDay]
    for(let index = 1; ; index++) {
        const day = dateToDay(firstDate.clone().add(index * interval.amount, interval.unit))
        if(day >= lastDay) break
        stops.push(day)
    }
    stops.push(lastDay)
    return stops
}
