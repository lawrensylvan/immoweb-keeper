import { useQuery } from '@apollo/client'
import React, { Component, useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, LayersControl, useMapEvents } from 'react-leaflet'
import EstateCard from './EstateCard'
import { gql } from '@apollo/client'
import { useSearch } from '../hooks/useSearch'

const ESTATES_NEAR_QUERY = gql`
query estatesNear(
    $location: [Float]
    $distanceMeters: Int
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
    $onlyLiked: Boolean       
    $onlyVisited: Boolean) {
    estatesNear(
        location: $location
        distanceMeters: $distanceMeters
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
        onlyLiked: $onlyLiked
        onlyVisited: $onlyVisited
    )
    {
        immowebCode,
        geolocation
    }
}
`

function EstateMarkers({estates, selectedImmowebCode, onSelect}) {
    const [baseLayer, setBaseLayer] = useState('Street')
    useMapEvents({baselayerchange: event => setBaseLayer(event.name)})
    const unselectedColor = baseLayer === 'Street' ? '#69b1ff' : 'pink'

    return estates?.map(estate => {
        const color = selectedImmowebCode === estate.immowebCode ? '#1677ff' : unselectedColor
        return <CircleMarker center={[estate.geolocation[1], estate.geolocation[0]]} radius={6}
            pathOptions={{color, fillColor: color, fillOpacity: 0.8}}
            eventHandlers={{click: () => onSelect(estate.immowebCode)}} key={estate.immowebCode} />
    }) || null
}

class MapErrorBoundary extends Component {
    state = {error: null}
    static getDerivedStateFromError(error) { return {error} }
    render() {
        if(this.state.error) return <div role="alert">Unable to display map: {this.state.error.message}</div>
        return this.props.children
    }
}

function MapResultsContent({searchFilters}) {

    // State of the map
    const [[longitude, latitude], setCenter] = useState([4.38, 50.86]) // TODO : maintain when map moves (only after some time)
    // TODO: add zoom level as state
    // TODO: set initial bounds and zoom level according to search results

    // All locations query
    // (since results from props would be paginated, we run a custom non paginated search but with only id and location as a result to gain perf)
    // TODO: include the filters from props (the main search context)
    const { data: estatesNearResult, loading, error } = useQuery(ESTATES_NEAR_QUERY, {variables: {
        location: [longitude, latitude],
        distanceMeters: 2000, // TODO : compute on basis of zoom level
        ...searchFilters
    }})
    console.log(error)
    
    // Selected item
    const [selectedImmowebCode, setSelectedImmowebCode] = useState(null)
    const { searchResults: selectedEstateResult, setFilter } = useSearch()
    useEffect(() => selectedImmowebCode && setFilter('immowebCode', selectedImmowebCode), [selectedImmowebCode]) // load full estate data when user clicks on a point
    const selectedEstate = selectedEstateResult?.[0]
    
    return (
        <div className='MapResults' style={{display: 'flex', justifyContent: 'center', position: 'relative'}}>

            {selectedEstate &&
            <div style={{position: 'absolute', left: 120, top: 50, zIndex: 1000}}>
                <EstateCard estate={selectedEstate} />
            </div>
            }

            <MapContainer
                center={[latitude, longitude]} 
                zoom={13}
                style={{width: '90%', height: '75vh'}} >

                <LayersControl position="topright" collapsed>
                    <LayersControl.BaseLayer checked name="Street">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            maxZoom={19}
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Light">
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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

                <EstateMarkers estates={estatesNearResult?.estatesNear} selectedImmowebCode={selectedImmowebCode}
                    onSelect={setSelectedImmowebCode} />

            </MapContainer>
        </div>
    )
}

export default function MapResults(props) {
    return <MapErrorBoundary><MapResultsContent {...props} /></MapErrorBoundary>
}
