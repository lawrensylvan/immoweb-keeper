import React, {useState} from 'react'
import { Layout } from 'antd'
import 'antd/dist/antd.css'
import SearchFilters from './SearchFilters'
import ResultViewer from './ResultViewer'
import { useSearch } from '../hooks/useSearch'

export default function SearchPage() {

    const [activeTab, setActiveTab] = useState('1')
    const [rememberedZipCodes, setRememberedZipCodes] = useState([1030, 1140])

    const {
        searchFilters, setFilter, clearFilters,
        resultSorter, setResultSorter,
        loading, loadingMore, error,
        resultCount, searchResults,
        fetchNext
    } = useSearch(
            {priceRange: [0, 500000], zipCodes: [1030, 1140], propertyTypes: ['APARTMENT', 'HOUSE']},
            {field: 'modificationDate', order: 'descend'}
        )

    // immoweb color theme : blue #3f6ea7 and green #6ad690
    return (
        <Layout>
            <div style={{
                maxWidth: '100%',
                display: 'grid',
                /*border: '1px dotted grey',
                borderRadius: 3,
                margin: '10px 10px 10px 10px',*/
                zIndex: 1,  backgroundColor: '#d7dfda', paddingTop: '5px', paddingBottom: '15px', paddingLeft: '5px' }}>
                <SearchFilters filters={searchFilters} setFilter={setFilter}
                    isMapActive={activeTab === '2'}
                    rememberedZipCodes={rememberedZipCodes}
                    onPostalCodesChange={zipCodes => {
                        setRememberedZipCodes(zipCodes)
                        setFilter('bounds', undefined)
                        setFilter('zipCodes', zipCodes)
                    }}
                    onOpenMap={() => setActiveTab('2')}
                    onRestorePostalCodes={() => {
                        setFilter('bounds', undefined)
                        setFilter('zipCodes', rememberedZipCodes)
                    }}
                    clearFilters={() => {
                        setRememberedZipCodes([])
                        clearFilters()
                    }} />
            </div>
            <Layout.Content style={{ paddingBottom: '15px', paddingLeft: '20px', paddingRight: '20px' }} >
                <ResultViewer
                    loading={loading} loadingMore={loadingMore} error={error}
                    count={resultCount} results={searchResults}
                    sort={resultSorter} setSort={setResultSorter}
                    fetchNext={fetchNext} searchFilters={searchFilters} setFilter={setFilter}
                    activeTab={activeTab} setActiveTab={setActiveTab}
                />
            </Layout.Content>
        </Layout>
    )

}
