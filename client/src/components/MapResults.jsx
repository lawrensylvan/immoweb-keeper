import { useQuery } from '@apollo/client'
import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, LayersControl, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import EstateCard from './EstateCard'
import { gql } from '@apollo/client'
import { Button } from 'antd'
import { useSearch } from '../hooks/useSearch'

const ESTATES_NEAR_QUERY = gql`
query estatesNear(
    $bounds: [Float!]
    $immowebCode: Int
    $priceRange: [Int]
    $zipCodes: [Int]
    $propertyTypes: [PropertyType!]
    $onlyWithGarden: Boolean
    $minGardenArea: Int
    $minLivingArea: Int
    $minBedroomCount: Int
    $freeText: String
    $onlyStillAvailable: Boolean
    $availabilityDateRange: [Date!]
    $onlyLiked: Boolean       
    $onlyVisited: Boolean) {
    estatesNear(
        bounds: $bounds
        immowebCode: $immowebCode
        priceRange: $priceRange
        zipCodes: $zipCodes
        propertyTypes: $propertyTypes
        onlyWithGarden: $onlyWithGarden
        minGardenArea: $minGardenArea
        minLivingArea: $minLivingArea
        minBedroomCount: $minBedroomCount
        freeText: $freeText
        onlyStillAvailable: $onlyStillAvailable
        availabilityDateRange: $availabilityDateRange
        onlyLiked: $onlyLiked
        onlyVisited: $onlyVisited
    )
    {
        points {
            immowebCode
            geolocation
            propertyType
            price
            livingArea
            gardenArea
            hasGarden
            modificationDate
            disappearanceDate
            isSold
            isUnderOption
        }
        truncated
        limit
    }
}
`

const MAP_CENTER = [50.86, 4.38]
const BELGIUM_BOUNDS = [[49.45, 2.45], [51.65, 6.45]]
const BELGIUM_PAN_BOUNDS = [[48.75, 1.45], [52.35, 7.45]]
const CLUSTER_SIZE_PIXELS = 60
const MIN_MARKER_RADIUS = 5
const MAX_MARKER_RADIUS = 24
const NO_GARDEN_COLOR = '#a0a0a0'
const HOUSE_COLOR = '#1677ff'
const APARTMENT_COLOR = '#722ed1'
const SELECTED_ESTATE_QUERY_OPTIONS = {fetchPolicy: 'no-cache'}

const normalizedRatio = (value, minimumValue, maximumValue) => {
    if(maximumValue === minimumValue) return 0.5
    return Math.max(0, Math.min(1, (value - minimumValue) / (maximumValue - minimumValue)))
}

