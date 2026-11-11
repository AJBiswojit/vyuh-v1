import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  Layers,
  ListChecks,
  RotateCcw,
  ShieldCheck,
  Timer,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { examService } from '../../services/exam.service.js'
import {
  formatDate,
  formatMinutes,
  formatTime,
  INSTITUTE_TIMEZONE,
  relativeTime,
} from '../../lib/time.js'
import { ErrorState, EmptyState, SkeletonCards } from '../../ui/states.jsx'
import { PageHeader } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'

/* Exams = schedule, instructions, eligibility and participation history.
   Results, marks and question-level analysis belong to Performance and are
   deliberately not linked from any examination card. */

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past examinations' },
  { id: 'missed', label: 'Missed' },
  { id: 'cancelled', label: 'Cancelled' },
]
const TAB_IDS = TABS.map((item) => item.id)

const SCHEDULE_LABEL = {
  upcoming: 'Scheduled',
  'live-window': 'Window open',
  'window-closed': 'Window closed',
  completed: 'Concluded',
  cancelled: 'Cancelled',
  draft: 'Scheduled',
}

const dateStampFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: INSTITUTE_TIMEZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

function dateStamp(value) {
  if (!value) return { day: '—', month: '—', year: '' }
  const parts = Object.fromEntries(
    dateStampFormatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  )
  return { day: parts.day || '—', month: (parts.month || '—').toUpperCase(), year: parts.year || '' }
}

/** Subject coverage comes from the decorated section summary, so a three-subject
 *  mock reads as "Physics · Chemistry · Mathematics" without inventing data. */
function syllabusLabel(exam) {
  const names = [...new Set((exam.sectionSummary || []).map((section) => section.subjectName).filter(Boolean))]
  if (names.length) return names.join(' · ')
  return exam.subject?.name || exam.type || 'General syllabus'
}

/** Participation is derived only from the attempt record. A closed window is a
 *  schedule fact and is shown separately, never as a substitute for an attempt. */
function participationOf(exam) {
  const state =
    exam.participationState ||
    (exam.attempt ? (exam.attempt.status === 'in-progress' ? 'in-progress' : 'submitted') : 'not-attempted')
  if (state === 'in-progress') return { key: 'in-progress', label: 'In progress', detail: 'Attempt still open' }
  if (state === 'submitted') {
    return {
      key: 'completed',
      label: 'Completed',
      detail: exam.attempt?.submittedAt ? `Submitted ${formatDate(exam.attempt.submittedAt)}` : 'Attempt submitted',
    }
  }
  if (state === 'auto-submitted') {
    return { key: 'completed', label: 'Completed', detail: 'Auto-submitted by the timer' }
  }
  if (exam.scheduleState === 'cancelled') {
    return { key: 'not-attempted', label: 'Not attempted', detail: 'Paper cancelled' }
  }
  if (['upcoming', 'live-window'].includes(exam.scheduleState)) {
    return { key: 'not-attempted', label: 'Not attempted', detail: 'Window still scheduled' }
  }
  return { key: 'missed', label: 'Missed', detail: 'No attempt recorded' }
}

function Metric({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="exam-metric" data-tone={tone}>
      <p className="exam-metric-label">
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
        {label}
      </p>
      <p className="exam-metric-value">{value}</p>
      <p className="exam-metric-hint">{hint}</p>
    </div>
  )
}

