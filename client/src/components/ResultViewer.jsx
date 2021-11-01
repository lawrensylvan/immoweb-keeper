import { Tabs, Result, Space, Select } from 'antd'
import moment from 'moment'
import GridResults from './GridResults'
import MapResults from './MapResults'
import TableResults from './TableResults'
import { SearchResultStatus, SearchContext } from '../state/useSearch'
import { useContext } from 'react'

const { Option, OptGroup } = Select

const estateDecorator = estate => ({
    ...estate,
    displayPrice: (estate.isAuction ? 'from ' : '') + estate.price.toLocaleString('fr-BE') + ' €',
    priceHistory: estate.priceHistory?.map(e => ({...e, price: e.price.toLocaleString('fr-BE') + ' €'})),
    displayZipCode: estate.locality + ' (' + estate.zipCode + ')',
    displayModificationDate: moment(estate.modificationDate).format('DD MMM YYYY') + ' (' + moment(estate.modificationDate).fromNow() + ')'
})

export default function ResultViewer() {
    
    const { searchStatus, searchResults, resultSorter, setSorter, error } = useContext(SearchContext)

    if(searchStatus === SearchResultStatus.ERROR) {
        return <Result
            title={error.message}
            subTitle={error?.networkError?.result?.errors[0]?.message || error.stack}
            status={[500, 404, 403].includes(error?.networkError?.statusCode)
                ? error.networkError.statusCode
                : 'error'} />
    }

    const isLoading = searchStatus === SearchResultStatus.LOADING

    const estates = searchResults?.map(estateDecorator)

    const SortSelector = ({field, order}) => (
        <Space style={{marginLeft: '30px'}}>
            <Select allowClear placeholder="sort results by..." style={{minWidth: '200px'}}
                    value={field + '-' + order}
                    onChange={v => {
                        if(v === undefined) return
                        const [field, order] = v.split('-')
                        setSorter({field, order})
                    }} >
                <OptGroup label="💰 Price">
                    <Option value="price-asc">💰↑ cheapest</Option>
                    <Option value="price-desc">💰↓ most expensive</Option>
                </OptGroup>
                <OptGroup label="🏡 ↔ Area">
                    <Option value="gardenArea-desc">🌳↓ biggest gardens</Option>
                    <Option value="area-desc">🏠↓ biggest living area</Option>
                </OptGroup>
                <OptGroup label="📅 Dates">
                    <Option value="lastModificationDate-desc">📅↓ modified recently</Option>
                    <Option value="creationDate-asc">📅↑ oldest (online since)</Option>
                    <Option value="disappearanceDate-desc">📅↓ disappeared recently</Option>
                </OptGroup>
            </Select>
            {estates && <span style={{fontStyle: 'italic'}}>({estates.length} results)</span>}
        </Space>
    )

    return (
            <Tabs defaultActiveKey={1} 
                  tabBarExtraContent={{right: <SortSelector field={resultSorter.field} order={resultSorter.order} />}}>
                <Tabs.TabPane tab="Grid results" key="1">
                    <GridResults estates={estates} isLoading={isLoading} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Map results" key="2">
                    <MapResults estates={estates} isLoading={isLoading} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Table results" key="3">
                    <TableResults estates={estates} isLoading={isLoading} />
                </Tabs.TabPane>
            </Tabs>
    )
}
