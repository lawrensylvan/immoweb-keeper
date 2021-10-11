import React, { useState } from 'react'
import { Button, Slider, Space, Switch, Select, Divider, notification, BackTop } from 'antd'
import { SearchOutlined, AimOutlined, EuroOutlined, ReloadOutlined } from '@ant-design/icons'
import _ from 'lodash'

export default function SearchFilters({fetchEstates}) {

    const [isFirstSearch, setFirstSearch] = useState(true)

    const [priceRange, setPriceRange] = useState([0, 500000])
    const [zipCodes, setZipCodes] = useState([])
    const [onlyWithGarden, setOnlyWithGarden] = useState(false)

    return (
        <div className="SearchFilters" style={{display: 'flex'}}>
            <BackTop />
            <Space size="large">

                {/* Price range slider */}
                <Space>
                    <EuroOutlined/>
                    <Slider value={priceRange} onChange={bounds => setPriceRange(bounds)}
                            range={{draggableTrack:true}} max={500000} step={10000}
                            marks={_.range(0, 500000, 100000).reduce((acc, n) => ({...acc, [n]: ''}), {})}
                            tooltipVisible style={{width: '15vw'}}
                            tipFormatter={n => Math.ceil(n/1000) + 'k€'}
                             />
                </Space>

                <Divider type="vertical" />

                {/* Zip code(s) selector */}
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
                
                {/* Only with garden checkbox */}

                <Switch value={onlyWithGarden} onChange={b => setOnlyWithGarden(b)}
                        checkedChildren="✓ with garden 🌳" unCheckedChildren="🌳 with garden ?"
                 />

                <Divider type="vertical" />

                {/* Submit button */}

                <Button onClick={() => {
                    const variables = { priceRange, zipCodes, onlyWithGarden }

                    notification.open({
                        message: 'Search ongoing...',
                        description: JSON.stringify(variables),
                        duration: 1
                    })

                    fetchEstates({ variables: {
                        ...variables,
                        onlyWithGarden: onlyWithGarden || undefined,
                        zipCodes: zipCodes.length ? zipCodes : undefined
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