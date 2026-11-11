/* ------------------------------------------------------------------
   Attempt evaluation — pure functions.
   Every mark, accuracy figure and analysis number in the application comes
   from these functions applied to the stored attempt + question records.
------------------------------------------------------------------- */

import { QUESTION_BY_ID } from '../data/mock/questions.mock.js'
import { flattenExamQuestions } from '../data/mock/exams.mock.js'
import { round } from '../services/api.js'

export const QUESTION_STATUS = {
  'not-visited': 'Not visited',
  'not-answered': 'Not answered',
  answered: 'Answered',
  marked: 'Marked for review',
  'answered-marked': 'Answered & marked',
}

export function isAnswered(response) {
  if (!response) return false
  const { answer } = response
  if (answer === null || answer === undefined) return false
  if (Array.isArray(answer)) return answer.length > 0
  if (typeof answer === 'string') return answer.trim().length > 0
  return true
}

export function isCorrect(question, answer) {
  if (!question || answer === null || answer === undefined || answer === '') return false
  const { correctAnswer, type } = question

  if (type === 'numerical' || type === 'numeric-with-sign') {
    const numeric = Number(answer)
    if (Number.isNaN(numeric)) return false
    const tolerance = question.tolerance ?? 0.01
    return Math.abs(numeric - Number(correctAnswer)) <= tolerance
  }

  if (Array.isArray(correctAnswer)) {
    const given = Array.isArray(answer) ? [...answer].sort() : [answer]
    const expected = [...correctAnswer].sort()
    return given.length === expected.length && expected.every((option, index) => option === given[index])
  }

  return String(answer) === String(correctAnswer)
}

export function isPartiallyCorrect(question, answer) {
  if (!question || question.type !== 'multiple' || !Array.isArray(answer)) return false
  if (!isAnswered({ answer })) return false
  const expected = question.correctAnswer
  const hits = answer.filter((option) => expected.includes(option))
  return hits.length > 0 && hits.length < expected.length
}

/**
 * Returns the full per-question evaluation for an attempt plus aggregate marks
 * derived strictly from the exam's marking scheme and the question records.
 */
export function evaluateAttempt(exam, attempt) {
  const questions = flattenExamQuestions(exam)
  const responseByQuestion = new Map((attempt?.responses || []).map((response) => [response.questionId, response]))

  let awardedMarks = 0
  let maxMarks = 0
  let correctCount = 0
  let incorrectCount = 0
  let unattemptedCount = 0
  let partialCount = 0
  let negativeTotal = 0
  let answeredCount = 0

  const items = questions.map((entry) => {
    const question = QUESTION_BY_ID[entry.questionId]
    const response = responseByQuestion.get(entry.questionId) || null
    const marks = question?.marks ?? 4
    const negativeMarks = exam.negativeMarking ? (question?.negativeMarks ?? 1) : 0
    maxMarks += marks

    const answered = isAnswered(response)
    let status = 'unattempted'
    let marksAwarded = 0
    let mistakeExplanation = null

    if (answered) {
      answeredCount += 1
      const correct = isCorrect(question, response.answer)
      if (correct) {
        status = 'correct'
        correctCount += 1
        marksAwarded = marks
      } else if (isPartiallyCorrect(question, response.answer) && Array.isArray(response.answer)) {
        status = 'partial'
        partialCount += 1
        const expected = question.correctAnswer
        const hits = response.answer.filter((option) => expected.includes(option))
        marksAwarded = round((marks * hits.length) / expected.length, 2)
        mistakeExplanation = buildMistakeExplanation(question, response.answer, 'partial')
      } else {
        status = 'incorrect'
        incorrectCount += 1
        marksAwarded = -Math.abs(negativeMarks)
        negativeTotal += Math.abs(negativeMarks)
        mistakeExplanation = buildMistakeExplanation(question, response.answer, 'incorrect')
      }
    } else {
      unattemptedCount += 1
    }

    awardedMarks += marksAwarded

    return {
      questionId: entry.questionId,
      sectionId: entry.sectionId,
      sectionName: entry.sectionName,
      subjectId: question?.subjectId ?? entry.subjectId,
      topicId: question?.topicId ?? null,
      difficulty: question?.difficulty ?? 'Medium',
      type: question?.type ?? 'single',
      question,
      response,
      status,
      marks,
      negativeMarks,
      marksAwarded,
      correctAnswer: question?.correctAnswer ?? null,
      studentAnswer: response?.answer ?? null,
      timeSpentSeconds: response?.timeSpentSeconds ?? 0,
      changeCount: response?.changeCount ?? 0,
      mistakeExplanation,
    }
  })

  const totalTimeSpent =
    attempt?.totalTimeSpent ||
    items.reduce((total, item) => total + (item.timeSpentSeconds || 0), 0) ||
    0

  const accuracy = answeredCount > 0 ? round((correctCount / answeredCount) * 100, 1) : 0
  const percentage = maxMarks > 0 ? round((Math.max(awardedMarks, 0) / maxMarks) * 100, 1) : 0

  return {
    items,
    totals: {
      awardedMarks: round(awardedMarks, 2),
      maxMarks: round(maxMarks, 2),
      percentage,
      accuracy,
      correctCount,
      incorrectCount,
      unattemptedCount,
      partialCount,
      answeredCount,
      negativeTotal: round(negativeTotal, 2),
      totalQuestions: items.length,
      totalTimeSpent,
      averageTimePerQuestion: items.length ? round(totalTimeSpent / items.length, 1) : 0,
    },
  }
}

