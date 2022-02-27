import { useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
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

export default function MapResults({searchFilters}) {

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

                {/* (for other tile layer providers : https://leaflet-extras.github.io/leaflet-providers/preview/ */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    subdomains='abcd'
                    maxZoom={19}
                    ext="png"                    
                />
                <TileLayer
                    url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-hybrid/{z}/{x}/{y}{r}.{ext}"
                    //url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    //url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                    //url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    subdomains='abcd'
                    maxZoom={19}
                    ext="png"
                    opacity={0.5}
                />

                {estatesNearResult?.estatesNear?.map(e => 
                    <CircleMarker center={[e.geolocation[1], e.geolocation[0]]} radius={6}
                                  pathOptions={{ color: selectedImmowebCode === e.immowebCode ? 'blue' : 'pink' }}
                                  eventHandlers={{click: (event) => setSelectedImmowebCode(e.immowebCode)}} key={e.immowebCode} />
                )}

            </MapContainer>
        </div>
    )
}
