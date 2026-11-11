/* Attempt service — owns the examination lifecycle: start, save, navigate,
   submit and restore. The saved attempt is the only source of truth for every
   result and analysis screen. */

import { request, assert, nowIso, createId } from './api.js'
import { insert, loadStore, readAll, updateRecord, writeSingleton } from '../data/mock/mock-storage.js'
import { findUser, addAuditEvent, notifyMany, getPolicies } from './repository.js'
import { flattenExamQuestions } from '../data/mock/exams.mock.js'
import { evaluateAttempt } from '../lib/exam-calculations.js'

function findAttemptFor(examId, studentId) {
  return readAll('attempts').find((attempt) => attempt.examId === examId && attempt.studentId === studentId) || null
}

function buildEmptyResponses(exam) {
  return flattenExamQuestions(exam).map((entry) => ({
    questionId: entry.questionId,
    sectionId: entry.sectionId,
    answer: null,
    status: 'not-visited',
    answeredAt: null,
    timeSpentSeconds: 0,
    changeCount: 0,
  }))
}

function remainingSecondsFor(attempt) {
  if (attempt.status !== 'in-progress') return 0
  const deadline = new Date(attempt.deadlineAt || attempt.startedAt).getTime()
  return Math.max(0, Math.round((deadline - Date.now()) / 1000))
}

function decorateAttempt(attempt) {
  if (!attempt) return null
  return {
    ...attempt,
    remainingTime: remainingSecondsFor(attempt),
  }
}

