import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLazyQuery, gql, NetworkStatus } from '@apollo/client'
import { isNetworkRequestInFlight } from '@apollo/client/core/networkStatus'
import moment from 'moment'
import _ from 'lodash'
import {formatShortDate} from '../utils/formatDate'

const PAGE_SIZE = 8

const ESTATES_QUERY = gql`
    query estates(
        $immowebCode: Int
        $bounds: [Float!]
        $priceRange: [Int]
        $zipCodes: [Int]
        $propertyTypes: [PropertyType!]
        $onlyWithGarden: Boolean
        $minGardenArea: Int
        $minLivingArea: Int
        $minBedroomCount: Int
        $freeText: String
        $onlyStillAvailable: Boolean
        $availabilityDateRange: [Date!]
        $onlyLiked: Boolean       
        $onlyVisited: Boolean
        $orderBy: OrderByInput
        $limit: Int
        $offset: Int
    ) {

        estates(immowebCode: $immowebCode
                bounds: $bounds
                priceRange: $priceRange,
                zipCodes: $zipCodes
                propertyTypes: $propertyTypes
                onlyWithGarden: $onlyWithGarden
                minGardenArea: $minGardenArea
                minLivingArea: $minLivingArea
                minBedroomCount: $minBedroomCount
                freeText: $freeText
                onlyStillAvailable: $onlyStillAvailable
                availabilityDateRange: $availabilityDateRange
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
                propertyType
                locality
                images
                creationDate
                modificationDate
                disappearanceDate
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
    displayPrice: Math.floor(estate.price / 1000).toLocaleString('fr-BE') + 'k€',
    priceHistory: estate.priceHistory?.map(e => ({...e, price: (e.price / 1000).toLocaleString('fr-BE') + 'k€'})),
    displayStreetAndNumber: estate.street ? estate.street
        .replace('rue ', 'r. ').replace('Rue ', 'r. ')
        .replace('avenue ', 'av.').replace('Avenue ', 'av. ')
        .replace('docteur ', 'Dr. ').replace('Docteur ', 'Dr. ')
        .replace('chaussée ', 'ch. ').replace('Chaussée ', 'ch. ').replace('chaussee ', 'ch. ').replace('Chaussee ', 'ch. ')
        .replace('boulevard ', 'bd. ').replace('Boulevard ', 'bd. ')
        + ' ' + (estate.streetNumber ?? '') : '',
    displayZipCode: estate.zipCode + ' ' + estate.locality,
    displayCreationDate: formatShortDate(estate.creationDate),
    displayModificationDate: formatShortDate(estate.modificationDate) + ' (' + moment(estate.modificationDate).fromNow() + ')',
    displayDisappearanceDate: estate.disappearanceDate
        ? formatShortDate(estate.disappearanceDate)
        : null
})

export const useSearch = (initialFilters = {}, initialSort = {field: 'modificationDate', order: 'descend'}, queryOptions = {}) => {

    const [searchFilters, setSearchFilters] = useState(initialFilters)
    const [resultSorter, setResultSorter] = useState(initialSort)
    const [paginationError, setPaginationError] = useState(null)

    const variables = useMemo(() => {
        const f = searchFilters
        if(_.isEmpty(f)) return null
        return {
            ...f,
            priceRange:         (!f.priceRange?.[0] && !f.priceRange?.[1]) ? undefined : f.priceRange,
            zipCodes:           f.zipCodes?.length ? f.zipCodes : undefined,
            propertyTypes:      f.propertyTypes?.length ? f.propertyTypes : undefined,
            freeText:           f.freeText === "" ? undefined : f.freeText,
            onlyWithGarden:     f.onlyWithGarden || undefined,
            minGardenArea:      f.onlyWithGarden && f.minGardenArea > 0 ? f.minGardenArea : undefined,
            minLivingArea:      f.minLivingArea > 0 ? f.minLivingArea : undefined,
            minBedroomCount:    f.minBedroomCount > 0 ? f.minBedroomCount : undefined,
            onlyStillAvailable: f.onlyStillAvailable || undefined,
            availabilityDateRange: f.availabilityDateRange?.length === 2 ? f.availabilityDateRange : undefined,
            immowebCode:        f.immowebCode || undefined,
            orderBy:            resultSorter,
            limit:              PAGE_SIZE,
            offset:             0
        }
    }, [resultSorter, searchFilters])

    // Load estates with active filters
    const [fetch, { data, networkStatus, error, fetchMore }] = useLazyQuery(ESTATES_QUERY, {
        ...queryOptions,
        variables,
        notifyOnNetworkStatusChange: true
    })

    const setFilter = useCallback((name, value) => {
        setSearchFilters(current => _.isEqual(current[name], value)
            ? current
            : {...current, [name]: value})
    }, [])

    const clearFilters = useCallback(() => {
        setSearchFilters({propertyTypes: ['APARTMENT', 'HOUSE']})
    }, [])

    // Reload results whenever state changes
    useEffect(() => {
        setPaginationError(null)
        if(variables) fetch(variables)
    }, [fetch, variables])

    return {

        searchResults: data?.estates?.page?.map(estateDecorator),
        resultCount: data?.estates?.totalCount,
        loading: isNetworkRequestInFlight(networkStatus) && networkStatus !== NetworkStatus.fetchMore,
        loadingMore: networkStatus === NetworkStatus.fetchMore,
        error: error || paginationError,

        resultSorter,
        setResultSorter,

        searchFilters,
        setFilter,
        clearFilters,

        fetchNext: async () => {
            try {
                await fetchMore({variables: {limit: PAGE_SIZE, offset: data?.estates?.page?.length || 0}})
            } catch(error) {
                setPaginationError(error)
            }
        }

    }

}
