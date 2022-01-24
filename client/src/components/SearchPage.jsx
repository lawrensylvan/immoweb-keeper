import React from 'react'
import { Layout } from 'antd'
import 'antd/dist/antd.css'
import SearchFilters from './SearchFilters'
import ResultViewer from './ResultViewer'
import { useSearch } from '../hooks/useSearch'

export default function SearchPage() {

    const {
        searchFilters, setFilter, clearFilters,
        resultSorter, setResultSorter,
        loading, error,
        resultCount, searchResults,
        fetchNext
    } = useSearch({priceRange: [0, 500000], zipCodes: [1030, 1140]}, {field: 'modificationDate', order: 'descend'})

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
                <SearchFilters filters={searchFilters} setFilter={setFilter} clearFilters={clearFilters} />
            </div>
            <Layout.Content style={{ paddingBottom: '15px', paddingLeft: '20px' }} >
                <ResultViewer
                    loading={loading} error={error}
                    count={resultCount} results={searchResults}
                    sort={resultSorter} setSort={setResultSorter}
                    fetchNext={fetchNext}
                />
            </Layout.Content>
        </Layout>  
    )

}