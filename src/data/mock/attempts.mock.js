/* Examination attempts. Responses only store what the student did — marks,
   accuracy and analysis are derived by the service layer from the question bank
   and the exam's marking scheme, never stored as separate hardcoded numbers. */

import { EXAMS, flattenExamQuestions } from './exams.mock.js'
import { QUESTIONS } from './questions.mock.js'

/* Deterministic pseudo-random so seeded demo attempts look realistic but are
   identical on every machine. */
function mulberry32(seed) {
  let state = seed
  return function next() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const QUESTION_BY_ID = QUESTIONS.reduce((accumulator, question) => {
  accumulator[question.id] = question
  return accumulator
}, {})

function correctAnswerFor(question) {
  return question.correctAnswer
}

function isEquivalent(question, answer) {
  if (answer === null || answer === undefined || answer === '') return false
  const correct = correctAnswerFor(question)
  if (question.type === 'numerical' || question.type === 'numeric-with-sign') {
    const value = Number(answer)
    if (Number.isNaN(value)) return false
    return Math.abs(value - Number(correct)) <= (question.tolerance ?? 0.01)
  }
  if (Array.isArray(correct)) {
    const given = Array.isArray(answer) ? [...answer].sort() : [answer]
    return given.length === correct.length && [...correct].sort().every((option, index) => option === given[index])
  }
  return String(answer) === String(correct)
}

/**
 * Builds a full attempt record from a per-question performance plan.
 * plan entries: { questionId, outcome: 'correct'|'incorrect'|'skipped'|'partial', seconds, changed }
 */
function buildAttempt({ id, exam, studentId, startedAt, submittedAt, status, plan, remainingTime }) {
  const flattened = flattenExamQuestions(exam)
  const responses = []
  const questionVisitHistory = []
  const questionTimeSpent = {}
  const markedForReview = []
  const answerChangeHistory = []
  let totalTimeSpent = 0

  flattened.forEach((entry, index) => {
    const question = QUESTION_BY_ID[entry.questionId]
    const planEntry = plan[entry.questionId] || { outcome: 'skipped', seconds: 40 }
    const seconds = Math.max(8, Math.round(planEntry.seconds ?? 45))
    totalTimeSpent += seconds
    questionTimeSpent[entry.questionId] = seconds
    questionVisitHistory.push({
      questionId: entry.questionId,
      visitedAt: new Date(new Date(startedAt).getTime() + index * 45000).toISOString(),
    })

    let answer = null
    let responseStatus = 'not-answered'

    if (planEntry.outcome === 'correct') {
      answer = question.correctAnswer
      responseStatus = 'answered'
    } else if (planEntry.outcome === 'incorrect') {
      if (question.type === 'single' || question.type === 'multiple') {
        const wrong = (question.options || []).map((option) => option.id).filter((optionId) => !question.correctAnswer.includes(optionId))
        answer = question.type === 'multiple' ? wrong.slice(0, 1) : wrong[0] ?? null
      } else {
        answer = Number(question.correctAnswer) + 7
      }
      responseStatus = answer === null ? 'not-answered' : 'answered'
    } else if (planEntry.outcome === 'partial') {
      answer = question.correctAnswer.slice(0, 1)
      responseStatus = 'answered'
    }

    if (planEntry.changed && answer !== null) {
      answerChangeHistory.push({
        questionId: entry.questionId,
        from: question.type === 'numerical' ? '—' : null,
        to: answer,
        at: new Date(new Date(startedAt).getTime() + index * 60000 + 20000).toISOString(),
        reason: 'answer revised after re-reading the question',
      })
    }

    if (planEntry.marked) {
      markedForReview.push(entry.questionId)
    }

    responses.push({
      questionId: entry.questionId,
      sectionId: entry.sectionId,
      answer,
      status: responseStatus,
      answeredAt:
        answer === null
          ? null
          : new Date(new Date(startedAt).getTime() + index * 60000 + 15000).toISOString(),
      timeSpentSeconds: seconds,
      changeCount: planEntry.changed ? 1 : 0,
    })
  })

  return {
    id,
    examId: exam.id,
    studentId,
    startedAt,
    submittedAt: submittedAt ?? null,
    status,
    remainingTime,
    responses,
    questionVisitHistory,
    questionTimeSpent,
    markedForReview,
    answerChangeHistory,
    totalTimeSpent,
    integrityEvents: [],
    lastActivityAt: submittedAt ?? new Date(new Date(startedAt).getTime() + totalTimeSpent * 1000).toISOString(),
  }
}

const MOCK_NOW = new Date('2026-11-11T05:05:00.000Z')

const FULL_MOCK_11 = EXAMS.find((exam) => exam.id === 'exam_full_002')
const PHYSICS_UT_03 = EXAMS.find((exam) => exam.id === 'exam_phy_001')
const NEET_MOCK_08 = EXAMS.find((exam) => exam.id === 'exam_neet_001')
const FULL_MOCK_12 = EXAMS.find((exam) => exam.id === 'exam_full_001')

/* ---- Full Mock 11: strong candidate, careful timing ---- */
const ananyaPlan = {
  q_phy_kin_01: { outcome: 'correct', seconds: 62 },
  q_phy_kin_02: { outcome: 'correct', seconds: 88, changed: true },
  q_phy_law_01: { outcome: 'correct', seconds: 40 },
  q_phy_law_02: { outcome: 'partial', seconds: 74 },
  q_phy_work_01: { outcome: 'correct', seconds: 55 },
  q_phy_rot_01: { outcome: 'incorrect', seconds: 96 },
  q_chem_mole_01: { outcome: 'correct', seconds: 44 },
  q_chem_mole_02: { outcome: 'correct', seconds: 50 },
  q_chem_eq_01: { outcome: 'correct', seconds: 66 },
  q_chem_bond_02: { outcome: 'correct', seconds: 72 },
  q_chem_org_01: { outcome: 'correct', seconds: 35 },
  q_math_quad_01: { outcome: 'correct', seconds: 38 },
  q_math_trig_01: { outcome: 'correct', seconds: 30 },
  q_math_calc_01: { outcome: 'correct', seconds: 26 },
  q_math_vec_01: { outcome: 'incorrect', seconds: 68 },
  q_math_prob_01: { outcome: 'skipped', seconds: 52 },
}

/* ---- Full Mock 11: inconsistent candidate ---- */
const ritwikPlan = {
  q_phy_kin_01: { outcome: 'correct', seconds: 90 },
  q_phy_kin_02: { outcome: 'incorrect', seconds: 120 },
  q_phy_law_01: { outcome: 'correct', seconds: 65 },
  q_phy_law_02: { outcome: 'skipped', seconds: 40 },
  q_phy_work_01: { outcome: 'incorrect', seconds: 80 },
  q_phy_rot_01: { outcome: 'skipped', seconds: 30 },
  q_chem_mole_01: { outcome: 'correct', seconds: 55 },
  q_chem_mole_02: { outcome: 'correct', seconds: 62, changed: true },
  q_chem_eq_01: { outcome: 'incorrect', seconds: 95 },
  q_chem_bond_02: { outcome: 'skipped', seconds: 25 },
  q_chem_org_01: { outcome: 'correct', seconds: 48 },
  q_math_quad_01: { outcome: 'correct', seconds: 44 },
  q_math_trig_01: { outcome: 'correct', seconds: 36 },
  q_math_calc_01: { outcome: 'correct', seconds: 30 },
  q_math_vec_01: { outcome: 'incorrect', seconds: 110 },
  q_math_prob_01: { outcome: 'skipped', seconds: 60 },
}

/* ---- Full Mock 11: top of the batch ---- */
const snehaPlan = {
  q_phy_kin_01: { outcome: 'correct', seconds: 45 },
  q_phy_kin_02: { outcome: 'correct', seconds: 70 },
  q_phy_law_01: { outcome: 'correct', seconds: 32 },
  q_phy_law_02: { outcome: 'correct', seconds: 82 },
  q_phy_work_01: { outcome: 'correct', seconds: 48 },
  q_phy_rot_01: { outcome: 'correct', seconds: 90 },
  q_chem_mole_01: { outcome: 'correct', seconds: 35 },
  q_chem_mole_02: { outcome: 'correct', seconds: 42 },
  q_chem_eq_01: { outcome: 'correct', seconds: 58 },
  q_chem_bond_02: { outcome: 'correct', seconds: 60 },
  q_chem_org_01: { outcome: 'correct', seconds: 28 },
  q_math_quad_01: { outcome: 'correct', seconds: 30 },
  q_math_trig_01: { outcome: 'correct', seconds: 26 },
  q_math_calc_01: { outcome: 'correct', seconds: 22 },
  q_math_vec_01: { outcome: 'correct', seconds: 62 },
  q_math_prob_01: { outcome: 'correct', seconds: 70, changed: true },
}

/* ---- Full Mock 11: struggling candidate ---- */
const kabirPlan = {
  q_phy_kin_01: { outcome: 'correct', seconds: 110 },
  q_phy_kin_02: { outcome: 'incorrect', seconds: 140 },
  q_phy_law_01: { outcome: 'incorrect', seconds: 95 },
  q_phy_law_02: { outcome: 'skipped', seconds: 60 },
  q_phy_work_01: { outcome: 'incorrect', seconds: 105 },
  q_phy_rot_01: { outcome: 'skipped', seconds: 45 },
  q_chem_mole_01: { outcome: 'correct', seconds: 88 },
  q_chem_mole_02: { outcome: 'incorrect', seconds: 120 },
  q_chem_eq_01: { outcome: 'incorrect', seconds: 130 },
  q_chem_bond_02: { outcome: 'skipped', seconds: 35 },
  q_chem_org_01: { outcome: 'correct', seconds: 66 },
  q_math_quad_01: { outcome: 'correct', seconds: 72 },
  q_math_trig_01: { outcome: 'incorrect', seconds: 90 },
  q_math_calc_01: { outcome: 'correct', seconds: 45 },
  q_math_vec_01: { outcome: 'skipped', seconds: 60 },
  q_math_prob_01: { outcome: 'skipped', seconds: 58 },
}

/* ---- Full Mock 11: mid-pack, marked several questions ---- */
const ishaPlan = {
  q_phy_kin_01: { outcome: 'correct', seconds: 68, marked: false },
  q_phy_kin_02: { outcome: 'correct', seconds: 92, marked: true },
  q_phy_law_01: { outcome: 'correct', seconds: 46 },
  q_phy_law_02: { outcome: 'incorrect', seconds: 88, marked: true },
  q_phy_work_01: { outcome: 'correct', seconds: 64 },
  q_phy_rot_01: { outcome: 'incorrect', seconds: 118 },
  q_chem_mole_01: { outcome: 'correct', seconds: 50 },
  q_chem_mole_02: { outcome: 'correct', seconds: 58 },
  q_chem_eq_01: { outcome: 'incorrect', seconds: 84 },
  q_chem_bond_02: { outcome: 'correct', seconds: 78 },
  q_chem_org_01: { outcome: 'correct', seconds: 40 },
  q_math_quad_01: { outcome: 'correct', seconds: 42 },
  q_math_trig_01: { outcome: 'correct', seconds: 34 },
  q_math_calc_01: { outcome: 'correct', seconds: 28 },
  q_math_vec_01: { outcome: 'skipped', seconds: 76, marked: true },
  q_math_prob_01: { outcome: 'incorrect', seconds: 82 },
}

/* ---- Physics UT 03: 8 questions ---- */
const physicsPlanStrong = {
  q_phy_work_02: { outcome: 'correct', seconds: 95 },
  q_phy_rot_01: { outcome: 'correct', seconds: 72 },
  q_phy_kin_01: { outcome: 'correct', seconds: 40 },
  q_phy_law_01: { outcome: 'correct', seconds: 28 },
  q_phy_work_01: { outcome: 'correct', seconds: 50 },
  q_phy_kin_02: { outcome: 'correct', seconds: 62 },
  q_phy_cur_02: { outcome: 'incorrect', seconds: 88, changed: true },
  q_phy_opt_02: { outcome: 'incorrect', seconds: 70 },
}

const physicsPlanMixed = {
  q_phy_work_02: { outcome: 'incorrect', seconds: 120 },
  q_phy_rot_01: { outcome: 'incorrect', seconds: 90 },
  q_phy_kin_01: { outcome: 'correct', seconds: 45 },
  q_phy_law_01: { outcome: 'correct', seconds: 40 },
  q_phy_work_01: { outcome: 'correct', seconds: 66 },
  q_phy_kin_02: { outcome: 'incorrect', seconds: 88 },
  q_phy_cur_02: { outcome: 'skipped', seconds: 55 },
  q_phy_opt_02: { outcome: 'skipped', seconds: 40 },
}

export const ATTEMPTS = [
  buildAttempt({
    id: 'attempt_001',
    exam: FULL_MOCK_11,
    studentId: 'stu_001',
    startedAt: '2026-11-02T04:02:00.000Z',
    submittedAt: '2026-11-02T06:58:00.000Z',
    status: 'submitted',
    plan: ananyaPlan,
    remainingTime: 1920,
  }),
  buildAttempt({
    id: 'attempt_002',
    exam: FULL_MOCK_11,
    studentId: 'stu_002',
    startedAt: '2026-11-02T04:05:00.000Z',
    submittedAt: '2026-11-02T07:28:00.000Z',
    status: 'expired',
    plan: ritwikPlan,
    remainingTime: 0,
  }),
  buildAttempt({
    id: 'attempt_003',
    exam: FULL_MOCK_11,
    studentId: 'stu_003',
    startedAt: '2026-11-02T04:00:00.000Z',
    submittedAt: '2026-11-02T06:41:00.000Z',
    status: 'submitted',
    plan: snehaPlan,
    remainingTime: 2940,
  }),
  buildAttempt({
    id: 'attempt_004',
    exam: FULL_MOCK_11,
    studentId: 'stu_004',
    startedAt: '2026-11-02T04:08:00.000Z',
    submittedAt: '2026-11-02T07:30:00.000Z',
    status: 'expired',
    plan: kabirPlan,
    remainingTime: 0,
  }),
  buildAttempt({
    id: 'attempt_005',
    exam: FULL_MOCK_11,
    studentId: 'stu_005',
    startedAt: '2026-11-02T04:01:00.000Z',
    submittedAt: '2026-11-02T06:52:00.000Z',
    status: 'submitted',
    plan: ishaPlan,
    remainingTime: 2280,
  }),

  buildAttempt({
    id: 'attempt_006',
    exam: PHYSICS_UT_03,
    studentId: 'stu_001',
    startedAt: '2026-11-09T04:01:00.000Z',
    submittedAt: '2026-11-09T04:28:00.000Z',
    status: 'submitted',
    plan: physicsPlanStrong,
    remainingTime: 120,
  }),
  buildAttempt({
    id: 'attempt_007',
    exam: PHYSICS_UT_03,
    studentId: 'stu_004',
    startedAt: '2026-11-09T04:03:00.000Z',
    submittedAt: '2026-11-09T04:45:00.000Z',
    status: 'expired',
    plan: physicsPlanMixed,
    remainingTime: 0,
  }),
  buildAttempt({
    id: 'attempt_008',
    exam: PHYSICS_UT_03,
    studentId: 'stu_005',
    startedAt: '2026-11-09T04:00:00.000Z',
    submittedAt: '2026-11-09T04:31:00.000Z',
    status: 'submitted',
    plan: physicsPlanStrong,
    remainingTime: 0,
  }),

  /* NEET Mock 08 is running right now: Dev has submitted, Tara is mid-attempt,
     Arjun has not started and Nila is mid-attempt with a reconnection event. */
  buildAttempt({
    id: 'attempt_009',
    exam: NEET_MOCK_08,
    studentId: 'stu_006',
    startedAt: '2026-11-11T03:16:00.000Z',
    submittedAt: '2026-11-11T04:14:00.000Z',
    status: 'submitted',
    plan: {
      q_bio_cell_01: { outcome: 'correct', seconds: 42 },
      q_bio_cell_02: { outcome: 'correct', seconds: 38 },
      q_bio_gen_01: { outcome: 'correct', seconds: 55 },
      q_bio_gen_02: { outcome: 'correct', seconds: 30 },
      q_bio_hum_01: { outcome: 'incorrect', seconds: 48 },
      q_bio_eco_01: { outcome: 'correct', seconds: 40 },
      q_phy_kin_01: { outcome: 'correct', seconds: 70 },
      q_phy_law_01: { outcome: 'incorrect', seconds: 65 },
      q_phy_opt_01: { outcome: 'correct', seconds: 44 },
      q_phy_cur_01: { outcome: 'skipped', seconds: 30 },
      q_chem_mole_01: { outcome: 'correct', seconds: 52 },
      q_chem_bond_01: { outcome: 'correct', seconds: 60 },
      q_chem_org_01: { outcome: 'correct', seconds: 32 },
      q_chem_eq_03: { outcome: 'skipped', seconds: 35 },
    },
    remainingTime: 1155,
  }),
  {
    /* Hand-shaped in-progress attempt so monitoring shows live progress. */
    id: 'attempt_010',
    examId: 'exam_neet_001',
    studentId: 'stu_007',
    startedAt: '2026-11-11T03:30:00.000Z',
    submittedAt: null,
    status: 'in-progress',
    remainingTime: 1980,
    responses: [
      { questionId: 'q_bio_cell_01', sectionId: 'sec_neet_001_bio', answer: ['b'], status: 'answered', answeredAt: '2026-11-11T03:32:00.000Z', timeSpentSeconds: 44, changeCount: 0 },
      { questionId: 'q_bio_cell_02', sectionId: 'sec_neet_001_bio', answer: ['a'], status: 'answered', answeredAt: '2026-11-11T03:35:00.000Z', timeSpentSeconds: 39, changeCount: 0 },
      { questionId: 'q_bio_gen_01', sectionId: 'sec_neet_001_bio', answer: ['b'], status: 'answered', answeredAt: '2026-11-11T03:38:00.000Z', timeSpentSeconds: 62, changeCount: 1 },
      { questionId: 'q_bio_gen_02', sectionId: 'sec_neet_001_bio', answer: 23, status: 'answered', answeredAt: '2026-11-11T03:41:00.000Z', timeSpentSeconds: 34, changeCount: 0 },
      { questionId: 'q_bio_hum_01', sectionId: 'sec_neet_001_bio', answer: null, status: 'marked', answeredAt: null, timeSpentSeconds: 51, changeCount: 0 },
      { questionId: 'q_bio_eco_01', sectionId: 'sec_neet_001_bio', answer: ['a'], status: 'answered', answeredAt: '2026-11-11T03:47:00.000Z', timeSpentSeconds: 40, changeCount: 0 },
      { questionId: 'q_phy_kin_01', sectionId: 'sec_neet_001_phy', answer: ['b'], status: 'answered', answeredAt: '2026-11-11T03:52:00.000Z', timeSpentSeconds: 58, changeCount: 0 },
      { questionId: 'q_phy_law_01', sectionId: 'sec_neet_001_phy', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_phy_opt_01', sectionId: 'sec_neet_001_phy', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_phy_cur_01', sectionId: 'sec_neet_001_phy', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_chem_mole_01', sectionId: 'sec_neet_001_chem', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_chem_bond_01', sectionId: 'sec_neet_001_chem', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_chem_org_01', sectionId: 'sec_neet_001_chem', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_chem_eq_03', sectionId: 'sec_neet_001_chem', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
    ],
    questionVisitHistory: [],
    questionTimeSpent: {},
    markedForReview: ['q_bio_hum_01'],
    answerChangeHistory: [
      { questionId: 'q_bio_gen_01', from: ['a'], to: ['b'], at: '2026-11-11T03:38:00.000Z', reason: 'answer revised' },
    ],
    totalTimeSpent: 328,
    integrityEvents: [],
    lastActivityAt: '2026-11-11T03:58:00.000Z',
  },
  {
    id: 'attempt_011',
    examId: 'exam_neet_001',
    studentId: 'stu_009',
    startedAt: '2026-11-11T03:18:00.000Z',
    submittedAt: null,
    status: 'in-progress',
    remainingTime: 1260,
    responses: [
      { questionId: 'q_bio_cell_01', sectionId: 'sec_neet_001_bio', answer: ['b'], status: 'answered', answeredAt: '2026-11-11T03:20:00.000Z', timeSpentSeconds: 50, changeCount: 0 },
      { questionId: 'q_bio_cell_02', sectionId: 'sec_neet_001_bio', answer: ['a'], status: 'answered-marked', answeredAt: '2026-11-11T03:24:00.000Z', timeSpentSeconds: 44, changeCount: 0 },
      { questionId: 'q_bio_gen_01', sectionId: 'sec_neet_001_bio', answer: null, status: 'not-answered', answeredAt: null, timeSpentSeconds: 30, changeCount: 0 },
      { questionId: 'q_bio_gen_02', sectionId: 'sec_neet_001_bio', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_bio_hum_01', sectionId: 'sec_neet_001_bio', answer: ['b'], status: 'answered', answeredAt: '2026-11-11T03:36:00.000Z', timeSpentSeconds: 48, changeCount: 0 },
      { questionId: 'q_bio_eco_01', sectionId: 'sec_neet_001_bio', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_phy_kin_01', sectionId: 'sec_neet_001_phy', answer: ['b'], status: 'answered', answeredAt: '2026-11-11T03:44:00.000Z', timeSpentSeconds: 60, changeCount: 0 },
      { questionId: 'q_phy_law_01', sectionId: 'sec_neet_001_phy', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_phy_opt_01', sectionId: 'sec_neet_001_phy', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_phy_cur_01', sectionId: 'sec_neet_001_phy', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_chem_mole_01', sectionId: 'sec_neet_001_chem', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_chem_bond_01', sectionId: 'sec_neet_001_chem', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_chem_org_01', sectionId: 'sec_neet_001_chem', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
      { questionId: 'q_chem_eq_03', sectionId: 'sec_neet_001_chem', answer: null, status: 'not-visited', answeredAt: null, timeSpentSeconds: 0, changeCount: 0 },
    ],
    questionVisitHistory: [],
    questionTimeSpent: {},
    markedForReview: ['q_bio_cell_02'],
    answerChangeHistory: [],
    totalTimeSpent: 232,
    integrityEvents: [
      {
        id: 'int_evt_001',
        attemptId: 'attempt_011',
        examId: 'exam_neet_001',
        studentId: 'stu_009',
        type: 'reconnection',
        severity: 'info',
        label: 'Connection lost for 34 seconds',
        detail: 'Tab became hidden at 03:52 and returned at 03:53. Responses were preserved.',
        at: '2026-11-11T03:52:00.000Z',
        resolved: false,
      },
      {
        id: 'int_evt_002',
        attemptId: 'attempt_011',
        examId: 'exam_neet_001',
        studentId: 'stu_009',
        type: 'tab-blur',
        severity: 'warning',
        label: 'Window lost focus for 12 seconds',
        detail: 'Focus moved away from the examination window twice within one minute.',
        at: '2026-11-11T04:02:00.000Z',
        resolved: false,
      },
    ],
    lastActivityAt: '2026-11-11T04:09:00.000Z',
  },
]

/* Upcoming exam with no attempt yet: full mock 12 is scheduled but nobody has
   started; NEET mock 08 has one candidate who has not opened it. */
export const NOT_STARTED = [
  { examId: FULL_MOCK_12.id, studentId: 'stu_001' },
  { examId: NEET_MOCK_08.id, studentId: 'stu_008' },
]
