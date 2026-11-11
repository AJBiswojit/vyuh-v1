import { useMemo, useState } from 'react'
import { Download, Filter, RefreshCw, ScrollText, Search } from 'lucide-react'
import useAsync from '../../lib/useAsync.js'
import { adminService } from '../../services/admin.service.js'
import { formatDate, formatTime, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

const ENTITY_LABEL = {
  user: 'User',
  policy: 'Policy',
  exam: 'Examination',
  approval: 'Approval',
  integrity: 'Integrity',
  class: 'Class',
  recording: 'Recording',
  attendance: 'Attendance',
  batch: 'Batch',
  settings: 'Settings',
  institute: 'Institute',
  attempt: 'Attempt',
  doubt: 'Doubt',
  support: 'Support',
}

const ROLE_LABEL = {
  admin: 'Institute Admin',
  faculty: 'Faculty',
  student: 'Student',
  system: 'System',
}

export default function AdminAuditLogPage() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [entityType, setEntityType] = useState('all')
  const [actorRole, setActorRole] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState(null)

  const { data, error, loading, refresh } = useAsync(
    () =>
      adminService.listAudit({
        query: query.trim() || undefined,
        entityType,
        actorRole,
        from: from || undefined,
        to: to || undefined,
      }),
    [query, entityType, actorRole, from, to],
  )

  const events = useMemo(() => data || [], [data])

  const entityTypes = useMemo(() => {
    const set = new Set(events.map((event) => event.entityType))
    return [...set].sort()
  }, [events])

  const counts = useMemo(() => {
    const base = {}
    events.forEach((event) => {
      base[event.actionLabel] = (base[event.actionLabel] || 0) + 1
    })
    return Object.entries(base).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [events])

  const downloadCsv = () => {
    if (!events.length) return
    const header = ['Timestamp', 'Actor', 'Role', 'Action', 'Entity type', 'Entity', 'From', 'To', 'Reason']
    const escape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`
    const rows = events.map((event) =>
      [
        event.at,
        event.actorName || event.actorId,
        event.actorRole,
        event.actionLabel,
        event.entityType,
        event.entityLabel,
        event.previousValue,
        event.newValue,
        event.reason,
      ].map(escape).join(','),
    )
    const blob = new Blob([[header.map(escape).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'audit-log.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
    toast.success('Audit log exported', `${events.length} entries written to audit-log.csv`)
  }

  const resetFilters = () => {
    setQuery('')
    setEntityType('all')
    setActorRole('all')
    setFrom('')
    setTo('')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Audit Log"
        description="Every privileged action, in order, with who did it, what changed and why. Entries are append-only."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => refresh()}>
              Refresh
            </Button>
            <Button size="sm" variant="primary" icon={Download} onClick={downloadCsv} disabled={!events.length}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="surface-flat mb-4 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field-input pl-8"
              placeholder="Search action, entity or actor…"
              aria-label="Search the audit log"
            />
          </div>
          <select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="field-select w-auto"
            aria-label="Filter by entity type"
          >
            <option value="all">All entities</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {ENTITY_LABEL[type] || type}
              </option>
            ))}
          </select>
          <select
            value={actorRole}
            onChange={(event) => setActorRole(event.target.value)}
            className="field-select w-auto"
            aria-label="Filter by actor role"
          >
            <option value="all">All roles</option>
            <option value="admin">Institute Admin</option>
            <option value="faculty">Faculty</option>
            <option value="student">Student</option>
            <option value="system">System</option>
          </select>
          <label className="flex items-center gap-1.5 text-[10.5px] text-muted">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="field-input w-auto py-1 text-[11px]"
              aria-label="From date"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[10.5px] text-muted">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="field-input w-auto py-1 text-[11px]"
              aria-label="To date"
            />
          </label>
          <Button size="sm" variant="ghost" icon={Filter} onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          {loading ? (
            <LoadingBlock rows={6} />
          ) : error ? (
            <ErrorState error={error} onRetry={refresh} title="The audit log could not be loaded" />
          ) : events.length === 0 ? (
            <div className="surface-flat">
              <EmptyState
                icon={ScrollText}
                title="No entries match these filters"
                description="Widen the date range or clear the search. Every privileged action is recorded automatically."
              />
            </div>
          ) : (
            <div className="surface-flat overflow-hidden">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Actor</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const open = expanded === event.id
                      return [
                        <tr key={event.id} className={open ? 'bg-[var(--sky-50)]' : ''}>
                          <td className="whitespace-nowrap">
                            <p className="text-[11px] text-ink">{formatDate(event.at)}</p>
                            <p className="text-[10px] text-soft">{formatTime(event.at)}</p>
                          </td>
                          <td>
                            <p className="text-[11.5px] font-medium text-ink">{event.actionLabel}</p>
                            <p className="font-mono text-[9.5px] text-soft">{event.action}</p>
                          </td>
                          <td>
                            <p className="max-w-[220px] truncate text-[11px] text-ink">{event.entityLabel}</p>
                            <p className="text-[9.5px] text-soft">{ENTITY_LABEL[event.entityType] || event.entityType}</p>
                          </td>
                          <td>
                            <p className="text-[11px] text-ink">{event.actorName || event.actorId}</p>
                            <p className="text-[9.5px] text-soft">{ROLE_LABEL[event.actorRole] || event.actorRole}</p>
                          </td>
                          <td className="align-right">
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : event.id)}
                              className="text-[10.5px] font-medium text-link"
                            >
                              {open ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>,
                        open ? (
                          <tr key={`${event.id}-detail`}>
                            <td colSpan={5} className="bg-[var(--surface-muted)]">
                              <dl className="grid gap-2 py-1 text-[10.5px] sm:grid-cols-2">
                                <div>
                                  <dt className="label-xs">Previous value</dt>
                                  <dd className="break-words font-mono text-ink">{event.previousValue || '—'}</dd>
                                </div>
                                <div>
                                  <dt className="label-xs">New value</dt>
                                  <dd className="break-words font-mono text-ink">{event.newValue || '—'}</dd>
                                </div>
                                <div className="sm:col-span-2">
                                  <dt className="label-xs">Reason</dt>
                                  <dd className="text-muted">{event.reason || 'No reason recorded'}</dd>
                                </div>
                                <div>
                                  <dt className="label-xs">Recorded</dt>
                                  <dd className="text-muted">
                                    {relativeTime(event.at)} · {event.ipLabel || 'Institute network'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="label-xs">Entity ID</dt>
                                  <dd className="font-mono text-muted">{event.entityId}</dd>
                                </div>
                              </dl>
                            </td>
                          </tr>
                        ) : null,
                      ]
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <section className="surface-flat p-3.5">
            <h2 className="text-[12px] font-medium text-ink">In this view</h2>
            <dl className="mt-1.5 space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Entries</dt>
                <dd className="font-medium text-ink">{events.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Oldest</dt>
                <dd className="font-medium text-ink">{events.length ? formatDate(events[events.length - 1].at) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Newest</dt>
                <dd className="font-medium text-ink">{events.length ? relativeTime(events[0].at) : '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-flat p-3.5">
            <h2 className="text-[12px] font-medium text-ink">Most frequent actions</h2>
            {counts.length === 0 ? (
              <p className="mt-1 text-[10.5px] text-soft">No entries.</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {counts.map(([label, count]) => (
                  <li key={label} className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="truncate text-muted">{label}</span>
                    <StatusBadge tone="neutral">{count}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="text-[10px] leading-relaxed text-soft">
            The audit log has no edit or delete path in the interface. Entries are written by the service layer at the
            moment an action succeeds.
          </p>
        </aside>
      </div>
    </div>
  )
}
