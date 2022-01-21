import React from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Divider, List } from 'antd'
import EstateCard from './EstateCard'
import { LoadingOutlined } from '@ant-design/icons'

export default function GridResults({estates, isLoading, fetchNext}) {

    return (
        <div className='GridResults' >
            <InfiniteScroll
                dataLength={estates?.length || 0}
                next={() => fetchNext()}
                hasMore={estates?.length > 0 && estates?.length < 50}
                loader={<LoadingOutlined/>}
                endMessage={estates?.length && <Divider plain>That's the end ! Come back tomorrow 🤐</Divider>}
                scrollableTarget="scrollableDiv"
                scrollThreshold={0.65}
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
