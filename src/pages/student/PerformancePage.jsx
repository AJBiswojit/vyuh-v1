import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Info, TrendingUp } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { performanceService } from '../../services/performance.service.js'
import { formatDate } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge } from '../../ui/workspace-kit.jsx'
import { ComparisonBars, DonutChart, MultiLine, CHART_TONE } from '../../ui/charts.jsx'

export default function PerformancePage() {
  const { user } = useAuth()
  const { data, error, loading, refresh } = useAsync(() => performanceService.getStudentPerformance(user.id), [user.id])

  const trendData = useMemo(() => {
    if (!data) return []
    return [...data.academic.points]
      .reverse()
      .map((point, index) => ({
        label: `T${index + 1}`,
        percentage: Math.max(point.percentage, 0),
        accuracy: point.accuracy,
        examTitle: point.examTitle,
      }))
  }, [data])

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Performance" />
        <LoadingBlock rows={7} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Student workspace" title="Performance" />
        <ErrorState error={error} onRetry={refresh} title="Performance data could not be loaded" />
      </div>
    )
  }

  const { academic, participation, notes } = data

  return (
    <div>
      <PageHeader
        eyebrow="Student workspace"
        title="Performance"
        description="Academic results and participation are shown separately. Nothing here is combined into a single invented score."
      />

      {academic.attempts === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={TrendingUp}
            title="No graded attempts yet"
            description="Attempt an examination and this page fills with trends, subject comparisons and topic-level accuracy from your saved responses."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Attempts', value: academic.attempts, hint: 'Graded examinations' },
              { label: 'Average score', value: `${academic.averagePercentage}%`, hint: `Best ${academic.bestPercentage}%` },
              { label: 'Average accuracy', value: `${academic.averageAccuracy}%`, hint: 'Correct of attempted' },
              { label: 'Average pace', value: `${academic.averageTimePerQuestion}s`, hint: 'Per question' },
            ].map((stat, index) => (
              <div key={stat.label} className="stat-tile" data-tone={index === 0 ? 'deep' : index === 1 ? 'sky' : index === 2 ? 'cream' : undefined}>
                <p className={`label-xs ${index === 0 ? '!text-white/70' : ''}`}>{stat.label}</p>
                <p className={`stat-figure mt-1.5 ${index === 0 ? 'text-white' : 'text-ink'}`}>{stat.value}</p>
                <p className={`stat-tile-hint ${index === 0 ? '!text-white/70' : ''}`}>{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <section className="surface-flat p-4 sm:p-5 lg:col-span-8">
              <div className="card-rule" aria-hidden="true" />
              <h2 className="mt-2 text-[13.5px] font-medium text-ink">Score and accuracy trend</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">Chronological across graded attempts.</p>
              <div className="mt-3">
                <MultiLine
                  data={trendData}
                  series={[
                    { key: 'percentage', name: 'Score %', color: CHART_TONE.primary },
                    { key: 'accuracy', name: 'Accuracy %', color: CHART_TONE.sky },
                  ]}
                  height={230}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <span className="legend-key" style={{ '--key': CHART_TONE.primary }}>
                  Score %
                </span>
                <span className="legend-key" style={{ '--key': CHART_TONE.sky }}>
                  Accuracy %
                </span>
              </div>
            </section>

            <section className="surface-sky p-4 sm:p-5 lg:col-span-4">
              <div className="card-rule" aria-hidden="true" />
              <h2 className="mt-2 text-[13.5px] font-medium text-[var(--sky-900)]">Subject averages</h2>
              <p className="mt-0.5 text-[11.5px] text-[var(--sky-800)]">Across all graded papers.</p>
              <div className="mt-2 space-y-2.5">
                {academic.subjectAverages.length === 0 ? (
                  <p className="py-6 text-center text-[11.5px] text-soft">No subject data yet.</p>
                ) : (
                  academic.subjectAverages.map((subject) => (
                    <div key={subject.subjectId}>
                      <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                        <span className="font-medium text-ink">{subject.subjectName}</span>
                        <span className="tabular text-muted">{subject.average}%</span>
                      </div>
                      <ProgressBar
                        value={subject.average}
                        tone={subject.average >= 60 ? 'good' : subject.average >= 35 ? 'warn' : 'danger'}
                        height={5}
                        className="mt-1"
                      />
                      <p className="mt-0.5 text-[10px] text-soft">Best {subject.best}% · {subject.count} paper{subject.count > 1 ? 's' : ''}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <section className="surface-flat p-4 sm:p-5 lg:col-span-5">
              <div className="card-rule" data-tone="warn" aria-hidden="true" />
              <h2 className="mt-2 text-[13.5px] font-medium text-ink">Topic accuracy</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">Weakest topics first — these drive the biggest gains.</p>
              <div className="mt-3">
                <ComparisonBars
                  data={academic.topicTrend.slice(0, 7).map((topic) => ({ name: topic.topicName, accuracy: Math.max(topic.accuracy, 0) }))}
                  series={[{ key: 'accuracy', name: 'Accuracy %' }]}
                  layout="horizontal"
                  height={240}
                  unit="%"
                />
              </div>
            </section>

            <section className="surface-flat p-4 sm:p-5 lg:col-span-7">
              <div className="card-rule" aria-hidden="true" />
              <h2 className="mt-2 text-[13.5px] font-medium text-ink">Examination history</h2>
              <div className="table-scroll mt-3">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Examination</th>
                      <th className="align-right">Marks</th>
                      <th className="align-right">Score</th>
                      <th className="align-right">Accuracy</th>
                      <th className="align-right">Negative</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {academic.points.map((point) => (
                      <tr key={point.attemptId}>
                        <td>
                          <p className="max-w-[230px] truncate font-medium text-ink">{point.examTitle}</p>
                          <p className="text-[10.5px] text-soft">{formatDate(point.submittedAt)}</p>
                        </td>
                        <td className="align-right tabular">{point.awardedMarks}/{point.maxMarks}</td>
                        <td className="align-right tabular font-medium">{Math.max(point.percentage, 0)}%</td>
                        <td className="align-right tabular">{point.accuracy}%</td>
                        <td className="align-right tabular text-[#8c2f2f]">−{point.negativeTotal}</td>
                        <td className="align-right">
                          <Link
                            to={`/student/exams/${point.examId}/analysis`}
                            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-link hover:underline"
                          >
                            Analysis <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="display-md text-ink">Participation</h2>
          <StatusBadge tone="neutral">Not part of academic score</StatusBadge>
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
            <h3 className="text-[13px] font-medium text-ink">Attendance</h3>
            <DonutChart
              data={[
                {
                  name: 'Attended',
                  value: Math.max(participation.attendance.percentage, 0.5),
                  color:
                    participation.attendance.percentage >= participation.attendance.threshold
                      ? CHART_TONE.primary
                      : CHART_TONE.warn,
                },
                { name: 'Balance', value: Math.max(100 - participation.attendance.percentage, 0.5), color: CHART_TONE.track },
              ]}
              height={160}
              innerRadius={46}
              outerRadius={66}
              centerValue={`${participation.attendance.percentage}%`}
              centerLabel="attendance"
            />
            <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <dt className="label-xs">Attended</dt>
                <dd className="font-medium text-ink">{participation.attendance.attendedHours} h</dd>
              </div>
              <div>
                <dt className="label-xs">Missed</dt>
                <dd className="font-medium text-ink">{participation.attendance.missingHours} h</dd>
              </div>
            </dl>
            <Link to="/student/attendance" className="btn btn-secondary btn-sm mt-3 w-full">
              Attendance detail
            </Link>
          </section>

          <section className="surface-cream p-4 sm:p-5 lg:col-span-4">
            <h3 className="text-[13px] font-medium text-[var(--cream-900)]">Classes</h3>
            <dl className="mt-2 space-y-2 text-[12px]">
              <div className="flex justify-between"><dt className="text-muted">Sessions scheduled</dt><dd className="font-medium text-ink">{participation.classes.liveSessions}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Sessions attended</dt><dd className="font-medium text-ink">{participation.classes.attended}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Upcoming</dt><dd className="font-medium text-ink">{participation.classes.scheduled}</dd></div>
            </dl>
            <p className="mt-3 text-[10.5px] leading-relaxed text-soft">{notes.participationNote}</p>
          </section>

          <section className="surface-flat p-4 sm:p-5 lg:col-span-4">
            <h3 className="text-[13px] font-medium text-ink">Doubt activity</h3>
            <dl className="mt-2 space-y-2 text-[12px]">
              <div className="flex justify-between"><dt className="text-muted">Doubts raised</dt><dd className="font-medium text-ink">{participation.doubts.total}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Answered by faculty</dt><dd className="font-medium text-ink">{participation.doubts.answered + participation.doubts.resolved}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Still open</dt><dd className="font-medium text-ink">{participation.doubts.open}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Response rate</dt><dd className="font-medium text-ink">{participation.doubts.responseRate}%</dd></div>
            </dl>
            <Link to="/student/doubts" className="btn btn-secondary btn-sm mt-3 w-full">
              Open doubts
            </Link>
          </section>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          {notes.academicNote} {notes.participationNote} Class participation is not combined with examination marks to
          produce a composite academic score.
        </p>
      </div>
    </div>
  )
}
