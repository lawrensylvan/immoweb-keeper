import { useState } from 'react'
import _ from 'lodash'
import { Checkbox, Popover, Table, Tag } from 'antd'
import InfiniteScroll from 'react-infinite-scroll-component'
import { Divider } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import {formatPostalCodeLocation} from './SelectLocalities'
import {formatShortDate} from '../utils/formatDate'

const COLUMN_STORAGE_KEY = 'estate-table-visible-columns'
const DEFAULT_COLUMN_KEYS = ['immowebCode', 'address', 'zipCode', 'price', 'modificationDate', 'livingArea', 'gardenArea']
const COLUMN_CHOICES = [
    ['immowebCode', 'Immoweb code'],
    ['address', 'Address'],
    ['zipCode', 'Zip code / locality'],
    ['propertyType', 'Estate type'],
    ['price', 'Price'],
    ['pricePerSquareMeter', 'Price / m²'],
    ['bedroomCount', 'Bedrooms'],
    ['livingArea', 'Living area'],
    ['gardenArea', 'Garden area'],
    ['status', 'Listing status'],
    ['creationDate', 'Created on'],
    ['modificationDate', 'Last modified on'],
    ['disappearanceDate', 'Disappeared on'],
    ['agencyName', 'Agency'],
    ['isAuction', 'Auction'],
    ['imageCount', 'Photos'],
    ['isLiked', 'Liked'],
    ['isVisited', 'Visited']
]

const loadVisibleColumnKeys = () => {
    try {
        const savedKeys = JSON.parse(localStorage.getItem(COLUMN_STORAGE_KEY))
        const validKeys = savedKeys?.filter(key => COLUMN_CHOICES.some(([choiceKey]) => choiceKey === key))
        return validKeys?.length ? validKeys : DEFAULT_COLUMN_KEYS
    } catch(error) {
        return DEFAULT_COLUMN_KEYS
    }
}

const listingStatus = estate => estate.isSold || estate.disappearanceDate
    ? 'soldOrDisappeared'
    : estate.isUnderOption
        ? 'underOption'
        : 'listed'

