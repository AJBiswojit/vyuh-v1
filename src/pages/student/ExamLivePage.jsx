import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ChevronLeft,
  Clock,
  Flag,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
  Send,
  X,
  Grid3x3,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { examService } from '../../services/exam.service.js'
import { attemptService } from '../../services/attempt.service.js'
import { flattenExamQuestions } from '../../data/mock/exams.mock.js'
import { formatClock } from '../../lib/time.js'
import { useToast, useConfirm } from '../../ui/feedback.jsx'
import Button from '../../ui/Button.jsx'
import { LoadingBlock, ErrorState, Modal } from '../../ui/states.jsx'
import useAsync from '../../lib/useAsync.js'

const STATUS_CLASS = {
  'not-visited': 'palette-not-visited',
  'not-answered': 'palette-not-answered',
  answered: 'palette-answered',
  marked: 'palette-marked',
  'answered-marked': 'palette-answered-marked',
}

const LEGEND = [
  { status: 'answered', label: 'Answered' },
  { status: 'not-answered', label: 'Not answered' },
  { status: 'not-visited', label: 'Not visited' },
  { status: 'marked', label: 'Marked for review' },
  { status: 'answered-marked', label: 'Answered & marked' },
]

function isAnswerPresent(answer) {
  if (answer === null || answer === undefined) return false
  if (Array.isArray(answer)) return answer.length > 0
  return String(answer).trim().length > 0
}

