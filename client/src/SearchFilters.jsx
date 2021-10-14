import React, { useState } from 'react'
import { Button, Slider, Space, Switch, Select, Divider, notification, BackTop, InputNumber, Popover } from 'antd'
import { SearchOutlined, AimOutlined, EuroOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import _ from 'lodash'

export default function SearchFilters({fetchEstates}) {

    const [isFirstSearch, setFirstSearch] = useState(true)
    const [shouldDisplayGardenArea, setshouldDisplayGardenArea] = useState(false)

    const [priceRange, setPriceRange] = useState([900000, 1000000])
    const [zipCodes, setZipCodes] = useState([])
    const [onlyWithGarden, setOnlyWithGarden] = useState(false)
    const [minGardenArea, setMinGardenArea] = useState(0)

    const filters = { priceRange, zipCodes, onlyWithGarden }

    return (
        <div className="SearchFilters" style={{display: 'flex'}}>
            <BackTop />
            <Space size="large">

                {/* PRICE RANGE */}
                <Space>
                    <EuroOutlined/>
                    <Slider value={priceRange} onChange={bounds => setPriceRange(bounds)}
                            range={{draggableTrack:true}} max={1000000} step={10000}
                            marks={_.range(0, 1000000, 100000).reduce((acc, n) => ({...acc, [n]: ''}), {})}
                            tooltipVisible style={{width: '15vw'}}
                            tipFormatter={n => n >= 1000000 ? Math.ceil(n/1000000) + 'M€' : n < 1000 ? n + '€' : Math.ceil(n/1000) + 'k€'}
                            />
                </Space>

                <Divider type="vertical" />

                {/* ZIP CODES */}
                <Space>
                    <AimOutlined/>
                    <Select value={zipCodes} onChange={v => setZipCodes(v)}
                            mode="multiple" placeholder="Select localities" style={{ width: '300px' }}
                            optionLabelProp="label" optionFilterProp={"children"} showArrow allowClear>
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
                                             value={minGardenArea} onChange={v => setMinGardenArea(v)}
                                />
                                m²
                                <Button shape="circle" type="dashed"
                                        onClick={() => {setMinGardenArea(0); setshouldDisplayGardenArea(false)}}
                                >
                                    <DeleteOutlined/>
                                </Button>
                            </Space>
                            {/*<Text type="secondary" style={{display:'block', fontSize: '12px'}}>(or no garden area specified)</Text>*/}
                    </div>
                }>  

                    <Switch checked={onlyWithGarden}
                            onChange={b => {setOnlyWithGarden(b); setshouldDisplayGardenArea(b)}}
                            onMouseEnter={() => setshouldDisplayGardenArea(onlyWithGarden)}
                            unCheckedChildren={'🌳 with garden ?'}
                            checkedChildren={minGardenArea > 0 ? `✓ 🌳 garden ≥${minGardenArea}m²` : '✓ with garden 🌳'}
                    />

                </Popover>

                <Divider type="vertical" />

                {/* SUBMIT */}

                <Button onClick={() => {
                    notification.open({
                        message: 'Search ongoing...',
                        description: JSON.stringify(filters),
                        duration: 1
                    })

                    fetchEstates({ variables: {
                        ...filters,
                        zipCodes: zipCodes.length ? zipCodes : undefined,
                        onlyWithGarden: onlyWithGarden || undefined,
                        minGardenArea: minGardenArea > 0 ? minGardenArea : undefined
                    }})
                    setFirstSearch(false)
                }}>
                    {isFirstSearch
                        ? <Space>Search <SearchOutlined /></Space>
                        : <Space>Refresh <ReloadOutlined /></Space>
                    }
                </Button>
                
            </Space>
        </div>
    )
}