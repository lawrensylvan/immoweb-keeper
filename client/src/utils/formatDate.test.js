import {formatShortDate, formatSliderDate} from './formatDate'

test('estate dates use a four-digit year and slider dates use two digits', () => {
    const date = '2024-09-12T00:00:00Z'
    expect(formatShortDate(date)).toBe('12 sept. 2024')
    expect(formatSliderDate(date)).toBe('12 sept. 24')
})
