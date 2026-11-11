import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CalendarClock, Clock, FileText, RotateCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { examService } from '../../services/exam.service.js'
import { formatDate, formatTime, relativeTime } from '../../lib/time.js'
import { ErrorState, EmptyState, SkeletonCards } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Past examinations' },
  { id: 'missed', label: 'Missed' },
  { id: 'cancelled', label: 'Cancelled' },
]

function ExamRow({ exam, tab }) {
  const isUpcoming = tab === 'upcoming'
  const started = exam.attempt?.status === 'in-progress'
  const link = isUpcoming
    ? started
      ? `/student/exams/${exam.id}/live`
      : `/student/exams/${exam.id}/instructions`
    : exam.attempt
      ? `/student/exams/${exam.id}/result`
      : null

  return (
    <div className="surface-flat flex flex-col gap-3 p-4 transition hover:border-[var(--line-strong)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge">{exam.type}</span>
          <StatusBadge tone={statusTone(exam.windowState)} dot>
            {statusLabel(started ? 'in-progress' : exam.windowState)}
          </StatusBadge>
          {exam.attempt?.status === 'expired' ? <StatusBadge tone="warn">Auto-submitted</StatusBadge> : null}
        </div>
        <h3 className="mt-2 text-[14px] font-medium leading-snug text-ink">{exam.title}</h3>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted clamp-2">{exam.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            {formatDate(exam.startAt)} · {formatTime(exam.startAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {exam.durationMinutes} min
          </span>
          <span>{exam.totalQuestions} questions · {exam.totalMarks} marks</span>
          <span>{exam.negativeMarking ? 'Negative marking' : 'No negative marking'}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {link ? (
          <Link to={link} className={`btn btn-sm ${isUpcoming ? 'btn-primary' : 'btn-secondary'}`}>
            {isUpcoming ? (started ? 'Resume attempt' : 'View instructions') : 'View result'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-[11px] text-soft">No attempt recorded</span>
        )}
      </div>
    </div>
  )
}

export default function ExamsListPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('upcoming')
  const { data, error, loading, refresh } = useAsync(() => examService.getStudentExams(user.id), [user.id])

  const counts = useMemo(
    () => ({
      upcoming: data?.upcoming?.length || 0,
      completed: data?.completed?.length || 0,
      missed: data?.missed?.length || 0,
      cancelled: data?.cancelled?.length || 0,
    }),
    [data],
  )

  const activeList = data?.[tab] || []

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Exams"
        description="Scheduled papers, live windows and graded attempts. Every result here is generated from your saved responses."
        actions={
          <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => refresh()}>
            Refresh
          </Button>
        }
      />

      {loading ? (
        <SkeletonCards count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} title="Examinations could not be loaded" />
      ) : (
        <>
          {data.inProgress.length ? (
            <div className="mb-4 rounded-[16px] border border-[var(--ink)] bg-[var(--ink)] p-4 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Attempt in progress</p>
                  <p className="mt-1 text-[14px] font-medium">{data.inProgress[0].title}</p>
                  <p className="mt-0.5 text-[11.5px] text-white/70">
                    Started {relativeTime(data.inProgress[0].attempt.startedAt)} · your responses are saved
                  </p>
                </div>
                <Link to={`/student/exams/${data.inProgress[0].id}/live`} className="btn btn-sky btn-sm">
                  Resume examination <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="tab-row mb-4" role="tablist" aria-label="Examination groups">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className="tab"
                onClick={() => setTab(item.id)}
              >
                {item.label}
                <span className="ml-1.5 text-[10.5px] text-soft">{counts[item.id]}</span>
              </button>
            ))}
          </div>

          {activeList.length === 0 ? (
            <div className="surface-flat">
              <EmptyState
                icon={tab === 'missed' ? AlertTriangle : FileText}
                title={
                  tab === 'upcoming'
                    ? 'No upcoming examinations'
                    : tab === 'completed'
                      ? 'No graded attempts yet'
                      : tab === 'missed'
                        ? 'Nothing missed'
                        : 'No cancelled examinations'
                }
                description={
                  tab === 'upcoming'
                    ? 'Your faculty will publish the next paper here with instructions.'
                    : tab === 'completed'
                      ? 'Once you submit an examination, its result and detailed analysis appear here.'
                      : 'This list stays empty when every examination window was used or honoured.'
                }
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeList.map((exam) => (
                <ExamRow key={exam.id} exam={exam} tab={tab} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
