import React, {useEffect, useMemo, useState} from 'react'
import {gql, useMutation, useQuery} from '@apollo/client'
import {Alert, Button, Card, Form, Layout, Radio, Select, Space, Spin, Switch, Table, Tag, TimePicker, Typography, message} from 'antd'
import {PlayCircleOutlined, SaveOutlined} from '@ant-design/icons'
import SelectLocalities from './SelectLocalities'
import moment from 'moment'

const ROUTINE_ADMIN_QUERY = gql`
    query RoutineAdmin($postalCode: Int!, $propertyType: PropertyType!) {
        routineStatus {
            schedule { enabled cronExpression timezone nextRunAt postalCodes propertyTypes }
            activeRun { id trigger status startedAt finishedAt errorSummary totals { added updated disappeared disappearanceChecked } }
            lastRun { id trigger status startedAt finishedAt errorSummary totals { added updated disappeared disappearanceChecked } }
            lastSuccessfulRun { id trigger status startedAt finishedAt }
        }
        routineRuns(limit: 10, postalCode: $postalCode, propertyType: $propertyType) {
            id trigger status startedAt finishedAt errorSummary
            coverage { postalCode propertyType status added updated disappeared errorSummary }
            totals { added updated disappeared disappearanceChecked }
        }
        routineHistory(postalCode: $postalCode, propertyType: $propertyType) { date runId }
    }
`
const UPDATE_SCHEDULE = gql`mutation UpdateRoutineSchedule($input: RoutineScheduleInput!) {
    updateRoutineSchedule(input: $input) { enabled cronExpression timezone nextRunAt postalCodes propertyTypes }
}`
const TRIGGER_ROUTINE = gql`mutation TriggerRoutine { triggerRoutine { started run { id status startedAt } } }`
const WEEKDAYS = [
    {label: 'Sunday', value: 0}, {label: 'Monday', value: 1}, {label: 'Tuesday', value: 2},
    {label: 'Wednesday', value: 3}, {label: 'Thursday', value: 4}, {label: 'Friday', value: 5},
    {label: 'Saturday', value: 6}
]

