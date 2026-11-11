import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCheck, CornerDownRight, MessageSquare, Search, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { doubtService } from '../../services/doubt.service.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'

const TABS = [
  { id: 'open', label: 'Open' },
  { id: 'answered', label: 'Answered' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

export default function FacultyDoubtsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('open')
  const [search, setSearch] = useState('')

  const { data, error, loading, refresh } = useAsync(() => doubtService.listFacultyDoubts(user.id), [user.id])

  const visible = useMemo(() => {
    if (!data) return []
    const rows = tab === 'all' ? data.doubts : data.doubts.filter((doubt) => doubt.status === tab)
    const needle = search.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter(
      (doubt) =>
        doubt.title.toLowerCase().includes(needle) ||
        doubt.student?.name?.toLowerCase().includes(needle) ||
        doubt.topicName.toLowerCase().includes(needle),
    )
  }, [data, tab, search])

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Doubts" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Doubts" />
        <ErrorState error={error} onRetry={refresh} title="The doubt inbox could not be loaded" />
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Doubts" />
        <ErrorState
          error={{ message: 'The doubt inbox is unavailable right now.' }}
          onRetry={refresh}
          title="The doubt inbox could not be loaded"
        />
      </div>
    )
  }

  const stats = data.stats
  const counts = { open: stats.open, answered: stats.answered, resolved: stats.resolved, all: data.doubts.length }

  return (
    <div>
      <PageHeader
        eyebrow="Faculty workspace"
        title="Doubts"
        description="Student doubts routed to you by subject and batch. Every reply notifies the student in their workspace."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Awaiting reply', value: stats.open, hint: 'Oldest first' },
          { label: 'High priority', value: stats.highPriority, hint: 'Blocking revision' },
          { label: 'Answered', value: stats.answered, hint: 'Student has your reply' },
          { label: 'Resolved', value: stats.resolved, hint: 'Confirmed by the student' },
        ].map((stat) => (
          <div key={stat.label} className="surface-flat p-4">
            <p className="label-xs">{stat.label}</p>
            <p className="stat-figure mt-1.5 text-ink">{stat.value}</p>
            <p className="mt-1 text-[10.5px] text-soft">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="tab-row" role="tablist" aria-label="Doubt status">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className="tab"
              onClick={() => setTab(item.id)}
            >
              {item.label} <span className="ml-1.5 text-[10.5px] text-soft">{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-[240px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field-input pl-8"
            placeholder="Search doubts…"
            aria-label="Search doubts"
          />
        </div>
      </div>

      <div className="mt-3">
        {visible.length === 0 ? (
          <div className="surface-flat">
            <EmptyState
              icon={MessageSquare}
              title={tab === 'open' ? 'Inbox clear' : 'Nothing in this view'}
              description={
                tab === 'open'
                  ? 'No student is waiting for your reply right now.'
                  : 'Doubts move here once they reach this status.'
              }
            />
          </div>
        ) : (
          <div className="space-y-2.5">
            {visible.map((doubt) => {
              const unanswered = doubt.replies.length === 0
              return (
                <Link
                  key={doubt.id}
                  to={`/faculty/doubts/${doubt.id}`}
                  className="surface-flat block p-4 transition hover:border-[var(--line-strong)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(doubt.status)} dot>
                      {statusLabel(doubt.status)}
                    </StatusBadge>
                    {doubt.priority === 'high' ? <StatusBadge tone="danger">High priority</StatusBadge> : null}
                    <span className="badge badge-sky">{subjectName(doubt.subjectId)}</span>
                    <span className="badge badge-outline">{doubt.topicName}</span>
                    <span className="ml-auto text-[10px] text-soft">asked {relativeTime(doubt.createdAt)}</span>
                  </div>
                  <h3 className="mt-1.5 flex items-center gap-1 text-[13.5px] font-medium leading-snug text-ink">
                    {doubt.title}
                    <ArrowRight className="h-3 w-3 text-soft" aria-hidden="true" />
                  </h3>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted clamp-2">{doubt.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--line)] pt-2 text-[10.5px] text-soft">
                    <span className="font-medium text-ink-80">{doubt.student?.name}</span>
                    <span>{doubt.batch?.name}</span>
                    <span className="inline-flex items-center gap-1">
                      <CornerDownRight className="h-3 w-3" aria-hidden="true" />
                      {doubt.replies.length} repl{doubt.replies.length === 1 ? 'y' : 'ies'}
                    </span>
                    {unanswered ? (
                      <span className="ml-auto font-medium text-[#8a6d1f]">Awaiting your reply</span>
                    ) : (
                      <span className="ml-auto">last activity {relativeTime(doubt.lastActivityAt)}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          The AI assistant is a demonstration provider that helps students before they escalate. It never answers on your
          behalf, and its responses are labelled as a demo in the student workspace.
        </p>
        <CheckCheck className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 text-soft sm:block" aria-hidden="true" />
      </div>
    </div>
  )
}