export function buildMistakeExplanation(question, answer, kind) {
  if (!question) return null

  if (question.type === 'numerical' || question.type === 'numeric-with-sign') {
    const given = Number(answer)
    const expected = Number(question.correctAnswer)
    if (Number.isNaN(given)) return 'The entry was not a valid number, so it could not be evaluated against the expected value.'
    const delta = round(given - expected, 2)
    const direction = delta > 0 ? 'higher' : 'lower'
    const signNote =
      question.type === 'numeric-with-sign'
        ? ' Check the Cartesian sign convention — the sign carries physical meaning here.'
        : ''
    return `Your answer ${given} is ${Math.abs(delta)} ${direction} than the expected ${expected}.${signNote} Re-check the last algebraic step and the unit conversion before finalising.`
  }

  if (question.type === 'multiple') {
    const expected = question.correctAnswer
    const given = Array.isArray(answer) ? answer : [answer]
    const missed = expected.filter((option) => !given.includes(option))
    const extra = given.filter((option) => !expected.includes(option))
    const parts = []
    if (kind === 'partial') parts.push('You selected some but not all of the correct options.')
    if (missed.length) parts.push(`You missed option${missed.length > 1 ? 's' : ''} ${missed.join(', ').toUpperCase()}.`)
    if (extra.length) parts.push(`You also selected ${extra.join(', ').toUpperCase()}, which ${extra.length > 1 ? 'are' : 'is'} incorrect.`)
    parts.push('For multiple-correct questions, every option must be judged independently.')
    return parts.join(' ')
  }

  const expectedId = Array.isArray(question.correctAnswer) ? question.correctAnswer[0] : question.correctAnswer
  const expectedOption = (question.options || []).find((option) => option.id === expectedId)
  const chosenId = Array.isArray(answer) ? answer[0] : answer
  const chosenOption = (question.options || []).find((option) => option.id === chosenId)
  if (!chosenOption) return 'No valid option was recorded for this question.'
  return `You chose ${chosenOption.id.toUpperCase()} (“${chosenOption.text}”). The correct choice is ${String(expectedId).toUpperCase()} (“${expectedOption?.text ?? ''}”). ${question.explanation}`
}

/* --------------------------- aggregations --------------------------- */

export function groupBySubject(items) {
  const map = new Map()
  items.forEach((item) => {
    const key = item.subjectId || 'unknown'
    if (!map.has(key)) {
      map.set(key, {
        subjectId: key,
        marksAwarded: 0,
        maxMarks: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        answered: 0,
        timeSpent: 0,
        questions: 0,
      })
    }
    const bucket = map.get(key)
    bucket.marksAwarded += item.marksAwarded
    bucket.maxMarks += item.marks
    bucket.timeSpent += item.timeSpentSeconds || 0
    bucket.questions += 1
    if (item.status === 'correct') bucket.correct += 1
    else if (item.status === 'incorrect') bucket.incorrect += 1
    else if (item.status === 'partial') {
      bucket.correct += 0.5
      bucket.answered += 1
    } else if (item.status === 'unattempted') bucket.unattempted += 1
    if (item.status !== 'unattempted') bucket.answered += 1
  })
  return [...map.values()].map((bucket) => ({
    ...bucket,
    marksAwarded: round(bucket.marksAwarded, 2),
    accuracy: bucket.answered ? round((bucket.correct / bucket.answered) * 100, 1) : 0,
    percentage: bucket.maxMarks ? round((Math.max(bucket.marksAwarded, 0) / bucket.maxMarks) * 100, 1) : 0,
  }))
}

