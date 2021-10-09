import { useLazyQuery, gql } from '@apollo/client'
import { Button } from 'antd'
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
            }
        }
    `)

    return (
        <div className="Search">

            <Button onClick={() => fetchEstates()}>Search<SearchOutlined /></Button>

            <ResultViewer results={{loading, error, data}} />
            
        </div>
    )

}