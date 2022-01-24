import { Result } from 'antd'
import GridResults from './GridResults'
import { useSearch } from '../hooks/useSearch'

export default function LikedEstates() {

    const { searchResults, loading, error } = useSearch({onlyLiked: true})
    
    if(error) {
        return <Result
            title={error.message}
            subTitle={error?.networkError?.result?.errors[0]?.message || error.stack}
            status={[500, 404, 403].includes(error?.networkError?.statusCode)
                ? error.networkError.statusCode
                : 'error'} />
    }

    return <GridResults estates={searchResults} isLoading={loading} />

}