export default function TableResults({estates, postalCodeCatalog, isLoading, sort, setSort, fetchNext, totalCount}) {
    const [visibleColumnKeys, setVisibleColumnKeys] = useState(loadVisibleColumnKeys)

    const updateVisibleColumnKeys = keys => {
        if(!keys.length) return
        setVisibleColumnKeys(keys)
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(keys))
    }

    const columnSelector = (
        <div className="table-column-selector">
            <strong>Visible columns</strong>
            <Checkbox.Group value={visibleColumnKeys} onChange={updateVisibleColumnKeys}>
                {COLUMN_CHOICES.map(([key, label]) => (
                    <Checkbox value={key} key={key}>{label}</Checkbox>
                ))}
            </Checkbox.Group>
        </div>
    )

    const allColumns = [
        {
            title: '♯ Immoweb Code', dataIndex: 'immowebCode', key: 'immowebCode'
        },
        {
            title: '⌖ Address', dataIndex: 'displayStreetAndNumber', key: 'address'
        },
        {
            title: '⌖ Zip code', dataIndex: 'displayZipCode', key: 'zipCode',
            render: (_, estate) => formatPostalCodeLocation(estate.zipCode, postalCodeCatalog, estate.locality),
            filters: _.uniq(estates?.map(e => e.zipCode))
                .map(z => {
                    const estate = estates.find(e => e.zipCode === z)
                    return {text: formatPostalCodeLocation(z, postalCodeCatalog, estate?.locality), value: z}
                }),
            onFilter: (value, record) => record.zipCode === value
        },
        {
            title: '🏘 Type', dataIndex: 'propertyType', key: 'propertyType',
            render: type => type === 'APARTMENT' ? '▦ flat' : '⌂ house',
            filters: [
                {text: '▦ flat', value: 'APARTMENT'},
                {text: '⌂ house', value: 'HOUSE'}
            ],
            onFilter: (value, estate) => estate.propertyType === value
        },
        {
            title: '💰 Price', dataIndex: 'displayPrice', key: 'price',
            sorter: true,
            sortOrder: sort.field === 'price' ? sort.order : null
        },
        {
            title: '💶 Price / m²', key: 'pricePerSquareMeter',
            render: (_, estate) => estate.price && estate.livingArea
                ? `${Math.round(estate.price / estate.livingArea).toLocaleString('fr-BE')} €/m²`
                : '—'
        },
        {
            title: '🛏 Bedrooms', dataIndex: 'bedroomCount', key: 'bedroomCount',
            render: value => value ?? '—',
            filters: _.uniq(estates?.map(estate => estate.bedroomCount).filter(value => value != null))
                .sort((a, b) => a - b)
                .map(value => ({text: value, value})),
            onFilter: (value, estate) => estate.bedroomCount === value
        },
        {
            title: '🏠↔', dataIndex: 'livingArea', key: 'livingArea',
            sorter: true,
            render: text => text ? `${text}m²` : '—',
            sortOrder: sort.field === 'livingArea' ? sort.order : null
        },
        {
            title: '🌳↔', dataIndex: 'gardenArea', key: 'gardenArea',
            sorter: true,
            render: (text, record) => text > 0 ? `✓ ${text}m²` : record.hasGarden ? '✓' : '✗',
            filters: [
                {text: 'Has garden', value: 'yes'},
                {text: 'No garden', value: 'no'}
            ],
            onFilter: (value, estate) => value === 'yes' ? estate.hasGarden : !estate.hasGarden,
            sortOrder: sort.field === 'gardenArea' ? sort.order : null
        },
        {
            title: 'Status', key: 'status',
            render: (_, estate) => {
                const status = listingStatus(estate)
                if(status === 'soldOrDisappeared') return <Tag color="red">Sold / disappeared</Tag>
                if(status === 'underOption') return <Tag color="orange">Under option</Tag>
                return <Tag color="blue">Listed</Tag>
            },
            filters: [
                {text: 'Listed', value: 'listed'},
                {text: 'Under option', value: 'underOption'},
                {text: 'Sold / disappeared', value: 'soldOrDisappeared'}
            ],
            onFilter: (value, estate) => listingStatus(estate) === value
        },
        {
            title: '📅 Created on', dataIndex: 'displayCreationDate', key: 'creationDate',
            sorter: true,
            sortOrder: sort.field === 'creationDate' ? sort.order : null
        },
        {
            title: '📅 Last modified on', dataIndex: 'displayModificationDate', key: 'modificationDate',
            sorter: true,
            sortOrder: sort.field === 'modificationDate' ? sort.order : null
        },
        {
            title: '👻 Disappeared on', dataIndex: 'disappearanceDate', key: 'disappearanceDate',
            sorter: true,
            render: formatShortDate,
            sortOrder: sort.field === 'disappearanceDate' ? sort.order : null
        },
        {
            title: 'Agency', dataIndex: 'agencyName', key: 'agencyName',
            render: value => value || '—',
            filters: _.uniq(estates?.map(estate => estate.agencyName).filter(Boolean))
                .sort((a, b) => a.localeCompare(b))
                .map(value => ({text: value, value})),
            onFilter: (value, estate) => estate.agencyName === value
        },
        {
            title: 'Auction', dataIndex: 'isAuction', key: 'isAuction',
            render: value => value ? '✓' : '—',
            filters: [{text: 'Auction', value: true}, {text: 'Not an auction', value: false}],
            onFilter: (value, estate) => Boolean(estate.isAuction) === value
        },
        {
            title: '📷 Photos', dataIndex: 'images', key: 'imageCount',
            render: images => images?.length || 0,
            filters: [{text: 'Has photos', value: 'yes'}, {text: 'No photos', value: 'no'}],
            onFilter: (value, estate) => value === 'yes' ? estate.images?.length > 0 : !estate.images?.length
        },
        {
            title: '♥ Liked', dataIndex: 'isLiked', key: 'isLiked',
            render: value => value ? '✓' : '—',
            filters: [{text: 'Liked', value: true}, {text: 'Not liked', value: false}],
            onFilter: (value, estate) => Boolean(estate.isLiked) === value
        },
        {
            title: '◉ Visited', dataIndex: 'isVisited', key: 'isVisited',
            render: value => value ? '✓' : '—',
            filters: [{text: 'Visited', value: true}, {text: 'Not visited', value: false}],
            onFilter: (value, estate) => Boolean(estate.isVisited) === value
        }
    ]

    const columns = allColumns
        .filter(column => visibleColumnKeys.includes(column.key))
        .map(column => ({
            ...column,
            title: (
                <Popover trigger="contextMenu" placement="bottomLeft" content={columnSelector}>
                    <span className="table-column-title" title="Right-click to choose columns">{column.title}</span>
                </Popover>
            )
        }))

    // TODO : bug = some rows get duplicated in the apollo cache and in the table when messing with sorters and alternating between grid and table results...
    return (
        <div className='TableResults'>

            <InfiniteScroll
                dataLength={estates?.length || 0}
                next={() => fetchNext()}
                hasMore={totalCount > estates?.length}
                loader={<Divider plain>Loading {totalCount - estates?.length} more <LoadingOutlined/> awesome estates</Divider>}
                endMessage={estates?.length && <Divider plain>Nothing more for now... Come back tomorrow 🤞</Divider>}
                scrollThreshold={0.85}
                >

                <Table
                    pagination={false}
                    dataSource={estates} rowKey="immowebCode" size="small"
                    onChange={(pagination, filters, sorter, extra) => {
                        if(extra.action !== 'sort') return
                        if(sorter.order) {
                            setSort({field: sorter.columnKey, order: sorter.order})
                        } else {
                            setSort({field: 'modificationDate', order: 'descend'})
                        }
                    }}
                    loading={isLoading} sortDirections={['ascend', 'descend']} columns={columns} />

            </InfiniteScroll>

        </div>
    )
}
