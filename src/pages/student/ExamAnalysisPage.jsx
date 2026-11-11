import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Lightbulb, MinusCircle, Target, XCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { analysisService } from '../../services/analysis.service.js'
import { examService } from '../../services/exam.service.js'
import { formatDuration } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge } from '../../ui/workspace-kit.jsx'
import { ComparisonBars, TopicRadar, TrendArea } from '../../ui/charts.jsx'

const LEVELS = [
  { id: 'A', label: 'Overall' },
  { id: 'B', label: 'Subject' },
  { id: 'C', label: 'Topic' },
  { id: 'D', label: 'Question level' },
]

const STATUS_STYLE = {
  correct: { tone: 'good', icon: CheckCircle2, label: 'Correct' },
  incorrect: { tone: 'danger', icon: XCircle, label: 'Incorrect' },
  partial: { tone: 'warn', icon: AlertCircle, label: 'Partial' },
  unattempted: { tone: 'neutral', icon: MinusCircle, label: 'Unattempted' },
}

function AnswerChip({ optionId, question, variant }) {
  const option = (question?.options || []).find((item) => item.id === optionId)
  const tone =
    variant === 'correct' ? 'border-[#cfe0c9] bg-[#eef5ec] text-[#2f532c]' : 'border-[#e8c9c9] bg-[#fbeeee] text-[#7d2b2b]'
  return (
    <span className={`inline-flex max-w-full items-baseline gap-1 rounded-[8px] border px-2 py-1 text-[11.5px] ${tone}`}>
      <span className="font-semibold uppercase">{optionId}</span>
      <span className="truncate">{option?.text || '—'}</span>
    </span>
  )
}

function formatAnswer(question, answer) {
  if (answer === null || answer === undefined || (Array.isArray(answer) && answer.length === 0)) return 'Not answered'
  if (Array.isArray(answer)) return answer.join(', ').toUpperCase()
  return String(answer)
}

