import { Select, Space, Tag } from 'antd'
import { AimOutlined } from '@ant-design/icons'
import { useQuery, gql } from '@apollo/client'
import React from 'react'

export default function SelectLocalities({ value, onChange }) {

    const { loading, error, data } = useQuery(gql`
        query localities {
            localities {
                zipCode
                name
            }
        }
    `)

    const renderOptions = () => {
        if(loading) return <Select.Option>Loading zip codes...</Select.Option>
        if(error) return <Select.Option>Could not load zip codes</Select.Option>
        
        return data.localities.map(locality =>
            <Select.Option value={locality.zipCode} label={locality.zipCode}>
                {locality.zipCode} · {locality.name}
            </Select.Option>
        )
    }
    
    const tagRender = ({label}) => {
        if(value.length <= 2) return <Tag closable="true">{label}</Tag>
        if(value[0] === label) return <span style={{fontSize: 12, fontStyle: 'italic', marginRight: 4}}>({value.length} localities selected)</span>
        return '' 
    }

    return (
        <Space>
            <AimOutlined/>
            <Select placeholder="Select localities" mode="multiple" optionLabelProp="label" optionFilterProp="children" allowClear
                    value={value} onChange={onChange}
                    tagRender={tagRender}
                    style={{ width: '210px' }} showArrow>
                {renderOptions()}
            </Select>
        </Space>
    )
}