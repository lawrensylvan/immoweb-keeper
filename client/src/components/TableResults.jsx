import _ from 'lodash'
import { Table } from 'antd'
import moment from 'moment'

export default function TableResults({estates, isLoading, sort, setSort}) {
    
    return (
        <div className='TableResults'>

            <Table
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

        </div>
    )
}