export default function ExamAnalysisPage() {
  const { examId } = useParams()
  const { user } = useAuth()
  const [level, setLevel] = useState('A')
  const [selectedQuestion, setSelectedQuestion] = useState(null)

  const { data, error, loading, refresh } = useAsync(async () => {
    const exams = await examService.getStudentExams(user.id)
    const all = [...exams.completed, ...exams.inProgress]
    const match = all.find((exam) => exam.id === examId)
    if (!match?.attempt?.id) return { noAttempt: true }
    const analysis = await analysisService.getDetailedAnalysis(match.attempt.id)
    return { analysis }
  }, [examId, user.id])

  const activeQuestion = useMemo(() => {
    if (!data?.analysis) return null
    return data.analysis.levelD.find((item) => item.questionId === selectedQuestion) || data.analysis.levelD[0]
  }, [data, selectedQuestion])

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Examination analysis" title="Loading analysis" />
        <LoadingBlock rows={7} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Examination analysis" title="Analysis" backTo="/student/exams" backLabel="All examinations" />
        <ErrorState error={error} onRetry={refresh} title="The analysis could not be generated" />
      </div>
    )
  }

  if (data.noAttempt) {
    return (
      <div>
        <PageHeader eyebrow="Examination analysis" title="No attempt found" backTo="/student/exams" backLabel="All examinations" />
        <div className="surface">
          <EmptyState title="Nothing to analyse yet" description="Detailed analysis is available once you submit this examination." />
        </div>
      </div>
    )
  }

  const { analysis } = data
  const { levelA, levelB, levelC, levelD, extras, exam, attempt } = analysis
  const radarData = levelC.topics.slice(0, 7).map((topic) => ({ name: topic.topicName, value: Math.max(topic.accuracy, 0) }))

  return (
    <div>
      <PageHeader
        eyebrow="Examination analysis"
        title={exam.title}
        description={`Attempt ${attempt.id} · ${levelD.length} questions · ${formatDuration(levelA.totalTimeSpent)} total time · every figure is derived from the saved attempt.`}
        backTo="/student/exams"
        backLabel="All examinations"
      />

      <div className="tab-row mb-4" role="tablist" aria-label="Analysis levels">
        {LEVELS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={level === item.id}
            className="tab"
            onClick={() => setLevel(item.id)}
          >
            <span className="mr-1 text-[10px] text-soft">{item.id}</span>
            {item.label}
          </button>
        ))}
      </div>

      {level === 'A' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Obtained marks', value: `${levelA.awardedMarks}/${levelA.maxMarks}`, hint: `${levelA.percentage}% of the paper` },
              { label: 'Accuracy', value: `${levelA.accuracy}%`, hint: `${levelA.correctCount} correct of ${levelA.answeredCount} attempted` },
              { label: 'Attempted', value: `${levelA.answeredCount}/${levelA.totalQuestions}`, hint: `${levelA.unattemptedCount} left blank` },
              { label: 'Average time', value: `${levelA.averageTimePerQuestion}s`, hint: `per question · ${formatDuration(levelA.totalTimeSpent)} total` },
            ].map((stat) => (
              <div key={stat.label} className="surface-flat p-4">
                <p className="label-xs">{stat.label}</p>
                <p className="mt-1.5 text-[20px] font-medium leading-none tabular text-ink">{stat.value}</p>
                <p className="mt-1.5 text-[10.5px] leading-snug text-soft">{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <section className="surface-flat p-4 sm:p-5 lg:col-span-7">
              <h2 className="text-[13.5px] font-medium text-ink">Time distribution across questions</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">Seconds recorded per question — spot where the clock went.</p>
              <div className="mt-3">
                <TrendArea
                  data={extras.timeDistribution.map((entry) => ({ label: entry.name, seconds: entry.seconds }))}
                  yKey="seconds"
                  name="Seconds"
                  domain={[0, 'dataMax + 20']}
                  height={210}
                />
              </div>
            </section>

            <section className="surface-flat p-4 sm:p-5 lg:col-span-5">
              <h2 className="text-[13.5px] font-medium text-ink">Section performance</h2>
              <div className="mt-3 space-y-3">
                {extras.sectionPerformance.map((section) => (
                  <div key={section.sectionId}>
                    <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                      <span className="font-medium text-ink">{section.name}</span>
                      <span className="tabular text-muted">{section.awarded}/{section.max}</span>
                    </div>
                    <ProgressBar
                      value={Math.max(section.percentage, 0)}
                      tone={section.percentage >= 60 ? 'good' : section.percentage >= 35 ? 'warn' : 'danger'}
                      height={5}
                      className="mt-1"
                    />
                    <p className="mt-0.5 text-[10px] text-soft">
                      {section.correct} of {section.total} correct
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="surface-flat p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Time management
              </h2>
              <p className="mt-1.5 text-[12px] font-medium text-ink">{extras.timeInsight.headline}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{extras.timeInsight.body}</p>
            </section>
            <section className="surface-flat p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <Target className="h-3.5 w-3.5" aria-hidden="true" /> Answer changes
              </h2>
              <p className="mt-1.5 text-[12px] font-medium text-ink">
                {extras.answerChanges.changed} revised · {extras.answerChanges.improved} helped · {extras.answerChanges.harmed} cost marks
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{extras.answerChanges.note}</p>
            </section>
            <section className="surface-flat p-4">
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Slowest questions
              </h2>
              <ul className="mt-1.5 space-y-1">
                {extras.slowest.slice(0, 4).map((item) => (
                  <li key={item.questionId} className="flex justify-between gap-2 text-[11px]">
                    <span className="truncate text-ink">
                      Q{item.number} · {item.topicName}
                    </span>
                    <span className="shrink-0 tabular text-muted">
                      {item.timeSpentSeconds}s · {STATUS_STYLE[item.status]?.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="surface-flat p-4 sm:p-5">
            <h2 className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
              <Lightbulb className="h-4 w-4" aria-hidden="true" /> Improvement recommendations
            </h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {extras.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-[12px] border border-[var(--line)] p-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={recommendation.priority === 'high' ? 'danger' : recommendation.priority === 'medium' ? 'warn' : 'sky'}>
                      {recommendation.priority}
                    </StatusBadge>
                    <p className="text-[12px] font-medium text-ink">{recommendation.title}</p>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{recommendation.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {level === 'B' ? (
        <div className="space-y-4">
          <section className="surface-flat p-4 sm:p-5">
            <h2 className="text-[13.5px] font-medium text-ink">Subject comparison</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">Score percentage against accuracy — a large gap means unanswered questions, not wrong concepts.</p>
            <div className="mt-3">
              <ComparisonBars
                data={levelB.map((bucket) => ({
                  name: bucket.subjectName,
                  percentage: Math.max(bucket.percentage, 0),
                  accuracy: bucket.accuracy,
                }))}
                series={[
                  { key: 'percentage', name: 'Score %' },
                  { key: 'accuracy', name: 'Accuracy %', color: '#aed9f0' },
                ]}
                height={230}
                unit="%"
              />
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            {levelB.map((bucket) => (
              <section key={bucket.subjectId} className="surface-flat p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-[13px] font-medium text-ink">{bucket.subjectName}</h3>
                    <p className="mt-0.5 text-[11px] text-muted">{bucket.questions} questions · {bucket.timeSpent}s spent</p>
                  </div>
                  <StatusBadge tone={bucket.percentage >= 60 ? 'good' : bucket.percentage >= 35 ? 'warn' : 'danger'}>
                    {Math.max(bucket.percentage, 0)}%
                  </StatusBadge>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Marks', value: `${bucket.marksAwarded}/${bucket.maxMarks}` },
                    { label: 'Correct', value: bucket.correct },
                    { label: 'Incorrect', value: bucket.incorrect },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[8px] bg-[var(--surface-sunken)] px-2 py-1.5">
                      <dt className="label-xs">{item.label}</dt>
                      <dd className="mt-0.5 text-[12px] font-medium tabular text-ink">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <ProgressBar value={Math.max(bucket.percentage, 0)} height={4} className="mt-3" tone={bucket.percentage >= 60 ? 'good' : 'warn'} />
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {level === 'C' ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <section className="surface-flat p-4 sm:p-5 lg:col-span-7">
              <h2 className="text-[13.5px] font-medium text-ink">Topic performance</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">Sorted weakest first. Accuracy, marks and time per topic.</p>
              <div className="mt-3 space-y-2.5">
                {levelC.topics.map((topic) => (
                  <div key={topic.topicId}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-[11.5px]">
                      <span className="font-medium text-ink">
                        {topic.topicName}
                        <span className="ml-1.5 text-[10px] font-normal text-soft">{topic.subjectName}</span>
                      </span>
                      <span className="tabular text-muted">
                        {topic.accuracy}% accuracy · {topic.marksAwarded}/{topic.maxMarks} marks · {topic.timeSpent}s
                      </span>
                    </div>
                    <ProgressBar
                      value={Math.max(topic.accuracy, 0)}
                      tone={topic.strength === 'strong' ? 'good' : topic.strength === 'developing' ? 'warn' : 'danger'}
                      height={5}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-flat p-4 sm:p-5 lg:col-span-5">
              <h2 className="text-[13.5px] font-medium text-ink">Accuracy profile</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">Up to seven topics for legibility.</p>
              <div className="mt-1">
                <TopicRadar data={radarData} height={250} />
              </div>
            </section>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <section className="surface-sky p-4">
              <h3 className="text-[12.5px] font-medium text-ink">Strong topics</h3>
              {levelC.strong.length ? (
                <ul className="mt-2 space-y-1">
                  {levelC.strong.map((topic) => (
                    <li key={topic.topicId} className="flex justify-between gap-2 text-[11.5px] text-ink-80">
                      <span>{topic.topicName}</span>
                      <span className="tabular">{topic.accuracy}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[11.5px] text-muted">No topic crossed the 75% accuracy mark in this paper.</p>
              )}
            </section>
            <section className="surface-cream p-4">
              <h3 className="text-[12.5px] font-medium text-ink">Needs work</h3>
              {levelC.weak.length ? (
                <ul className="mt-2 space-y-1">
                  {levelC.weak.map((topic) => (
                    <li key={topic.topicId} className="flex justify-between gap-2 text-[11.5px] text-ink-80">
                      <span>{topic.topicName}</span>
                      <span className="tabular">{topic.accuracy}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[11.5px] text-muted">Nothing below 45% accuracy — a balanced paper for you.</p>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {level === 'D' ? (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="surface-flat p-3 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto">
            <p className="px-1 text-[11.5px] font-medium text-ink">Questions</p>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {levelD.map((item) => {
                return (
                  <button
                    key={item.questionId}
                    type="button"
                    onClick={() => setSelectedQuestion(item.questionId)}
                    className={`flex h-8 w-8 items-center justify-center rounded-[7px] border text-[11px] font-semibold tabular transition ${
                      activeQuestion?.questionId === item.questionId
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                        : item.status === 'correct'
                          ? 'border-[#b9d5b1] bg-[#dfeeda] text-[#2f5c2b]'
                          : item.status === 'incorrect'
                            ? 'border-[#c99b9b] bg-[#fbeeee] text-[#8c2f2f]'
                            : item.status === 'partial'
                              ? 'border-[#d9c78d] bg-[var(--cream-100)] text-[#7a6220]'
                              : 'border-[#dcdfe1] bg-[#eef0f1] text-ink-70'
                    }`}
                    aria-label={`Question ${item.number}, ${style.label}`}
                    aria-current={activeQuestion?.questionId === item.questionId ? 'true' : undefined}
                  >
                    {item.number}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 space-y-1 border-t border-[var(--line)] pt-2.5">
              {Object.entries(STATUS_STYLE).map(([key, style]) => {
                const count = levelD.filter((item) => item.status === key).length
                return (
                  <div key={key} className="flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="text-muted">{style.label}</span>
                    <span className="font-medium tabular text-ink">{count}</span>
                  </div>
                )
              })}
            </div>
          </aside>

          {activeQuestion ? (
            <section className="surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-md bg-[var(--ink)] px-1.5 text-[11px] font-semibold text-white">
                    Q{activeQuestion.number}
                  </span>
                  <span className="text-[11px] text-muted">
                    {activeQuestion.sectionName} · {activeQuestion.subjectName} · {activeQuestion.topicName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge tone={STATUS_STYLE[activeQuestion.status]?.tone || 'neutral'} dot>
                    {activeQuestion.statusLabel}
                  </StatusBadge>
                  <span className="badge">{activeQuestion.difficulty}</span>
                  <span className="badge tabular">{activeQuestion.marksAwarded > 0 ? '+' : ''}{activeQuestion.marksAwarded} / {activeQuestion.marks}</span>
                  <span className="badge tabular">{activeQuestion.timeSpentSeconds}s</span>
                </div>
              </div>

              <p className="mt-3 text-[14px] leading-[1.65] text-ink">{activeQuestion.question?.text}</p>

              {activeQuestion.question?.image ? (
                <figure className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)]">
                  <img src={activeQuestion.question.image.svg} alt={activeQuestion.question.image.alt} className="max-h-[220px] w-full object-contain" />
                </figure>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[10px] border border-[var(--line)] p-3">
                  <p className="label-xs">Your response</p>
                  <div className="mt-1.5 space-y-1.5">
                    {activeQuestion.studentAnswer === null || (Array.isArray(activeQuestion.studentAnswer) && activeQuestion.studentAnswer.length === 0) ? (
                      <p className="text-[12px] font-medium text-[#8c2f2f]">Not answered</p>
                    ) : Array.isArray(activeQuestion.studentAnswer) ? (
                      activeQuestion.studentAnswer.map((optionId) => (
                        <div key={optionId}>
                          <AnswerChip
                            optionId={optionId}
                            question={activeQuestion.question}
                            variant={activeQuestion.correctAnswer.includes(optionId) ? 'correct' : 'incorrect'}
                          />
                        </div>
                      ))
                    ) : (
                      <AnswerChip
                        optionId={String(activeQuestion.studentAnswer)}
                        question={activeQuestion.question}
                        variant="incorrect"
                      />
                    )}
                    <p className="text-[10.5px] text-soft">{formatAnswer(activeQuestion.question, activeQuestion.studentAnswer)}</p>
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#cfe0c9] bg-[#f6faf5] p-3">
                  <p className="label-xs">Correct response</p>
                  <div className="mt-1.5 space-y-1.5">
                    {Array.isArray(activeQuestion.correctAnswer) ? (
                      activeQuestion.correctAnswer.map((optionId) => (
                        <div key={optionId}>
                          <AnswerChip optionId={optionId} question={activeQuestion.question} variant="correct" />
                        </div>
                      ))
                    ) : (
                      <p className="text-[12px] font-medium text-[#2f532c] tabular">
                        {formatAnswer(activeQuestion.question, activeQuestion.correctAnswer)}
                        {activeQuestion.question?.unit ? ` ${activeQuestion.question.unit}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[10px] bg-[var(--surface-sunken)] p-3">
                  <p className="label-xs">Step-by-step solution</p>
                  <ol className="mt-1.5 space-y-1">
                    {(activeQuestion.question?.solution || []).map((step, index) => (
                      <li key={step} className="flex gap-2 text-[12px] leading-relaxed text-ink-80">
                        <span className="shrink-0 font-medium text-soft">{index + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-[10px] border border-[var(--line)] p-3">
                  <p className="label-xs">Explanation</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-80">{activeQuestion.question?.explanation}</p>
                </div>

                {activeQuestion.mistakeExplanation ? (
                  <div className="rounded-[10px] border border-[#e8c9c9] bg-[#fdf6f6] p-3">
                    <p className="label-xs text-[#7d2b2b]">Where your answer went wrong</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[#7d2b2b]/90">{activeQuestion.mistakeExplanation}</p>
                  </div>
                ) : null}

                {activeQuestion.changeCount > 0 ? (
                  <p className="text-[11px] text-soft">
                    You revised this answer {activeQuestion.changeCount} time{activeQuestion.changeCount > 1 ? 's' : ''} during the attempt.
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const index = levelD.findIndex((item) => item.questionId === activeQuestion.questionId)
                    if (index > 0) setSelectedQuestion(levelD[index - 1].questionId)
                  }}
                >
                  ← Previous question
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const index = levelD.findIndex((item) => item.questionId === activeQuestion.questionId)
                    if (index < levelD.length - 1) setSelectedQuestion(levelD[index + 1].questionId)
                  }}
                >
                  Next question <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </section>
          ) : (
            <EmptyState title="No questions in this paper" />
          )}
        </div>
      ) : null}
    </div>
  )
}
