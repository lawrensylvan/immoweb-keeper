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

    if(error) {
        console.dir(error)
        if(error.networkError.statusCode === 400) {
            return <Result title="Error 400 received from server !" subTitle={error.networkError.result.errors[0].message} status="error" />
        }
        return <Result subTitle={error.stackTrace} status={error.networkError.statusCode === 500 ? '500' : 'error'} />
    }

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