const interpolateColor = (start, end, ratio) => {
    const channel = index => Math.round(start[index] + (end[index] - start[index]) * ratio)
    return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

const formatPrice = price => price == null
    ? 'Unknown'
    : new Intl.NumberFormat('fr-BE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(price)

const formatArea = area => area == null ? 'Unknown' : `${area} m²`

const pricePerSquareMeter = estate => {
    const price = Number(estate.price)
    const livingArea = Number(estate.livingArea)
    return Number.isFinite(price) && Number.isFinite(livingArea) && livingArea > 0
        ? price / livingArea
        : null
}

const valueForMode = (estate, mode) => {
    if(mode === 'recency') {
        const value = new Date(estate.modificationDate).getTime()
        return Number.isFinite(value) ? value : null
    }
    if(mode === 'pricePerSquareMeter') return pricePerSquareMeter(estate)
    const value = estate[mode]
    if(value == null) return null
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
}

const percentile = (sortedValues, ratio) => {
    if(!sortedValues.length) return null
    const index = (sortedValues.length - 1) * ratio
    const lowerIndex = Math.floor(index)
    const upperIndex = Math.ceil(index)
    if(lowerIndex === upperIndex) return sortedValues[lowerIndex]
    const weight = index - lowerIndex
    return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
}

const distributionForMode = (estates, mode) => {
    if(!['price', 'pricePerSquareMeter', 'livingArea', 'gardenArea', 'recency'].includes(mode)) return null
    const values = (estates || [])
        .filter(estate => mode !== 'gardenArea' || estate.hasGarden)
        .map(estate => valueForMode(estate, mode))
        .filter(value => value != null)
        .sort((a, b) => a - b)
    if(!values.length) return null
    return {
        low: percentile(values, 0.05),
        median: percentile(values, 0.5),
        high: percentile(values, 0.95)
    }
}

const percentileColorRatio = (value, distribution) => {
    if(!distribution) return 0.5
    const {low, median, high} = distribution
    if(low === high) return 0.5
    if(value <= median) {
        return median === low ? 0.5 : normalizedRatio(value, low, median) * 0.5
    }
    return median === high ? 0.5 : 0.5 + normalizedRatio(value, median, high) * 0.5
}

const formatPricePerSquareMeter = estate => {
    const value = pricePerSquareMeter(estate)
    return value == null
        ? 'Unknown'
        : `${new Intl.NumberFormat('fr-BE', {maximumFractionDigits: 0}).format(value)} €/m²`
}

const formatRecency = modificationDate => {
    const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(modificationDate).getTime()) / 86400000))
    if(elapsedDays === 0) return 'Today'
    return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`
}

const formatDisappearanceDate = disappearanceDate => new Intl.DateTimeFormat('fr-BE').format(new Date(disappearanceDate))

const tooltipValue = (estate, mode) => {
    if(mode === 'uniform') return null
    if(mode === 'price') return formatPrice(estate.price)
    if(mode === 'pricePerSquareMeter') return formatPricePerSquareMeter(estate)
    if(mode === 'livingArea') return `🏠 ${formatArea(estate.livingArea)}`
    if(mode === 'gardenArea') return estate.hasGarden
        ? `🌳 ${formatArea(estate.gardenArea)}`
        : '🌳 No garden'
    if(mode === 'availability') {
        if(estate.isSold || estate.disappearanceDate) return estate.disappearanceDate
            ? `Sold / disappeared — ${formatDisappearanceDate(estate.disappearanceDate)}`
            : 'Sold / disappeared'
        return estate.isUnderOption ? 'Under option' : 'Listed'
    }
    if(mode === 'propertyType') return estate.propertyType === 'APARTMENT' ? 'Flat' : 'House'
    if(mode === 'recency') return formatRecency(estate.modificationDate)
    return 'Unknown'
}

const serializeBounds = bounds => [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth()
]

const applyBelgiumMinimumZoom = map => {
    const minimumZoom = map.getBoundsZoom(BELGIUM_BOUNDS)
    map.setMinZoom(minimumZoom)
    if(map.getZoom() < minimumZoom) map.setZoom(minimumZoom)
}

function MapViewportQuery({onUserBoundsChange}) {
    const map = useMap()
    const timeoutRef = useRef(null)
    const lastUserInteractionRef = useRef(0)

    useEffect(() => {
        const container = map.getContainer()
        const markUserInteraction = () => { lastUserInteractionRef.current = Date.now() }
        const markZoomControlInteraction = event => {
            if(event.target.closest('.leaflet-control-zoom')) markUserInteraction()
        }
        const handleMoveEnd = () => {
            if(Date.now() - lastUserInteractionRef.current > 2000) return
            clearTimeout(timeoutRef.current)
            timeoutRef.current = setTimeout(
                () => onUserBoundsChange(serializeBounds(map.getBounds())),
                250
            )
        }

        container.addEventListener('pointerdown', markUserInteraction)
        container.addEventListener('wheel', markUserInteraction)
        container.addEventListener('keydown', markUserInteraction)
        container.addEventListener('click', markZoomControlInteraction, true)
        map.on('moveend', handleMoveEnd)
        return () => {
            clearTimeout(timeoutRef.current)
            container.removeEventListener('pointerdown', markUserInteraction)
            container.removeEventListener('wheel', markUserInteraction)
            container.removeEventListener('keydown', markUserInteraction)
            container.removeEventListener('click', markZoomControlInteraction, true)
            map.off('moveend', handleMoveEnd)
        }
    }, [map, onUserBoundsChange])

    return null
}

function FitToPostalCodeResults({estates, enabled, selectionKey}) {
    const map = useMap()
    const lastSelectionKey = useRef(null)

    useEffect(() => {
        if(!enabled || !estates?.length || lastSelectionKey.current === selectionKey) return
        const coordinates = estates
            .map(estate => estate.geolocation)
            .filter(location => Array.isArray(location) && location.length === 2 && location.every(Number.isFinite))
            .map(([longitude, latitude]) => [latitude, longitude])
        if(!coordinates.length) return
        lastSelectionKey.current = selectionKey
        map.fitBounds(coordinates, {padding: [32, 32], maxZoom: 14, animate: false})
    }, [enabled, estates, map, selectionKey])

    return null
}

function BelgiumZoomLimit() {
    const map = useMapEvents({
        resize: event => applyBelgiumMinimumZoom(event.target)
    })

    useEffect(() => applyBelgiumMinimumZoom(map), [map])

    return null
}

function EstateMarkers({estates, selectedImmowebCode, onSelect, onClearSelection, clusterMarkers, markerSizeBy, markerColorBy}) {
    const [baseLayer, setBaseLayer] = useState('Light')
    const [zoom, setZoom] = useState(13)
    const map = useMapEvents({
        baselayerchange: event => setBaseLayer(event.name),
        zoomend: event => setZoom(event.target.getZoom()),
        click: onClearSelection
    })
    const unselectedColor = baseLayer === 'Satellite' ? 'pink' : '#69b1ff'

    const markerRadii = useMemo(() => {
        const radii = new Map()
        if(markerSizeBy === 'uniform') return radii

        const distribution = distributionForMode(estates, markerSizeBy)
        if(!distribution) return radii

        estates?.forEach(estate => {
            const value = valueForMode(estate, markerSizeBy)
            if(value == null) return
            const ratio = normalizedRatio(value, distribution.low, distribution.high)
            radii.set(estate.immowebCode,
                MIN_MARKER_RADIUS + Math.sqrt(ratio) * (MAX_MARKER_RADIUS - MIN_MARKER_RADIUS))
        })

        return radii
    }, [estates, markerSizeBy])

    const markerColors = useMemo(() => {
        const colors = new Map()
        if(markerColorBy === 'uniform') return colors

        if(markerColorBy === 'availability') {
            estates?.forEach(estate => colors.set(estate.immowebCode,
                estate.isSold || estate.disappearanceDate
                    ? '#f5222d'
                    : estate.isUnderOption ? '#fa8c16' : '#1677ff'))
            return colors
        }

        if(markerColorBy === 'propertyType') {
            estates?.forEach(estate => colors.set(estate.immowebCode,
                estate.propertyType === 'APARTMENT' ? APARTMENT_COLOR : HOUSE_COLOR))
            return colors
        }

        const distribution = distributionForMode(estates, markerColorBy)

        estates?.forEach(estate => {
            if(markerColorBy === 'gardenArea' && !estate.hasGarden) {
                colors.set(estate.immowebCode, NO_GARDEN_COLOR)
                return
            }

            const value = valueForMode(estate, markerColorBy)
            if(value == null || !Number.isFinite(value)) {
                colors.set(estate.immowebCode, NO_GARDEN_COLOR)
                return
            }
            const ratio = percentileColorRatio(value, distribution)
            if(markerColorBy === 'price' || markerColorBy === 'pricePerSquareMeter') {
                colors.set(estate.immowebCode, `hsl(${120 * (1 - ratio)}, 75%, 42%)`)
            } else if(markerColorBy === 'recency') {
                colors.set(estate.immowebCode, interpolateColor([150, 150, 150], [22, 119, 255], ratio))
            } else {
                colors.set(estate.immowebCode, interpolateColor([160, 230, 170], [20, 105, 45], ratio))
            }
        })

        return colors
    }, [estates, markerColorBy])

    const clusters = useMemo(() => {
        const cells = new Map()

        estates?.forEach(estate => {
            if(!estate.geolocation || estate.geolocation.length < 2) return

            const position = [estate.geolocation[1], estate.geolocation[0]]
            const point = map.project(position, zoom)
            const isSelected = estate.immowebCode === selectedImmowebCode
            const key = isSelected || !clusterMarkers
                ? `selected-${estate.immowebCode}`
                : `${Math.floor(point.x / CLUSTER_SIZE_PIXELS)}-${Math.floor(point.y / CLUSTER_SIZE_PIXELS)}`
            const cluster = cells.get(key) || {estates: [], latitude: 0, longitude: 0}

            cluster.estates.push(estate)
            cluster.latitude += position[0]
            cluster.longitude += position[1]
            cells.set(key, cluster)
        })

        return Array.from(cells.values()).map(cluster => ({
            ...cluster,
            center: [
                cluster.latitude / cluster.estates.length,
                cluster.longitude / cluster.estates.length
            ]
        }))
    }, [clusterMarkers, estates, map, selectedImmowebCode, zoom])

    return clusters.map(cluster => {
        if(cluster.estates.length === 1) {
            const estate = cluster.estates[0]
            const isSelected = selectedImmowebCode === estate.immowebCode
            const fillColor = markerColors.get(estate.immowebCode)
                || (isSelected ? '#1677ff' : unselectedColor)
            const tooltipValues = [
                tooltipValue(estate, markerSizeBy),
                tooltipValue(estate, markerColorBy)
            ].filter(Boolean)
            const radius = markerRadii.get(estate.immowebCode) || 6
            const MarkerTooltip = () => tooltipValues.length > 0 &&
                <Tooltip direction="top" className="estate-marker-tooltip" opacity={0.95}>
                    {tooltipValues.map((value, index) => <div key={index}>{value}</div>)}
                </Tooltip>

            const size = Math.max(18, Math.round(radius * 2))
            const glyph = estate.propertyType === 'APARTMENT' ? '▦' : '⌂'
            const icon = divIcon({
                className: 'estate-property-div-icon',
                html: `<span class="estate-property-marker" style="width:${size}px;height:${size}px;background:${fillColor};border-color:${isSelected ? '#003a8c' : fillColor};font-size:${Math.max(12, Math.round(size * 0.62))}px">${glyph}</span>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2]
            })

            return <Marker position={cluster.center} icon={icon}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{mouseover: event => {
                    event.target.setZIndexOffset(1000)
                    onSelect(estate)
                }, click: () => onSelect(estate)}} key={estate.immowebCode}>
                <MarkerTooltip />
            </Marker>
        }

        return <CircleMarker center={cluster.center} radius={18}
            pathOptions={{color: '#0958d9', fillColor: '#1677ff', fillOpacity: 0.9, weight: 2}}
            eventHandlers={{click: () => map.setView(cluster.center, Math.min(zoom + 2, 19))}}
            key={`cluster-${zoom}-${cluster.center.join('-')}`}>
            <Tooltip permanent direction="center" className="estate-cluster-count">
                {cluster.estates.length}
            </Tooltip>
        </CircleMarker>
    })
}

