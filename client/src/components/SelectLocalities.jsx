import {Select, Space, Tag} from 'antd'
import {AimOutlined, CheckOutlined} from '@ant-design/icons'
import {useQuery, gql} from '@apollo/client'
import React, {useMemo} from 'react'

export const POSTAL_CODES_QUERY = gql`
    query BelgianPostalCodes { postalCodes { code localities group groupName } }
`

export function postalCodeSegments(value = [], catalog = []) {
    const selected = new Set(value)
    if(!selected.size) return []
    if(catalog.length && selected.size === catalog.length) return [{value: 'group:ALL', label: 'All Belgium', codes: catalog.map(item => item.code)}]
    const groups = [...new Map(catalog.map(item => [item.group, item.groupName])).entries()]
    const complete = groups.filter(([group]) => {
        const codes = catalog.filter(item => item.group === group).map(item => item.code)
        return codes.length && codes.every(code => selected.has(code))
    })
    const covered = new Set(complete.flatMap(([group]) => catalog.filter(item => item.group === group).map(item => item.code)))
    const remainder = value.filter(code => !covered.has(code))
    const segments = complete.map(([group, name]) => ({
        value: `group:${group}`,
        label: `All ${name}`,
        codes: catalog.filter(item => item.group === group).map(item => item.code)
    }))
    segments.push(...remainder.map(code => ({value: code, label: String(code), codes: [code]})))
    return segments
}

export function postalCodeLabels(value = [], catalog = []) {
    return postalCodeSegments(value, catalog).map(segment => segment.label)
}

export function describePostalCodes(value = [], catalog = []) {
    const labels = postalCodeLabels(value, catalog)
    return labels.length ? labels.join(', ') : 'No postal codes'
}

export function formatPostalCodeLocation(postalCode, catalog = [], fallbackLocality = '') {
    const location = catalog.find(item => item.code === Number(postalCode))
    const locality = location?.localities?.join(', ') || fallbackLocality
    const postalLabel = [postalCode, locality].filter(Boolean).join(' · ')
    return location?.groupName ? `${postalLabel} - ${location.groupName}` : postalLabel
}

export default function SelectLocalities({value = [], onChange, multiple = true, addOnly = false, allowGroups = false, style}) {
    const {loading, error, data} = useQuery(POSTAL_CODES_QUERY)
    const catalog = useMemo(() => data?.postalCodes || [], [data])
    const groups = useMemo(() => [...new Map(catalog.map(item => [item.group, item.groupName])).entries()], [catalog])
    const selectedCodes = useMemo(() => new Set(Array.isArray(value) ? value : value == null ? [] : [value]), [value])
    const compactSegments = useMemo(() => multiple && !addOnly ? postalCodeSegments(value, catalog) : [], [multiple, addOnly, value, catalog])
    const compactValues = useMemo(() => compactSegments.map(segment => segment.value), [compactSegments])
    const compactValueSet = useMemo(() => new Set(compactValues), [compactValues])
    const selectedGroup = group => {
        const codes = group === 'ALL' ? catalog.map(item => item.code) : catalog.filter(item => item.group === group).map(item => item.code)
        return codes.length > 0 && codes.every(code => selectedCodes.has(code))
    }

    const change = selected => {
        if(!multiple) return onChange(selected)
        if(!addOnly) {
            let next = selected.filter(item => typeof item === 'number')
            for(const command of selected.filter(item => typeof item === 'string')) {
                const group = command.slice('group:'.length)
                const codes = group === 'ALL' ? catalog.map(item => item.code) : catalog.filter(item => item.group === group).map(item => item.code)
                next.push(...codes)
            }
            return onChange([...new Set(next)].sort((a, b) => a - b))
        }
        const codes = typeof selected === 'string'
            ? (selected === 'group:ALL'
                ? catalog.map(item => item.code)
                : catalog.filter(item => item.group === selected.slice('group:'.length)).map(item => item.code))
            : [selected]
        onChange([...new Set([...value, ...codes])].sort((a, b) => a - b))
    }

    const dropdown = <Select
        loading={loading} disabled={Boolean(error)} showSearch allowClear={!addOnly} showArrow
        mode={multiple && !addOnly ? 'multiple' : undefined}
        placeholder={error ? 'Unable to load postal codes' : multiple ? 'Add a postal code or area' : 'Search postal code or locality'}
        optionFilterProp="searchText" optionLabelProp={multiple && !addOnly ? 'label' : 'children'}
        value={multiple ? (addOnly ? null : compactValues) : value} onChange={change}
        maxTagCount={multiple && !addOnly ? 3 : undefined}
        maxTagPlaceholder={multiple && !addOnly ? omitted => <span className="postal-code-overflow-count">+{omitted.length}</span> : undefined}
        dropdownClassName={addOnly ? 'postal-code-dropdown' : undefined}
        style={style || {width: 320}}
    >
        {multiple && !addOnly && compactSegments.length > 0 && <Select.OptGroup label="Selected">
            {compactSegments.map(segment => {
                const item = typeof segment.value === 'number' ? catalog.find(entry => entry.code === segment.value) : null
                return <Select.Option key={`selected-${segment.value}`} value={segment.value} label={segment.label}
                    searchText={`${segment.label} ${item?.localities.join(' ') || ''}`}>
                    {item ? `${item.code} · ${item.localities.join(', ')}` : segment.label}
                </Select.Option>
            })}
        </Select.OptGroup>}
        {(multiple || allowGroups) && <Select.OptGroup label="Areas">
            {(addOnly || (!compactValueSet.has('group:ALL') && !selectedGroup('ALL'))) &&
            <Select.Option value="group:ALL" label="All Belgium" searchText="All Belgium" className={addOnly && selectedGroup('ALL') ? 'postal-option-selected' : ''}>
                <span>All Belgium</span>{addOnly && selectedGroup('ALL') && <CheckOutlined />}
            </Select.Option>}
            {groups.filter(([group]) => addOnly || !selectedGroup(group)).map(([group, name]) => <Select.Option key={group} value={`group:${group}`} label={`All ${name}`} searchText={`All ${name}`}
                className={addOnly && selectedGroup(group) ? 'postal-option-selected' : ''}>
                <span>All {name}</span>{addOnly && selectedGroup(group) && <CheckOutlined />}
            </Select.Option>)}
        </Select.OptGroup>}
        <Select.OptGroup label="Postal codes">
            {catalog.filter(item => addOnly || !selectedCodes.has(item.code)).map(item => <Select.Option key={item.code} value={item.code} label={String(item.code)}
                className={addOnly && selectedCodes.has(item.code) ? 'postal-option-selected' : ''}
                searchText={`${item.code} ${item.localities.join(' ')} ${item.groupName}`}>
                <span>{item.code} · {item.localities.join(', ')}</span>
                {addOnly && selectedCodes.has(item.code) && <CheckOutlined />}
            </Select.Option>)}
        </Select.OptGroup>
    </Select>

    if(!multiple || !addOnly) return <Space className="postal-code-select"><AimOutlined />{dropdown}</Space>
    return <div className="postal-code-select">
        <Space><AimOutlined />{dropdown}</Space>
        <div className="postal-code-tags postal-code-selection-summary">
            {postalCodeSegments(value, catalog).map(segment => <Tag key={segment.label} closable onClose={() => {
                const removed = new Set(segment.codes)
                onChange(value.filter(code => !removed.has(code)))
            }}>{segment.label}</Tag>)}
        </div>
    </div>
}
