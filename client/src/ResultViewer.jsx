import { Tabs, Empty, Spin, Result } from 'antd'
import GridResults from './GridResults'
import MapResults from './MapResults'
import TableResults from './TableResults'

const estateDecorator = estate => ({
    ...estate,
    displayPrice: estate.price.toLocaleString('fr-BE') + ' €',
    displayZipCode: estate.locality + ' (' + estate.zipCode + ')'
})

export default function ResultViewer({results}) {
    
    const {loading, error, data} = results

    const estates = data?.estates.map(estateDecorator)

    if(error) return <Result status={error.networkError.statusCode === 500 ? '500' : 'error'} />

    if(!estates && !loading) return <Empty description="Start playing with the filters !" />

    if(!estates && loading) return <Spin/>

    return (
        <div className='ResultViewer'>
            <Tabs defaultActiveKey="1">
                <Tabs.TabPane tab="Grid results" key="1">
                    <GridResults estates={estates} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Map results" key="2">
                    <MapResults estates={estates} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Table result" key="3">
                    <TableResults estates={estates} />
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}
