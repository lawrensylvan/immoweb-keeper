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
        freeText: undefined,
        minLivingArea: 0,
        minBedroomCount: 0
    })

    const [resultSorter, setResultSorter] = useState({field: 'modificationDate', order: 'descend'})

    // Load estates with active filters
    const [fetch, { loading, error, data }] = useLazyQuery(gql`
        query estates(
            $priceRange: [Int],
            $zipCodes: [Int],
            $freeText: String,
            $onlyWithGarden: Boolean,
            $minGardenArea: Int,
            $minLivingArea: Int,
            $minBedroomCount: Int,
            $onlyStillAvailable: Boolean
            $immowebCode: Int,            
            $orderBy: OrderByInput
        ) {

            estates(priceRange: $priceRange, 
                    zipCodes: $zipCodes,
                    freeText: $freeText,
                    onlyWithGarden: $onlyWithGarden,
                    minGardenArea: $minGardenArea,
                    minLivingArea: $minLivingArea,
                    minBedroomCount: $minBedroomCount,
                    onlyStillAvailable: $onlyStillAvailable
                    immowebCode: $immowebCode,
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
                streetNumber
                isAuction
                isSold
                isUnderOption
                description
                livingArea
                bedroomCount
                isLiked
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

        const {
            priceRange,
            zipCodes,
            freeText,
            onlyWithGarden,
            minGardenArea,
            minLivingArea,
            minBedroomCount,
            onlyStillAvailable,
            immowebCode
        } = searchFilters

        const variables = {
            ...searchFilters,
            priceRange: priceRange?.[1] ? priceRange : priceRange?.[0] ? [priceRange[0], 99999999] : [0, 99999999],
            zipCodes: zipCodes?.length ? zipCodes : undefined,
            freeText: freeText === "" ? undefined : freeText,
            onlyWithGarden: onlyWithGarden || undefined,
            minGardenArea: onlyWithGarden && minGardenArea > 0 ? minGardenArea : undefined,
            minLivingArea: minLivingArea > 0 ? minLivingArea : undefined,
            minBedroomCount: minBedroomCount > 0 ? minBedroomCount : undefined,
            onlyStillAvailable: onlyStillAvailable || undefined,
            immowebCode: immowebCode || undefined,
            orderBy: resultSorter
        }

        notification.open({
            message: 'Search ongoing...',
            description: <pre>{JSON.stringify(variables, null, 2)}</pre>,
            placement: 'bottomLeft',
            duration: 5
        })

        fetch({ variables })

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
            fetchResultsLater({}, resultSorter)
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