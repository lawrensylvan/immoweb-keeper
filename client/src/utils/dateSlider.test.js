import {dateSliderStops, dateToDay, dayToDate} from './dateSlider'

const day = date => dateToDay(`${date}T00:00:00Z`)
const dates = stops => stops.map(stop => dayToDate(stop).format('YYYY-MM-DD'))

test('short histories snap to each day and include both endpoints', () => {
    expect(dates(dateSliderStops(day('2026-09-12'), day('2026-09-19')))).toEqual([
        '2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15',
        '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19'
    ])
})

test('longer histories use calendar-aligned months', () => {
    const stops = dates(dateSliderStops(day('2025-01-01'), day('2026-01-01')))
    expect(stops).toHaveLength(13)
    expect(stops.slice(0, 3)).toEqual(['2025-01-01', '2025-02-01', '2025-03-01'])
    expect(stops[stops.length - 1]).toBe('2026-01-01')
})

test('the current day remains a selectable endpoint between regular stops', () => {
    const stops = dates(dateSliderStops(day('2026-01-01'), day('2026-02-02')))
    expect(stops[0]).toBe('2026-01-01')
    expect(stops[stops.length - 1]).toBe('2026-02-02')
    expect(new Set(stops).size).toBe(stops.length)
})
