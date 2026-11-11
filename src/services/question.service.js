/* Question bank service. Questions are reusable: examinations reference IDs, so
   editing a question updates every paper that uses it (with a warning when a
   paper has already been attempted). */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord, removeRecord } from '../data/mock/mock-storage.js'
import { addAuditEvent } from './repository.js'
import { TOPIC_BY_ID, subjectName } from '../data/mock/subjects.mock.js'

const TYPES = ['single', 'multiple', 'numerical', 'numeric-with-sign']
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

export function decorateQuestion(question) {
  if (!question) return null
  const store = loadStore()
  const usedIn = store.exams.filter((exam) =>
    (exam.sections || []).some((section) => (section.questionIds || []).includes(question.id)),
  )
  return {
    ...question,
    subjectName: subjectName(question.subjectId),
    topicName: TOPIC_BY_ID[question.topicId]?.name || 'General',
    usedInExams: usedIn.map((exam) => ({ id: exam.id, title: exam.title, status: exam.status })),
    usageCount: usedIn.length,
    hasAttemptedUsage: usedIn.some((exam) =>
      store.attempts.some((attempt) => attempt.examId === exam.id && attempt.status !== 'in-progress'),
    ),
  }
}

function validateQuestionPayload(payload) {
  assert(String(payload.text || '').trim().length >= 15, 'The question text must be at least 15 characters.', {
    code: 'validation',
  })
  assert(payload.subjectId, 'Choose a subject.', { code: 'validation' })
  assert(payload.topicId, 'Choose a topic.', { code: 'validation' })
  assert(DIFFICULTIES.includes(payload.difficulty), 'Choose a difficulty level.', { code: 'validation' })
  assert(TYPES.includes(payload.type), 'Choose a question type.', { code: 'validation' })
  assert(Number(payload.marks) > 0, 'Marks must be greater than zero.', { code: 'validation' })

  if (payload.type === 'single' || payload.type === 'multiple') {
    const options = (payload.options || []).filter((option) => String(option.text || '').trim().length > 0)
    assert(options.length >= 2, 'Provide at least two answer options.', { code: 'validation' })
    const ids = options.map((option) => option.id)
    assert(new Set(ids).size === ids.length, 'Answer option identifiers must be unique.', { code: 'validation' })
    const correct = Array.isArray(payload.correctAnswer) ? payload.correctAnswer : []
    assert(correct.length >= 1, 'Mark the correct answer.', { code: 'validation' })
    if (payload.type === 'single') {
      assert(correct.length === 1, 'A single-correct question must have exactly one correct option.', { code: 'validation' })
    }
    correct.forEach((id) => {
      assert(ids.includes(id), 'A marked correct option no longer exists in the option list.', { code: 'validation' })
    })
  } else {
    assert(
      payload.correctAnswer !== '' && payload.correctAnswer !== null && payload.correctAnswer !== undefined,
      'Provide the expected numerical answer.',
      { code: 'validation' },
    )
    assert(!Number.isNaN(Number(payload.correctAnswer)), 'The numerical answer must be a number.', { code: 'validation' })
  }
  assert(String(payload.explanation || '').trim().length >= 20, 'Add an explanation of at least 20 characters — students read it in the analysis.', {
    code: 'validation',
  })
}

