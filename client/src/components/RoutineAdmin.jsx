import React, { useEffect, useMemo, useState } from 'react'
import { gql, useMutation, useQuery } from '@apollo/client'
import { Alert, Button, Card, Form, Input, Layout, Select, Space, Spin, Switch, Table, Tag, Typography, message } from 'antd'
import { PlayCircleOutlined, SaveOutlined } from '@ant-design/icons'

const ROUTINE_ADMIN_QUERY = gql`
    query RoutineAdmin {
        routineStatus {
            schedule { enabled cronExpression timezone nextRunAt }
            activeRun { id trigger status startedAt finishedAt errorSummary totals { added updated disappeared disappearanceChecked } }
            lastRun { id trigger status startedAt finishedAt errorSummary totals { added updated disappeared disappearanceChecked } }
            lastSuccessfulRun { id trigger status startedAt finishedAt }
        }
        routineRuns(limit: 10) {
            id trigger status startedAt finishedAt errorSummary
            totals { added updated disappeared disappearanceChecked }
        }
        routineHistory { queryId label periods { start end } }
    }
`

const UPDATE_SCHEDULE = gql`
    mutation UpdateRoutineSchedule($input: RoutineScheduleInput!) {
        updateRoutineSchedule(input: $input) { enabled cronExpression timezone nextRunAt }
    }
`

const TRIGGER_ROUTINE = gql`
    mutation TriggerRoutine {
        triggerRoutine { started run { id status startedAt } }
    }
`

const CRON_PRESETS = [
    {label: 'Daily at 04:00', value: '0 4 * * *'},
    {label: 'Daily at 06:00', value: '0 6 * * *'},
    {label: 'Every Sunday at 04:00', value: '0 4 * * 0'}
]

function formatDate(value) {
    if(!value) return '—'
    return new Intl.DateTimeFormat('en-BE', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Brussels'
    }).format(new Date(value))
}

function formatDuration(run) {
    if(!run?.finishedAt) return run?.status === 'running' ? 'In progress' : '—'
    const seconds = Math.max(0, Math.round((new Date(run.finishedAt) - new Date(run.startedAt)) / 1000))
    const minutes = Math.floor(seconds / 60)
    return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}

function statusColor(status) {
    return {success: 'green', failed: 'red', running: 'blue', interrupted: 'orange'}[status] || 'default'
}

function addPeriodToDays(days, start, end) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return
    let current = new Date(`${start}T00:00:00Z`)
    const last = new Date(`${end}T00:00:00Z`)
    while(current <= last) {
        const key = current.toISOString().slice(0, 10)
        days.set(key, (days.get(key) || 0) + 1)
        current.setUTCDate(current.getUTCDate() + 1)
    }
}

function RunCalendar({history}) {
    const {days, years, maxCount} = useMemo(() => {
        const aggregated = new Map()
        history.forEach(query => query.periods.forEach(period => addPeriodToDays(aggregated, period.start, period.end)))
        const representedYears = [...new Set([...aggregated.keys()].map(day => Number(day.slice(0, 4))))].sort((a, b) => b - a)
        return {
            days: aggregated,
            years: representedYears,
            maxCount: Math.max(1, ...aggregated.values())
        }
    }, [history])

    if(!years.length) return <Typography.Text type="secondary">No historical runs recorded yet.</Typography.Text>

    return <div className="routine-calendars">
        {years.map(year => {
            const cells = []
            const first = new Date(Date.UTC(year, 0, 1))
            for(let i = 0; i < first.getUTCDay(); i++) cells.push(<span className="run-day empty" key={`empty-${i}`} />)
            for(let current = first; current.getUTCFullYear() === year; current.setUTCDate(current.getUTCDate() + 1)) {
                const key = current.toISOString().slice(0, 10)
                const count = days.get(key) || 0
                const level = count ? Math.max(1, Math.ceil((count / maxCount) * 4)) : 0
                cells.push(<span className={`run-day level-${level}`} key={key} title={`${key}: ${count} ${count === 1 ? 'query' : 'queries'} recorded`} />)
            }
            return <div className="routine-calendar-year" key={year}>
                <Typography.Title level={5}>{year}</Typography.Title>
                <div className="routine-calendar-scroll"><div className="routine-calendar-grid">{cells}</div></div>
            </div>
        })}
    </div>
}

