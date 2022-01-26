import React from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Divider, List } from 'antd'
import EstateCard from './EstateCard'
import { LoadingOutlined } from '@ant-design/icons'

export default function GridResults({estates, totalCount, isLoading, fetchNext}) {
    
    return (
        <div className='GridResults' >
            <InfiniteScroll
                dataLength={estates?.length || 0}
                next={() => fetchNext()}
                hasMore={totalCount > estates?.length}
                loader={<Divider plain>Loading {totalCount - estates?.length} more <LoadingOutlined/> awesome estates</Divider>}
                endMessage={estates?.length && <Divider plain>Nothing more for now... Come back tomorrow 🤞</Divider>}
                scrollableTarget="scrollableDiv"
                scrollThreshold={0.85}
                >

                <List size="small" loading={isLoading} grid={{ gutter: 16, column: 4 }}
                    dataSource={estates} renderItem={estate => (
                        <List.Item key={estate.immowebCode}>
                            <EstateCard estate={estate} />
                        </List.Item>
                    )}
                />

            </InfiniteScroll>
        </div>
    )
}