const formatLegendValue = (value, mode) => {
    if(value == null) return '—'
    if(mode === 'price') return `${Math.round(value / 1000).toLocaleString('fr-BE')}k€`
    if(mode === 'pricePerSquareMeter') return `${Math.round(value).toLocaleString('fr-BE')} €/m²`
    if(mode === 'gardenArea') return `${Math.round(value).toLocaleString('fr-BE')} m²`
    if(mode === 'recency') return formatRecency(new Date(value).toISOString())
    return Math.round(value).toLocaleString('fr-BE')
}

function MarkerColorLegend({mode, estates}) {
    const distribution = useMemo(() => distributionForMode(estates, mode), [estates, mode])
    if(mode === 'uniform') return null

    if(mode === 'availability') return (
        <div className="map-legend">
            <span><i style={{background: '#1677ff'}} />Listed</span>
            <span><i style={{background: '#fa8c16'}} />Under option</span>
            <span><i style={{background: '#f5222d'}} />Sold / disappeared</span>
        </div>
    )

    if(mode === 'propertyType') return (
        <div className="map-legend">
            <span><i style={{background: HOUSE_COLOR}} />⌂ House</span>
            <span><i style={{background: APARTMENT_COLOR}} />▦ Flat</span>
        </div>
    )

    return (
        <div className={`map-legend map-legend-${mode}`}>
            {mode === 'gardenArea' && <span><i style={{background: NO_GARDEN_COLOR}} />No garden</span>}
            <div className="map-legend-scale" />
            <div className="map-legend-labels map-legend-percentiles">
                <span title="5th percentile">{formatLegendValue(distribution?.low, mode)}</span>
                <span title="Median">{formatLegendValue(distribution?.median, mode)}</span>
                <span title="95th percentile">{formatLegendValue(distribution?.high, mode)}</span>
            </div>
        </div>
    )
}

