import { Tabs, Empty, Spin, Result } from 'antd'
import moment from 'moment'
import GridResults from './GridResults'
import MapResults from './MapResults'
import TableResults from './TableResults'

const estateDecorator = estate => ({
    ...estate,
    displayPrice: estate.price.toLocaleString('fr-BE') + ' €',
    displayZipCode: estate.locality + ' (' + estate.zipCode + ')',
    displayModificationDate: moment(estate.modificationDate).format('DD MMM YYYY') + ' (' + moment(estate.modificationDate).fromNow() + ')'
})

export default function ResultViewer({results}) {
    
    const {loading, error, data} = results

    const estates = data?.estates.map(estateDecorator)

    if(error) {
        return <Result
            title={error.message}
            subTitle={error?.networkError?.result?.errors[0]?.message || ''}
            status={[500, 404, 403].includes(error?.networkError?.statusCode) ? error.networkError.statusCode : 'error'} />
    }

    //if(!estates && !loading) return <Empty description="Start playing with the filters !" />

    //if(!estates && loading) return <Spin />

    return (
        <div className='ResultViewer'>
            <Tabs defaultActiveKey="1">
                <Tabs.TabPane tab="Grid results" key="1">
                    <GridResults estates={estates} isLoading={loading} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Map results" key="2">
                    <MapResults estates={estates} isLoading={loading} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Table results" key="3">
                    <TableResults estates={estates} isLoading={loading} />
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}
