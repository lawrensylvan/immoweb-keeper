import React, { useContext, useState } from 'react'
import { Button, Slider, Space, Switch, Divider, InputNumber, Popover, Typography, Input } from 'antd'
import { SearchOutlined, EuroOutlined, ReloadOutlined, DeleteOutlined, FileSearchOutlined, ClearOutlined, CodepenOutlined, ArrowsAltOutlined, NumberOutlined } from '@ant-design/icons'
import _ from 'lodash'
import { SearchContext, SearchResultStatus } from '../hooks/useSearch'
import SelectLocalities from './SelectLocalities'

const { Text } = Typography

export default function SearchFilters({fetchEstates}) {

    const { searchFilters, setFilter, clearFilters, fetchResults, searchStatus } = useContext(SearchContext)
    
    const {
        priceRange,
        zipCodes,
        onlyWithGarden,
        minGardenArea,
        immowebCode,
        onlyStillAvailable,
        freeText,
        minLivingArea,
        minBedroomCount
    } = searchFilters

    const [shouldDisplayGardenArea, setShouldDisplayGardenArea] = useState(false)
    
    return (
        <Space size="medium" style={{display: 'flex', justifyContent: 'space-evenly', alignContent: 'center'}}>

            {/* PRICE RANGE */}
            <Space>
                <EuroOutlined />
                <Slider min={0} max={1010000} step={10000}
                        value={(priceRange || [0, 1010000]).map(n => n === null ? 1010000 : n)}
                        onChange={bounds => setFilter('priceRange', bounds.map(n => n === 1010000 ? null : n))}
                        marks={_.range(0, 1010000, 100000).reduce((acc, n) => ({...acc, [n]: ''}), {})}
                        range={{draggableTrack:true}} style={{width: '25vw', marginBottom: -21, marginLeft: 15}} tooltipVisible
                        tipFormatter={n => n > 1000000 ? '∞' : n === 1000000 ? Math.ceil(n/1000000) + 'M€' : n < 1000 ? n + '€' : Math.ceil(n/1000) + 'k€'}
                />
            </Space>

            <Space style={{display: 'flex', flexDirection: 'column'}}>

                {/* ZIP CODES */}
                <SelectLocalities value={zipCodes} onChange={v => setFilter('zipCodes', v)} />

                {/* FREE TEXT */}
                <Space>
                    <FileSearchOutlined/>
                    <Input value={freeText || ''} onChange={e => setFilter('freeText', e.target.value)}
                            placeholder="free search" style={{ width: '210px' }}
                            allowClear />
                </Space>

            </Space>

            <Space style={{display: 'flex', flexDirection: 'column' }}>

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
                    <InputNumber style={{width:'151px'}} controls={false}
                        value={immowebCode} onChange={v => setFilter('immowebCode', v)} placeholder="immoweb code"
                    />
                </Space>
                
                <Space>
                    {/* BEDROOM COUNT */}
                    <Space>
                        <CodepenOutlined />
                        <InputNumber style={{width:'48px'}} controls={false}
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

            <Divider type="vertical" />

            <Space style={{display: 'flex', flexDirection: 'column'}}>

                {/* CLEAR */}    
                <Button onClick={() => clearFilters()} style={{width: '100px'}}>
                    <Space>Clear all<ClearOutlined/></Space>
                </Button>

                {/* SUBMIT */}
                <Button onClick={() => fetchResults()} style={{width: '100px'}}>
                    {searchStatus === SearchResultStatus.NO_SEARCH
                        ? <Space>Search <SearchOutlined/></Space>
                        : <Space>Refresh <ReloadOutlined/></Space>
                    }
                </Button>

            </Space>
            
        </Space>
    )
}