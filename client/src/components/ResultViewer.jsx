import { Tabs, Result, Space, Select } from 'antd'
import GridResults from './GridResults'
import MapResults from './MapResults'
import TableResults from './TableResults'

const { Option, OptGroup } = Select

export default function ResultViewer({loading, error, count, results, sort, setSort, fetchNext}) {
    
    if(error) {
        return <Result
            title={error.message}
            subTitle={error?.networkError?.result?.errors[0]?.message || error.stack}
            status={[500, 404, 403].includes(error?.networkError?.statusCode)
                ? error.networkError.statusCode
                : 'error'} />
    }

    const SortSelector = ({field, order}) => (
        <Space style={{marginLeft: '30px'}}>
            <Select placeholder="sort results by..." style={{minWidth: '200px'}}
                    value={field + '-' + order}
                    onChange={v => {
                        if(v === undefined) return
                        const [field, order] = v.split('-')
                        setSort({field, order})
                    }} >
                <OptGroup label="💰 Price">
                    <Option value="price-ascend">💰↑ cheapest</Option>
                    <Option value="price-descend">💰↓ most expensive</Option>
                </OptGroup>
                <OptGroup label="🏡 ↔ Area">
                    <Option value="gardenArea-descend">🌳↓ biggest gardens</Option>
                    <Option value="livingArea-descend">🏠↓ biggest living area</Option>
                </OptGroup>
                <OptGroup label="📅 Dates">
                    <Option value="modificationDate-descend">📅↓ modified recently</Option>
                    <Option value="creationDate-ascend">📅↑ oldest (online since)</Option>
                    <Option value="disappearanceDate-descend">📅↓ disappeared recently</Option>
                </OptGroup>
            </Select>
            {results && <span style={{fontStyle: 'italic'}}>({count} result{count >= 2 && 's'})</span>}
        </Space>
    )

    return (
        <Tabs defaultActiveKey={1} className="resultTab" destroyInactiveTabPane={true}
                tabBarExtraContent={{right: <SortSelector field={sort.field} order={sort.order} />}}>
            <Tabs.TabPane tab="Grid results" key="1">
                <GridResults estates={results} isLoading={loading} fetchNext={fetchNext} totalCount={count} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Map results" key="2">
                <MapResults estates={results} isLoading={loading} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Table results" key="3">
                <TableResults estates={results} isLoading={loading} fetchNext={fetchNext} totalCount={count} sort={sort} setSort={setSort} />
            </Tabs.TabPane>
        </Tabs>
    )
}
