import _ from 'lodash'
import { Table } from 'antd'
import moment from 'moment'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Divider } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'

export default function TableResults({estates, isLoading, sort, setSort, fetchNext, totalCount}) {

    // TODO : bug = some rows get duplicated in the apollo cache and in the table when messing with sorters and alternating between grid and table results...
    return (
        <div className='TableResults'>

            <InfiniteScroll
                dataLength={estates?.length || 0}
                next={() => fetchNext()}
                hasMore={totalCount > estates?.length}
                loader={<Divider plain>Loading {totalCount - estates?.length} more <LoadingOutlined/> awesome estates</Divider>}
                endMessage={estates?.length && <Divider plain>Nothing more for now... Come back tomorrow 🤞</Divider>}
                scrollableTarget="scrollableDiv"
                scrollThreshold={0.85}
                >

                <Table
                    pagination={false}
                    dataSource={estates} rowKey="immowebCode" size="small"
                    onChange={(pagination, filters, sorter, extra) => {
                        if(extra.action !== 'sort') return
                        if(sorter.order) {
                            setSort({field: sorter.columnKey, order: sorter.order})
                        } else {
                            setSort({field: 'modificationDate', order: 'descend'})
                        }
                    }}
                    loading={isLoading} sortDirections={['ascend', 'descend']} columns={[
                    {
                        title: '♯ Immoweb Code', dataIndex: 'immowebCode', key: 'immowebCode'
                    },
                    {
                        title: '⌖ Address', dataIndex: 'displayStreetAndNumber', key: 'street',
                        sorter: (a, b) => a.street - b.street
                    },
                    {
                        title: '⌖ Zip code', dataIndex: 'displayZipCode', key: 'zipCode',
                        filters: _.uniq(estates?.map(e => e.zipCode))
                                .map(z => ({text: `${estates.filter(e => e.zipCode === z)[0].locality} (${z})`, value: z})),
                        onFilter: (value, record) => record.zipCode === value
                    },
                    {
                        title: '💰 Price', dataIndex: 'displayPrice', key: 'price',
                        sorter: (a, b) => a.price - b.price,
                        sortOrder: sort.field === 'price' ? sort.order : null
                    },
                    {
                        title: '📅 Last modified on', dataIndex: 'displayModificationDate', key: 'modificationDate',
                        sorter: (a, b) => moment(a.modificationDate).diff(moment(b.modificationDate)),
                        sortOrder: sort.field === 'modificationDate' ? sort.order : null
                    },
                    {
                        title: '🏠↔', dataIndex: 'livingArea', key: 'livingArea',
                        sorter: (a, b) => a.livingArea - b.livingArea,
                        render: (text, record) => text ? text + 'm²' : '',
                        sortOrder: sort.field === 'livingArea' ? sort.order : null
                    },
                    {
                        title: '🌳↔', dataIndex: 'gardenArea', key: 'gardenArea',
                        sorter: (a, b) => a.gardenArea - b.gardenArea,
                        render: (text, record) => text > 0 ? `✓ ${text}m²` : record.hasGarden ? '✓' : '✗',
                        sortOrder: sort.field === 'gardenArea' ? sort.order : null
                    }
                ]} />

            </InfiniteScroll>

        </div>
    )
}
