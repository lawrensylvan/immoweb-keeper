import { useLazyQuery, gql } from '@apollo/client'

export function Explorer() {

    const [fetchEstates, { loading, error, data, refetch }] = useLazyQuery(gql`
        query estates {
            estates {
                id
                immowebCode
            }
        }
    `)

    if(loading) return <p>Loading...</p>
    if(error) return <p>Error :(</p>

    return (
        <>
            <button onClick={() => fetchEstates()}>Load</button>

            <ul>
                {data?.estates.map(e => <li key={e.id}>{e.immowebCode}</li>)}
            </ul>
        </>
    )

}