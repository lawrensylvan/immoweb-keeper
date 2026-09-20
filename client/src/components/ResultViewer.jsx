import { useState } from 'react'
import { Tabs, Result, Space, Select } from 'antd'
import { useQuery } from '@apollo/client'
import GridResults from './GridResults'
import MapResults from './MapResults'
import TableResults from './TableResults'
import {POSTAL_CODES_QUERY} from './SelectLocalities'

const { Option, OptGroup } = Select

export default function ResultViewer({loading, loadingMore, error, count, results, sort, setSort, fetchNext,
    searchFilters, setFilter, activeTab, setActiveTab}) {
    const [markerSizeBy, setMarkerSizeBy] = useState('uniform')
    const [markerColorBy, setMarkerColorBy] = useState('uniform')
    const {data: postalCodeData} = useQuery(POSTAL_CODES_QUERY)
    const postalCodeCatalog = postalCodeData?.postalCodes || []
    
    if(error) {
        return <Result
            title={error.message}
            subTitle={error?.networkError?.result?.errors[0]?.message || error.stack}
            status={[500, 404, 403].includes(error?.networkError?.statusCode)
                ? error.networkError.statusCode
                : 'error'} />
    }

    const SortSelector = ({field, order}) => (
        <div className="result-toolbar">
            <Space>
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
            </Space>
            {results && <span className="result-count">({count} result{count >= 2 && 's'})</span>}
        </div>
    )

    const MarkerSizeSelector = () => (
        <div className="result-toolbar">
            <Space>
                <span className="marker-size-icon" title="Size markers by" aria-label="Size markers by">⤢</span>
                <Select className={`marker-mode-select${markerSizeBy === 'uniform' ? ' is-uniform' : ''}`}
                    optionLabelProp="label" style={{minWidth: '220px'}} value={markerSizeBy} onChange={value => {
                    setMarkerSizeBy(value)
                    if(value === 'gardenArea') setFilter('onlyWithGarden', true)
                }}>
                    <Option value="uniform" label="size data points by">– Uniform size</Option>
                    <Option value="price" label="💰 Price">💰 Price</Option>
                    <Option value="pricePerSquareMeter" label="💶 Price / m²">💶 Price / m²</Option>
                    <Option value="livingArea" label="🏠 Living area">🏠 Living area</Option>
                    <Option value="gardenArea" label="🌳 Garden area">🌳 Garden area</Option>
                </Select>
                <span className="marker-color-icon" title="Color markers by" aria-label="Color markers by">🎨</span>
                <Select className={`marker-mode-select${markerColorBy === 'uniform' ? ' is-uniform' : ''}`}
                    optionLabelProp="label" style={{minWidth: '210px'}} value={markerColorBy} onChange={value => {
                    setMarkerColorBy(value)
                    if(value === 'availability') setFilter('onlyStillAvailable', false)
                }}>
                    <Option value="uniform" label="color data points by">– Uniform color</Option>
                    <Option value="availability" label="🚦 Availability">🚦 Availability</Option>
                    <Option value="price" label="💰 Price">💰 Price</Option>
                    <Option value="pricePerSquareMeter" label="💶 Price / m²">💶 Price / m²</Option>
                    <Option value="recency" label="📅 Recency">📅 Recency</Option>
                    <Option value="gardenArea" label="🌳 Garden area">🌳 Garden area</Option>
                    <Option value="propertyType" label="🏘 Estate type">🏘 Estate type</Option>
                </Select>
            </Space>
            {results && <span className="result-count">({count} result{count >= 2 && 's'})</span>}
        </div>
    )

    const TableToolbar = () => (
        <div className="result-toolbar">
            {results && <span className="result-count">({count} result{count >= 2 && 's'})</span>}
        </div>
    )

    return (
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="resultTab" destroyInactiveTabPane={true}
                tabBarExtraContent={{right:
                    activeTab === '2'
                        ? <MarkerSizeSelector />
                        : activeTab === '3'
                            ? <TableToolbar />
                            : <SortSelector field={sort.field} order={sort.order} />}}>
            <Tabs.TabPane tab="Grid results" key="1">
                <GridResults estates={results} postalCodeCatalog={postalCodeCatalog} isLoading={loading} isLoadingMore={loadingMore}
                    fetchNext={fetchNext} totalCount={count} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Map results" key="2">
                <MapResults isLoading={loading} searchFilters={searchFilters}
                    setGlobalFilter={setFilter}
                    markerSizeBy={markerSizeBy} markerColorBy={markerColorBy}
                    postalCodeCatalog={postalCodeCatalog} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Table results" key="3">
                <TableResults estates={results} postalCodeCatalog={postalCodeCatalog} isLoading={loading} fetchNext={fetchNext} totalCount={count} sort={sort} setSort={setSort} />
            </Tabs.TabPane>
        </Tabs>
    )
}
