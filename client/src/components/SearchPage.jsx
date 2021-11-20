import React from 'react'
import { Layout } from 'antd'
import 'antd/dist/antd.css'
import { useSearch, SearchContext } from '../state/useSearch'
import SearchFilters from './SearchFilters'
import ResultViewer from './ResultViewer'

export default function SearchPage() {
    // immoweb color theme : blue #3f6ea7 and green #6ad690
    return (

        <SearchContext.Provider value={useSearch()}>
            <Layout>
                <Layout.Header style={{ position: 'fixed', zIndex: 1, width: '100%', backgroundColor: '#d7dfda', minHeight: '90px' }}>
                    <SearchFilters/>
                </Layout.Header>
                <Layout.Content style={{marginTop: '90px', paddingLeft: '20px'}} >
                    <ResultViewer/>
                </Layout.Content>
            </Layout>
        </SearchContext.Provider>
            
    )

}