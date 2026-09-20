import React, { useEffect } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Divider, List } from 'antd'
import EstateCard from './EstateCard'
import { LoadingOutlined } from '@ant-design/icons'

export default function GridResults({estates, postalCodeCatalog, totalCount, isLoading, isLoadingMore, fetchNext}) {

    useEffect(() => {
        if(isLoading || isLoadingMore || !estates?.length || totalCount <= estates.length) return undefined

        const checkForScrollableContent = window.setTimeout(() => {
            const documentHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
            if(documentHeight <= window.innerHeight) fetchNext()
        }, 0)

        return () => window.clearTimeout(checkForScrollableContent)
    }, [estates?.length, fetchNext, isLoading, isLoadingMore, totalCount])
    
    return (
        <div className='GridResults' >
            <InfiniteScroll
                dataLength={estates?.length || 0}
                next={() => fetchNext()}
                hasMore={totalCount > estates?.length}
                loader={<Divider plain>Loading {totalCount - estates?.length} more <LoadingOutlined/> awesome estates</Divider>}
                endMessage={estates?.length ? <Divider plain>Nothing more for now... Come back tomorrow 🤞</Divider> : null}
                scrollThreshold={0.85}
                >

                <List className="estate-grid" size="small" loading={isLoading} split={false}
                    dataSource={estates} renderItem={estate => (
                        <List.Item key={estate.immowebCode}>
                            <EstateCard estate={estate} postalCodeCatalog={postalCodeCatalog} />
                        </List.Item>
                    )}
                />

            </InfiniteScroll>
        </div>
    )
}
