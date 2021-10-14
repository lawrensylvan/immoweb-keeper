import { Card, Drawer, Popover, Tooltip } from 'antd'
import { useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle } from 'react-leaflet'
import EstateCard from './EstateCard'

export default function MapResults({estates}) {
    
    const position = [50.85, 4.35]

    const [selectedEstate, setSelectedEstate] = useState(null)
 
    // Default OSM
    /*<TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    />*/

    // Other tile layer providers : https://leaflet-extras.github.io/leaflet-providers/preview/

    return (
        <div className='MapResults' style={{display: 'flex', justifyContent: 'center', position: 'relative'}}>

            <div style={{position: 'absolute', left: `100px`, top: `100px`, zIndex: '10000'}}>
                {selectedEstate && <EstateCard estate={selectedEstate} />}
            </div>

            <MapContainer center={position} zoom={13} scrollWheelZoom={false} style={{width: '90%', height: '75vh'}} >
            
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    subdomains='abcd'
                    maxZoom={19}
                    ext="png"
                />

                {estates?.filter(e => e.geolocation?.length === 2).map(e => 
                    <CircleMarker center={[e.geolocation[1], e.geolocation[0]]} radius={6}
                                  pathOptions={{ color: selectedEstate === e ? 'blue' : 'pink' }}
                                  eventHandlers={{click: (event) => setSelectedEstate(e)}} />
                )}
            </MapContainer>
        </div>
    )
}
