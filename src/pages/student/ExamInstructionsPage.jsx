import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText, Lock, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { examService } from '../../services/exam.service.js'
import { attemptService } from '../../services/attempt.service.js'
import { formatDate, formatTime } from '../../lib/time.js'
import { subjectName } from '../../data/mock/subjects.mock.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

const LEGEND = [
  { state: 'palette-not-visited', label: 'Not visited' },
  { state: 'palette-not-answered', label: 'Not answered' },
  { state: 'palette-answered', label: 'Answered' },
  { state: 'palette-marked', label: 'Marked for review' },
  { state: 'palette-answered-marked', label: 'Answered & marked' },
]

export default function ExamInstructionsPage() {
  const { examId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [acknowledged, setAcknowledged] = useState(false)
  const [starting, setStarting] = useState(false)

  const { data, error, loading, refresh } = useAsync(
    () => examService.getExamForStudent(examId, user.id),
    [examId, user.id],
  )

  const negativeSummary = useMemo(() => {
    if (!data) return null
    const questions = data.exam.sections.flatMap((section) => section.questionIds)
    return {
      questions: questions.length,
      markedForNegative: data.exam.negativeMarking,
    }
  }, [data])

  const start = async () => {
    setStarting(true)
    try {
      const result = await attemptService.startExam(examId, user.id)
      if (result.alreadySubmitted) {
        toast.info('Already submitted', 'This attempt was submitted earlier. Open the result instead.')
        navigate(`/student/exams/${examId}/result`)
        return
      }
      toast.success(result.resumed ? 'Attempt resumed' : 'Examination started', 'Your timer has started and your responses will be saved.')
      navigate(`/student/exams/${examId}/live`)
    } catch (caught) {
      toast.error('Could not start the examination', caught?.message)
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Examination" title="Instructions" />
        <LoadingBlock rows={7} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Examination" title="Instructions" backTo="/student/exams" backLabel="All examinations" />
        <ErrorState error={error} onRetry={refresh} title="This examination could not be opened" />
      </div>
    )
  }

  const { exam, canStart, blockedReason, attempt, candidate } = data
  const alreadySubmitted = attempt && attempt.status !== 'in-progress'

  return (
    <div className="mx-auto max-w-[1080px]">
      <PageHeader
        eyebrow="Examination instructions"
        title={exam.title}
        description="Read every section before you begin. The Start button unlocks only after you accept the declaration."
        backTo="/student/exams"
        backLabel="All examinations"
        actions={<StatusBadge tone={canStart ? 'good' : alreadySubmitted ? 'sky' : 'warn'} dot>{alreadySubmitted ? 'Submitted' : canStart ? 'Ready to start' : 'Not available'}</StatusBadge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <section className="surface p-5">
            <h2 className="text-[14px] font-medium text-ink">Candidate and paper details</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[12px] border border-[var(--line)] p-3">
                <p className="label-xs">Candidate</p>
                <p className="mt-1 text-[13px] font-medium text-ink">{candidate.name}</p>
                <p className="text-[11.5px] text-muted">{candidate.enrollmentId} · {candidate.email}</p>
              </div>
              <div className="rounded-[12px] border border-[var(--line)] p-3">
                <p className="label-xs">Examination window</p>
                <p className="mt-1 text-[13px] font-medium text-ink">{formatDate(exam.startAt)}</p>
                <p className="text-[11.5px] text-muted">{formatTime(exam.startAt)} – {formatTime(exam.endAt)} IST</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Duration', value: `${exam.durationMinutes} min` },
                { label: 'Questions', value: exam.totalQuestions },
                { label: 'Maximum marks', value: exam.totalMarks },
                { label: 'Sections', value: exam.sections.length },
              ].map((item) => (
                <div key={item.label} className="rounded-[10px] bg-[var(--surface-sunken)] px-3 py-2.5">
                  <p className="label-xs">{item.label}</p>
                  <p className="mt-0.5 text-[14px] font-medium text-ink tabular">{item.value}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-5 text-[13px] font-medium text-ink">Section structure</h3>
            <div className="mt-2 space-y-2">
              {exam.sections.map((section) => (
                <div key={section.id} className="flex items-start justify-between gap-3 rounded-[10px] border border-[var(--line)] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-ink">{section.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted">{section.instructions}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11.5px] font-medium text-ink tabular">{section.questionIds.length} Q</p>
                    <p className="text-[10.5px] text-soft">{subjectName(section.subjectId)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="text-[14px] font-medium text-ink">Marking scheme</h2>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-[10px] bg-[var(--sky-50)] px-3 py-2.5">
                <p className="label-xs">Correct answer</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">+{data.marksScheme.defaultQuestionMarks} marks</p>
              </div>
              <div className="rounded-[10px] bg-[var(--cream-100)] px-3 py-2.5">
                <p className="label-xs">Incorrect answer</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">
                  {exam.negativeMarking ? `−${data.marksScheme.defaultNegativeMarkValue} marks` : 'No penalty'}
                </p>
              </div>
              <div className="rounded-[10px] bg-[var(--surface-sunken)] px-3 py-2.5">
                <p className="label-xs">Unattempted</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">0 marks</p>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              Numerical-answer questions carry no negative marking. Multiple-correct questions award partial credit for
              each correct option selected without an incorrect one.
            </p>
          </section>

          <section className="surface p-5">
            <h2 className="text-[14px] font-medium text-ink">Question status legend</h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {LEGEND.map((entry) => (
                <div key={entry.label} className="flex items-center gap-1.5">
                  <span className={`palette-btn ${entry.state}`} aria-hidden="true" />
                  <span className="text-[11.5px] text-muted">{entry.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="text-[14px] font-medium text-ink">Examination conduct</h2>
            <ol className="mt-2.5 space-y-2">
              {(exam.instructions || []).map((instruction, index) => (
                <li key={instruction} className="flex gap-2.5 text-[12px] leading-relaxed text-ink-80">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[9.5px] font-semibold text-ink-70">
                    {index + 1}
                  </span>
                  {instruction}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-[76px] lg:self-start">
          <section className="surface p-5">
            <h2 className="text-[14px] font-medium text-ink">Before you start</h2>
            <ul className="mt-3 space-y-2.5">
              {[
                { icon: Clock, text: 'The timer starts immediately and cannot be paused.' },
                { icon: CheckCircle2, text: 'Responses are saved as you move between questions.' },
                { icon: ShieldCheck, text: 'Tab switching is logged as a technical integrity event, not automatically as misconduct.' },
                { icon: Lock, text: 'Once submitted, the attempt cannot be reopened.' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.text} className="flex items-start gap-2 text-[11.5px] leading-snug text-muted">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-60" aria-hidden="true" />
                    {item.text}
                  </li>
                )
              })}
            </ul>

            {blockedReason && !alreadySubmitted ? (
              <div className="mt-4 rounded-[10px] border border-[#e8c9c9] bg-[#fdf6f6] p-3">
                <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#7d2b2b]">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Cannot start now
                </p>
                <p className="mt-1 text-[11px] leading-snug text-[#7d2b2b]/85">{blockedReason}</p>
              </div>
            ) : null}

            {alreadySubmitted ? (
              <div className="mt-4 space-y-2">
                <p className="text-[11.5px] leading-snug text-muted">
                  You already submitted this paper. Open the result to review your marks and the question-level analysis.
                </p>
                <Button variant="primary" fullWidth iconRight={ArrowRight} onClick={() => navigate(`/student/exams/${examId}/result`)}>
                  View result
                </Button>
              </div>
            ) : (
              <>
                <label className="checkbox-row mt-4 rounded-[10px] border border-[var(--line)] p-3">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    disabled={!canStart}
                  />
                  <span className="text-[11.5px] leading-snug">
                    I have read the instructions and I understand the marking scheme. I will not leave the examination
                    window until I submit, and I understand that the timer cannot be paused.
                  </span>
                </label>

                <Button
                  className="mt-3"
                  variant="primary"
                  fullWidth
                  size="lg"
                  iconRight={ArrowRight}
                  loading={starting}
                  disabled={!acknowledged || !canStart}
                  onClick={start}
                >
                  {attempt?.status === 'in-progress' ? 'Resume examination' : 'Start examination'}
                </Button>
                <p className="mt-2 text-center text-[10px] text-soft">
                  {acknowledged ? 'Declaration accepted' : 'Accept the declaration to unlock the start button'}
                </p>
              </>
            )}
          </section>

          <section className="surface-sunken p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
              <User className="h-3.5 w-3.5" aria-hidden="true" /> Proctor note
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              This demonstration records tab-focus and reconnection events locally. Technical interruptions are reviewed by
              the administrator before any academic consequence is considered.
            </p>
          </section>

          <section className="surface-flat p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Total questions
            </p>
            <p className="mt-1 text-[22px] font-medium tabular text-ink">{negativeSummary?.questions}</p>
            <p className="text-[10.5px] text-soft">
              {negativeSummary?.markedForNegative ? 'Negative marking applies to single and multiple correct items.' : 'No negative marking on this paper.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