class MapErrorBoundary extends Component {
    state = {error: null}
    static getDerivedStateFromError(error) { return {error} }
    render() {
        if(this.state.error) return <div role="alert">Unable to display map: {this.state.error.message}</div>
        return this.props.children
    }
}

function MapResultsContent({searchFilters, setGlobalFilter, clusterMarkers = false,
    markerSizeBy = 'uniform', markerColorBy = 'uniform', postalCodeCatalog = []}) {
    const [pendingBounds, setPendingBounds] = useState(null)
    const variables = searchFilters
    const { data: estatesNearResult, previousData, loading, error } = useQuery(ESTATES_NEAR_QUERY, {
        variables
    })
    // Apollo clears `data` while a query with new variables is in flight. Keep the
    // last completed points on screen until the replacement response arrives.
    const mapResult = estatesNearResult?.estatesNear || (loading ? previousData?.estatesNear : null)
    const handleUserBoundsChange = useCallback(bounds => setPendingBounds(bounds), [])
    const applyPendingBounds = () => {
        if(!pendingBounds) return
        setGlobalFilter('bounds', pendingBounds)
        setGlobalFilter('zipCodes', undefined)
        setPendingBounds(null)
    }
    const spatialFilterKey = JSON.stringify([searchFilters.bounds, searchFilters.zipCodes])
    useEffect(() => setPendingBounds(null), [spatialFilterKey])
    const initialMapBounds = searchFilters.bounds
        ? [[searchFilters.bounds[1], searchFilters.bounds[0]], [searchFilters.bounds[3], searchFilters.bounds[2]]]
        : null
    
    // Selected item
    const [selectedMapPoint, setSelectedMapPoint] = useState(null)
    const selectedImmowebCode = selectedMapPoint?.immowebCode
    const nonSpatialFiltersKey = useMemo(() => JSON.stringify(
        Object.fromEntries(Object.entries(searchFilters).filter(([name]) => name !== 'bounds'))
    ), [searchFilters])
    const previousNonSpatialFiltersKey = useRef(nonSpatialFiltersKey)

    useEffect(() => {
        if(previousNonSpatialFiltersKey.current !== nonSpatialFiltersKey) {
            previousNonSpatialFiltersKey.current = nonSpatialFiltersKey
            setSelectedMapPoint(null)
        }
    }, [nonSpatialFiltersKey])

    // Do not let a full estate revision overwrite the lightweight map point with the
    // same Apollo cache identity (Estate + immowebCode), notably its geolocation.
    const { searchResults: selectedEstateResult, setFilter } = useSearch(
        {},
        {field: 'modificationDate', order: 'descend'},
        SELECTED_ESTATE_QUERY_OPTIONS
    )
    useEffect(() => selectedImmowebCode && setFilter('immowebCode', selectedImmowebCode), [selectedImmowebCode, setFilter]) // load full estate data when a marker is hovered
    const selectedEstate = selectedImmowebCode != null && selectedEstateResult?.[0]?.immowebCode === selectedImmowebCode
        ? selectedEstateResult[0]
        : null
    const displayedMapPoints = useMemo(() => {
        const points = mapResult?.points || []
        if(!selectedMapPoint) return points

        const selectedIndex = points.findIndex(point => point.immowebCode === selectedMapPoint.immowebCode)
        if(selectedIndex >= 0) {
            return points.map((point, index) => index === selectedIndex ? selectedMapPoint : point)
        }

        // An unbounded query may omit the selected estate because of the map cap.
        // Keep the selected point without exceeding that cap.
        return points.length >= (mapResult?.limit || Infinity)
            ? [...points.slice(0, -1), selectedMapPoint]
            : [...points, selectedMapPoint]
    }, [mapResult, selectedMapPoint])
    
    return (
        <div className='MapResults' style={{display: 'flex', justifyContent: 'center', position: 'relative'}}>
            <div className="map-frame">

                {pendingBounds &&
                <Button type="primary" className="map-show-area-button" onClick={applyPendingBounds}>
                    Show all results in this area
                </Button>}

                {(loading || error || mapResult?.truncated) &&
                <div className={`map-status${error ? ' map-status-error' : ''}${pendingBounds ? ' map-status-below-area-button' : ''}`}>
                    {error
                        ? `Unable to load map points: ${error.message}`
                        : loading
                            ? 'Loading properties in this area…'
                            : searchFilters.bounds
                                ? `Showing the first ${mapResult.limit.toLocaleString()} properties. Zoom in to narrow the area.`
                                : `Showing the first ${mapResult.limit.toLocaleString()} properties for this location.`}
                </div>
                }

                {selectedEstate &&
                <div className="selected-estate-card">
                    <EstateCard estate={selectedEstate} postalCodeCatalog={postalCodeCatalog} />
                </div>
                }

                <MarkerColorLegend mode={markerColorBy} estates={displayedMapPoints} />

                <MapContainer
                    {...(initialMapBounds ? {bounds: initialMapBounds} : {center: MAP_CENTER, zoom: 13})}
                    maxBounds={BELGIUM_PAN_BOUNDS}
                    maxBoundsViscosity={1}
                    style={{width: '100%', height: '100%'}} >

                <MapViewportQuery onUserBoundsChange={handleUserBoundsChange} />
                <FitToPostalCodeResults estates={loading ? [] : displayedMapPoints}
                    enabled={!searchFilters.bounds && Boolean(searchFilters.zipCodes?.length)}
                    selectionKey={(searchFilters.zipCodes || []).join(',')} />
                <BelgiumZoomLimit />

                <LayersControl position="topright" collapsed>
                    <LayersControl.BaseLayer name="Street">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            maxZoom={19}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer checked name="Light">
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_3q6c_1_39a6dacf90766de75eb357e1"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            subdomains="abcd"
                            maxZoom={20}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Tiles &copy; Esri and its imagery providers"
                            maxZoom={19}
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <EstateMarkers estates={displayedMapPoints} selectedImmowebCode={selectedImmowebCode}
                    onSelect={estate => setSelectedMapPoint(current => current?.immowebCode === estate.immowebCode ? current : {...estate})}
                    onClearSelection={() => setSelectedMapPoint(null)} clusterMarkers={clusterMarkers}
                    markerSizeBy={markerSizeBy} markerColorBy={markerColorBy} />

                </MapContainer>
            </div>
        </div>
    )
}

export default function MapResults(props) {
    return <MapErrorBoundary><MapResultsContent {...props} /></MapErrorBoundary>
}