export const attemptService = {
  async getAttemptForExam(examId, studentId) {
    return request(() => decorateAttempt(findAttemptFor(examId, studentId)), { latency: 80 })
  },

  async startExam(examId, studentId) {
    return request(
      () => {
        const store = loadStore()
        const exam = store.exams.find((item) => item.id === examId)
        assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
        const student = store.users.find((item) => item.id === studentId)
        assert(student?.role === 'student', 'Only enrolled students can attempt this examination.', {
          code: 'forbidden',
          status: 403,
        })
        assert(['published', 'completed'].includes(exam.status), 'This examination is not open for attempts.', {
          code: 'not-open',
          status: 409,
        })

        /* An existing attempt is reported before the window check: a student who
           already submitted must be sent to their result, not told the window
           closed (which used to surface as a confusing error on the paper they
           had just finished). */
        const existing = findAttemptFor(examId, studentId)
        if (existing) {
          if (existing.status === 'in-progress') {
            return { attempt: decorateAttempt(existing), resumed: true, alreadySubmitted: false }
          }
          return { attempt: decorateAttempt(existing), resumed: false, alreadySubmitted: true }
        }

        const now = Date.now()
        const windowEnd = new Date(exam.endAt).getTime()
        assert(now <= windowEnd, 'The examination window has closed.', { code: 'window-closed', status: 409 })

        const durationMs = exam.durationMinutes * 60000
        const deadline = Math.min(now + durationMs, windowEnd)

        const attempt = {
          id: createId('attempt'),
          examId,
          studentId,
          startedAt: new Date(now).toISOString(),
          deadlineAt: new Date(deadline).toISOString(),
          submittedAt: null,
          status: 'in-progress',
          remainingTime: Math.round((deadline - now) / 1000),
          currentQuestionId: flattenExamQuestions(exam)[0]?.questionId ?? null,
          currentSectionId: exam.sections?.[0]?.id ?? null,
          responses: buildEmptyResponses(exam),
          questionVisitHistory: [],
          questionTimeSpent: {},
          markedForReview: [],
          answerChangeHistory: [],
          totalTimeSpent: 0,
          integrityEvents: [],
          lastActivityAt: new Date(now).toISOString(),
          submittedReason: null,
        }
        insert('attempts', attempt)

        const integrity = store.integrity || []
        if (now - new Date(exam.startAt).getTime() > (getPolicies()?.examination?.accessWindowMinutes ?? 15) * 60000) {
          writeSingleton('integrity', [
            ...integrity,
            {
              id: createId('int_evt'),
              attemptId: attempt.id,
              examId,
              studentId,
              type: 'late-join',
              severity: 'info',
              label: 'Attempt opened after the access window',
              detail: 'The attempt was opened later than the policy access window and is flagged for review.',
              at: nowIso(),
              resolved: false,
              resolution: null,
              resolvedBy: null,
              resolvedAt: null,
            },
          ])
        }

        return { attempt: decorateAttempt(attempt), resumed: false, alreadySubmitted: false }
      },
      { label: 'examination start', latency: 340 },
    )
  },

  async getAttempt(attemptId) {
    return request(() => {
      const attempt = readAll('attempts').find((item) => item.id === attemptId)
      assert(attempt, 'That attempt does not exist.', { code: 'not-found', status: 404 })
      return decorateAttempt(attempt)
    }, { latency: 120 })
  },

  /** Records a response. `answer` is an array of option ids, a number, or null. */
  async saveResponse(attemptId, questionId, answer, { timeSpentSeconds, status } = {}) {
    return request(
      () => {
        const attempt = readAll('attempts').find((item) => item.id === attemptId)
        assert(attempt, 'That attempt does not exist.', { code: 'not-found', status: 404 })
        assert(attempt.status === 'in-progress', 'This attempt is already submitted.', { code: 'submitted', status: 409 })

        const previous = attempt.responses.find((response) => response.questionId === questionId)
        const previousAnswer = previous?.answer ?? null
        const changed = JSON.stringify(previousAnswer) !== JSON.stringify(answer)

        const responses = attempt.responses.map((response) => {
          if (response.questionId !== questionId) return response
          const answered = answer !== null && answer !== undefined && (!Array.isArray(answer) || answer.length > 0)
          const nextStatus =
            status ??
            (answered
              ? attempt.markedForReview.includes(questionId)
                ? 'answered-marked'
                : 'answered'
              : attempt.markedForReview.includes(questionId)
                ? 'marked'
                : 'not-answered')
          return {
            ...response,
            answer,
            status: nextStatus,
            answeredAt: answered ? nowIso() : null,
            timeSpentSeconds: timeSpentSeconds ?? response.timeSpentSeconds,
            changeCount: response.changeCount + (changed ? 1 : 0),
          }
        })

        const answerChangeHistory = changed
          ? [
              ...attempt.answerChangeHistory,
              {
                questionId,
                from: previousAnswer,
                to: answer,
                at: nowIso(),
                reason: 'response updated in the examination interface',
              },
            ]
          : attempt.answerChangeHistory

        updateRecord('attempts', attemptId, {
          responses,
          answerChangeHistory,
          lastActivityAt: nowIso(),
          currentQuestionId: questionId,
        })
        return { ok: true, changed }
      },
      { latency: 60 },
    )
  },

  async markForReview(attemptId, questionId, marked) {
    return request(() => {
      const attempt = readAll('attempts').find((item) => item.id === attemptId)
      assert(attempt, 'That attempt does not exist.', { code: 'not-found', status: 404 })
      assert(attempt.status === 'in-progress', 'This attempt is already submitted.', { code: 'submitted', status: 409 })

      const markedForReview = marked
        ? [...new Set([...attempt.markedForReview, questionId])]
        : attempt.markedForReview.filter((id) => id !== questionId)

      const responses = attempt.responses.map((response) => {
        if (response.questionId !== questionId) return response
        const answered = response.answer !== null && response.answer !== undefined && (!Array.isArray(response.answer) || response.answer.length > 0)
        return {
          ...response,
          status: answered ? (marked ? 'answered-marked' : 'answered') : marked ? 'marked' : 'not-answered',
        }
      })
      updateRecord('attempts', attemptId, { markedForReview, responses, lastActivityAt: nowIso() })
      return { ok: true, markedForReview }
    }, { latency: 60 })
  },

  async clearResponse(attemptId, questionId) {
    return this.saveResponse(attemptId, questionId, null)
  },

  async recordVisit(attemptId, questionId, sectionId) {
    return request(() => {
      const attempt = readAll('attempts').find((item) => item.id === attemptId)
      if (!attempt || attempt.status !== 'in-progress') return { ok: false }
      const visited = attempt.questionVisitHistory.some((entry) => entry.questionId === questionId)
      const responses = attempt.responses.map((response) => {
        if (response.questionId !== questionId) return response
        if (response.status === 'not-visited') {
          const answered = response.answer !== null && response.answer !== undefined
          return { ...response, status: answered ? 'answered' : 'not-answered' }
        }
        return response
      })
      const questionVisitHistory = visited
        ? attempt.questionVisitHistory
        : [...attempt.questionVisitHistory, { questionId, visitedAt: nowIso() }]
      updateRecord('attempts', attemptId, {
        responses,
        questionVisitHistory,
        currentQuestionId: questionId,
        currentSectionId: sectionId ?? attempt.currentSectionId,
        lastActivityAt: nowIso(),
      })
      return { ok: true }
    }, { latency: 40 })
  },

  async recordTime(attemptId, questionId, seconds) {
    return request(() => {
      const attempt = readAll('attempts').find((item) => item.id === attemptId)
      if (!attempt || attempt.status !== 'in-progress') return { ok: false }
      const safeSeconds = Math.max(0, Math.min(Math.round(seconds), 3600))
      const existing = attempt.questionTimeSpent[questionId] || 0
      const responses = attempt.responses.map((response) =>
        response.questionId === questionId ? { ...response, timeSpentSeconds: existing + safeSeconds } : response,
      )
      updateRecord('attempts', attemptId, {
        questionTimeSpent: { ...attempt.questionTimeSpent, [questionId]: existing + safeSeconds },
        responses,
        totalTimeSpent: attempt.totalTimeSpent + safeSeconds,
        lastActivityAt: nowIso(),
      })
      return { ok: true }
    }, { latency: 40 })
  },

  async logIntegrityEvent(attemptId, event) {
    return request(() => {
      const store = loadStore()
      const attempt = store.attempts.find((item) => item.id === attemptId)
      assert(attempt, 'That attempt does not exist.', { code: 'not-found', status: 404 })
      const record = {
        id: createId('int_evt'),
        attemptId,
        examId: attempt.examId,
        studentId: attempt.studentId,
        type: event.type,
        severity: event.severity || 'info',
        label: event.label,
        detail: event.detail || '',
        at: nowIso(),
        resolved: false,
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
      }
      writeSingleton('integrity', [...(store.integrity || []), record])
      return record
    }, { latency: 40 })
  },

  async submitAttempt(attemptId, { reason = 'manual', auto = false, actor = null } = {}) {
    return request(
      () => {
        const store = loadStore()
        const attempt = store.attempts.find((item) => item.id === attemptId)
        assert(attempt, 'That attempt does not exist.', { code: 'not-found', status: 404 })
        assert(attempt.status === 'in-progress', 'This attempt was already submitted. A second submission is not possible.', {
          code: 'already-submitted',
          status: 409,
        })
        const exam = store.exams.find((item) => item.id === attempt.examId)
        assert(exam, 'The examination for this attempt no longer exists.', { code: 'not-found', status: 404 })

        const submittedAt = nowIso()
        const deadline = new Date(attempt.deadlineAt || attempt.startedAt).getTime()
        const isExpired = Date.now() >= deadline
        const status = auto || isExpired ? 'expired' : 'submitted'

        updateRecord('attempts', attemptId, {
          status,
          submittedAt,
          remainingTime: Math.max(0, Math.round((deadline - Date.now()) / 1000)),
          submittedReason: reason,
          lastActivityAt: submittedAt,
        })

        const evaluation = evaluateAttempt(exam, {
          ...attempt,
          status,
          submittedAt,
        })

        const facultyId = exam.createdBy
        notifyMany([facultyId], {
          type: 'exam-submitted',
          title: `Attempt submitted: ${exam.title}`,
          body: `${findUser(attempt.studentId)?.name || 'A student'} scored ${evaluation.totals.awardedMarks}/${evaluation.totals.maxMarks}.`,
          link: `/faculty/exams/${exam.id}`,
          entityId: exam.id,
        })
        notifyMany([attempt.studentId], {
          type: 'result-published',
          title: `Result available: ${exam.title}`,
          body: `${evaluation.totals.awardedMarks} of ${evaluation.totals.maxMarks} marks · ${evaluation.totals.percentage}%`,
          link: `/student/exams/${exam.id}/result`,
          entityId: exam.id,
        })

        addAuditEvent({
          actor: actor || { id: attempt.studentId, role: 'student', name: findUser(attempt.studentId)?.name },
          action: auto ? 'attempt.auto-submitted' : 'attempt.submitted',
          actionLabel: auto ? 'Attempt auto-submitted' : 'Attempt submitted',
          entityType: 'attempt',
          entityId: attemptId,
          entityLabel: `${findUser(attempt.studentId)?.name || attempt.studentId} · ${exam.title}`,
          previousValue: 'in-progress',
          newValue: status,
          reason: reason || (auto ? 'Timer expired' : 'Submitted by the candidate'),
        })

        return { attempt: decorateAttempt(loadStore().attempts.find((item) => item.id === attemptId)), evaluation }
      },
      { label: 'submission', latency: 420 },
    )
  },

  async getAttemptForResult(attemptId) {
    return request(() => {
      const store = loadStore()
      const attempt = store.attempts.find((item) => item.id === attemptId)
      assert(attempt, 'That attempt does not exist.', { code: 'not-found', status: 404 })
      const exam = store.exams.find((item) => item.id === attempt.examId)
      assert(exam, 'The examination for this attempt no longer exists.', { code: 'not-found', status: 404 })
      return { attempt: decorateAttempt(attempt), exam }
    }, { latency: 140 })
  },

  async listAttemptsForExam(examId) {
    return request(() => readAll('attempts').filter((attempt) => attempt.examId === examId).map(decorateAttempt))
  },

  async listAttemptsForStudent(studentId) {
    return request(() => readAll('attempts').filter((attempt) => attempt.studentId === studentId).map(decorateAttempt))
  },

  /** Used by admin integrity controls: force-submit an in-progress attempt. */
  async forceSubmit(attemptId, reason, actor) {
    return this.submitAttempt(attemptId, { reason: reason || 'Force-submitted by the administrator', actor })
  },
}
