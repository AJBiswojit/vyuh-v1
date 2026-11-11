/* Examination service — creation, scheduling, publication and eligibility.
   All three workspaces read examinations through this service. */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord } from '../data/mock/mock-storage.js'
import {
  findExam,
  findUser,
  findSubject,
  addAuditEvent,
  notifyMany,
  publicUser,
  getPolicies,
} from './repository.js'
import { QUESTION_BY_ID } from '../data/mock/questions.mock.js'

const EDITABLE_STATUSES = ['draft', 'scheduled', 'published']

function examQuestionCount(exam) {
  return (exam.sections || []).reduce((total, section) => total + (section.questionIds?.length || 0), 0)
}

function examMarks(exam) {
  return (exam.sections || []).reduce(
    (total, section) =>
      total + (section.questionIds || []).reduce((sum, questionId) => sum + (QUESTION_BY_ID[questionId]?.marks ?? 4), 0),
    0,
  )
}

export function decorateExam(exam) {
  if (!exam) return null
  const totalQuestions = examQuestionCount(exam)
  const totalMarks = examMarks(exam)
  const creator = findUser(exam.createdBy)
  const batches = (exam.batchIds || []).map((batchId) => loadStore().batches.find((batch) => batch.id === batchId)).filter(Boolean)
  return {
    ...exam,
    totalQuestions,
    totalMarks,
    creator: publicUser(creator),
    batches,
    subject: exam.subjectId ? findSubject(exam.subjectId) : null,
    sectionSummary: (exam.sections || []).map((section) => ({
      id: section.id,
      name: section.name,
      subjectId: section.subjectId,
      subjectName: findSubject(section.subjectId)?.name,
      questionCount: section.questionIds?.length || 0,
      marks: (section.questionIds || []).reduce((sum, id) => sum + (QUESTION_BY_ID[id]?.marks ?? 4), 0),
    })),
  }
}

function studentBatchIds(studentId) {
  const store = loadStore()
  const profile = store.students.find((item) => item.id === studentId)
  const user = store.users.find((item) => item.id === studentId)
  const ids = new Set()
  if (profile?.batchId) ids.add(profile.batchId)
  ;(user?.batchIds || []).forEach((id) => ids.add(id))
  return [...ids]
}

function examWindowState(exam) {
  const now = Date.now()
  const start = new Date(exam.startAt).getTime()
  const end = new Date(exam.endAt).getTime()
  if (exam.status === 'cancelled') return 'cancelled'
  if (exam.status === 'draft') return 'draft'
  if (exam.status === 'completed') return 'completed'
  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'live-window'
  return 'window-closed'
}

