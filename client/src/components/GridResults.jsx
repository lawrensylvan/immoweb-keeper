import React from 'react'
import { List, Pagination } from 'antd'
import EstateCard from './EstateCard'

export default function GridResults({estates, isLoading}) {
    
    return (
        <div className='GridResults' >
            <List size="small" loading={isLoading} grid={{ gutter: 16, column: 4 }}
                pagination={<Pagination defaultPageSize={12} pageSize={12} showSizeChanger={false} simple={true} />}
                dataSource={estates} renderItem={estate => (
                    <List.Item>
                        <EstateCard estate={estate} key={estate.immowebCode} />
                    </List.Item>
                )}
            />
        </div>
    )
}
