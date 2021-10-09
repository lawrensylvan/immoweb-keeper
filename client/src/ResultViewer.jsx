import _ from 'lodash'
import { Table } from 'antd'

export default function ResultViewer({results}) {
    
    const {loading, error, data} = results

    return (
        <div className='ResultViewer'>

            {loading && <p>Loading...</p>}

            {error && <p>Error !</p>}

            <Table dataSource={data?.estates} rowKey="id" loading={loading} sortDirections={['ascend', 'descend']} columns={[
                {
                    title: 'Immoweb Code', dataIndex: 'immowebCode', key: 'immowebCode'
                },
                {
                    title: 'Zip code', dataIndex: 'zipCode', key: 'zipCode',
                    filters: _.uniq(data?.estates.map(e => e.zipCode))
                              .map(z => ({text: `${data?.estates.filter(e => e.zipCode === z)[0].locality} (${z})`, value: z})),
                    onFilter: (value, record) => record.zipCode === value
                },
                {
                    title: 'Price', dataIndex: 'price', key: 'price',
                    sorter: (a, b) => a.price - b.price,
                    defaultSortOrder: 'ascend'
                },
            ]} />

        </div>
    )
}
