import React, { useContext, useState } from 'react'
import { Button, Slider, Space, Switch, Select, Divider, BackTop, InputNumber, Popover, Typography } from 'antd'
import { SearchOutlined, AimOutlined, EuroOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import _ from 'lodash'
import { SearchContext, SearchResultStatus } from '../hooks/useSearch'

const { Text } = Typography

export default function SearchFilters({fetchEstates}) {

    const { searchFilters, setFilter, fetchResults, searchStatus } = useContext(SearchContext)
    
    const {
        priceRange,
        zipCodes,
        onlyWithGarden,
        minGardenArea,
        immowebCode,
        onlyStillAvailable,
        freeText
    } = searchFilters

    const [shouldDisplayGardenArea, setShouldDisplayGardenArea] = useState(false)
    
    return (
        <div className="SearchFilters" style={{display: 'flex'}}>
            <BackTop />
            <Space size="large">

                {/* PRICE RANGE */}
                <Space>
                    <EuroOutlined/>
                    <Slider min={0} max={1010000} step={10000}
                            value={priceRange.map(n => n === null ? 1010000 : n)}
                            onChange={bounds => setFilter('priceRange', bounds.map(n => n === 1010000 ? null : n))}
                            marks={_.range(0, 1010000, 100000).reduce((acc, n) => ({...acc, [n]: ''}), {})}
                            range={{draggableTrack:true}} style={{width: '25vw'}} tooltipVisible
                            tipFormatter={n => n > 1000000 ? '∞' : n === 1000000 ? Math.ceil(n/1000000) + 'M€' : n < 1000 ? n + '€' : Math.ceil(n/1000) + 'k€'}
                    />
                </Space>

            <Space style={{display: 'flex', flexDirection: 'column'}}>

                {/* ZIP CODES */}
                <Space>
                    <AimOutlined/>
                    <Select value={zipCodes} onChange={v => setFilter('zipCodes', v)}
                            mode="multiple" placeholder="Select localities" style={{ width: '230px' }}
                            optionLabelProp="label" optionFilterProp={"children"} showArrow allowClear>
                        <Select.Option value={1000} label="Bruxelles">1000 · Bruxelles</Select.Option>
                        <Select.Option value={1030} label="Schaerbeek">1030 · Schaerbeek</Select.Option>
                        <Select.Option value={1140} label="Evere">1140 · Evere</Select.Option>
                    </Select>
                </Space>

                {/* FREE TEXT */}
                <Space>
                    <FileSearchOutlined/>
                    <Input value={freeText || ''} onChange={e => setFilter('freeText', e.target.value)}
                            placeholder="free search" style={{ width: '230px' }}
                            allowClear />
                </Space>

            </Space>
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
                            onChange={b => {setFilter('onlyWithGarden', b); setShouldDisplayGardenArea(b) }}
                            onMouseEnter={() => setShouldDisplayGardenArea(onlyWithGarden)}
                            unCheckedChildren={'🌳 with garden ?'}
                            checkedChildren={minGardenArea > 0 ? `✓ 🌳 garden ≥${minGardenArea}m²` : '✓ with garden 🌳'}
                    />

                </Popover>

                {/* IMMOWEB CODE */}
                <InputNumber style={{width:'110px'}} controls={false}
                    value={immowebCode} onChange={v => setFilter('immowebCode', v)} placeholder="#immoweb"
                />

                <Divider type="vertical" />

                {/* SUBMIT */}
                <Button onClick={() => fetchResults()}>
                    {searchStatus === SearchResultStatus.NO_SEARCH
                        ? <Space>Search <SearchOutlined /></Space>
                        : <Space>Refresh <ReloadOutlined /></Space>
                    }
                </Button>
                
            </Space>
        </div>
    )
}