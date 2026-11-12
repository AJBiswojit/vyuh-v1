import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  Bot,
  Filter,
  Inbox,
  LifeBuoy,
  Paperclip,
  Search,
  Send,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { supportService } from '../../services/support.service.js'
import { SUPPORT_STATUSES, SUPPORT_STATUS_LABELS } from '../../data/mock/support.mock.js'
import { formatDate, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextArea, Select, Field, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

function formatBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export default function SupportDeskPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const ticketParam = searchParams.get('ticket')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [requestedTicketId, setRequestedTicketId] = useState(ticketParam || null)
  const [reply, setReply] = useState('')
  const [replyStatus, setReplyStatus] = useState('in-progress')
  const [statusReason, setStatusReason] = useState('')
  const [statusPending, setStatusPending] = useState(false)
  const [actionError, setActionError] = useState(null)

  const actor = useMemo(() => ({ id: user.id, role: 'admin', name: user.name }), [user.id, user.name])
  const tickets = useAsync(
    () => supportService.listAll({ status: statusFilter, role: roleFilter, search }),
    [statusFilter, roleFilter, search],
  )

  const ticketList = tickets.data?.tickets || []
  const selectedTicketId = ticketList.length
    ? (ticketList.some((ticket) => ticket.id === (ticketParam || requestedTicketId))
      ? ticketParam || requestedTicketId
      : ticketList[0].id)
    : ticketParam || requestedTicketId

  const selectTicket = (ticketId) => {
    setRequestedTicketId(ticketId)
    setSearchParams(ticketId ? { ticket: ticketId } : {}, { replace: true })
  }

  const selectedTicket = ticketList.find((ticket) => ticket.id === selectedTicketId) || null
  const stats = tickets.data?.stats || { open: 0, inProgress: 0, waitingForStudent: 0, resolved: 0, total: 0 }

  const replaceTicket = (updated) => {
    tickets.setData((current) => ({
      ...(current || { stats: {} }),
      tickets: (current?.tickets || []).map((ticket) => (ticket.id === updated.id ? updated : ticket)),
    }))
  }

  const sendReply = async (event) => {
    event.preventDefault()
    setActionError(null)
    setStatusPending(true)
    try {
      const updated = await supportService.reply(selectedTicket.id, reply, actor, { status: replyStatus })
      replaceTicket(updated)
      setReply('')
      toast.success('Response published', `${updated.code || updated.id} is now ${SUPPORT_STATUS_LABELS[updated.status] || updated.status}.`)
    } catch (caught) {
      setActionError(caught?.message || 'The response could not be published.')
    } finally {
      setStatusPending(false)
    }
  }

  const changeStatus = async (event) => {
    event.preventDefault()
    setActionError(null)
    setStatusPending(true)
    try {
      const updated = await supportService.setStatus(selectedTicket.id, replyStatus, actor, statusReason)
      replaceTicket(updated)
      setStatusReason('')
      toast.success('Ticket status updated', `${updated.code || updated.id} is now ${SUPPORT_STATUS_LABELS[updated.status] || updated.status}.`)
    } catch (caught) {
      setActionError(caught?.message || 'The status could not be updated.')
    } finally {
      setStatusPending(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin workspace"
        title="Support Desk"
        description="One shared ticket space for Student and Faculty requests. Reply, change status, inspect escalated mock conversations and keep an auditable activity timeline."
        actions={<StatusBadge tone="neutral">{stats.open + stats.inProgress + stats.waitingForStudent} active of {stats.total}</StatusBadge>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Open', value: stats.open, hint: 'Awaiting first response', bar: 'bg-[var(--warn-500)]' },
          { label: 'In Progress', value: stats.inProgress, hint: 'Being investigated', bar: 'bg-[var(--sky-500)]' },
          { label: 'Waiting for Student', value: stats.waitingForStudent, hint: 'Awaiting requester reply', bar: 'bg-[var(--cream-500)]' },
          { label: 'Resolved', value: stats.resolved, hint: 'Resolved or closed', bar: 'bg-[var(--good-500)]' },
          { label: 'Total tickets', value: stats.total, hint: 'Student + Faculty', bar: 'bg-[var(--sky-900)]' },
        ].map((stat) => (
          <div key={stat.label} className="stat-tile">
            <p className="label-xs">{stat.label}</p>
            <p className="stat-figure mt-1.5 text-ink">{stat.value}</p>
            <p className="stat-tile-hint">{stat.hint}</p>
            <span className={`mt-2 inline-block h-1 w-8 rounded-full ${stat.bar}`} aria-hidden="true" />
          </div>
        ))}
      </div>

      <section className="surface-flat mt-4 p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <Field label="Search tickets" htmlFor="support-search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
              <input
                id="support-search"
                className="field-input pl-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Subject, reference, description or requester"
              />
            </div>
          </Field>
          <Select label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {SUPPORT_STATUSES.map((status) => <option key={status} value={status}>{SUPPORT_STATUS_LABELS[status]}</option>)}
          </Select>
          <Select label="Requester role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="all">Student + Faculty</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </Select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Filter className="h-3 w-3 text-soft" aria-hidden="true" />
          {['all', 'open', 'in-progress', 'waiting-for-student', 'resolved'].map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-2.5 py-0.5 text-[10.5px] transition ${statusFilter === status ? 'bg-[var(--sky-800)] text-white' : 'text-ink-70 hover:bg-[var(--sky-50)]'}`}
            >
              {status === 'all' ? 'All' : SUPPORT_STATUS_LABELS[status]}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-soft">Escalated AI conversations carry a real ticket ID.</span>
        </div>
      </section>

      {tickets.loading && !tickets.data ? <div className="mt-4"><LoadingBlock rows={8} /></div> : null}
      {tickets.error ? <div className="mt-4"><ErrorState error={tickets.error} onRetry={tickets.refresh} title="Support tickets could not be loaded" /></div> : null}

      {!tickets.loading && !tickets.error ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <aside className="surface-flat overflow-hidden">
            <div className="border-b border-[var(--line)] px-3.5 py-2.5">
              <h2 className="text-[12.5px] font-medium text-ink">Ticket queue</h2>
              <p className="text-[10px] text-soft">{(tickets.data?.tickets || []).length} matching ticket{(tickets.data?.tickets || []).length === 1 ? '' : 's'}</p>
            </div>
            {(tickets.data?.tickets || []).length === 0 ? (
              <EmptyState compact icon={Inbox} title="No matching tickets" description="Try another status, role or search term." />
            ) : (
              <div className="max-h-[680px] space-y-1.5 overflow-y-auto p-2.5">
                {(tickets.data?.tickets || []).map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    aria-pressed={selectedTicketId === ticket.id}
                    onClick={() => selectTicket(ticket.id)}
                    className={`w-full rounded-[10px] border px-2.5 py-2 text-left transition ${selectedTicketId === ticket.id ? 'border-[var(--sky-300)] bg-[var(--sky-50)]' : 'border-[var(--line)] bg-white hover:border-[var(--line-strong)]'}`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</StatusBadge>
                      <span className="badge badge-outline">{ticket.role}</span>
                      {ticket.priority === 'high' ? <StatusBadge tone="danger">High</StatusBadge> : null}
                      <span className="ml-auto font-mono text-[9px] text-soft">{ticket.code || ticket.id}</span>
                    </div>
                    <p className="mt-1 truncate text-[11.5px] font-medium text-ink">{ticket.subject}</p>
                    <p className="mt-0.5 truncate text-[10px] text-soft">{ticket.userName} · {ticket.category} · {ticket.replyCount} replies</p>
                    <p className="mt-0.5 text-[9.5px] text-soft">Updated {relativeTime(ticket.updatedAt)} · {ticket.source === 'ai-escalation' ? 'Mock AI escalation' : 'Direct ticket'}</p>
                  </button>
                ))}
              </div>
            )}
          </aside>

          {selectedTicket ? (
            <article className="surface-flat flex min-h-[640px] flex-col overflow-hidden">
              <header className="border-b border-[var(--line)] px-3.5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="label-xs">{selectedTicket.code || selectedTicket.id} · {selectedTicket.category}</p>
                    <h2 className="mt-1 text-[14px] font-medium leading-snug text-ink">{selectedTicket.subject}</h2>
                    <p className="mt-0.5 text-[10.5px] text-soft">
                      {selectedTicket.userName} ({selectedTicket.role}) · {selectedTicket.userEmail} · raised {formatDate(selectedTicket.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge tone={statusTone(selectedTicket.status)} dot>{statusLabel(selectedTicket.status)}</StatusBadge>
                    <StatusBadge tone={selectedTicket.priority === 'high' ? 'danger' : 'neutral'}>{selectedTicket.priority}</StatusBadge>
                  </div>
                </div>
                {selectedTicket.source === 'ai-escalation' ? (
                  <div className="mt-2 flex items-start gap-1.5 rounded-[9px] border border-[var(--sky-200)] bg-[var(--sky-50)] p-2">
                    <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--sky-800)]" aria-hidden="true" />
                    <p className="text-[10px] leading-relaxed text-[var(--sky-900)]">
                      Escalated from AI Auto Support — a deterministic mock response service, not a live AI model. Last topic: {selectedTicket.context?.lastTopic || 'general'}.
                    </p>
                  </div>
                ) : null}
                {selectedTicket.attachments?.length ? (
                  <div className="mt-2">
                    <p className="label-xs">Attachment metadata</p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {selectedTicket.attachments.map((file, index) => (
                        <li key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-white px-2 py-0.5 text-[10px] text-muted">
                          <Paperclip className="h-2.5 w-2.5" aria-hidden="true" />
                          <span className="max-w-[160px] truncate">{file.name}</span>
                          <span className="text-soft">· {formatBytes(file.size)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </header>

              <div className="flex-1 overflow-y-auto px-3.5 py-3">
                <ol className="support-timeline" aria-label={`Activity for ${selectedTicket.code || selectedTicket.id}`}>
                  {(selectedTicket.activity || []).map((event) => (
                    <li key={event.id} className="support-timeline-item">
                      <span className={`support-timeline-dot ${event.kind === 'status' ? 'is-status' : ''}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-medium text-ink">{event.authorName}</span>
                          <span className="text-[9.5px] text-soft">{formatDate(event.at)} · {relativeTime(event.at)}</span>
                          {event.kind === 'status' ? <StatusBadge tone={statusTone(event.status)}>{SUPPORT_STATUS_LABELS[event.status] || event.status}</StatusBadge> : null}
                          {event.kind === 'reopened' ? <StatusBadge tone="warn">Reopened by requester</StatusBadge> : null}
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-muted">{event.message}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                {selectedTicket.context?.transcript ? (
                  <details className="mt-3 rounded-[10px] border border-[var(--line)] bg-[var(--surface-sunken)] p-2.5">
                    <summary className="cursor-pointer text-[11px] font-medium text-ink">View escalated mock conversation transcript</summary>
                    <p className="mt-1.5 whitespace-pre-wrap text-[10.5px] leading-relaxed text-muted">{selectedTicket.context.transcript}</p>
                  </details>
                ) : null}
              </div>

              <div className="border-t border-[var(--line)] bg-[var(--surface-sunken)] p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
                  <form onSubmit={sendReply} className="space-y-2">
                    <p className="text-[11px] font-medium text-ink">Reply to requester</p>
                    <TextArea
                      rows={3}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Write the response. The requester is notified in-app."
                      aria-label="Admin support response"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={replyStatus}
                        onChange={(event) => setReplyStatus(event.target.value)}
                        className="min-w-[170px]"
                        aria-label="Status after reply"
                      >
                        {SUPPORT_STATUSES.map((status) => <option key={status} value={status}>{SUPPORT_STATUS_LABELS[status]}</option>)}
                      </Select>
                      <Button type="submit" size="sm" variant="primary" icon={Send} loading={statusPending} disabled={!reply.trim()}>
                        Publish response
                      </Button>
                    </div>
                  </form>
                  <form onSubmit={changeStatus} className="space-y-2">
                    <p className="text-[11px] font-medium text-ink">Status-only update</p>
                    <TextArea
                      rows={3}
                      value={statusReason}
                      onChange={(event) => setStatusReason(event.target.value)}
                      placeholder="Reason for the status change"
                      aria-label="Status change reason"
                    />
                    <Button type="submit" size="sm" variant="secondary" icon={ArrowUpRight} loading={statusPending} disabled={!statusReason.trim()} fullWidth>
                      Set {SUPPORT_STATUS_LABELS[replyStatus]}
                    </Button>
                  </form>
                </div>
                <FormError>{actionError}</FormError>
                <p className="mt-1 text-[9.5px] leading-relaxed text-soft">
                  Status labels are shared across both workspaces. Waiting for Student means the requester must reply; resolved and closed tickets may be reopened by the requester.
                </p>
              </div>
            </article>
          ) : (
            <div className="surface-flat">
              <EmptyState
                icon={LifeBuoy}
                title="Select a support ticket"
                description="Choose a ticket from the queue to read the full activity timeline and respond."
                action={<Button size="sm" variant="secondary" icon={Sparkles} onClick={tickets.refresh}>Refresh queue</Button>}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