function UpcomingExamCard({ exam }) {
  const isLive = exam.scheduleState === 'live-window'
  const stamp = dateStamp(exam.startAt)
  const hasNegativeMarking = Boolean(exam.negativeMarking)

  return (
    <article className="exam-card" data-state={isLive ? 'live' : 'upcoming'} aria-label={exam.title}>
      <div className="exam-card-inner">
        <div className="exam-card-top">
          <div className="exam-chip-row">
            <span className="exam-type-chip">
              <Layers className="h-3 w-3" aria-hidden="true" />
              {exam.type}
            </span>
            <span className="exam-status-chip" data-tone={isLive ? 'live' : 'upcoming'}>
              <span className="dot" aria-hidden="true" />
              {isLive ? 'Live now' : 'Upcoming'}
            </span>
          </div>
          <div className="exam-date-stamp" aria-label={`Scheduled for ${formatDate(exam.startAt)}`}>
            <span className="exam-date-day">{stamp.day}</span>
            <span className="exam-date-month">{stamp.month}</span>
            <span className="exam-date-year">{stamp.year}</span>
          </div>
        </div>

        <h3 className="exam-title">{exam.title}</h3>
        <p className="exam-subject">{syllabusLabel(exam)}</p>
        <p className="exam-description clamp-2">
          {exam.description || 'Review the paper structure and instructions before the window opens.'}
        </p>

        <div className="exam-schedule">
          <span className="exam-schedule-item">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <strong>{formatDate(exam.startAt)}</strong>
          </span>
          <span className="exam-schedule-sep" aria-hidden="true" />
          <span className="exam-schedule-item">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Starts <strong>{formatTime(exam.startAt)} IST</strong>
          </span>
          <span className="exam-schedule-sep" aria-hidden="true" />
          <span className="exam-schedule-item">
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            Window closes <strong>{formatTime(exam.endAt)} IST</strong>
          </span>
        </div>

        <div className="exam-metrics">
          <Metric icon={Timer} label="Duration" value={formatMinutes(exam.durationMinutes)} hint="CBT timer" />
          <Metric icon={ListChecks} label="Questions" value={exam.totalQuestions} hint="Total items" />
          <Metric icon={Award} label="Maximum marks" value={exam.totalMarks} hint="Paper total" />
          <Metric
            icon={hasNegativeMarking ? AlertTriangle : CheckCircle2}
            label="Negative marking"
            value={hasNegativeMarking ? 'Applies' : 'None'}
            hint={hasNegativeMarking ? 'Penalty on incorrect' : 'No penalty'}
            tone={hasNegativeMarking ? 'cream' : undefined}
          />
        </div>

        <div className="exam-card-foot">
          {/* Instructions are mandatory: starting a CBT always passes through the
              declaration workflow, even while the examination window is open. */}
          <Link to={`/student/exams/${exam.id}/instructions`} className="btn btn-primary btn-sm exam-cta">
            View Instructions
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <span className="exam-foot-note">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {isLive ? 'Window open · start after the declaration' : 'Declaration required before the CBT begins'}
          </span>
        </div>
      </div>
    </article>
  )
}

function PastExamCard({ exam, cancelled = false }) {
  const stamp = dateStamp(exam.startAt)
  const participation = participationOf(exam)
  const scheduleLabel = cancelled ? 'Cancelled' : SCHEDULE_LABEL[exam.scheduleState] || '—'

  return (
    <article
      className="exam-archive"
      data-participation={cancelled ? 'cancelled' : participation.key}
      aria-label={exam.title}
    >
      <div className="exam-archive-date" aria-hidden="true">
        <span className="exam-archive-day">{stamp.day}</span>
        <span className="exam-archive-month">{stamp.month}</span>
        <span className="exam-archive-year">{stamp.year}</span>
      </div>

      <div className="exam-archive-body">
        <h3 className="exam-archive-title">{exam.title}</h3>
        <div className="exam-archive-chips">
          <span className="exam-archive-type">{exam.type}</span>
          <span className="exam-archive-subject">{syllabusLabel(exam)}</span>
        </div>
        <div className="exam-archive-meta">
          <span className="exam-archive-meta-item">
            <CalendarDays className="h-3 w-3" aria-hidden="true" />
            Conducted {formatDate(exam.startAt)}
          </span>
          <span className="exam-archive-meta-item">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {formatMinutes(exam.durationMinutes)}
          </span>
          <span className="exam-archive-meta-item">
            <Award className="h-3 w-3" aria-hidden="true" />
            {exam.totalMarks} marks
          </span>
        </div>
        {cancelled && exam.cancellationReason ? (
          <p className="exam-archive-reason">{exam.cancellationReason}</p>
        ) : null}
      </div>

      <div className="exam-archive-status">
        <span className="exam-participation" data-state={participation.key}>
          <span className="dot" aria-hidden="true" />
          {participation.label}
        </span>
        <span className="exam-schedule-tag">Schedule: {scheduleLabel}</span>
        <span className="exam-archive-detail">{participation.detail}</span>
      </div>
    </article>
  )
}

