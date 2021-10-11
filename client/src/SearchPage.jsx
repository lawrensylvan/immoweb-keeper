import { useLazyQuery, gql } from '@apollo/client'
import { Layout } from 'antd'
import 'antd/dist/antd.css'
import SearchFilters from './SearchFilters'
import ResultViewer from './ResultViewer'

export default function Search() {

    // Load estates with active filters
    const [fetchEstates, { loading, error, data }] = useLazyQuery(gql`
        query estates($priceRange: [Int]!, $zipCodes: [Int], $onlyWithGarden: Boolean) {
            estates(priceRange: $priceRange, zipCodes: $zipCodes, onlyWithGarden: $onlyWithGarden) {
                id
                immowebCode
                price
                zipCode
                locality
                images
                creationDate
            }
        }
    `)

    return (
        <div className="SearchPage">

            <Layout>
                <Layout.Header style={{ position: 'fixed', zIndex: 1, width: '100%', backgroundColor: 'floralwhite', minHeight: '90px' }}>
                    <SearchFilters fetchEstates={fetchEstates} />
                </Layout.Header>
                <Layout.Content style={{marginTop: '90px', paddingLeft: '20px'}} >
                    <ResultViewer results={{loading, error, data}} />
                </Layout.Content>
            </Layout>
            
        </div>
    )

}