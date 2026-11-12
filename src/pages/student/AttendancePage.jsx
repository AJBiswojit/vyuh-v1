import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Info,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { attendanceService } from '../../services/attendance.service.js'
import { formatDate, formatDayKey, formatMinutes, formatTime } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { DonutChart, ComparisonBars, CHART_TONE } from '../../ui/charts.jsx'
import Button from '../../ui/Button.jsx'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'present', label: 'Present' },
  { id: 'partial', label: 'Partial' },
  { id: 'absent', label: 'Absent' },
  { id: 'late', label: 'Late' },
  { id: 'early', label: 'Early' },
  { id: 'warnings', label: 'Warnings' },
]

function SignalBadges({ session }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {session.lateArrival ? <StatusBadge tone="warn">Late {session.lateArrivalMinutes} min</StatusBadge> : null}
      {session.earlyDeparture ? <StatusBadge tone="warn">Early {session.earlyDepartureMinutes} min</StatusBadge> : null}
      {session.isEligible && !session.meetsThreshold ? (
        <StatusBadge tone="danger">Below {session.threshold}%</StatusBadge>
      ) : null}
      {session.reconnectionCount > 0 ? (
        <span className="badge badge-outline">{session.reconnectionCount} reconnect{session.reconnectionCount === 1 ? '' : 's'}</span>
      ) : null}
      {session.checkoutNote ? <span className="badge badge-neutral">{session.checkoutNote}</span> : null}
    </div>
  )
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [chosenDate, setChosenDate] = useState(null)
  const [filter, setFilter] = useState('all')

  const { data, error, loading, refresh } = useAsync(() => attendanceService.getStudentAttendance(user.id), [user.id])

  const rows = useMemo(() => {
    const sessions = data?.sessions || []
    if (filter === 'all') return sessions
    if (filter === 'late') return sessions.filter((session) => session.lateArrival)
    if (filter === 'early') return sessions.filter((session) => session.earlyDeparture)
    if (filter === 'warnings') {
      return sessions.filter(
        (session) => session.lateArrival || session.earlyDeparture || (session.isEligible && !session.meetsThreshold),
      )
    }
    return sessions.filter((session) => session.status === filter)
  }, [data, filter])

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Attendance" />
        <LoadingBlock rows={7} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Attendance" />
        <ErrorState error={error} onRetry={refresh} title="Attendance could not be loaded" />
      </div>
    )
  }

  const { summary, dayView, bySubject, timingWarnings } = data
  const selectedDate = chosenDate || dayView.latestDateKey
  const selectedDay = dayView.dayByKey[selectedDate] || null
  const selectedPending = dayView.nonEligibleByDate[selectedDate] || []
  const threshold = summary.threshold
  const donutData = selectedDay?.hasEligibleClass
    ? [
        {
          name: 'Attended',
          value: selectedDay.attendedMinutes,
          percentage: selectedDay.percentage,
          color: selectedDay.meetsThreshold ? CHART_TONE.primary : CHART_TONE.warn,
        },
        {
          name: 'Missed',
          value: selectedDay.missedMinutes,
          percentage: selectedDay.missedPercentage,
          color: CHART_TONE.track,
        },
      ]
    : []

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Attendance"
        description="Choose a date to see eligible class minutes, check-in/check-out events and a duration-based percentage. In-progress sessions are not graded."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="attendance-date">Select attendance date</label>
            <input
              id="attendance-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setChosenDate(event.target.value || null)}
              className="field-input w-[170px]"
              aria-label="Select attendance date"
            />
            <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setChosenDate(null)}>
              Latest day
            </Button>
          </div>
        }
      />

      <section className="surface-sky p-4 sm:p-5" aria-labelledby="selected-day-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="page-eyebrow">Selected day</p>
            <h2 id="selected-day-heading" className="mt-1 text-[15px] font-medium text-[var(--sky-900)]">
              {formatDayKey(selectedDate)}
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--sky-800)]">
              {selectedDay?.hasEligibleClass
                ? `${selectedDay.classCount} eligible class${selectedDay.classCount === 1 ? '' : 'es'} · each has its own check-in and check-out below.`
                : 'No completed eligible class duration is recorded for this date.'}
            </p>
          </div>
          <StatusBadge tone={!selectedDay?.hasEligibleClass ? 'neutral' : selectedDay.meetsThreshold ? 'good' : 'warn'} dot>
            {!selectedDay?.hasEligibleClass
              ? 'No eligible class'
              : selectedDay.meetsThreshold
                ? 'Above threshold'
                : `Below ${threshold}% threshold`}
          </StatusBadge>
        </div>

        {!selectedDay?.hasEligibleClass ? (
          <div className="mt-3 rounded-[12px] border border-[var(--sky-200)] bg-white/80">
            <EmptyState
              compact
              icon={CalendarCheck}
              title="No eligible class on this date"
              description="A percentage is not shown because there is no eligible class duration to use as the denominator. This is not a 0% attendance day."
            />
            {selectedPending.length ? (
              <p className="px-4 pb-4 text-center text-[10.5px] leading-relaxed text-soft">
                {selectedPending.length} scheduled or in-progress session{selectedPending.length === 1 ? '' : 's'} on this date:
                {' '}{selectedPending.map((session) => session.title).join(' · ')}. No attendance events are treated as completed.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
            <div className="rounded-[12px] border border-[var(--sky-200)] bg-white/85 p-3">
              <DonutChart
                data={donutData}
                height={186}
                innerRadius={54}
                outerRadius={76}
                centerValue={`${selectedDay.percentage}%`}
                centerLabel="of eligible time"
                tooltipFormatter={(entry) =>
                  `${formatMinutes(entry.value)} · ${entry.percentage}% of ${formatMinutes(selectedDay.eligibleMinutes)} eligible`
                }
              />
              <div className="mt-2 space-y-1" aria-label="Daily attendance legend">
                {donutData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="legend-key" style={{ '--key': entry.color }}>{entry.name}</span>
                    <span className="tabular font-medium text-ink">
                      {formatMinutes(entry.value)} · {entry.percentage}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-soft">
                Exact values and percentages appear in the legend and chart tooltip. Percentage uses eligible minutes, not class count.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'First in / check-in', value: selectedDay.firstInLabel, hint: selectedDay.firstIn ? formatDate(selectedDay.firstIn) : 'No event recorded' },
                { label: 'Last out / check-out', value: selectedDay.lastOutLabel, hint: selectedDay.checkoutNote || (selectedDay.lastOut ? formatDate(selectedDay.lastOut) : '—') },
                { label: 'Total attended time', value: formatMinutes(selectedDay.attendedMinutes), hint: `${selectedDay.percentage}% of eligible duration` },
                { label: 'Eligible class duration', value: formatMinutes(selectedDay.eligibleMinutes), hint: `Missed ${formatMinutes(selectedDay.missedMinutes)}` },
                { label: 'Classes attended', value: `${selectedDay.attendedClasses} of ${selectedDay.classCount}`, hint: `${selectedDay.presentClasses} present · ${selectedDay.partialClasses} partial` },
                { label: 'Missed / partial classes', value: `${selectedDay.missedClasses} / ${selectedDay.partialClasses}`, hint: `${selectedDay.lateArrivals} late · ${selectedDay.earlyDepartures} early` },
              ].map((item) => (
                <div key={item.label} className="rounded-[10px] border border-[var(--sky-200)] bg-white/85 px-3 py-2.5">
                  <p className="label-xs">{item.label}</p>
                  <p className="mt-1 text-[14px] font-medium tabular text-ink">{item.value}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-soft">{item.hint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDay?.hasEligibleClass ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-[12px] font-medium text-[var(--sky-900)]">Classes on this day</h3>
            {selectedDay.sessions.map((session) => (
              <article key={session.classId} className="day-session">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/student/live-classes/${session.classId}`} className="text-[12px] font-medium text-ink hover:underline">
                      {session.title}
                    </Link>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {subjectName(session.subjectId)} · {session.facultyName} · {formatTime(session.scheduledStartAt)}–{formatTime(session.scheduledEndAt || session.sessionEndedAt)}
                    </p>
                  </div>
                  <StatusBadge tone={statusTone(session.status)} dot>{statusLabel(session.status)}</StatusBadge>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div><dt className="label-xs">Check-in</dt><dd className="mt-0.5 text-[11.5px] font-medium tabular text-ink">{session.firstInLabel}</dd></div>
                  <div><dt className="label-xs">Check-out</dt><dd className="mt-0.5 text-[11.5px] font-medium tabular text-ink">{session.lastOutLabel}</dd></div>
                  <div><dt className="label-xs">Attended</dt><dd className="mt-0.5 text-[11.5px] font-medium tabular text-ink">{formatMinutes(session.attendedDuration)}</dd></div>
                  <div><dt className="label-xs">Eligible</dt><dd className="mt-0.5 text-[11.5px] font-medium tabular text-ink">{formatMinutes(session.eligibleDuration)}</dd></div>
                </dl>
                <SignalBadges session={session} />
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <section className="surface-flat p-4 sm:p-5 lg:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[13px] font-medium text-ink">Monthly overview</h2>
            <span className="text-[10.5px] text-soft">Attended / eligible minutes</span>
          </div>
          <div className="mt-3">
            <ComparisonBars
              data={dayView.monthly.map((month) => ({ label: month.label, percentage: month.percentage, tooltipLabel: `${month.label} · ${formatMinutes(month.attended)} of ${formatMinutes(month.eligible)} eligible` }))}
              xKey="label"
              series={[{ key: 'percentage', name: 'Attendance %', color: CHART_TONE.primary }]}
              unit="%"
              height={210}
            />
          </div>
          <div className="mt-2 space-y-1.5">
            {dayView.monthly.map((month) => (
              <div key={month.key} className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-1.5 text-[10.5px]">
                <span className="font-medium text-ink">{month.label}</span>
                <span className="tabular text-muted">
                  {month.percentage}% · {formatMinutes(month.attended)} / {formatMinutes(month.eligible)} · {month.lateArrivals} late · {month.earlyDepartures} early · {month.thresholdWarnings} warnings
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-cream p-4 sm:p-5 lg:col-span-5">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-[var(--cream-800)]" aria-hidden="true" />
            <h2 className="text-[13px] font-medium text-[var(--cream-900)]">Date-wise history</h2>
          </div>
          <p className="mt-0.5 text-[10.5px] text-[var(--cream-800)]">Select a day to update the donut and class list.</p>
          <div className="mt-3 max-h-[252px] space-y-1.5 overflow-y-auto pr-1">
            {dayView.days.length === 0 ? (
              <EmptyState compact icon={CalendarCheck} title="No eligible dates" description="Eligible days appear after sessions have ended." />
            ) : (
              [...dayView.days].reverse().map((day) => (
                <button
                  key={day.key}
                  type="button"
                  aria-pressed={selectedDate === day.key}
                  onClick={() => setChosenDate(day.key)}
                  className={`flex w-full items-center justify-between gap-2 rounded-[10px] border px-2.5 py-2 text-left transition ${
                    selectedDate === day.key
                      ? 'border-[var(--cream-500)] bg-white'
                      : 'border-[var(--cream-300)] bg-white/55 hover:border-[var(--cream-500)]'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-medium text-ink">{day.label}</span>
                    <span className="block text-[10px] text-soft">{day.classCount} class{day.classCount === 1 ? '' : 'es'} · {day.attendedClasses} attended · {day.missedClasses} missed</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[12px] font-medium tabular text-ink">{day.percentage}%</span>
                    <span className="block text-[9.5px] text-soft">{formatMinutes(day.attendedMinutes)} / {formatMinutes(day.eligibleMinutes)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="surface-flat mt-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-medium text-ink">Subject-wise attendance</h2>
          <span className="text-[10.5px] text-soft">Eligible minutes only · requirement {threshold}%</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bySubject.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-soft sm:col-span-2 lg:col-span-3">No subject-level sessions yet.</p>
          ) : (
            bySubject.map((subject) => (
              <div key={subject.subjectId} className="rounded-[10px] border border-[var(--line)] p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12px] font-medium text-ink">{subjectName(subject.subjectId)}</p>
                  <p className="tabular text-[11.5px] text-muted">{subject.percentage}%</p>
                </div>
                <ProgressBar
                  value={subject.percentage}
                  tone={subject.percentage >= threshold ? 'good' : subject.percentage >= threshold - 10 ? 'warn' : 'danger'}
                  className="mt-1.5"
                  height={5}
                />
                <p className="mt-1 text-[10px] leading-snug text-soft">
                  {formatMinutes(subject.attendedMinutes)} / {formatMinutes(subject.eligibleMinutes)} · {subject.sessions} sessions · {subject.missed} missed
                </p>
                <p className="mt-0.5 text-[10px] text-soft">{subject.lateArrivals} late · {subject.earlyDepartures} early · {subject.warnings} threshold warnings</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="surface-flat mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
          <h2 className="text-[13px] font-medium text-ink">Class-wise history</h2>
          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
                className={`rounded-full px-2.5 py-0.5 text-[10.5px] transition ${
                  filter === option.id ? 'bg-[var(--sky-800)] text-white' : 'text-ink-70 hover:bg-[var(--sky-50)] hover:text-[var(--sky-900)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-3.5 py-8 text-center text-[11.5px] text-soft">No sessions match this filter.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Date</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th className="align-right">Attended</th>
                  <th className="align-right">Eligible</th>
                  <th className="align-right">Percent</th>
                  <th>Status & signals</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((session) => (
                  <tr key={session.classId}>
                    <td>
                      <Link to={`/student/live-classes/${session.classId}`} className="font-medium text-ink hover:underline">{session.title}</Link>
                      <p className="text-[10.5px] text-soft">{subjectName(session.subjectId)} · {session.facultyName}</p>
                    </td>
                    <td className="whitespace-nowrap text-[11.5px]">
                      {formatDate(session.scheduledStartAt)}
                      <span className="block text-[10px] text-soft">{formatTime(session.scheduledStartAt)}</span>
                    </td>
                    <td className="whitespace-nowrap tabular text-[11px]">{session.firstInLabel}</td>
                    <td className="whitespace-nowrap tabular text-[11px]">
                      {session.lastOutLabel}
                      {session.checkoutNote ? <span className="block text-[9.5px] text-soft">{session.checkoutNote}</span> : null}
                    </td>
                    <td className="align-right tabular">{formatMinutes(session.attendedMinutes)}</td>
                    <td className="align-right tabular">{formatMinutes(session.eligibleMinutes)}</td>
                    <td className="align-right tabular font-medium">{session.isEligible ? `${session.percentage}%` : '—'}</td>
                    <td>
                      <StatusBadge tone={statusTone(session.status)} dot>{statusLabel(session.status)}</StatusBadge>
                      <SignalBadges session={session} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface-cream mt-4 p-4 sm:p-5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-[var(--warn-800)]" aria-hidden="true" />
          <h2 className="text-[13px] font-medium text-[var(--cream-900)]">Late arrival, early departure & threshold warnings</h2>
        </div>
        {timingWarnings.length === 0 ? (
          <p className="mt-2 text-[11px] text-[var(--cream-800)]">No timing or threshold warnings are present in the eligible session records.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {timingWarnings.map((warning) => (
              <li key={warning.attendanceId} className="rounded-[10px] border border-[var(--cream-300)] bg-white/70 p-2.5">
                <p className="text-[11.5px] font-medium text-ink">{warning.title}</p>
                <p className="mt-0.5 text-[10px] text-soft">{warning.dateLabel} · {warning.percentage}% of eligible time</p>
                <p className="mt-1 text-[10.5px] leading-snug text-[var(--cream-900)]">{warning.reasons.join(' · ')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          {summary.policyNote} Join and leave events are merged per session: reconnecting during the same class never
          double-counts attended time, and minutes outside the eligible window are excluded. A live or scheduled session
          has no attendance percentage until its actual end is recorded.
        </p>
        <Clock3 className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 text-soft sm:block" aria-hidden="true" />
      </div>
    </div>
  )
}
