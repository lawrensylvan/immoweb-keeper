import React from 'react'
import { Layout } from 'antd'
import 'antd/dist/antd.css'
import SearchFilters from './SearchFilters'
import ResultViewer from './ResultViewer'

export default function SearchPage() {

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
                <SearchFilters/>
            </div>
            <Layout.Content style={{ paddingBottom: '15px', paddingLeft: '20px' }} >
                <ResultViewer/>
            </Layout.Content>
        </Layout>  
    )

}
