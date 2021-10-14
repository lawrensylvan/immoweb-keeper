import React, { useState } from 'react'
import { List, Card, Avatar, Pagination, Image, Skeleton, Popover, Tag, Dropdown, Menu } from 'antd'
import { CopyOutlined, EditOutlined, ExpandAltOutlined, HeartOutlined } from '@ant-design/icons'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import EstateCard from './EstateCard'

export default function GridResults({estates, isLoading}) {
    
    return (
        <div className='GridResults' >
            <List size="small" loading={isLoading} grid={{ gutter: 16, column: 4 }}
                pagination={<Pagination defaultPageSize={12} pageSize={12} showSizeChanger={false} simple={true} />}
                dataSource={estates} renderItem={estate => (
                    <List.Item>
                        <EstateCard estate={estate} key={estate.id} />
                    </List.Item>
                )}
            />

        </div>
    )
}