export default function RoutineAdmin() {
    const {data, loading, error, refetch} = useQuery(ROUTINE_ADMIN_QUERY, {pollInterval: 10000})
    const [updateSchedule, {loading: saving}] = useMutation(UPDATE_SCHEDULE)
    const [triggerRoutine, {loading: triggering}] = useMutation(TRIGGER_ROUTINE)
    const [enabled, setEnabled] = useState(false)
    const [cronExpression, setCronExpression] = useState('0 4 * * *')

    const schedule = data?.routineStatus?.schedule
    useEffect(() => {
        if(schedule) {
            setEnabled(schedule.enabled)
            setCronExpression(schedule.cronExpression)
        }
    }, [schedule])

    if(loading && !data) return <Spin className="routine-loading" />
    if(error) return <Alert type="error" showIcon message="Unable to load routine administration" description={error.message} />

    const status = data.routineStatus
    const active = status.activeRun
    const scheduleDescription = CRON_PRESETS.find(preset => preset.value === cronExpression)?.label || 'Custom schedule'
    const currentStatus = active
        ? {label: 'RUNNING', color: 'blue'}
        : status.lastRun?.status === 'failed'
            ? {label: 'LAST RUN FAILED', color: 'red'}
            : status.lastRun?.status === 'interrupted'
                ? {label: 'LAST RUN INTERRUPTED', color: 'orange'}
                : {label: 'IDLE', color: 'green'}
    const save = async () => {
        try {
            await updateSchedule({variables: {input: {enabled, cronExpression}}})
            message.success('Routine schedule updated')
            await refetch()
        } catch(saveError) {
            message.error(saveError.message)
        }
    }
    const runNow = async () => {
        try {
            const result = await triggerRoutine()
            if(result.data.triggerRoutine.started) message.success('Routine started')
            else message.info('The routine is already running')
            await refetch()
        } catch(triggerError) {
            message.error(triggerError.message)
        }
    }

    const columns = [
        {title: 'Started', dataIndex: 'startedAt', render: formatDate},
        {title: 'Trigger', dataIndex: 'trigger', render: value => <span style={{textTransform: 'capitalize'}}>{value}</span>},
        {title: 'Status', dataIndex: 'status', render: value => <Tag color={statusColor(value)}>{value.toUpperCase()}</Tag>},
        {title: 'Duration', render: (_, run) => formatDuration(run)},
        {title: 'Added', render: (_, run) => run.totals?.added ?? '—'},
        {title: 'Updated', render: (_, run) => run.totals?.updated ?? '—'},
        {title: 'Disappeared', render: (_, run) => run.totals?.disappearanceChecked === false
            ? <Typography.Text type="secondary">Not checked</Typography.Text>
            : run.totals?.disappeared ?? '—'}
    ]

    return <Layout.Content className="routine-admin">
        <Typography.Title level={2}>Routine administration</Typography.Title>

        <div className="routine-summary-grid">
            <Card title="Current status">
                <Space direction="vertical">
                    <Tag color={currentStatus.color}>{currentStatus.label}</Tag>
                    <Typography.Text>Last successful run: {formatDate(status.lastSuccessfulRun?.finishedAt)}</Typography.Text>
                    <Typography.Text>Next scheduled run: {schedule.enabled ? formatDate(schedule.nextRunAt) : 'Scheduling disabled'}</Typography.Text>
                </Space>
            </Card>

            <Card title="Schedule">
                <Form layout="vertical">
                    <Form.Item label="Enabled">
                        <Switch checked={enabled} onChange={setEnabled} />
                    </Form.Item>
                    <Form.Item label={`Cron expression (${schedule.timezone})`}>
                        <Space wrap>
                            <Input value={cronExpression} onChange={event => setCronExpression(event.target.value)} style={{width: 180}} />
                            <Select value={CRON_PRESETS.some(preset => preset.value === cronExpression) ? cronExpression : undefined}
                                placeholder="Choose a preset" options={CRON_PRESETS} onChange={setCronExpression} style={{width: 220}} />
                        </Space>
                    </Form.Item>
                    <Typography.Paragraph type="secondary">
                        {scheduleDescription}. Missed runs while the server is offline are not replayed.
                    </Typography.Paragraph>
                    <Space>
                        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>Save schedule</Button>
                        <Button icon={<PlayCircleOutlined />} loading={triggering} disabled={Boolean(active)} onClick={runNow}>Run now</Button>
                    </Space>
                </Form>
            </Card>
        </div>

        <Card title="Recent runs" className="routine-section">
            <Table rowKey="id" columns={columns} dataSource={data.routineRuns} pagination={false}
                expandable={{expandedRowRender: run => run.errorSummary ? <Alert type="error" message={run.errorSummary} /> : <Typography.Text type="secondary">No error reported.</Typography.Text>}} />
        </Card>

        <Card title="Run history" className="routine-section">
            <Typography.Paragraph type="secondary">A darker square means more saved searches recorded a run on that day.</Typography.Paragraph>
            <RunCalendar history={data.routineHistory} />
        </Card>
    </Layout.Content>
}
