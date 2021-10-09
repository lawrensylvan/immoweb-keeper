import _ from 'lodash'
import { Table } from 'antd'

export default function TableResults({estates}) {
    
    return (
        <div className='TableResults'>

            <Table dataSource={estates} rowKey="id" size="small" sortDirections={['ascend', 'descend']} columns={[
                {
                    title: 'Immoweb Code', dataIndex: 'immowebCode', key: 'immowebCode'
                },
                {
                    title: 'Zip code', dataIndex: 'displayZipCode', key: 'zipCode',
                    filters: _.uniq(estates?.map(e => e.zipCode))
                              .map(z => ({text: `${estates.filter(e => e.zipCode === z)[0].locality} (${z})`, value: z})),
                    onFilter: (value, record) => record.zipCode === value
                },
                {
                    title: 'Price', dataIndex: 'displayPrice', key: 'price',
                    sorter: (a, b) => a.price - b.price,
                    defaultSortOrder: 'ascend'
                },
            ]} />

        </div>
    )
}
