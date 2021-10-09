import { useLazyQuery, gql } from '@apollo/client'
import { Button, Layout } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import 'antd/dist/antd.css'
import ResultViewer from './ResultViewer'

export default function Search() {

    // Load all estates
    const [fetchEstates, { loading, error, data, refetch }] = useLazyQuery(gql`
        query estates {
            estates {
                id
                immowebCode
                price
                zipCode
                locality
                images
            }
        }
    `)

    return (
        <div className="SearchPage">

            <Layout>
                <Layout.Header style={{ position: 'fixed', zIndex: 1, width: '100%' }}>
                    <Button onClick={() => fetchEstates()}>Search<SearchOutlined /></Button>
                </Layout.Header>
                <Layout.Content style={{marginTop: '80px'}}>
                    <ResultViewer results={{loading, error, data}} />
                </Layout.Content>
            </Layout>
            
        </div>
    )

}