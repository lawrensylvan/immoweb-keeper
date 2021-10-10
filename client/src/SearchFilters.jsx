import React, { useRef, useState } from 'react'
import { Button, Slider, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import _ from 'lodash'

export default function SearchFilters({fetchEstates}) {

    const priceRangeRef = useRef()

    return (
        <div className="SearchFilters" style={{display: 'flex'}}>
            <Space size="large">

                <Slider range={{draggableTrack:true}} max={500000} step={10000} defaultValue={[0, 500000]}
                        marks={_.range(0, 500000, 100000).reduce((acc, n) => ({...acc, [n]: ''}), {})}
                        tooltipVisible style={{width: '15vw'}}
                        tipFormatter={n => Math.ceil(n/1000) + 'k€'}
                        ref={priceRangeRef} />
                
                <Button onClick={() => fetchEstates({
                    variables: { 
                        priceRange: priceRangeRef.current.state.bounds
                    }
                })}>Search<SearchOutlined />
                
                </Button>
                
            </Space>
        </div>
    )
}
