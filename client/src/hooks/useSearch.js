import { useEffect, useMemo, useState } from 'react'
import { useLazyQuery, gql, NetworkStatus } from '@apollo/client'
import { isNetworkRequestInFlight } from '@apollo/client/core/networkStatus'
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

export const useSearch = (initialFilters, initialSort) => {

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
            limit:              PAGE_SIZE
        }
    }, [resultSorter, searchFilters])

    console.dir(variables)

    // Load estates with active filters
    const [fetch, { data, loading, networkStatus, error, fetchMore }] = useLazyQuery(ESTATES_QUERY, {variables, notifyOnNetworkStatusChange: true})

    // Reload results whenever state changes
    useEffect(() => {
        fetch(variables)
    }, [variables])

    // Set a filter
    const setFilter = (name, value) => {
        if(!_.isEqual(searchFilters[name], value)) {
            setSearchFilters(current => ({...current, [name]: value}))
        }
    }

    // Clear all filters
    const clearFilters = () => {
        if(searchFilters !== {}) {
            setSearchFilters({})
        }
    }

    return {
        searchFilters,
        setFilter,
        clearFilters,

        resultSorter,
        setResultSorter: (sorter) => {setResultSorter(sorter); fetch()},

        fetchNext: () => fetchMore({variables: {limit: PAGE_SIZE, offset: data?.estates?.page?.length || 0}}),
        
        searchResults: data?.estates?.page,
        resultCount: data?.estates?.totalCount,

        loading: isNetworkRequestInFlight(networkStatus) && networkStatus !== NetworkStatus.fetchMore,
        error
    }

}