const EMPTY_COPY = {
  upcoming: {
    title: 'No upcoming examinations',
    description: 'Your faculty will publish the next paper here with its schedule, syllabus and instructions.',
    icon: CalendarDays,
  },
  past: {
    title: 'No past examinations yet',
    description: 'Concluded papers and your participation record will be archived here.',
    icon: FileText,
  },
  missed: {
    title: 'Nothing missed',
    description: 'Every concluded examination window has an attempt on record.',
    icon: CheckCircle2,
  },
  cancelled: {
    title: 'No cancelled examinations',
    description: 'Papers cancelled by faculty are listed here with the published reason.',
    icon: Ban,
  },
}

export default function ExamsListPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = TAB_IDS.includes(requestedTab) ? requestedTab : 'upcoming'
  const { data, error, loading, refresh } = useAsync(() => examService.getStudentExams(user.id), [user.id])

  const selectTab = (id) => {
    const next = new URLSearchParams(searchParams)
    if (id === 'upcoming') next.delete('tab')
    else next.set('tab', id)
    setSearchParams(next, { replace: true })
  }

  const lists = useMemo(() => {
    const startValue = (exam) => new Date(exam.startAt).getTime()
    const bySoonest = (items) => [...items].sort((a, b) => startValue(a) - startValue(b))
    const byRecent = (items) => [...items].sort((a, b) => startValue(b) - startValue(a))
    return {
      /* `past` is the archive bucket; fall back to the submitted-attempt bucket
         for any provider that has not adopted the additive field yet. */
      upcoming: bySoonest(data?.upcoming || []),
      past: byRecent(data?.past || data?.completed || []),
      missed: byRecent(data?.missed || []),
      cancelled: byRecent(data?.cancelled || []),
    }
  }, [data])

  const counts = useMemo(
    () => ({
      upcoming: lists.upcoming.length,
      past: lists.past.length,
      missed: lists.missed.length,
      cancelled: lists.cancelled.length,
    }),
    [lists],
  )
  const activeList = lists[tab] || []
  const empty = EMPTY_COPY[tab]

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Exams"
        description="Scheduled papers, exam instructions, live windows and a record of your participation. Scores, attempts and question-level analysis live in Performance."
        actions={
          <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => refresh()}>
            Refresh
          </Button>
        }
      />

      {/* Error first: a failed request must never fall through to the "no
          examinations" empty state, which reads as if the student had none. */}
      {loading && !data ? (
        <SkeletonCards count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} title="Examinations could not be loaded" />
      ) : !data ? (
        <ErrorState
          error={{ message: 'The examination list is unavailable right now.' }}
          onRetry={refresh}
          title="Examinations could not be loaded"
        />
      ) : (
        <>
          {data.inProgress?.length ? (
            <div className="exam-resume surface-deep">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.16em] text-white/70">
                    <span className="dot bg-[#a6e59a]" aria-hidden="true" /> Attempt in progress
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-white">{data.inProgress[0].title}</p>
                  <p className="mt-0.5 text-[11.5px] text-white/75">
                    Started {relativeTime(data.inProgress[0].attempt.startedAt)} · your responses are saved
                  </p>
                </div>
                <Link to={`/student/exams/${data.inProgress[0].id}/live`} className="btn btn-sky btn-sm">
                  Resume examination <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : null}

          <div className="exam-tabs" role="tablist" aria-label="Examination groups">
            {TABS.map((item) => (
              <button
                key={item.id}
                id={`exam-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                aria-controls="exam-tab-panel"
                className="exam-tab"
                onClick={() => selectTab(item.id)}
              >
                {item.label}
                <span className="exam-tab-count">{counts[item.id]}</span>
              </button>
            ))}
          </div>

          <div id="exam-tab-panel" role="tabpanel" aria-labelledby={`exam-tab-${tab}`} className="mt-3.5">
            {activeList.length === 0 ? (
              <div className="surface-flat">
                <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
              </div>
            ) : (
              <>
                {tab === 'upcoming' ? (
                  <div className="exam-grid">
                    {activeList.map((exam) => (
                      <UpcomingExamCard key={exam.id} exam={exam} />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* One page-level note, never repeated inside each card. */}
                    <p className="exam-archive-note">
                      <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Marks, results and question-level analysis are available in Performance → Examination history.
                    </p>
                    <div className="exam-archive-list">
                      {activeList.map((exam) => (
                        <PastExamCard key={exam.id} exam={exam} cancelled={tab === 'cancelled'} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
