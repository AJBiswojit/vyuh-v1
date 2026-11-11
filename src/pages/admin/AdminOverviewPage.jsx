import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Flag,
  Layers,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { adminService } from '../../services/admin.service.js'
import { formatTime, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { DonutChart, TrendArea } from '../../ui/charts.jsx'
import Button from '../../ui/Button.jsx'

export default function AdminOverviewPage() {
  const { user } = useAuth()
  const { data, error, loading, refresh } = useAsync(async () => {
    const [overview, trend] = await Promise.all([
      adminService.getOverview(),
      adminService.getMonthlyAttendanceTrend(),
    ])
    return { overview, trend }
  }, [])

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Overview" />
        <LoadingBlock rows={7} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Overview" />
        <ErrorState error={error} onRetry={refresh} title="The institute overview could not be loaded" />
      </div>
    )
  }

  const { counts, attendance, academics, activeExams, todayClasses, pendingApprovals, recentAudit, alerts, insights } = data.overview
  const trend = data.trend.map((point) => ({ label: point.key, percentage: point.percentage }))

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Overview"
        description="One institute, one dataset. Every figure below is computed from stored records — nothing is estimated."
        actions={
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => refresh()}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Students', value: counts.students, hint: `${counts.activeStudents} active`, to: '/admin/users?role=student', icon: Users },
          { label: 'Faculty', value: counts.faculty, hint: `${counts.activeFaculty} active`, to: '/admin/users?role=faculty', icon: Users },
          { label: 'Batches', value: counts.batches, hint: `${counts.archivedBatches} archived`, to: '/admin/batches', icon: Layers },
          { label: 'Live classes', value: counts.liveClasses, hint: `${counts.classesToday} scheduled today`, to: '/admin/reports', icon: CalendarClock },
          { label: 'Active examinations', value: counts.activeExams, hint: 'Open window now', to: '/admin/integrity', icon: ClipboardList },
          { label: 'Pending approvals', value: counts.pendingApprovals, hint: 'Awaiting your decision', to: '/admin/approvals', icon: CheckSquare },
          { label: 'Integrity events', value: counts.unresolvedIntegrity, hint: 'Unresolved', to: '/admin/integrity', icon: Shield },
          { label: 'Flagged content', value: counts.flaggedRecordings, hint: `${counts.openTickets} open tickets`, to: '/admin/moderation', icon: Flag },
        ].map((tile) => {
          const Icon = tile.icon
          return (
            <Link key={tile.label} to={tile.to} className="surface-flat p-4 transition hover:border-[var(--line-strong)]">
              <div className="flex items-start justify-between gap-2">
                <p className="label-xs">{tile.label}</p>
                <Icon className="h-3.5 w-3.5 text-soft" aria-hidden="true" />
              </div>
              <p className="stat-figure mt-1.5 text-ink">{tile.value}</p>
              <p className="mt-1 text-[10.5px] text-soft">{tile.hint}</p>
            </Link>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
          <h2 className="text-[13.5px] font-medium text-ink">Institute attendance</h2>
          <p className="mt-0.5 text-[11px] text-muted">Duration-based across every session.</p>
          <DonutChart
            data={[
              { name: 'Attended', value: Math.max(attendance.percentage, 0.5), color: attendance.percentage >= attendance.threshold ? '#242729' : '#b08d31' },
              { name: 'Missed', value: Math.max(100 - attendance.percentage, 0.5), color: '#eef0f1' },
            ]}
            height={168}
            innerRadius={50}
            outerRadius={70}
            centerValue={`${attendance.percentage}%`}
            centerLabel="attended"
          />
          <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <dt className="label-xs">Attended hours</dt>
              <dd className="font-medium text-ink">{attendance.attendedHours}</dd>
            </div>
            <div>
              <dt className="label-xs">Eligible hours</dt>
              <dd className="font-medium text-ink">{attendance.eligibleHours}</dd>
            </div>
          </dl>
          <div className="mt-2">
            <ProgressBar value={attendance.percentage} tone={attendance.percentage >= attendance.threshold ? 'good' : 'warn'} label={`Policy threshold ${attendance.threshold}%`} />
          </div>
          <p className="mt-1.5 text-[10px] text-soft">
            {attendance.belowThreshold} student record{attendance.belowThreshold === 1 ? '' : 's'} below the threshold.
          </p>
        </section>

        <section className="surface-flat p-4 sm:p-5 lg:col-span-5">
          <h2 className="text-[13.5px] font-medium text-ink">Attendance trend</h2>
          <p className="mt-0.5 text-[11px] text-muted">Monthly, computed from join/leave events.</p>
          <div className="mt-2">
            {trend.length ? (
              <TrendArea data={trend} height={200} name="Attendance %" />
            ) : (
              <EmptyState compact icon={CalendarClock} title="No sessions recorded yet" />
            )}
          </div>
        </section>

        <section className="surface-flat p-4 sm:p-5 lg:col-span-3">
          <h2 className="text-[13.5px] font-medium text-ink">Academics</h2>
          <dl className="mt-2 space-y-2 text-[11.5px]">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Graded attempts</dt>
              <dd className="font-medium text-ink">{academics.gradedAttempts}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Average score</dt>
              <dd className="font-medium text-ink">{academics.averagePercentage}%</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Average accuracy</dt>
              <dd className="font-medium text-ink">{academics.averageAccuracy}%</dd>
            </div>
          </dl>
          <div className="mt-3 space-y-2">
            {insights.map((insight) => (
              <div key={insight.label} className="rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-2">
                <p className="text-[10px] uppercase tracking-wide text-soft">{insight.label}</p>
                <p className="mt-0.5 text-[11.5px] font-medium text-ink">{insight.value}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted">{insight.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13.5px] font-medium text-ink">Needs attention</h2>
            <span className="badge badge-outline">{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <EmptyState compact icon={AlertCircle} title="Nothing outstanding" description="No unresolved integrity or moderation items." />
          ) : (
            <ul className="mt-2 space-y-1.5">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <Link to={alert.link} className="block rounded-[8px] border border-[var(--line)] px-2.5 py-2 transition hover:border-[var(--line-strong)]">
                    <p className="text-[11.5px] font-medium text-ink">{alert.title}</p>
                    <p className="text-[10.5px] text-muted">{alert.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13.5px] font-medium text-ink">Today's classes</h2>
            <Link to="/admin/reports" className="text-[11px] font-medium text-link">
              Reports
            </Link>
          </div>
          {todayClasses.length === 0 ? (
            <EmptyState compact icon={CalendarClock} title="No classes today" description="Sessions scheduled for today appear here." />
          ) : (
            <ul className="mt-2 divide-y divide-[var(--line)]">
              {todayClasses.slice(0, 5).map((klass) => (
                <li key={klass.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-medium text-ink">{klass.title}</p>
                    <p className="text-[10px] text-soft">
                      {klass.facultyName} · {formatTime(klass.scheduledStartAt)}
                    </p>
                  </div>
                  <StatusBadge tone={statusTone(klass.status)}>{statusLabel(klass.status)}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13.5px] font-medium text-ink">Recent activity</h2>
            <Link to="/admin/audit-log" className="text-[11px] font-medium text-link">
              Audit log
            </Link>
          </div>
          <ul className="mt-2 space-y-1.5">
            {recentAudit.slice(0, 5).map((event) => (
              <li key={event.id} className="text-[11px] leading-snug">
                <p className="font-medium text-ink">{event.actionLabel}</p>
                <p className="text-muted">
                  {event.entityLabel} · {relativeTime(event.at)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {pendingApprovals.length ? (
        <section className="surface-flat mt-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13.5px] font-medium text-ink">Approvals waiting on you</h2>
            <Link to="/admin/approvals" className="text-[11px] font-medium text-link">
              Open queue <ArrowRight className="inline h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-2 space-y-1.5">
            {pendingApprovals.map((approval) => (
              <li key={approval.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-medium text-ink">{approval.title}</p>
                  <p className="text-[10px] text-soft">
                    {approval.requester?.name} · requested {relativeTime(approval.requestedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {approval.priority === 'high' ? <StatusBadge tone="danger">High</StatusBadge> : null}
                  <Link to="/admin/approvals" className="text-[10.5px] font-medium text-link">
                    Review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeExams.length ? (
        <section className="surface-flat mt-4 p-4">
          <h2 className="text-[13.5px] font-medium text-ink">Live examination windows</h2>
          <ul className="mt-2 space-y-1.5">
            {activeExams.map((exam) => (
              <li key={exam.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-[var(--surface-sunken)] px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-medium text-ink">{exam.title}</p>
                  <p className="text-[10px] text-soft">
                    {exam.candidateCount} candidate{exam.candidateCount === 1 ? '' : 's'} · closes {formatTime(exam.endAt)}
                  </p>
                </div>
                <Link to={`/admin/integrity?examId=${exam.id}`} className="text-[10.5px] font-medium text-link">
                  Live monitor
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-4 text-[10px] leading-relaxed text-soft">
        Signed in as {user.name}. This workspace is a frontend demonstration using seeded local data; no request leaves the
        browser.
      </p>
    </div>
  )
}