export function groupByTopic(items) {
  const map = new Map()
  items.forEach((item) => {
    const key = item.topicId || 'unknown'
    if (!map.has(key)) {
      map.set(key, {
        topicId: key,
        subjectId: item.subjectId,
        marksAwarded: 0,
        maxMarks: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        answered: 0,
        timeSpent: 0,
        questions: 0,
        difficulties: new Set(),
      })
    }
    const bucket = map.get(key)
    bucket.marksAwarded += item.marksAwarded
    bucket.maxMarks += item.marks
    bucket.timeSpent += item.timeSpentSeconds || 0
    bucket.questions += 1
    bucket.difficulties.add(item.difficulty)
    if (item.status === 'correct') bucket.correct += 1
    else if (item.status === 'incorrect') bucket.incorrect += 1
    else if (item.status === 'unattempted') bucket.unattempted += 1
    if (item.status !== 'unattempted') bucket.answered += 1
  })
  return [...map.values()].map((bucket) => {
    const accuracy = bucket.answered ? round((bucket.correct / bucket.answered) * 100, 1) : 0
    return {
      ...bucket,
      difficulties: [...bucket.difficulties],
      accuracy,
      percentage: bucket.maxMarks ? round((Math.max(bucket.marksAwarded, 0) / bucket.maxMarks) * 100, 1) : 0,
      strength: accuracy >= 75 ? 'strong' : accuracy >= 45 ? 'developing' : 'weak',
    }
  })
}

export function slowestQuestions(items, limit = 5) {
  return [...items]
    .filter((item) => item.timeSpentSeconds > 0)
    .sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds)
    .slice(0, limit)
}

export function timeManagementInsight(items, totals) {
  const answered = items.filter((item) => item.status !== 'unattempted')
  if (!answered.length) {
    return {
      headline: 'No questions were attempted',
      body: 'Start with the section you find most familiar so the timer works in your favour.',
    }
  }
  const slowCorrect = answered.filter((item) => item.status === 'correct' && item.timeSpentSeconds > 90)
  const fastWrong = answered.filter((item) => item.status === 'incorrect' && item.timeSpentSeconds < 35)
  if (fastWrong.length >= 2) {
    return {
      headline: 'Some answers were rushed',
      body: `${fastWrong.length} incorrect answers were submitted in under 35 seconds. Slow down on questions that have a trap in the wording.`,
    }
  }
  if (slowCorrect.length >= 2) {
    return {
      headline: 'Accuracy is good, but pace needs work',
      body: `${slowCorrect.length} correct answers took more than 90 seconds. Practise the same topic under a tighter time budget to protect time for the harder questions.`,
    }
  }
  return {
    headline: 'Balanced pacing',
    body: `You averaged ${totals.averageTimePerQuestion} seconds per question with ${totals.accuracy}% accuracy. Keep this rhythm and revisit the questions you marked for review first.`,
  }
}

export function answerChangeInsight(attempt, items) {
  const history = attempt?.answerChangeHistory || []
  if (!history.length) {
    return { changed: 0, improved: 0, harmed: 0, note: 'No answers were revised during this attempt.' }
  }
  const byQuestion = new Map(items.map((item) => [item.questionId, item]))
  let improved = 0
  let harmed = 0
  history.forEach((change) => {
    const item = byQuestion.get(change.questionId)
    if (!item) return
    if (item.status === 'correct') improved += 1
    else if (item.status === 'incorrect') harmed += 1
  })
  return {
    changed: history.length,
    improved,
    harmed,
    note:
      improved > harmed
        ? 'Your revisions helped — re-reading the question before submitting is paying off.'
        : improved === harmed
          ? 'Revisions broke even. Only change an answer when you can name the specific error in your first attempt.'
          : 'Most revisions cost marks. Trust your first reading unless you find a concrete mistake.',
  }
}

export function buildRecommendations(items, topics) {
  const weak = [...topics].filter((topic) => topic.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy)
  const strong = [...topics].filter((topic) => topic.accuracy >= 75).sort((a, b) => b.accuracy - a.accuracy)
  const recommendations = []

  weak.slice(0, 2).forEach((topic) => {
    recommendations.push({
      id: `rec_${topic.topicId}`,
      kind: 'topic',
      title: `Revisit ${topic.topicId.replace('top_', '').replace(/_/g, ' ')}`,
      body: `Accuracy is ${topic.accuracy}% across ${topic.questions} question${topic.questions > 1 ? 's' : ''}. Work through the explanation for each missed question, then attempt the topic again under time pressure.`,
      priority: 'high',
    })
  })

  const unattempted = items.filter((item) => item.status === 'unattempted').length
  if (unattempted >= 3) {
    recommendations.push({
      id: 'rec_attempt_rate',
      kind: 'strategy',
      title: `Attempt rate: ${unattempted} questions left blank`,
      body: 'Leaving questions blank guarantees zero marks. In single-correct questions, eliminate two options and make an informed choice.',
      priority: 'medium',
    })
  }

  if (strong.length) {
    recommendations.push({
      id: 'rec_leverage',
      kind: 'strength',
      title: `Leverage your strength in ${strong[0].topicId.replace('top_', '').replace(/_/g, ' ')}`,
      body: `Accuracy of ${strong[0].accuracy}% shows the concept is secure. Use these questions first in the next paper to bank marks early.`,
      priority: 'low',
    })
  }

  return recommendations
}