export const questionService = {
  async listQuestions({ subjectId, topicId, difficulty, type, search, createdBy, page = 1, pageSize = 50 } = {}) {
    return request(() => {
      let questions = readAll('questions')
      if (createdBy) questions = questions.filter((question) => question.createdBy === createdBy)
      if (subjectId && subjectId !== 'all') questions = questions.filter((question) => question.subjectId === subjectId)
      if (topicId && topicId !== 'all') questions = questions.filter((question) => question.topicId === topicId)
      if (difficulty && difficulty !== 'all') questions = questions.filter((question) => question.difficulty === difficulty)
      if (type && type !== 'all') questions = questions.filter((question) => question.type === type)
      if (search) {
        const needle = String(search).toLowerCase()
        questions = questions.filter(
          (question) =>
            question.text.toLowerCase().includes(needle) ||
            question.id.toLowerCase().includes(needle),
        )
      }
      const decorated = sortBy(questions, (question) => question.updatedAt || question.createdAt || '', 'desc').map(decorateQuestion)
      const total = decorated.length
      const start = (Math.max(1, page) - 1) * pageSize
      return {
        items: decorated.slice(start, start + pageSize),
        meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      }
    }, { latency: 240 })
  },

  async getQuestion(questionId) {
    return request(() => {
      const question = readAll('questions').find((item) => item.id === questionId)
      assert(question, 'That question does not exist.', { code: 'not-found', status: 404 })
      return decorateQuestion(question)
    }, { latency: 140 })
  },

  async createQuestion(payload, actor) {
    return request(() => {
      validateQuestionPayload(payload)
      const question = {
        id: createId('q'),
        subjectId: payload.subjectId,
        topicId: payload.topicId,
        difficulty: payload.difficulty,
        type: payload.type,
        marks: Number(payload.marks),
        negativeMarks: Number(payload.negativeMarks ?? 1),
        createdBy: actor?.id || 'fac_001',
        text: String(payload.text).trim(),
        options:
          payload.type === 'single' || payload.type === 'multiple'
            ? payload.options.filter((option) => String(option.text || '').trim().length > 0)
            : [],
        correctAnswer: payload.correctAnswer,
        tolerance: payload.type === 'single' || payload.type === 'multiple' ? undefined : Number(payload.tolerance ?? 0.01),
        unit: payload.unit || '',
        explanation: String(payload.explanation).trim(),
        solution: payload.solution?.length ? payload.solution : [String(payload.explanation).trim()],
        image: payload.image || null,
        status: payload.status === 'draft' ? 'draft' : 'active',
        version: 1,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      insert('questions', question)
      addAuditEvent({
        actor,
        action: 'question.created',
        actionLabel: 'Question created',
        entityType: 'question',
        entityId: question.id,
        entityLabel: question.text.slice(0, 60),
        previousValue: null,
        newValue: `${question.type} · ${question.difficulty}`,
        reason: 'Question bank addition',
      })
      return decorateQuestion(question)
    }, { latency: 320 })
  },

  async updateQuestion(questionId, payload, actor) {
    return request(() => {
      const store = loadStore()
      const question = store.questions.find((item) => item.id === questionId)
      assert(question, 'That question does not exist.', { code: 'not-found', status: 404 })
      validateQuestionPayload({ ...question, ...payload })

      const usedInGradedExam = store.exams.some(
        (exam) =>
          (exam.sections || []).some((section) => (section.questionIds || []).includes(questionId)) &&
          store.attempts.some((attempt) => attempt.examId === exam.id && attempt.status !== 'in-progress'),
      )
      assert(
        !usedInGradedExam || payload.forceEdit === true,
        'This question has already been graded in an examination. Editing it would change analysed results. Duplicate the question instead.',
        { code: 'locked', status: 409 },
      )

      updateRecord('questions', questionId, {
        ...payload,
        marks: payload.marks !== undefined ? Number(payload.marks) : question.marks,
        negativeMarks: payload.negativeMarks !== undefined ? Number(payload.negativeMarks) : question.negativeMarks,
        version: (question.version || 1) + 1,
        updatedAt: nowIso(),
      })
      addAuditEvent({
        actor,
        action: 'question.modified',
        actionLabel: 'Question modified',
        entityType: 'question',
        entityId: questionId,
        entityLabel: question.text.slice(0, 60),
        previousValue: question.text.slice(0, 80),
        newValue: (payload.text ?? question.text).slice(0, 80),
        reason: 'Question bank edit',
      })
      return decorateQuestion(loadStore().questions.find((item) => item.id === questionId))
    }, { latency: 320 })
  },

  async duplicateQuestion(questionId, actor) {
    return request(() => {
      const question = readAll('questions').find((item) => item.id === questionId)
      assert(question, 'That question does not exist.', { code: 'not-found', status: 404 })
      const copy = {
        ...question,
        id: createId('q'),
        text: `${question.text}`,
        status: 'draft',
        version: 1,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdBy: actor?.id || question.createdBy,
      }
      insert('questions', copy)
      return decorateQuestion(copy)
    }, { latency: 240 })
  },

  async archiveQuestion(questionId, actor) {
    return request(() => {
      const question = readAll('questions').find((item) => item.id === questionId)
      assert(question, 'That question does not exist.', { code: 'not-found', status: 404 })
      updateRecord('questions', questionId, { status: 'archived', updatedAt: nowIso() })
      addAuditEvent({
        actor,
        action: 'question.archived',
        actionLabel: 'Question archived',
        entityType: 'question',
        entityId: questionId,
        entityLabel: question.text.slice(0, 60),
        previousValue: question.status,
        newValue: 'archived',
        reason: 'Removed from the active bank',
      })
      return decorateQuestion(loadStore().questions.find((item) => item.id === questionId))
    })
  },

  async deleteQuestion(questionId, actor) {
    return request(() => {
      const store = loadStore()
      const question = store.questions.find((item) => item.id === questionId)
      assert(question, 'That question does not exist.', { code: 'not-found', status: 404 })
      const usedIn = store.exams.filter((exam) =>
        (exam.sections || []).some((section) => (section.questionIds || []).includes(questionId)),
      )
      assert(
        usedIn.length === 0,
        `This question is used in ${usedIn.length} examination${usedIn.length > 1 ? 's' : ''}. Archive it instead of deleting so past papers stay intact.`,
        { code: 'conflict', status: 409 },
      )
      removeRecord('questions', questionId)
      addAuditEvent({
        actor,
        action: 'question.deleted',
        actionLabel: 'Question deleted',
        entityType: 'question',
        entityId: questionId,
        entityLabel: question.text.slice(0, 60),
        previousValue: 'existed',
        newValue: 'deleted',
        reason: 'Question bank cleanup',
      })
      return { ok: true }
    })
  },

  async getStats(createdBy) {
    return request(() => {
      const questions = readAll('questions').filter(
        (question) => !createdBy || question.createdBy === createdBy,
      )
      const bySubject = {}
      const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 }
      const byType = {}
      questions.forEach((question) => {
        bySubject[question.subjectId] = (bySubject[question.subjectId] || 0) + 1
        byDifficulty[question.difficulty] = (byDifficulty[question.difficulty] || 0) + 1
        byType[question.type] = (byType[question.type] || 0) + 1
      })
      return {
        total: questions.length,
        active: questions.filter((question) => question.status === 'active').length,
        drafts: questions.filter((question) => question.status === 'draft').length,
        bySubject: Object.entries(bySubject).map(([subjectId, count]) => ({
          subjectId,
          subjectName: subjectName(subjectId),
          count,
        })),
        byDifficulty,
        byType,
      }
    }, { latency: 180 })
  },
}

export const QUESTION_TYPES = TYPES
export const QUESTION_DIFFICULTIES = DIFFICULTIES
