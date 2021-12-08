import { Layout, Result } from 'antd'
import moment from 'moment'
import GridResults from './GridResults'
import { useQuery, gql } from '@apollo/client'
import { HeartFilled } from '@ant-design/icons'
import { Content, Header } from 'antd/lib/layout/layout'

const estateDecorator = estate => ({
    ...estate,
    displayPrice: (estate.isAuction ? 'from ' : '') + estate.price.toLocaleString('fr-BE') + ' €',
    priceHistory: estate.priceHistory?.map(e => ({...e, price: e.price.toLocaleString('fr-BE') + ' €'})),
    displayStreetAndNumber: estate.street ? estate.street + ' ' + estate.streetNumber : '',
    displayZipCode: estate.zipCode + ' ' + estate.locality,
    displayModificationDate: moment(estate.modificationDate).format('DD MMM YYYY') + ' (' + moment(estate.modificationDate).fromNow() + ')'
})

export default function LikedEstates() {
    
    // Load estates that the current user liked
    /*const { loading, error, data } = useQuery(gql`
        query likedEstates {
            userByName(name: "lawrensylvan") {
                likedEstates {
                    immowebCode
                    price
                    zipCode
                    locality
                    images
                    modificationDate
                    hasGarden
                    gardenArea
                    agencyLogo
                    agencyName
                    geolocation 
                    street
                    streetNumber
                    isAuction
                    isSold
                    isUnderOption
                    description
                    livingArea
                    bedroomCount
                    priceHistory {
                        price
                        date
                    }
                }
            }
        }
    `)*/

    const { loading, error, data } = useQuery(gql`
        query likedEstates {
            estates(onlyLiked: true) {
                immowebCode
                price
                zipCode
                locality
                images
                modificationDate
                hasGarden
                gardenArea
                agencyLogo
                agencyName
                geolocation 
                street
                streetNumber
                isAuction
                isSold
                isUnderOption
                description
                livingArea
                bedroomCount
                priceHistory {
                    price
                    date
                }
                isLiked
            }
        }
    `)

    if(error) {
        return <Result
            title={error.message}
            subTitle={error?.networkError?.result?.errors[0]?.message || error.stack}
            status={[500, 404, 403].includes(error?.networkError?.statusCode)
                ? error.networkError.statusCode
                : 'error'} />
    }

    const estates = data?.estates.map(estateDecorator)

    return (
        <Layout>
            <h1>Liked estates</h1>
            <Content>
                <GridResults estates={estates} isLoading={loading} />
            </Content>
        </Layout>
    )
}
