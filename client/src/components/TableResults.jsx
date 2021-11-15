import _ from 'lodash'
import { Table } from 'antd'
import moment from 'moment'
import { SearchContext } from '../hooks/useSearch'
import { useContext } from 'react'

export default function TableResults({estates, isLoading}) {

    const { resultSorter, setSorter } = useContext(SearchContext)
    
    return (
        <div className='TableResults'>

            <Table
                dataSource={estates} rowKey="immowebCode" size="small"
                onChange={(pagination, filters, sorter, extra) => {
                    if(extra.action !== 'sort') return
                    // TODO : should only sync main sorting if not all results fit in one page
                    if(sorter.order) {
                        setSorter({field: sorter.columnKey, order: sorter.order})
                    } else {
                        setSorter({field: 'modificationDate', order: 'descend'})
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
                    sortOrder: resultSorter.field === 'price' ? resultSorter.order : null
                },
                {
                    title: '📅 Last modified on', dataIndex: 'displayModificationDate', key: 'modificationDate',
                    sorter: (a, b) => moment(a.modificationDate).diff(moment(b.modificationDate)),
                    sortOrder: resultSorter.field === 'modificationDate' ? resultSorter.order : null
                },
                {
                    title: '🏠↔', dataIndex: 'livingArea', key: 'livingArea',
                    sorter: (a, b) => a.livingArea - b.livingArea,
                    render: (text, record) => text ? text + 'm²' : '',
                    sortOrder: resultSorter.field === 'livingArea' ? resultSorter.order : null
                },
                {
                    title: '🌳↔', dataIndex: 'gardenArea', key: 'gardenArea',
                    sorter: (a, b) => a.gardenArea - b.gardenArea,
                    render: (text, record) => text > 0 ? `✓ ${text}m²` : record.hasGarden ? '✓' : '✗',
                    sortOrder: resultSorter.field === 'gardenArea' ? resultSorter.order : null
                }
            ]} />

        </div>
    )
}
