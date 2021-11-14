import React, { useRef, useState } from 'react'
import { notification } from 'antd'
import { useLazyQuery, gql } from '@apollo/client'
import _ from 'lodash'

export const SearchContext = React.createContext()

export const SearchResultStatus = {
    NO_SEARCH:  'NO_SEARCH',
    NO_RESULTS: 'NO_RESULTS',
    ERROR:      'ERROR',
    LOADING:    'LOADING',
    READY:      'READY'
}

export const useSearch = () => {

    // Maintain state of active filters, active sorter, search results
    
    const [isFirstSearch, setFirstSearch] = useState(true)

    const [searchFilters, setSearchFilters] = useState({
        priceRange: [0, 500000],
        zipCodes: [1030, 1140],
        onlyWithGarden: false,
        minGardenArea: undefined,
        immowebCode: undefined,
        freeText: undefined
    })

    const [resultSorter, setResultSorter] = useState({field: 'lastModificationDate', order: 'desc'})

    // Load estates with active filters
    const [fetch, { loading, error, data }] = useLazyQuery(gql`
        query estates(
            $priceRange: [Int],
            $zipCodes: [Int],
            $onlyWithGarden: Boolean,
            $minGardenArea: Int,
            $immowebCode: Int,
            $freeText: String
            $orderBy: OrderByInput
        ) {

            estates(priceRange: $priceRange, 
                    zipCodes: $zipCodes,
                    onlyWithGarden: $onlyWithGarden,
                    minGardenArea: $minGardenArea,
                    immowebCode: $immowebCode,
                    freeText: $freeText,
                    orderBy: $orderBy) {
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
                isAuction
                isSold
                isUnderOption
                priceHistory {
                    price
                    date
                }
            }
        }
    `)

    // Fetch estates with search filter
    const fetchResults = (searchFilters, resultSorter) => {
        
        clearTimeout(interval.current)

        notification.open({
            message: 'Search ongoing...',
            description: JSON.stringify(searchFilters) + ' by ' + resultSorter.field + ' (' + resultSorter.order + ')',
            placement: 'bottomLeft',
            duration: 5
        })

        const {priceRange, zipCodes, onlyWithGarden, minGardenArea, immowebCode, freeText} = searchFilters

        fetch({ variables: {
            ...searchFilters,
            priceRange: priceRange?.[1] ? priceRange : priceRange?.[0] ? [priceRange[0], 99999999] : [0, 99999999],
            zipCodes: zipCodes?.length ? zipCodes : undefined,
            freeText: freeText === "" ? undefined : freeText,
            onlyWithGarden: onlyWithGarden || undefined,
            minGardenArea: onlyWithGarden && minGardenArea > 0 ? minGardenArea : undefined,
            immowebCode: immowebCode || undefined,

            orderBy: resultSorter
        }})

        setFirstSearch(false)
    }

    // Fetch with a delay
    const interval = useRef()
    const fetchResultsLater = (searchFilters, resultSorter) => {
        if(interval.current) {
            clearTimeout(interval.current)
        }
        interval.current = setTimeout(() => {
            fetchResults(searchFilters, resultSorter)
        }, 2000)
    }

    // Set a filter
    const setFilter = (name, value) => {
        if(!_.isEqual(searchFilters[name], value)) {
            const newSearchFilters = {...searchFilters, [name]: value}
            setSearchFilters(newSearchFilters)
            fetchResultsLater(newSearchFilters, resultSorter)
        }
    }

    // Clear all filters
    const clearFilters = () => {
        if(searchFilters !== {}) {
            setSearchFilters({})
            fetchResultsLater(searchFilters, resultSorter)
        }
    }

    // Set a sorter
    const setSorter = (sorter) => {
        setResultSorter(sorter)
        fetchResults(searchFilters, sorter)
    }

    return {
        isFirstSearch,
        searchFilters,
        setFilter,
        clearFilters,
        resultSorter,
        setSorter,
        fetchResults: () => fetchResults(searchFilters, resultSorter),
        searchResults: data?.estates,
        searchStatus: loading               ?   SearchResultStatus.LOADING
                    : error                 ?   SearchResultStatus.ERROR
                    : data?.estates?.length ?   SearchResultStatus.READY
                    : isFirstSearch         ?   SearchResultStatus.NO_SEARCH
                    :                           SearchResultStatus.NO_RESULTS,
        error
    }

}