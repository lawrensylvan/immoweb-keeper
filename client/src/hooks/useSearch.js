import { useEffect, useMemo, useState } from 'react'
import { useLazyQuery, gql, NetworkStatus } from '@apollo/client'
import { isNetworkRequestInFlight } from '@apollo/client/core/networkStatus'
import moment from 'moment'
import _ from 'lodash'

const PAGE_SIZE = 8

const ESTATES_QUERY = gql`
    query estates(
        $immowebCode: Int
        $priceRange: [Int]
        $zipCodes: [Int]
        $onlyWithGarden: Boolean
        $minGardenArea: Int
        $minLivingArea: Int
        $minBedroomCount: Int
        $freeText: String
        $onlyStillAvailable: Boolean
        $onlyLiked: Boolean       
        $onlyVisited: Boolean
        $orderBy: OrderByInput
        $limit: Int
        $offset: Int
    ) {

        estates(immowebCode: $immowebCode
                priceRange: $priceRange,
                zipCodes: $zipCodes
                onlyWithGarden: $onlyWithGarden
                minGardenArea: $minGardenArea
                minLivingArea: $minLivingArea
                minBedroomCount: $minBedroomCount
                freeText: $freeText
                onlyStillAvailable: $onlyStillAvailable
                onlyLiked: $onlyLiked
                onlyVisited: $onlyVisited
                orderBy: $orderBy
                limit: $limit
                offset: $offset) {

            totalCount
            page {
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
                isLiked
                isVisited
                priceHistory {
                    price
                    date
                }
            }
        }
    }
`

const estateDecorator = estate => ({
    ...estate,
    displayPrice: (estate.isAuction ? 'from ' : '') + estate.price.toLocaleString('fr-BE') + ' €',
    priceHistory: estate.priceHistory?.map(e => ({...e, price: e.price.toLocaleString('fr-BE') + ' €'})),
    displayStreetAndNumber: estate.street ? estate.street + ' ' + estate.streetNumber : '',
    displayZipCode: estate.zipCode + ' ' + estate.locality,
    displayModificationDate: moment(estate.modificationDate).format('DD MMM YYYY') + ' (' + moment(estate.modificationDate).fromNow() + ')'
})

export const useSearch = (initialFilters = {}, initialSort = {field: 'modificationDate', order: 'descend'}) => {

    const [searchFilters, setSearchFilters] = useState(initialFilters)
    const [resultSorter, setResultSorter] = useState(initialSort)

    const variables = useMemo(() => {
        const f = searchFilters
        return {
            ...f,
            priceRange:         f.priceRange?.[1] ? f.priceRange : f.priceRange?.[0] ? [f.priceRange[0], 99999999] : [0, 99999999],
            zipCodes:           f.zipCodes?.length ? f.zipCodes : undefined,
            freeText:           f.freeText === "" ? undefined : f.freeText,
            onlyWithGarden:     f.onlyWithGarden || undefined,
            minGardenArea:      f.onlyWithGarden && f.minGardenArea > 0 ? f.minGardenArea : undefined,
            minLivingArea:      f.minLivingArea > 0 ? f.minLivingArea : undefined,
            minBedroomCount:    f.minBedroomCount > 0 ? f.minBedroomCount : undefined,
            onlyStillAvailable: f.onlyStillAvailable || undefined,
            immowebCode:        f.immowebCode || undefined,
            orderBy:            resultSorter,
            limit:              PAGE_SIZE,
            offset:             0
        }
    }, [resultSorter, searchFilters])

    // Load estates with active filters
    const [fetch, { data, networkStatus, error, fetchMore }] = useLazyQuery(ESTATES_QUERY, {variables, notifyOnNetworkStatusChange: true})

    // Reload results whenever state changes
    useEffect(() => {
        fetch(variables)
    }, [variables])

    return {

        searchResults: data?.estates?.page?.map(estateDecorator),
        resultCount: data?.estates?.totalCount,
        loading: isNetworkRequestInFlight(networkStatus) && networkStatus !== NetworkStatus.fetchMore,
        error,

        resultSorter,
        setResultSorter,

        searchFilters,
        setFilter: (name, value) => {
            if(!_.isEqual(searchFilters[name], value)) {
                setSearchFilters(current => ({...current, [name]: value}))
            }
        },
        clearFilters: () => {
            if(searchFilters !== {}) {
                setSearchFilters({})
            }
        },

        fetchNext: () => {
            fetchMore({variables: {limit: PAGE_SIZE, offset: data?.estates?.page?.length || 0}})
        }

    }

}