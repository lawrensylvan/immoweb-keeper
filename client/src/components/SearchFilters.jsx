import React, { useEffect, useMemo, useState } from 'react'
import { Button, Slider, Space, Switch, Divider, InputNumber, Popover, Typography, Input, Tooltip } from 'antd'
import { EuroOutlined, DeleteOutlined, FileSearchOutlined, ClearOutlined, ArrowsAltOutlined, NumberOutlined, CalendarOutlined, AimOutlined, ExportOutlined, RollbackOutlined } from '@ant-design/icons'
import {gql, useQuery} from '@apollo/client'
import _ from 'lodash'
import moment from 'moment'
import SelectLocalities from './SelectLocalities'
import {dateSliderStops, dateToDay, dayToDate} from '../utils/dateSlider'
import {formatSliderDate} from '../utils/formatDate'

const { Text } = Typography
const ROUTINE_RANGE_QUERY = gql`
    query RoutineAvailabilityRange { routineStatus { firstRunAt } }
`

const formatPrice = value => value > 1000000 ? '∞' : value === 1000000 ? '1M€' : value < 1000 ? `${value}€` : `${Math.ceil(value / 1000)}k€`

export default function SearchFilters({filters, setFilter, clearFilters, rememberedZipCodes, isMapActive,
    onPostalCodesChange, onOpenMap, onRestorePostalCodes}) {

    const {
        priceRange,
        zipCodes,
        propertyTypes,
        onlyWithGarden,
        minGardenArea,
        immowebCode,
        onlyStillAvailable,
        freeText,
        minLivingArea,
        minBedroomCount,
        availabilityDateRange
    } = filters

    const {data: routineRangeData} = useQuery(ROUTINE_RANGE_QUERY)
    const firstRunAt = routineRangeData?.routineStatus?.firstRunAt
    const firstRoutineDay = firstRunAt ? dateToDay(firstRunAt) : null
    const todayDay = dateToDay(moment())
    const availabilityMarks = useMemo(() => Object.fromEntries(
        dateSliderStops(firstRoutineDay, todayDay).map(day => [day, ''])
    ), [firstRoutineDay, todayDay])
    const selectedAvailabilityDays = availabilityDateRange?.length === 2
        ? availabilityDateRange.map(dateToDay)
        : firstRoutineDay == null ? null : [firstRoutineDay, todayDay]

    useEffect(() => {
        if(firstRoutineDay == null || availabilityDateRange?.length === 2) return
        setFilter('availabilityDateRange', [
            dayToDate(firstRoutineDay).startOf('day').toISOString(),
            dayToDate(todayDay).endOf('day').toISOString()
        ])
    }, [availabilityDateRange, firstRoutineDay, setFilter, todayDay])

    const [shouldDisplayGardenArea, setShouldDisplayGardenArea] = useState(false)
    const selectedPropertyTypes = propertyTypes || []
    const togglePropertyType = propertyType => {
        if(selectedPropertyTypes.includes(propertyType)) {
            if(selectedPropertyTypes.length === 1) return
            setFilter('propertyTypes', selectedPropertyTypes.filter(type => type !== propertyType))
        } else {
            setFilter('propertyTypes', [...selectedPropertyTypes, propertyType])
        }
    }
    
    return (
        <Space size={24} className="search-filter-bar">

            <div className="range-filter-stack">
                {/* PRICE RANGE */}
                <div className="compact-range-filter">
                    <EuroOutlined />
                    <span className="range-edge-label range-edge-label-left">{formatPrice((priceRange || [0, null])[0] || 0)}</span>
                    <Slider min={0} max={1010000} step={10000}
                            value={(priceRange || [0, 1010000]).map(n => n === null ? 1010000 : n)}
                            onChange={bounds => setFilter('priceRange', bounds.map(n => n === 1010000 ? null : n))}
                            marks={_.range(0, 1010000, 100000).reduce((acc, n) => ({...acc, [n]: ''}), {})}
                            range={{draggableTrack:true}}
                            tipFormatter={formatPrice}
                    />
                    <span className="range-edge-label range-edge-label-right">{formatPrice((priceRange || [0, null])[1] ?? 1010000)}</span>
                </div>

                {/* HISTORICAL AVAILABILITY RANGE */}
                <div className="compact-range-filter compact-date-range-filter">
                    <CalendarOutlined />
                    {selectedAvailabilityDays
                        ? <>
                            <span className="range-edge-label range-edge-label-left">{formatSliderDate(dayToDate(selectedAvailabilityDays[0]).toDate())}</span>
                            <Slider min={firstRoutineDay} max={todayDay} step={null} marks={availabilityMarks}
                                value={selectedAvailabilityDays}
                                onChange={bounds => setFilter('availabilityDateRange', [
                                    dayToDate(bounds[0]).startOf('day').toISOString(),
                                    dayToDate(bounds[1]).endOf('day').toISOString()
                                ])}
                                range={{draggableTrack: true}}
                                tipFormatter={day => formatSliderDate(dayToDate(day).toDate())}
                            />
                            <span className="range-edge-label range-edge-label-right">{formatSliderDate(dayToDate(selectedAvailabilityDays[1]).toDate())}</span>
                        </>
                        : <span className="date-range-loading">Loading routine dates…</span>}
                </div>
            </div>

            <Space style={{display: 'flex', flexDirection: 'column'}}>

                {/* ZIP CODES */}
                {filters.bounds
                    ? <Space>
                        <AimOutlined />
                        <div className="map-area-location-filter">
                            <em>selected area on map</em>
                            {!isMapActive && <Tooltip title="Open Map results">
                                <Button size="small" icon={<ExportOutlined />} onClick={onOpenMap} aria-label="Open Map results" />
                            </Tooltip>}
                            <Tooltip title={rememberedZipCodes?.length ? 'Restore postal-code selection' : 'Remove map-area filter'}>
                                <Button size="small" icon={<RollbackOutlined />} onClick={onRestorePostalCodes} aria-label="Restore postal-code selection" />
                            </Tooltip>
                        </div>
                    </Space>
                    : <SelectLocalities value={zipCodes} onChange={onPostalCodesChange} />}

                {/* FREE TEXT */}
                <Space>
                    <FileSearchOutlined/>
                    <Input value={freeText || ''} onChange={e => setFilter('freeText', e.target.value)}
                            placeholder="free search" style={{ width: '320px' }}
                            allowClear />
                </Space>

            </Space>

            <Space style={{display: 'flex', flexDirection: 'column' }}>

                {/* PROPERTY TYPE */}
                <Button.Group className="property-type-filter">
                    <Button type={selectedPropertyTypes.includes('APARTMENT') ? 'primary' : 'default'}
                        title="Flats" aria-label="Flats" aria-pressed={selectedPropertyTypes.includes('APARTMENT')}
                        onClick={() => togglePropertyType('APARTMENT')}>
                        ▦ <span className="property-type-label">flats</span>
                    </Button>
                    <Button type={selectedPropertyTypes.includes('HOUSE') ? 'primary' : 'default'}
                        title="Houses" aria-label="Houses" aria-pressed={selectedPropertyTypes.includes('HOUSE')}
                        onClick={() => togglePropertyType('HOUSE')}>
                        ⌂ <span className="property-type-label">houses</span>
                    </Button>
                </Button.Group>

                {/* GARDEN */}
                <Popover arrow visible={shouldDisplayGardenArea} content={
                    <div onMouseLeave={() => setShouldDisplayGardenArea(false)}>
                            <Space>
                                ≥
                                <InputNumber style={{width:'64px'}} autoFocus
                                            min={0} max={999} step={10}
                                            value={minGardenArea} onChange={v => setFilter('minGardenArea', v) }
                                />
                                m²
                                <Button shape="circle" type="dashed"
                                        onClick={() => { setFilter('minGardenArea', 0); setShouldDisplayGardenArea(false) }}
                                >
                                    <DeleteOutlined/>
                                </Button>
                            </Space>
                            {<Text type="secondary" style={{display:'block', fontSize: '12px'}}>(or no garden area specified)</Text>}
                    </div>
                }>  

                    <Switch checked={onlyWithGarden}
                            style={{minWidth: '150px'}}
                            onChange={b => {setFilter('onlyWithGarden', b); setShouldDisplayGardenArea(b) }}
                            onMouseEnter={() => setShouldDisplayGardenArea(onlyWithGarden)}
                            unCheckedChildren={'🌳 with garden ?'}
                            checkedChildren={minGardenArea > 0 ? `✓ 🌳 garden ≥${minGardenArea}m²` : '✓ with garden 🌳'}
                    />

                </Popover>

                {/* ONLY AVAILABLE */}
                <Switch checked={onlyStillAvailable}
                        style={{minWidth: '150px'}}
                        onChange={b => {setFilter('onlyStillAvailable', b)}}
                        unCheckedChildren={'only still available ?'}
                        checkedChildren={'✓ only still available !'}
                />

            </Space>

            <Space style={{display: 'flex', flexDirection: 'column' }}>

                {/* IMMOWEB CODE */}
                <Space>
                    <NumberOutlined />
                    <InputNumber style={{width:'167px'}} controls={false}
                        value={immowebCode} onChange={v => setFilter('immowebCode', v)} placeholder="immoweb code"
                    />
                </Space>
                
                <Space>
                    {/* BEDROOM COUNT */}
                    <Space>
                        <span role="img" aria-label="Minimum bedroom count">🛏</span>
                        <InputNumber style={{width:'64px'}} min={0} step={1} precision={0}
                            value={minBedroomCount || 0} onChange={v => setFilter('minBedroomCount', v)}
                        /> 
                    </Space>
                    
                    {/* LIVING AREA */}
                    <Space>
                        <ArrowsAltOutlined />
                        <InputNumber style={{width:'73px'}}
                            value={minLivingArea || 0} onChange={v => setFilter('minLivingArea', v)}
                            min={0} max={1000} step={25}
                            formatter={t => t + ' m²'}
                        />
                    </Space>
                </Space>
                
            </Space>

            <div className="filter-clear-group">
                <Divider type="vertical" />

                <Space style={{display: 'flex', flexDirection: 'column'}}>

                    {/* CLEAR */}
                    <Button onClick={() => clearFilters()} style={{width: '100px'}}>
                        <Space>Clear all<ClearOutlined/></Space>
                    </Button>

                {/* SUBMIT 
                <Button onClick={() => fetchResults()} style={{width: '100px'}}>
                    {searchStatus === SearchResultStatus.NO_SEARCH
                        ? <Space>Search <SearchOutlined/></Space>
                        : <Space>Refresh <ReloadOutlined/></Space>
                    }
                </Button>
                    */}

                </Space>
            </div>
            
        </Space>
    )
}