function formatDate(value) {
    if(!value) return '—'
    return new Intl.DateTimeFormat('en-BE', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Brussels'}).format(new Date(value))
}
function formatDuration(run) {
    if(!run?.finishedAt) return run?.status === 'running' ? 'In progress' : '—'
    const seconds = Math.max(0, Math.round((new Date(run.finishedAt) - new Date(run.startedAt)) / 1000))
    const minutes = Math.floor(seconds / 60)
    return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}
function statusColor(status) { return {success: 'green', failed: 'red', running: 'blue', interrupted: 'orange', partial: 'gold'}[status] || 'default' }

function RunCalendar({history}) {
    const years = useMemo(() => [...new Set(history.map(item => Number(item.date.slice(0, 4))))].sort((a, b) => b - a), [history])
    const days = useMemo(() => new Set(history.map(item => item.date)), [history])
    if(!years.length) return <Typography.Text type="secondary">No successful coverage recorded for this selection.</Typography.Text>
    return <div className="routine-calendars">{years.map(year => {
        const cells = []
        const first = new Date(Date.UTC(year, 0, 1))
        for(let i = 0; i < first.getUTCDay(); i++) cells.push(<span className="run-day empty" key={`empty-${i}`} />)
        for(let current = first; current.getUTCFullYear() === year; current.setUTCDate(current.getUTCDate() + 1)) {
            const key = current.toISOString().slice(0, 10)
            cells.push(<span className={`run-day level-${days.has(key) ? 4 : 0}`} key={key} title={`${key}: ${days.has(key) ? 'covered' : 'not covered'}`} />)
        }
        return <div className="routine-calendar-year" key={year}><Typography.Title level={5}>{year}</Typography.Title>
            <div className="routine-calendar-scroll"><div className="routine-calendar-grid">{cells}</div></div></div>
    })}</div>
}

export default function RoutineAdmin() {
    const [monitorPostalCode, setMonitorPostalCode] = useState(1000)
    const [monitorPropertyType, setMonitorPropertyType] = useState('HOUSE')
    const {data, loading, error, refetch} = useQuery(ROUTINE_ADMIN_QUERY, {
        variables: {postalCode: monitorPostalCode, propertyType: monitorPropertyType}, pollInterval: 10000
    })
    const [updateSchedule, {loading: saving}] = useMutation(UPDATE_SCHEDULE)
    const [triggerRoutine, {loading: triggering}] = useMutation(TRIGGER_ROUTINE)
    const [enabled, setEnabled] = useState(false)
    const [frequency, setFrequency] = useState('daily')
    const [scheduleTime, setScheduleTime] = useState(() => moment('04:00', 'HH:mm'))
    const [dayOfWeek, setDayOfWeek] = useState(0)
    const [postalCodes, setPostalCodes] = useState([])
    const [propertyTypes, setPropertyTypes] = useState(['HOUSE'])
    const cronExpression = `${scheduleTime.minute()} ${scheduleTime.hour()} * * ${frequency === 'daily' ? '*' : dayOfWeek}`

    const schedule = data?.routineStatus?.schedule
    useEffect(() => {
        if(schedule) {
            setEnabled(schedule.enabled)
            const match = /^(\d+)\s+(\d+)\s+\*\s+\*\s+(\*|[0-6])$/.exec(schedule.cronExpression)
            if(match) {
                setScheduleTime(moment({hour: Number(match[2]), minute: Number(match[1])}))
                setFrequency(match[3] === '*' ? 'daily' : 'weekly')
                if(match[3] !== '*') setDayOfWeek(Number(match[3]))
            }
            setPostalCodes(schedule.postalCodes); setPropertyTypes(schedule.propertyTypes)
            if(schedule.postalCodes.length && !schedule.postalCodes.includes(monitorPostalCode)) setMonitorPostalCode(schedule.postalCodes[0])
        }
    }, [schedule]) // eslint-disable-line react-hooks/exhaustive-deps

    if(loading && !data) return <Spin className="routine-loading" />
    if(error) return <Alert type="error" showIcon message="Unable to load routine administration" description={error.message} />
    const status = data.routineStatus
    const active = status.activeRun
    const currentStatus = active ? {label: 'RUNNING', color: 'blue'} : {label: status.lastRun?.status === 'failed' ? 'LAST RUN FAILED' : status.lastRun?.status === 'partial' ? 'LAST RUN PARTIAL' : 'IDLE', color: statusColor(status.lastRun?.status || 'success')}
    const save = async () => {
        try {
            await updateSchedule({variables: {input: {enabled, cronExpression, postalCodes, propertyTypes}}})
            message.success('Routine configuration updated'); await refetch()
        } catch(saveError) { message.error(saveError.message) }
    }
    const runNow = async () => {
        try {
            await updateSchedule({variables: {input: {enabled, cronExpression, postalCodes, propertyTypes}}})
            const result = await triggerRoutine(); message[result.data.triggerRoutine.started ? 'success' : 'info'](result.data.triggerRoutine.started ? 'Routine started' : 'The routine is already running')
            await refetch()
        } catch(triggerError) { message.error(triggerError.message) }
    }
    const scopedCoverage = run => run.coverage?.find(item => item.postalCode === monitorPostalCode && item.propertyType === monitorPropertyType)
    const columns = [
        {title: 'Started', dataIndex: 'startedAt', render: formatDate},
        {title: 'Trigger', dataIndex: 'trigger', render: value => <span style={{textTransform: 'capitalize'}}>{value}</span>},
        {title: 'Coverage', render: (_, run) => <Tag color={statusColor(scopedCoverage(run)?.status)}>{(scopedCoverage(run)?.status || run.status).toUpperCase()}</Tag>},
        {title: 'Duration', render: (_, run) => formatDuration(run)},
        {title: 'Added', render: (_, run) => scopedCoverage(run)?.added ?? '—'},
        {title: 'Updated', render: (_, run) => scopedCoverage(run)?.updated ?? '—'},
        {title: 'Disappeared', render: (_, run) => scopedCoverage(run)?.disappeared ?? '—'}
    ]

    return <Layout.Content className="routine-admin">
        <Typography.Title level={2}>Admin schedules</Typography.Title>
        <div className="routine-summary-grid">
            <Card title="Current status"><Space direction="vertical">
                <Tag color={currentStatus.color}>{currentStatus.label}</Tag>
                <Typography.Text>Last successful run: {formatDate(status.lastSuccessfulRun?.finishedAt)}</Typography.Text>
                <Typography.Text>Next scheduled run: {schedule.enabled ? formatDate(schedule.nextRunAt) : 'Scheduling disabled'}</Typography.Text>
            </Space></Card>
            <Card title="Schedule"><Form layout="vertical">
                <Form.Item label="Enabled"><Switch checked={enabled} onChange={setEnabled} /></Form.Item>
                <Form.Item label="Areas"><SelectLocalities value={postalCodes} onChange={setPostalCodes} addOnly style={{width: 430}} /></Form.Item>
                <Form.Item label="Property types">
                    <Radio.Group
                        value={propertyTypes.length === 2 ? 'ALL' : propertyTypes[0]}
                        onChange={event => setPropertyTypes(event.target.value === 'ALL' ? ['HOUSE', 'APARTMENT'] : [event.target.value])}
                    >
                        <Radio value="HOUSE">Houses only</Radio>
                        <Radio value="APARTMENT">Flats only</Radio>
                        <Radio value="ALL">All</Radio>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label={`Schedule (${schedule.timezone})`}><Space wrap>
                    <Radio.Group value={frequency} onChange={event => setFrequency(event.target.value)}>
                        <Radio.Button value="daily">Daily</Radio.Button>
                        <Radio.Button value="weekly">Weekly</Radio.Button>
                    </Radio.Group>
                    <TimePicker value={scheduleTime} onChange={value => value && setScheduleTime(value)} format="HH:mm" minuteStep={5} allowClear={false} />
                    {frequency === 'weekly' && <Select value={dayOfWeek} onChange={setDayOfWeek} options={WEEKDAYS} style={{width: 150}} />}
                </Space></Form.Item>
                <Typography.Paragraph type="secondary">
                    {frequency === 'daily' ? 'Every day' : `Every ${WEEKDAYS.find(day => day.value === dayOfWeek).label}`} at {scheduleTime.format('HH:mm')}. Missed runs are not replayed.
                </Typography.Paragraph>
                <Space><Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!postalCodes.length || !propertyTypes.length} onClick={save}>Save</Button>
                    <Button icon={<PlayCircleOutlined />} loading={triggering} disabled={Boolean(active) || !postalCodes.length || !propertyTypes.length} onClick={runNow}>Run now</Button></Space>
            </Form></Card>
        </div>
        <Card title="Coverage monitoring" className="routine-section">
            <Space wrap className="routine-monitor-filters">
                <SelectLocalities multiple={false} value={monitorPostalCode} onChange={setMonitorPostalCode} />
                <Select value={monitorPropertyType} onChange={setMonitorPropertyType} style={{width: 160}} options={[{label: 'Houses', value: 'HOUSE'}, {label: 'Apartments', value: 'APARTMENT'}]} />
            </Space>
            <RunCalendar history={data.routineHistory} />
        </Card>
        <Card title="Recent runs for this coverage" className="routine-section">
            <Table rowKey="id" columns={columns} dataSource={data.routineRuns} pagination={false}
                expandable={{expandedRowRender: run => scopedCoverage(run)?.errorSummary ? <Alert type="error" message={scopedCoverage(run).errorSummary} /> : <Typography.Text type="secondary">No error reported.</Typography.Text>}} />
        </Card>
    </Layout.Content>
}