export const examService = {
  async listExams({ status, batchId, subjectId, createdBy, search } = {}) {
    return request(() => {
      let exams = readAll('exams')
      if (status && status !== 'all') exams = exams.filter((exam) => exam.status === status)
      if (batchId && batchId !== 'all') exams = exams.filter((exam) => (exam.batchIds || []).includes(batchId))
      if (subjectId && subjectId !== 'all') exams = exams.filter((exam) => exam.subjectId === subjectId)
      if (createdBy) exams = exams.filter((exam) => exam.createdBy === createdBy)
      if (search) {
        const needle = String(search).toLowerCase()
        exams = exams.filter((exam) => exam.title.toLowerCase().includes(needle))
      }
      return sortBy(exams, (exam) => exam.startAt, 'desc').map(decorateExam)
    })
  },

  async getExam(examId) {
    return request(() => {
      const exam = findExam(examId)
      assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
      return decorateExam(exam)
    })
  },

  /** Student-visible examinations, restricted to the student's batches. */
  async getStudentExams(studentId) {
    return request(() => {
      const batchIds = studentBatchIds(studentId)
      const student = findUser(studentId)
      assert(student, 'Student not found.', { code: 'not-found', status: 404 })
      const exams = readAll('exams')
        .filter((exam) => (exam.batchIds || []).some((id) => batchIds.includes(id)))
        .filter((exam) => ['published', 'completed', 'cancelled'].includes(exam.status))

      const attempts = readAll('attempts').filter((attempt) => attempt.studentId === studentId)

      const decorated = exams.map((exam) => {
        const attempt = attempts.find((item) => item.examId === exam.id)
        return {
          ...decorateExam(exam),
          windowState: examWindowState(exam),
          attempt: attempt
            ? {
                id: attempt.id,
                status: attempt.status,
                submittedAt: attempt.submittedAt,
                startedAt: attempt.startedAt,
              }
            : null,
        }
      })

      return {
        upcoming: decorated.filter((exam) => ['upcoming', 'live-window'].includes(exam.windowState) && !exam.attempt),
        inProgress: decorated.filter((exam) => exam.attempt?.status === 'in-progress'),
        completed: decorated.filter((exam) => exam.attempt && exam.attempt.status !== 'in-progress'),
        missed: decorated.filter(
          (exam) => exam.windowState === 'window-closed' && !exam.attempt,
        ),
        cancelled: decorated.filter((exam) => exam.windowState === 'cancelled'),
      }
    })
  },

  /** Validates that the student may open this examination and returns it with
   *  the full question set for the instruction page. */
  async getExamForStudent(examId, studentId) {
    return request(() => {
      const store = loadStore()
      const exam = store.exams.find((item) => item.id === examId)
      assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
      const student = store.users.find((item) => item.id === studentId)
      assert(student && student.role === 'student', 'Only enrolled students can open this examination.', {
        code: 'forbidden',
        status: 403,
      })
      const batchIds = studentBatchIds(studentId)
      const inBatch = (exam.batchIds || []).some((id) => batchIds.includes(id))
      assert(inBatch, 'This examination is not assigned to your batch.', { code: 'forbidden', status: 403 })
      assert(exam.status !== 'draft', 'This examination has not been published yet.', { code: 'not-published', status: 409 })

      const policy = getPolicies()?.examination
      const windowState = examWindowState(exam)
      const lateJoinMinutes = policy?.accessWindowMinutes ?? 15
      const minutesSinceStart = (Date.now() - new Date(exam.startAt).getTime()) / 60000
      const lateJoinAllowed = exam.allowLateJoin && minutesSinceStart <= lateJoinMinutes

      let canStart = false
      let blockedReason = null
      if (exam.status === 'cancelled') blockedReason = 'This examination was cancelled by the faculty.'
      else if (windowState === 'upcoming') blockedReason = 'The examination window has not opened yet.'
      else if (windowState === 'completed') blockedReason = 'This examination has ended.'
      else if (windowState === 'window-closed') blockedReason = 'The examination window has closed.'
      else if (!exam.allowLateJoin && minutesSinceStart > lateJoinMinutes) {
        blockedReason = 'Late joining is disabled for this examination.'
      } else {
        canStart = true
      }

      const attempt = store.attempts.find((item) => item.examId === examId && item.studentId === studentId)

      return {
        exam: decorateExam(exam),
        canStart,
        blockedReason,
        lateJoinAllowed,
        attempt: attempt ? { id: attempt.id, status: attempt.status } : null,
        policy: {
          requireAcknowledgement: policy?.requireInstructionsAcknowledged ?? true,
          negativeMarkingEnabled: policy?.negativeMarkingEnabled ?? true,
        },
        marksScheme: {
          defaultQuestionMarks: policy?.defaultQuestionMarks ?? 4,
          defaultNegativeMarkValue: policy?.defaultNegativeMarkValue ?? 1,
        },
        candidate: publicUser(student),
      }
    })
  },

  async getQuestionsByIds(questionIds) {
    return request(() => questionIds.map((id) => QUESTION_BY_ID[id]).filter(Boolean), { latency: 80 })
  },

  async createExam(payload, actor) {
    return request(
      () => {
        const store = loadStore()
        const policy = getPolicies()?.examination
        const {
          title,
          description,
          type,
          subjectId,
          batchIds = [],
          startAt,
          endAt,
          durationMinutes,
          sections = [],
          negativeMarking,
          shuffleQuestions,
          shuffleOptions,
          resultVisibility,
          allowLateJoin,
          instructions = [],
          status = 'draft',
        } = payload

        assert(String(title || '').trim().length >= 5, 'Give the examination a clear title (at least 5 characters).', { code: 'validation' })
        assert(['Unit Test', 'Chapter Test', 'Full Mock', 'Practice Sheet'].includes(type), 'Choose a valid examination type.', { code: 'validation' })
        assert(batchIds.length > 0, 'Select at least one target batch.', { code: 'validation' })
        assert(startAt && endAt, 'Set both a start and an end time.', { code: 'validation' })
        assert(new Date(endAt) > new Date(startAt), 'The end time must be after the start time.', { code: 'validation' })
        assert(Number(durationMinutes) > 0, 'Duration must be greater than zero.', { code: 'validation' })
        assert(Number(durationMinutes) <= 300, 'Duration cannot exceed 300 minutes.', { code: 'validation' })

        const windowMinutes = (new Date(endAt) - new Date(startAt)) / 60000
        assert(
          windowMinutes >= Number(durationMinutes),
          'The examination window must be at least as long as the duration.',
          { code: 'validation' },
        )

        const nonEmptySections = sections.filter((section) => (section.questionIds || []).length > 0)
        assert(nonEmptySections.length > 0, 'Add at least one question to the examination.', { code: 'validation' })

        const allQuestionIds = nonEmptySections.flatMap((section) => section.questionIds)
        const duplicates = allQuestionIds.filter((id, index) => allQuestionIds.indexOf(id) !== index)
        assert(duplicates.length === 0, 'A question appears more than once. Each question can be used only once per paper.', {
          code: 'validation',
        })

        const id = createId('exam')
        const resolvedStatus = status === 'published' ? 'published' : status === 'scheduled' ? 'scheduled' : 'draft'
        const requiresApproval = policy?.requireAdminApprovalToPublish && resolvedStatus === 'published'

        const exam = {
          id,
          title: String(title).trim(),
          description: description || '',
          type,
          subjectId: subjectId || null,
          subjectIds: [...new Set(nonEmptySections.map((section) => section.subjectId))],
          batchIds,
          createdBy: actor?.id ?? 'fac_001',
          durationMinutes: Number(durationMinutes),
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          status: requiresApproval ? 'pending-approval' : resolvedStatus,
          negativeMarking: negativeMarking ?? policy?.negativeMarkingEnabled ?? true,
          shuffleQuestions: shuffleQuestions ?? false,
          shuffleOptions: shuffleOptions ?? false,
          resultVisibility: resultVisibility ?? policy?.resultVisibility ?? 'immediate',
          allowLateJoin: allowLateJoin ?? false,
          sections: nonEmptySections.map((section, index) => ({
            id: section.id || `sec_${id}_${index + 1}`,
            name: section.name || `Section ${index + 1}`,
            subjectId: section.subjectId || subjectId || 'sub_phy',
            instructions: section.instructions || '',
            questionIds: [...section.questionIds],
          })),
          instructions: instructions.length ? instructions : undefined,
          publishedAt: resolvedStatus === 'published' && !requiresApproval ? nowIso() : null,
          createdAt: nowIso(),
          approvalId: null,
        }
        if (!exam.instructions) exam.instructions = EXAM_INSTRUCTIONS

        insert('exams', exam)

        const impactedStudents = store.batches
          .filter((batch) => batchIds.includes(batch.id))
          .flatMap((batch) => batch.studentIds)

        if (resolvedStatus === 'published' && !requiresApproval) {
          notifyMany(impactedStudents, {
            type: 'exam-published',
            title: `New examination: ${exam.title}`,
            body: `Scheduled for ${new Date(exam.startAt).toUTCString()} · ${exam.durationMinutes} minutes.`,
            link: `/student/exams/${exam.id}/instructions`,
            entityId: exam.id,
          })
        }

        if (requiresApproval) {
          insert('approvals', {
            id: createId('approval'),
            type: 'exam-publish',
            title: `Publish ${exam.title}`,
            summary: `${actor?.name || 'Faculty'} submitted a new ${type.toLowerCase()} for approval.`,
            entityType: 'exam',
            entityId: exam.id,
            requestedBy: actor?.id ?? 'fac_001',
            requestedAt: nowIso(),
            status: 'pending',
            priority: 'normal',
            details: [
              { label: 'Batches', value: batchIds.join(', ') },
              { label: 'Questions', value: String(allQuestionIds.length) },
              { label: 'Duration', value: `${durationMinutes} minutes` },
            ],
            reviewedBy: null,
            reviewedAt: null,
            reason: null,
          })
          const admins = store.users.filter((user) => user.role === 'admin').map((user) => user.id)
          notifyMany(admins, {
            type: 'approval-pending',
            title: 'Examination publication needs approval',
            body: exam.title,
            link: '/admin/approvals',
            entityId: exam.id,
          })
        }

        addAuditEvent({
          actor,
          action: resolvedStatus === 'published' ? 'exam.published' : 'exam.created',
          actionLabel: resolvedStatus === 'published' ? 'Examination published' : 'Examination created',
          entityType: 'exam',
          entityId: exam.id,
          entityLabel: exam.title,
          previousValue: null,
          newValue: resolvedStatus,
          reason: resolvedStatus === 'draft' ? 'Saved as a draft' : 'Scheduled for publication',
        })

        return decorateExam(exam)
      },
      { label: 'examination creation', latency: 380 },
    )
  },

  async updateExam(examId, payload, actor) {
    return request(() => {
      const store = loadStore()
      const exam = store.exams.find((item) => item.id === examId)
      assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
      assert(EDITABLE_STATUSES.includes(exam.status), 'Published examinations with attempts cannot be structurally edited. Duplicate the paper instead.', {
        code: 'locked',
        status: 409,
      })
      const attempts = store.attempts.filter((attempt) => attempt.examId === examId && attempt.status !== 'in-progress')
      assert(
        attempts.length === 0 || exam.status === 'draft',
        'Students have already attempted part of this paper. Create a new examination instead of editing it.',
        { code: 'locked', status: 409 },
      )

      if (payload.startAt && payload.endAt) {
        assert(new Date(payload.endAt) > new Date(payload.startAt), 'The end time must be after the start time.', {
          code: 'validation',
        })
      }
      if (payload.sections) {
        const nonEmpty = payload.sections.filter((section) => (section.questionIds || []).length > 0)
        assert(nonEmpty.length > 0, 'The examination needs at least one question.', { code: 'validation' })
        const ids = nonEmpty.flatMap((section) => section.questionIds)
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
        assert(duplicates.length === 0, 'A question appears more than once in the paper.', { code: 'validation' })
      }

      const previous = { title: exam.title, status: exam.status, startAt: exam.startAt, durationMinutes: exam.durationMinutes }
      updateRecord('exams', examId, {
        ...payload,
        startAt: payload.startAt ? new Date(payload.startAt).toISOString() : exam.startAt,
        endAt: payload.endAt ? new Date(payload.endAt).toISOString() : exam.endAt,
        updatedAt: nowIso(),
      })
      addAuditEvent({
        actor,
        action: 'exam.modified',
        actionLabel: 'Examination modified',
        entityType: 'exam',
        entityId: examId,
        entityLabel: exam.title,
        previousValue: JSON.stringify(previous),
        newValue: JSON.stringify({
          title: payload.title ?? exam.title,
          status: payload.status ?? exam.status,
          startAt: payload.startAt ?? exam.startAt,
          durationMinutes: payload.durationMinutes ?? exam.durationMinutes,
        }),
        reason: payload.reason || 'Faculty update',
      })
      return decorateExam(loadStore().exams.find((item) => item.id === examId))
    })
  },

  async publishExam(examId, actor) {
    return request(() => {
      const store = loadStore()
      const exam = store.exams.find((item) => item.id === examId)
      assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
      assert(['draft', 'scheduled', 'pending-approval'].includes(exam.status), 'This examination is already published.', {
        code: 'conflict',
        status: 409,
      })
      const policy = getPolicies()?.examination
      const needsApproval = policy?.requireAdminApprovalToPublish && actor?.role === 'faculty'

      if (needsApproval) {
        assert(exam.approvalId || true, '', { code: 'validation' })
        updateRecord('exams', examId, { status: 'pending-approval' })
        insert('approvals', {
          id: createId('approval'),
          type: 'exam-publish',
          title: `Publish ${exam.title}`,
          summary: 'Publication requested by faculty and pending administrator review.',
          entityType: 'exam',
          entityId: exam.id,
          requestedBy: actor?.id,
          requestedAt: nowIso(),
          status: 'pending',
          priority: 'normal',
          details: [{ label: 'Window', value: `${new Date(exam.startAt).toISOString()} – ${new Date(exam.endAt).toISOString()}` }],
          reviewedBy: null,
          reviewedAt: null,
          reason: null,
        })
      } else {
        updateRecord('exams', examId, { status: 'published', publishedAt: nowIso() })
        const studentIds = store.batches
          .filter((batch) => (exam.batchIds || []).includes(batch.id))
          .flatMap((batch) => batch.studentIds)
        notifyMany(studentIds, {
          type: 'exam-published',
          title: `New examination: ${exam.title}`,
          body: `Starts ${new Date(exam.startAt).toISOString()} · ${exam.durationMinutes} minutes · review the instructions before starting.`,
          link: `/student/exams/${exam.id}/instructions`,
          entityId: exam.id,
        })
      }

      addAuditEvent({
        actor,
        action: 'exam.published',
        actionLabel: needsApproval ? 'Examination submitted for approval' : 'Examination published',
        entityType: 'exam',
        entityId: examId,
        entityLabel: exam.title,
        previousValue: exam.status,
        newValue: needsApproval ? 'pending-approval' : 'published',
        reason: needsApproval ? 'Institute policy requires administrator approval' : 'Faculty publication',
      })
      return decorateExam(loadStore().exams.find((item) => item.id === examId))
    })
  },

  async cancelExam(examId, reason, actor) {
    return request(() => {
      const exam = findExam(examId)
      assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
      assert(!['completed', 'cancelled'].includes(exam.status), 'This examination can no longer be cancelled.', {
        code: 'conflict',
        status: 409,
      })
      assert(String(reason || '').trim().length >= 10, 'Give a reason for cancellation (at least 10 characters).', {
        code: 'validation',
      })
      updateRecord('exams', examId, { status: 'cancelled', cancelledAt: nowIso(), cancellationReason: reason })
      const store = loadStore()
      const studentIds = store.batches
        .filter((batch) => (exam.batchIds || []).includes(batch.id))
        .flatMap((batch) => batch.studentIds)
      notifyMany(studentIds, {
        type: 'exam-cancelled',
        title: `Examination cancelled: ${exam.title}`,
        body: reason,
        link: '/student/exams',
        entityId: exam.id,
      })
      addAuditEvent({
        actor,
        action: 'exam.cancelled',
        actionLabel: 'Examination cancelled',
        entityType: 'exam',
        entityId: examId,
        entityLabel: exam.title,
        previousValue: exam.status,
        newValue: 'cancelled',
        reason,
      })
      return decorateExam(loadStore().exams.find((item) => item.id === examId))
    })
  },

  async endExam(examId, reason, actor) {
    return request(() => {
      const exam = findExam(examId)
      assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
      updateRecord('exams', examId, { status: 'completed', endedAt: nowIso(), endedReason: reason || 'Ended manually' })
      addAuditEvent({
        actor,
        action: 'exam.ended',
        actionLabel: 'Examination ended',
        entityType: 'exam',
        entityId: examId,
        entityLabel: exam.title,
        previousValue: exam.status,
        newValue: 'completed',
        reason: reason || 'Ended manually from the console',
      })
      return decorateExam(loadStore().exams.find((item) => item.id === examId))
    })
  },

  /** Question pool for the exam builder, filtered by subject. */
  async getQuestionPool({ subjectId, topicId, difficulty, search, createdBy } = {}) {
    return request(() => {
      let questions = readAll('questions')
      if (subjectId && subjectId !== 'all') questions = questions.filter((question) => question.subjectId === subjectId)
      if (topicId && topicId !== 'all') questions = questions.filter((question) => question.topicId === topicId)
      if (difficulty && difficulty !== 'all') questions = questions.filter((question) => question.difficulty === difficulty)
      if (createdBy) questions = questions.filter((question) => question.createdBy === createdBy)
      if (search) {
        const needle = String(search).toLowerCase()
        questions = questions.filter((question) => question.text.toLowerCase().includes(needle))
      }
      return questions
    })
  },

  async getFacultyExams(facultyId) {
    return request(() => {
      const exams = readAll('exams').filter((exam) => exam.createdBy === facultyId)
      return sortBy(exams, (exam) => exam.startAt, 'desc').map((exam) => ({
        ...decorateExam(exam),
        windowState: examWindowState(exam),
      }))
    })
  },
}

/* Default instruction template used when the faculty does not customise it. */
const EXAM_INSTRUCTIONS = [
        'The examination will start only after you acknowledge the declaration on the instructions page.',
        'The countdown timer is shown at the top of the screen and cannot be paused once the examination starts.',
        'Use Save & Next to record an answer and move on. Clear Response removes your current selection.',
        'Mark for Review flags a question for a later visit; it does not record an answer by itself.',
        'There is negative marking for incorrect answers on single-correct and multiple-correct questions.',
        'Numerical answers must be entered to the precision allowed by the question. Do not type units.',
        'The examination is auto-submitted when the timer reaches zero. Your last saved responses are final.',
  'Do not refresh or close the tab during the examination. Use the on-screen navigation instead.',
]

export { examWindowState, studentBatchIds }
