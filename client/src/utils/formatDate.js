const estateDateFormatter = new Intl.DateTimeFormat('fr-BE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Brussels'
})
const sliderDateFormatter = new Intl.DateTimeFormat('fr-BE', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'Europe/Brussels'
})

export const formatShortDate = value => value == null ? '—' : estateDateFormatter.format(new Date(value))
export const formatSliderDate = value => value == null ? '—' : sliderDateFormatter.format(new Date(value))