export default function ExamLivePage() {
  const { examId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const { data, error, loading, refresh } = useAsync(
    async () => {
      const [examPayload, attempt] = await Promise.all([
        examService.getExamForStudent(examId, user.id),
        attemptService.getAttemptForExam(examId, user.id),
      ])
      /* Questions are fetched through the service — never from the mock data
         module directly — so the exam screen has no hidden data dependency. */
      const questionRecords = await examService.getQuestionsByIds(
        flattenExamQuestions(examPayload.exam).map((entry) => entry.questionId),
      )
      return { examPayload, attempt, questionRecords }
    },
    [examId, user.id],
  )

  /* ----------------------------- local state ---------------------------- */
  const [answers, setAnswers] = useState({})
  const [statuses, setStatuses] = useState({})
  const [marked, setMarked] = useState([])
  const [visited, setVisited] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [currentSection, setCurrentSection] = useState(null)
  const [remaining, setRemaining] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [connectionNotice, setConnectionNotice] = useState(null)

  const attemptRef = useRef(null)
  const answerRef = useRef({})
  const statusRef = useRef({})
  const markedRef = useRef([])
  const submittedRef = useRef(false)
  const deadlineRef = useRef(null)
  const secondsOnQuestion = useRef(0)
  const pendingTime = useRef({})
  const initialized = useRef(false)

  const exam = data?.examPayload?.exam
  const attempt = data?.attempt

  const questions = useMemo(() => (exam ? flattenExamQuestions(exam) : []), [exam])
  const questionById = useMemo(() => {
    const index = {}
    ;(data?.questionRecords || []).forEach((question) => {
      index[question.id] = question
    })
    return index
  }, [data])

  /* --------------------------- initial hydration ------------------------ */
  useEffect(() => {
    if (!exam || !attempt || initialized.current) return
    initialized.current = true
    attemptRef.current = attempt
    deadlineRef.current = new Date(attempt.deadlineAt || attempt.startedAt).getTime() + (attempt.deadlineAt ? 0 : exam.durationMinutes * 60000)

    const nextAnswers = {}
    const nextStatuses = {}
    attempt.responses.forEach((response) => {
      nextAnswers[response.questionId] = response.answer
      nextStatuses[response.questionId] = response.status
    })
    setAnswers(nextAnswers)
    answerRef.current = nextAnswers
    setStatuses(nextStatuses)
    statusRef.current = nextStatuses
    setMarked(attempt.markedForReview || [])
    markedRef.current = attempt.markedForReview || []
    setVisited((attempt.questionVisitHistory || []).map((entry) => entry.questionId))

    const firstUnanswered =
      questions.find((entry) => !isAnswerPresent(nextAnswers[entry.questionId])) || questions[0]
    const startQuestion = attempt.currentQuestionId || firstUnanswered?.questionId
    setCurrentId(startQuestion)
    setCurrentSection(
      questions.find((entry) => entry.questionId === startQuestion)?.sectionId || exam.sections?.[0]?.id || null,
    )
    setRemaining(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, attempt])

  /* ------------------------------- timer ------------------------------- */
  useEffect(() => {
    if (!attempt || submitted) return
    const tick = () => {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) handleAutoSubmit()
    }
    const interval = setInterval(tick, 1000)
    tick()
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, submitted])

  /* --------------------- per-question time tracking -------------------- */
  useEffect(() => {
    if (!attempt || submitted) return
    const interval = setInterval(() => {
      secondsOnQuestion.current += 1
    }, 1000)
    return () => clearInterval(interval)
  }, [attempt, submitted])

  const flushTime = useCallback(() => {
    const attemptId = attemptRef.current?.id
    const questionId = currentId
    const seconds = secondsOnQuestion.current
    if (!attemptId || !questionId || seconds <= 0) return
    secondsOnQuestion.current = 0
    pendingTime.current[questionId] = (pendingTime.current[questionId] || 0) + seconds
    attemptService.recordTime(attemptId, questionId, seconds).catch(() => {})
  }, [currentId])

  const flushAllTime = useCallback(async () => {
    const attemptId = attemptRef.current?.id
    if (!attemptId) return
    flushTime()
    const remainingPending = { ...pendingTime.current }
    pendingTime.current = {}
    if (Object.keys(remainingPending).length === 0) return
    await Promise.all(
      Object.entries(remainingPending).map(([questionId, seconds]) =>
        attemptService.recordTime(attemptId, questionId, seconds).catch(() => {}),
      ),
    )
  }, [flushTime])

  /* ------------------------- connection monitoring --------------------- */
  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
      setConnectionNotice(null)
      if (attemptRef.current?.id) {
        attemptService.logIntegrityEvent(attemptRef.current.id, {
          type: 'reconnection',
          severity: 'info',
          label: 'Connection restored',
          detail: 'The network connection returned during the examination. Responses were preserved.',
        }).catch(() => {})
      }
    }
    const onOffline = () => {
      setOnline(false)
      setConnectionNotice('Connection lost. Your saved responses are safe; the timer continues.')
      if (attemptRef.current?.id) {
        attemptService.logIntegrityEvent(attemptRef.current.id, {
          type: 'reconnection',
          severity: 'warning',
          label: 'Connection lost',
          detail: 'The network connection dropped during the examination.',
        }).catch(() => {})
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && attemptRef.current?.id && !submittedRef.current) {
        attemptService.logIntegrityEvent(attemptRef.current.id, {
          type: 'tab-blur',
          severity: 'warning',
          label: 'Examination window left focus',
          detail: 'The document was hidden. This is recorded as a technical event and reviewed before any consequence.',
        }).catch(() => {})
      }
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  /* -------------------------- fullscreen control ----------------------- */
  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      toast.info('Full screen is unavailable', 'Your browser blocked the request. You can continue in the normal window.')
    }
  }

  /* ------------------------------ submission --------------------------- */
  const finish = useCallback(
    async ({ auto = false } = {}) => {
      if (submittedRef.current) return
      submittedRef.current = true
      setSubmitted(true)
      setSubmitting(true)
      try {
        await flushAllTime()
        await attemptService.submitAttempt(attemptRef.current.id, {
          auto,
          reason: auto ? 'Timer expired — submitted automatically' : 'Submitted by the candidate',
        })
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
        toast.success(auto ? 'Time is up — attempt submitted' : 'Attempt submitted', 'Your result is ready to view.')
        navigate(`/student/exams/${examId}/result?submitted=${auto ? 'auto' : 'manual'}`, { replace: true })
      } catch (caught) {
        submittedRef.current = false
        setSubmitted(false)
        toast.error('Submission failed', caught?.message || 'Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
    [examId, flushAllTime, navigate, toast],
  )

  const handleAutoSubmit = useCallback(() => {
    if (submittedRef.current) return
    toast.info('Time is up', 'The examination is being submitted automatically.')
    finish({ auto: true })
  }, [finish, toast])

  const manualSubmit = async () => {
    const counts = summariseStatuses()
    const ok = await confirm({
      title: 'Submit the examination?',
      description: 'Once submitted you cannot reopen this attempt. Unanswered and marked questions are included as they stand.',
      confirmLabel: 'Submit now',
      tone: 'primary',
      details: [
        { label: 'Answered', value: String(counts.answered) },
        { label: 'Not answered', value: String(counts.unanswered) },
        { label: 'Marked for review', value: String(counts.marked) },
        { label: 'Time remaining', value: formatClock(remaining) },
      ],
    })
    if (ok) finish({ auto: false })
  }

  /* ---------------------------- answer actions ------------------------- */
  const currentQuestion = currentId ? questionById[currentId] || currentEntry?.question || null : null
  const currentEntry = questions.find((entry) => entry.questionId === currentId)

  const persistAnswer = async (questionId, value) => {
    const attemptId = attemptRef.current?.id
    if (!attemptId) return
    const isMarked = markedRef.current.includes(questionId)
    const nextStatus = isAnswerPresent(value) ? (isMarked ? 'answered-marked' : 'answered') : isMarked ? 'marked' : 'not-answered'
    setAnswers((current) => ({ ...current, [questionId]: value }))
    answerRef.current = { ...answerRef.current, [questionId]: value }
    setStatuses((current) => ({ ...current, [questionId]: nextStatus }))
    statusRef.current = { ...statusRef.current, [questionId]: nextStatus }
    try {
      await attemptService.saveResponse(attemptId, questionId, value, {
        timeSpentSeconds: pendingTime.current[questionId],
      })
    } catch (caught) {
      toast.error('Response not saved', caught?.message || 'Check your connection. The answer stays on screen.')
    }
  }

  const markVisited = async (questionId, sectionId) => {
    if (visited.includes(questionId)) return
    setVisited((current) => [...current, questionId])
    const currentStatus = statusRef.current[questionId]
    if (currentStatus === 'not-visited' || !currentStatus) {
      const answered = isAnswerPresent(answerRef.current[questionId])
      const nextStatus = answered ? 'answered' : 'not-answered'
      setStatuses((current) => ({ ...current, [questionId]: nextStatus }))
      statusRef.current = { ...statusRef.current, [questionId]: nextStatus }
    }
    if (attemptRef.current?.id) {
      attemptService.recordVisit(attemptRef.current.id, questionId, sectionId).catch(() => {})
    }
  }

  useEffect(() => {
    if (currentId && currentEntry) markVisited(currentId, currentEntry.sectionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  const goTo = (questionId) => {
    flushTime()
    const entry = questions.find((item) => item.questionId === questionId)
    if (!entry) return
    setCurrentId(questionId)
    setCurrentSection(entry.sectionId)
    setPaletteOpen(false)
  }

  const nextQuestion = () => {
    const index = questions.findIndex((entry) => entry.questionId === currentId)
    const next = questions[index + 1]
    if (next) goTo(next.questionId)
  }

  const prevQuestion = () => {
    const index = questions.findIndex((entry) => entry.questionId === currentId)
    const prev = questions[index - 1]
    if (prev) goTo(prev.questionId)
  }

  const toggleMark = async (andNext = false) => {
    if (!currentId || !attemptRef.current?.id) return
    const isMarked = markedRef.current.includes(currentId)
    const nextMarked = isMarked ? markedRef.current.filter((id) => id !== currentId) : [...markedRef.current, currentId]
    markedRef.current = nextMarked
    setMarked(nextMarked)
    const answered = isAnswerPresent(answerRef.current[currentId])
    const nextStatus = answered ? (isMarked ? 'answered' : 'answered-marked') : isMarked ? 'not-answered' : 'marked'
    setStatuses((current) => ({ ...current, [currentId]: nextStatus }))
    statusRef.current = { ...statusRef.current, [currentId]: nextStatus }
    try {
      await attemptService.markForReview(attemptRef.current.id, currentId, !isMarked)
    } catch {
      /* non-blocking */
    }
    if (andNext) nextQuestion()
  }

  const clearResponse = async () => {
    if (!currentId) return
    await persistAnswer(currentId, null)
    if (markedRef.current.includes(currentId)) {
      // Status must revert to "marked for review" with no answer.
      setStatuses((current) => ({ ...current, [currentId]: 'marked' }))
      statusRef.current = { ...statusRef.current, [currentId]: 'marked' }
    }
    toast.info('Response cleared', 'The question is now unanswered.')
  }

  /* ------------------------------- derived ----------------------------- */
  function summariseStatuses() {
    const counts = { answered: 0, unanswered: 0, marked: 0, notVisited: 0 }
    questions.forEach((entry) => {
      const status = statusRef.current[entry.questionId]
      if (status === 'answered' || status === 'answered-marked') counts.answered += 1
      else if (status === 'marked') counts.marked += 1
      else if (status === 'not-answered') counts.unanswered += 1
      else counts.notVisited += 1
    })
    return counts
  }

  const counts = summariseStatuses()
  const sections = exam?.sections || []
  const sectionQuestions = questions.filter((entry) => entry.sectionId === currentSection)
  const totalQuestions = questions.length

  /* --------------------------- guard conditions ------------------------ */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-[520px]">
          <LoadingBlock label="Preparing your examination" rows={5} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[560px] p-6">
        <ErrorState error={error} onRetry={refresh} title="The examination could not be opened" />
        <Button className="mt-3" variant="secondary" onClick={() => navigate('/student/exams')}>
          Back to examinations
        </Button>
      </div>
    )
  }

  if (!attempt || attempt.status !== 'in-progress') {
    return <Navigate to={`/student/exams/${examId}/result`} replace />
  }

  const currentAnswer = answers[currentId]
  const isMarked = marked.includes(currentId)
  const currentNumber = questions.findIndex((entry) => entry.questionId === currentId) + 1
  const isLastQuestion = currentNumber === questions.length

  /* ------------------------------- render ------------------------------ */
  return (
    <div className="exam-viewport">
      {/* header */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] text-[10px] font-semibold text-ink">
            VY
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium leading-tight text-ink">{exam.title}</p>
            <p className="truncate text-[10px] leading-tight text-soft">
              {user.name} · {user.enrollmentId} · {exam.type}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <span
            className={`hidden items-center gap-1 rounded-full border px-2 py-1 text-[10px] sm:inline-flex ${
              online ? 'border-[#cfe0c9] bg-[#eef5ec] text-[#375f34]' : 'border-[#e8c9c9] bg-[#fbeeee] text-[#8c2f2f]'
            }`}
            title={online ? 'Connection stable' : 'Connection lost'}
          >
            <span className={`dot ${online ? 'bg-[#4c7a45]' : 'bg-[#9d3c3c]'}`} aria-hidden="true" />
            {online ? 'Connected' : 'Offline'}
          </span>

          <div
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${
              remaining <= 300 ? 'border-[#e8c9c9] bg-[#fbeeee]' : 'border-[var(--line-strong)] bg-white'
            }`}
            role="timer"
            aria-live="off"
            aria-label={`Time remaining ${formatClock(remaining)}`}
          >
            <Clock className={`h-3.5 w-3.5 ${remaining <= 300 ? 'text-[#8c2f2f]' : 'text-ink-60'}`} aria-hidden="true" />
            <span className={`tabular text-[13px] font-semibold ${remaining <= 300 ? 'text-[#8c2f2f]' : 'text-ink'}`}>
              {formatClock(remaining)}
            </span>
          </div>

          <button type="button" onClick={toggleFullscreen} className="icon-btn h-7 w-7" aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}>
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => setInstructionsOpen(true)} className="btn btn-ghost btn-xs hidden sm:inline-flex">
            Instructions
          </button>
          <Button size="xs" variant="primary" icon={Send} loading={submitting} onClick={manualSubmit} disabled={submitted}>
            Submit
          </Button>
        </div>
      </header>

      {connectionNotice ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-[#e3d5a8] bg-[var(--cream-100)] px-3 py-1.5 text-[11px] text-[#7a6220]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> {connectionNotice}
        </div>
      ) : null}

      {/* section bar */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1.5">
        {sections.map((section) => {
          const sectionTotal = questions.filter((entry) => entry.sectionId === section.id).length
          const answeredInSection = questions.filter(
            (entry) =>
              entry.sectionId === section.id &&
              (statuses[entry.questionId] === 'answered' || statuses[entry.questionId] === 'answered-marked'),
          ).length
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                const first = questions.find((entry) => entry.sectionId === section.id)
                if (first) goTo(first.questionId)
              }}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition ${
                currentSection === section.id
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                  : 'border-[var(--line)] bg-white text-ink-70 hover:border-[var(--line-strong)]'
              }`}
              aria-current={currentSection === section.id ? 'true' : undefined}
            >
              {section.name} <span className="opacity-70">· {answeredInSection}/{sectionTotal}</span>
            </button>
          )
        })}
        <div className="ml-auto hidden shrink-0 items-center gap-3 text-[10.5px] text-muted sm:flex">
          <span>{counts.answered} answered</span>
          <span>{counts.unanswered + counts.notVisited} remaining</span>
          <span>{counts.marked} marked</span>
        </div>
      </div>

      {/* body */}
      <div className="exam-body">
        <div className="flex min-h-0 flex-col">
          <div className="exam-question-scroll thin-scroll flex-1 px-3 py-3 sm:px-5 sm:py-4">
            {currentQuestion ? (
              <div className="mx-auto max-w-[860px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[var(--ink)] px-1.5 text-[11px] font-semibold text-white tabular">
                      Q{questions.findIndex((entry) => entry.questionId === currentId) + 1}
                    </span>
                    <span className="text-[11px] text-muted">
                      of {totalQuestions} · {currentEntry?.sectionName}
                    </span>
                    <span className="badge badge-outline">{currentQuestion.difficulty}</span>
                    <span className="badge badge-outline">
                      {currentQuestion.type === 'multiple'
                        ? 'Multiple correct'
                        : currentQuestion.type === 'single'
                          ? 'Single correct'
                          : 'Numerical'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted">
                    <span className="tabular">+{currentQuestion.marks}</span>
                    {exam.negativeMarking && currentQuestion.negativeMarks ? (
                      <span className="tabular text-[#8c2f2f]">−{currentQuestion.negativeMarks}</span>
                    ) : null}
                  </div>
                </div>

                <p className="mt-3 text-[14px] leading-[1.65] text-ink">{currentQuestion.text}</p>

                {currentQuestion.image ? (
                  <figure className="mt-3 overflow-hidden rounded-[10px] border border-[var(--line)]">
                    <img
                      src={currentQuestion.image.svg}
                      alt={currentQuestion.image.alt}
                      className="max-h-[220px] w-full object-contain"
                    />
                    <figcaption className="border-t border-[var(--line)] bg-[var(--surface-muted)] px-3 py-1.5 text-[10px] text-soft">
                      {currentQuestion.image.alt}
                    </figcaption>
                  </figure>
                ) : null}

                <div className="mt-4 space-y-2">
                  {currentQuestion.type === 'single' &&
                    currentQuestion.options.map((option) => {
                      const selected = Array.isArray(currentAnswer)
                        ? currentAnswer.includes(option.id)
                        : currentAnswer === option.id
                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 transition ${
                            selected
                              ? 'border-[var(--ink)] bg-[var(--sky-50)]'
                              : 'border-[var(--line)] bg-white hover:border-[var(--line-strong)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q_${currentId}`}
                            checked={selected}
                            onChange={() => persistAnswer(currentId, [option.id])}
                            className="mt-0.5 h-3.5 w-3.5 accent-[var(--ink)]"
                          />
                          <span className="text-[13px] leading-snug text-ink">
                            <span className="mr-1.5 font-semibold">{option.id.toUpperCase()}.</span>
                            {option.text}
                          </span>
                        </label>
                      )
                    })}

                  {currentQuestion.type === 'multiple' &&
                    currentQuestion.options.map((option) => {
                      const selected = Array.isArray(currentAnswer) && currentAnswer.includes(option.id)
                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 transition ${
                            selected
                              ? 'border-[var(--ink)] bg-[var(--sky-50)]'
                              : 'border-[var(--line)] bg-white hover:border-[var(--line-strong)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const existing = Array.isArray(currentAnswer) ? currentAnswer : []
                              const next = selected
                                ? existing.filter((id) => id !== option.id)
                                : [...existing, option.id]
                              persistAnswer(currentId, next)
                            }}
                            className="mt-0.5 h-3.5 w-3.5 accent-[var(--ink)]"
                          />
                          <span className="text-[13px] leading-snug text-ink">
                            <span className="mr-1.5 font-semibold">{option.id.toUpperCase()}.</span>
                            {option.text}
                          </span>
                        </label>
                      )
                    })}

                  {(currentQuestion.type === 'numerical' || currentQuestion.type === 'numeric-with-sign') && (
                    <div className="rounded-[10px] border border-[var(--line)] p-3">
                      <label htmlFor="numeric-answer" className="label-xs">
                        Your answer {currentQuestion.unit ? `(in ${currentQuestion.unit})` : ''}
                      </label>
                      <input
                        id="numeric-answer"
                        type="number"
                        step="any"
                        inputMode="decimal"
                        value={currentAnswer ?? ''}
                        onChange={(event) =>
                          persistAnswer(currentId, event.target.value === '' ? null : Number(event.target.value))
                        }
                        className="field-input mt-1.5 max-w-[220px] tabular"
                        placeholder="Enter a number"
                      />
                      <p className="mt-1.5 text-[10.5px] text-soft">
                        {currentQuestion.type === 'numeric-with-sign'
                          ? 'Include the sign according to the Cartesian convention. Do not type units.'
                          : 'Enter the value only — units are not required.'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3 text-[11px] text-muted">
                  <span className={`badge ${isMarked ? 'badge-warn' : 'badge-outline'}`}>
                    <Flag className="h-3 w-3" aria-hidden="true" /> {isMarked ? 'Marked for review' : 'Not marked'}
                  </span>
                  <span className={`badge ${isAnswerPresent(currentAnswer) ? 'badge-good' : 'badge-outline'}`}>
                    {isAnswerPresent(currentAnswer) ? 'Response saved' : 'No response yet'}
                  </span>
                  <span className="ml-auto hidden sm:inline">
                    Question {sectionQuestions.findIndex((entry) => entry.questionId === currentId) + 1} of {sectionQuestions.length} in this section
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted">Select a question from the palette to begin.</p>
            )}
          </div>

          {/* bottom controls */}
          <div className="shrink-0 border-t border-[var(--line)] bg-white px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button size="xs" variant="ghost" icon={ChevronLeft} onClick={prevQuestion} disabled={currentNumber <= 1}>
                Previous
              </Button>
              <Button size="xs" variant="secondary" icon={Flag} onClick={() => toggleMark(false)}>
                {isMarked ? 'Unmark' : 'Mark for review'}
              </Button>
              <Button size="xs" variant="secondary" icon={RotateCcw} onClick={clearResponse}>
                Clear response
              </Button>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="btn btn-secondary btn-xs lg:hidden"
              >
                <Grid3x3 className="h-3 w-3" /> Palette
              </button>
              <div className="ml-auto flex items-center gap-1.5">
                <Button size="xs" variant="secondary" onClick={() => toggleMark(true)}>
                  Mark &amp; next
                </Button>
                <Button
                  size="xs"
                  variant="primary"
                  icon={Save}
                  onClick={() => {
                    flushTime()
                    nextQuestion()
                  }}
                  disabled={isLastQuestion}
                >
                  Save &amp; next
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* palette (desktop) */}
        <aside className="hidden min-h-0 flex-col border-l border-[var(--line)] bg-[var(--surface-muted)] lg:flex">
          <div className="shrink-0 border-b border-[var(--line)] px-3 py-2">
            <p className="text-[11.5px] font-medium text-ink">Question palette</p>
            <p className="mt-0.5 text-[10px] text-soft">{currentEntry?.sectionName}</p>
          </div>
          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
            <div className="grid grid-cols-6 gap-1.5">
              {sectionQuestions.map((entry) => {
                const number = questions.findIndex((item) => item.questionId === entry.questionId) + 1
                const status = statuses[entry.questionId] || 'not-visited'
                return (
                  <button
                    key={entry.questionId}
                    type="button"
                    onClick={() => goTo(entry.questionId)}
                    className={`palette-btn ${STATUS_CLASS[status]} ${currentId === entry.questionId ? 'palette-current' : ''}`}
                    aria-label={`Question ${number}, ${status.replace(/-/g, ' ')}`}
                    aria-current={currentId === entry.questionId ? 'true' : undefined}
                  >
                    {number}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 space-y-1 border-t border-[var(--line)] pt-2.5">
              {LEGEND.map((entry) => {
                const count = sectionQuestions.filter(
                  (item) => (statuses[item.questionId] || 'not-visited') === entry.status,
                ).length
                return (
                  <div key={entry.status} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className={`palette-btn ${STATUS_CLASS[entry.status]} h-4 w-4 rounded-[4px]`} aria-hidden="true" />
                      <span className="text-[10.5px] text-muted">{entry.label}</span>
                    </span>
                    <span className="text-[10.5px] font-medium tabular text-ink">{count}</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 rounded-[10px] border border-[var(--line)] bg-white p-2.5">
              <p className="label-xs">Paper summary</p>
              <dl className="mt-1.5 space-y-1 text-[10.5px]">
                <div className="flex justify-between"><dt className="text-muted">Answered</dt><dd className="font-medium tabular text-ink">{counts.answered}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Not answered</dt><dd className="font-medium tabular text-ink">{counts.unanswered}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Not visited</dt><dd className="font-medium tabular text-ink">{counts.notVisited}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Marked</dt><dd className="font-medium tabular text-ink">{counts.marked}</dd></div>
              </dl>
            </div>
          </div>
        </aside>
      </div>

      {/* palette (mobile sheet) */}
      {paletteOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[rgba(20,22,24,0.4)] lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="max-h-[70vh] w-full overflow-hidden rounded-t-[20px] bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
              <div>
                <p className="text-[12.5px] font-medium text-ink">Question palette</p>
                <p className="text-[10px] text-soft">{currentEntry?.sectionName}</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setPaletteOpen(false)} aria-label="Close palette">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="thin-scroll max-h-[52vh] overflow-y-auto p-3">
              <div className="grid grid-cols-6 gap-2">
                {sectionQuestions.map((entry) => {
                  const number = questions.findIndex((item) => item.questionId === entry.questionId) + 1
                  const status = statuses[entry.questionId] || 'not-visited'
                  return (
                    <button
                      key={entry.questionId}
                      type="button"
                      onClick={() => goTo(entry.questionId)}
                      className={`palette-btn h-9 w-full ${STATUS_CLASS[status]} ${currentId === entry.questionId ? 'palette-current' : ''}`}
                    >
                      {number}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-[var(--line)] pt-2.5">
                {LEGEND.map((entry) => (
                  <span key={entry.status} className="flex items-center gap-1.5 text-[10.5px] text-muted">
                    <span className={`palette-btn ${STATUS_CLASS[entry.status]} h-3.5 w-3.5 rounded-[3px]`} aria-hidden="true" />
                    {entry.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-t border-[var(--line)] p-3">
              <Button variant="primary" fullWidth onClick={() => setPaletteOpen(false)}>
                Back to question
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={instructionsOpen}
        onClose={() => setInstructionsOpen(false)}
        title="Examination instructions"
        description="Reference panel — the timer keeps running."
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setInstructionsOpen(false)}>
              Return to the paper
            </Button>
          </div>
        }
      >
        <ol className="space-y-2">
          {(exam.instructions || []).map((instruction, index) => (
            <li key={instruction} className="flex gap-2 text-[12px] leading-relaxed text-ink-80">
              <span className="shrink-0 font-medium text-soft">{index + 1}.</span>
              {instruction}
            </li>
          ))}
        </ol>
        <div className="mt-4 rounded-[10px] bg-[var(--surface-sunken)] p-3">
          <p className="text-[11px] leading-relaxed text-muted">
            Marking scheme: +{currentQuestion?.marks ?? 4} for a correct answer,{' '}
            {exam.negativeMarking ? `−${currentQuestion?.negativeMarks ?? 1} for an incorrect answer, ` : ''}
            0 for an unattempted question. Numerical answers carry no negative marking.
          </p>
        </div>
      </Modal>

      {remaining <= 300 ? (
        <span className="sr-only" role="status" aria-live="polite">
          Less than five minutes remaining
        </span>
      ) : null}
    </div>
  )
}
