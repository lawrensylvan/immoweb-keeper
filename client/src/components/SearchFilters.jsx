import React, { useRef, useState } from 'react'
import { Button, Slider, Space, Switch, Select, Divider, notification, BackTop, InputNumber, Popover } from 'antd'
import { SearchOutlined, AimOutlined, EuroOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import _ from 'lodash'

export default function SearchFilters({fetchEstates}) {

    const [isFirstSearch, setFirstSearch] = useState(true)
    const [shouldDisplayGardenArea, setshouldDisplayGardenArea] = useState(false)

    const [priceRange, setPriceRange] = useState([300000, 600000])
    const [zipCodes, setZipCodes] = useState([])
    const [onlyWithGarden, setOnlyWithGarden] = useState(false)
    const [minGardenArea, setMinGardenArea] = useState(0)
    const [immowebCode, setImmowebCode] = useState(null)
    
    const filters = { priceRange, zipCodes, onlyWithGarden }


    const interval = useRef()

    const fetchSoon = () => {
        if(interval.current) {
            clearTimeout(interval.current)
        }
        interval.current = setTimeout(() => {
            fetch()
        }, 2000)
    }

    const fetch = () => {
        notification.open({
            message: 'Search ongoing...',
            description: JSON.stringify(filters),
            duration: 1
        })

        fetchEstates({ variables: {
            ...filters,
            zipCodes: zipCodes.length ? zipCodes : undefined,
            onlyWithGarden: onlyWithGarden || undefined,
            minGardenArea: onlyWithGarden && minGardenArea > 0 ? minGardenArea : undefined,
            priceRange: priceRange[1] ? priceRange : [priceRange[0], 1000000000],
            immowebCode: immowebCode || undefined
        }})
        setFirstSearch(false)
    }

    return (
        <div className="SearchFilters" style={{display: 'flex'}}>
            <BackTop />
            <Space size="large">

                {/* PRICE RANGE */}
                <Space>
                    <EuroOutlined/>
                    <Slider min={0} max={1010000} step={10000}
                            value={priceRange.map(n => n === null ? 1010000 : n)}
                            onChange={bounds => setPriceRange(bounds.map(n => n === 1010000 ? null : n)) || fetchSoon()}
                            marks={_.range(0, 1010000, 100000).reduce((acc, n) => ({...acc, [n]: ''}), {})}
                            range={{draggableTrack:true}} style={{width: '25vw'}} tooltipVisible
                            tipFormatter={n => n > 1000000 ? '∞' : n === 1000000 ? Math.ceil(n/1000000) + 'M€' : n < 1000 ? n + '€' : Math.ceil(n/1000) + 'k€'}
                    />
                </Space>

                <Divider type="vertical" />

                {/* ZIP CODES */}
                <Space>
                    <AimOutlined/>
                    <Select value={zipCodes} onChange={v => setZipCodes(v) || fetchSoon()}
                            mode="multiple" placeholder="Select localities" style={{ width: '230px' }}
                            optionLabelProp="label" optionFilterProp={"children"} showArrow allowClear>
                        <Select.Option value={1000} label="Bruxelles">1000 · Bruxelles</Select.Option>
                        <Select.Option value={1030} label="Schaerbeek">1030 · Schaerbeek</Select.Option>
                        <Select.Option value={1140} label="Evere">1140 · Evere</Select.Option>
                    </Select>
                </Space>

                <Divider type="vertical" />
                
                {/* GARDEN */}
                <Popover arrow visible={shouldDisplayGardenArea} content={
                    <div onMouseLeave={() => setshouldDisplayGardenArea(false)}>
                            <Space>
                                ≥
                                <InputNumber style={{width:'64px'}} autoFocus
                                             min={0} max={999} step={10}
                                             value={minGardenArea} onChange={v => setMinGardenArea(v) || fetchSoon()}
                                />
                                m²
                                <Button shape="circle" type="dashed"
                                        onClick={() => {setMinGardenArea(0); setshouldDisplayGardenArea(false); fetchSoon()}}
                                >
                                    <DeleteOutlined/>
                                </Button>
                            </Space>
                            {/*<Text type="secondary" style={{display:'block', fontSize: '12px'}}>(or no garden area specified)</Text>*/}
                    </div>
                }>  

                    <Switch checked={onlyWithGarden}
                            onChange={b => {setOnlyWithGarden(b); setshouldDisplayGardenArea(b); fetchSoon()}}
                            onMouseEnter={() => setshouldDisplayGardenArea(onlyWithGarden)}
                            unCheckedChildren={'🌳 with garden ?'}
                            checkedChildren={minGardenArea > 0 ? `✓ 🌳 garden ≥${minGardenArea}m²` : '✓ with garden 🌳'}
                    />

                </Popover>

                {/* IMMOWEB CODE */}
                <InputNumber style={{width:'110px'}} controls={false}
                    value={immowebCode} onChange={v => setImmowebCode(v) || fetchSoon()} placeholder="#immoweb"
                />

                <Divider type="vertical" />

                {/* SUBMIT */}

                <Button onClick={() => fetch()}>
                    {isFirstSearch
                        ? <Space>Search <SearchOutlined /></Space>
                        : <Space>Refresh <ReloadOutlined /></Space>
                    }
                </Button>
                
            </Space>
        </div>
    )
}