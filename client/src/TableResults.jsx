import _ from 'lodash'
import { Table } from 'antd'
import moment from 'moment'

export default function TableResults({estates, isLoading}) {

    return (
        <div className='TableResults'>

            <Table dataSource={estates} rowKey="id" size="small" loading={isLoading} sortDirections={['ascend', 'descend']} columns={[
                {
                    title: '♯ Immoweb Code', dataIndex: 'immowebCode', key: 'immowebCode'
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
                    defaultSortOrder: 'ascend'
                },
                {
                    title: '📅 Last modified on', dataIndex: 'displayModificationDate', key: 'modificationDate',
                    sorter: (a, b) => moment(a.modificationDate).diff(moment(b.modificationDate)),
                    defaultSortOrder: 'descend'
                },
                {
                    title: '🌳 Garden', dataIndex: 'gardenArea', key: 'garden',
                    sorter: (a, b) => a.gardenArea - b.gardenArea,
                    render: (text, record) => text > 0 ? `✓ ${text}m²` : record.hasGarden ? '✓' : '✗'
                }
            ]} />

        </div>
    )
}
