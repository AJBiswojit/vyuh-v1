/* Analysis + item analysis. Everything is computed from stored attempts and
   question records via the pure calculators in lib/exam-calculations.js. */

import { request, assert, round, sortBy } from './api.js'
import { loadStore } from '../data/mock/mock-storage.js'
import { findUser, publicUser } from './repository.js'
import {
  evaluateAttempt,
  groupBySubject,
  groupByTopic,
  slowestQuestions,
  timeManagementInsight,
  answerChangeInsight,
  buildRecommendations,
  QUESTION_STATUS,
  isAnswered,
  isCorrect,
} from '../lib/exam-calculations.js'
import { TOPIC_BY_ID, subjectName } from '../data/mock/subjects.mock.js'
import { QUESTION_BY_ID } from '../data/mock/questions.mock.js'

function topicLabel(topicId) {
  return TOPIC_BY_ID[topicId]?.name || 'General'
}

export const analysisService = {
  async getDetailedAnalysis(attemptId) {
    return request(
      () => {
        const store = loadStore()
        const attempt = store.attempts.find((item) => item.id === attemptId)
        assert(attempt, 'That attempt does not exist.', { code: 'not-found', status: 404 })
        const exam = store.exams.find((item) => item.id === attempt.examId)
        assert(exam, 'The examination for this attempt no longer exists.', { code: 'not-found', status: 404 })

        const { items, totals } = evaluateAttempt(exam, attempt)
        const subjects = groupBySubject(items).map((bucket) => ({
          ...bucket,
          subjectName: subjectName(bucket.subjectId),
        }))
        const topics = groupByTopic(items)
          .map((bucket) => ({
            ...bucket,
            topicName: topicLabel(bucket.topicId),
            subjectName: subjectName(bucket.subjectId),
          }))
          .sort((a, b) => a.accuracy - b.accuracy)

        const levelD = items.map((item) => ({
          questionId: item.questionId,
          number: items.findIndex((entry) => entry.questionId === item.questionId) + 1,
          sectionId: item.sectionId,
          sectionName: item.sectionName,
          subjectId: item.subjectId,
          subjectName: subjectName(item.subjectId),
          topicId: item.topicId,
          topicName: topicLabel(item.topicId),
          difficulty: item.difficulty,
          type: item.type,
          question: item.question,
          status: item.status,
          statusLabel: QUESTION_STATUS[item.status] || item.status,
          studentAnswer: item.studentAnswer,
          correctAnswer: item.correctAnswer,
          marks: item.marks,
          negativeMarks: item.negativeMarks,
          marksAwarded: item.marksAwarded,
          timeSpentSeconds: item.timeSpentSeconds,
          changeCount: item.changeCount,
          mistakeExplanation: item.mistakeExplanation,
        }))

        return {
          exam: {
            id: exam.id,
            title: exam.title,
            type: exam.type,
            durationMinutes: exam.durationMinutes,
            negativeMarking: exam.negativeMarking,
            startAt: exam.startAt,
            sections: exam.sections,
          },
          attempt: {
            id: attempt.id,
            studentId: attempt.studentId,
            studentName: findUser(attempt.studentId)?.name,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            status: attempt.status,
            totalTimeSpent: attempt.totalTimeSpent,
          },
          levelA: {
            ...totals,
            questions: levelD.length,
          },
          levelB: subjects,
          levelC: {
            topics,
            strong: topics.filter((topic) => topic.strength === 'strong'),
            weak: topics.filter((topic) => topic.strength === 'weak'),
          },
          levelD,
          extras: {
            timeDistribution: levelD
              .filter((item) => item.timeSpentSeconds > 0)
              .map((item) => ({ name: `Q${item.number}`, seconds: item.timeSpentSeconds, status: item.status })),
            slowest: slowestQuestions(items, 5).map((item) => ({
              questionId: item.questionId,
              number: levelD.find((entry) => entry.questionId === item.questionId)?.number,
              topicName: topicLabel(item.topicId),
              timeSpentSeconds: item.timeSpentSeconds,
              status: item.status,
            })),
            timeInsight: timeManagementInsight(items, totals),
            answerChanges: answerChangeInsight(attempt, items),
            recommendations: buildRecommendations(items, topics),
            sectionPerformance: (exam.sections || []).map((section) => {
              const sectionItems = items.filter((item) => item.sectionId === section.id)
              const awarded = sectionItems.reduce((total, item) => total + item.marksAwarded, 0)
              const max = sectionItems.reduce((total, item) => total + item.marks, 0)
              return {
                sectionId: section.id,
                name: section.name,
                awarded: round(awarded, 2),
                max,
                percentage: max ? round((Math.max(awarded, 0) / max) * 100, 1) : 0,
                correct: sectionItems.filter((item) => item.status === 'correct').length,
                total: sectionItems.length,
              }
            }),
          },
        }
      },
      { label: 'analysis', latency: 260 },
    )
  },

  /** Compact result summary used by the result card. */
  async getResultSummary(attemptId) {
    return request(() => {
      const store = loadStore()
      const attempt = store.attempts.find((item) => item.id === attemptId)
      assert(attempt, 'That attempt does not exist.', { code: 'not-found', status: 404 })
      const exam = store.exams.find((item) => item.id === attempt.examId)
      assert(exam, 'The examination for this attempt no longer exists.', { code: 'not-found', status: 404 })
      const { totals, items } = evaluateAttempt(exam, attempt)
      const subjectBreakdown = groupBySubject(items).map((bucket) => ({
        ...bucket,
        subjectName: subjectName(bucket.subjectId),
      }))
      return { exam, attempt, totals, subjectBreakdown, items }
    }, { latency: 160 })
  },

  /** Faculty item analysis across one examination. */
  async getItemAnalysis(examId) {
    return request(
      () => {
        const store = loadStore()
        const exam = store.exams.find((item) => item.id === examId)
        assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
        const attempts = store.attempts.filter(
          (attempt) => attempt.examId === examId && attempt.status !== 'in-progress',
        )

        const questions = (exam.sections || []).flatMap((section) =>
          (section.questionIds || []).map((questionId) => ({
            questionId,
            sectionId: section.id,
            sectionName: section.name,
            subjectId: section.subjectId,
            question: QUESTION_BY_ID[questionId],
          })),
        )

        const itemRows = questions.map((entry, index) => {
          const responses = attempts.map((attempt) =>
            (attempt.responses || []).find((response) => response.questionId === entry.questionId),
          )
          const answered = responses.filter((response) => isAnswered(response))
          const correct = answered.filter((response) => isCorrect(entry.question, response.answer))
          const times = responses.filter((response) => response?.timeSpentSeconds > 0).map((response) => response.timeSpentSeconds)
          const avgTime = times.length ? round(times.reduce((sum, value) => sum + value, 0) / times.length, 1) : 0
          const correctPct = attempts.length ? round((correct.length / attempts.length) * 100, 1) : 0
          const incorrectPct = attempts.length ? round(((answered.length - correct.length) / attempts.length) * 100, 1) : 0
          const unattemptedPct = attempts.length ? round(((attempts.length - answered.length) / attempts.length) * 100, 1) : 0
          return {
            number: index + 1,
            ...entry,
            topicId: entry.question?.topicId,
            topicName: topicLabel(entry.question?.topicId),
            difficulty: entry.question?.difficulty,
            attempts: attempts.length,
            correctCount: correct.length,
            incorrectCount: answered.length - correct.length,
            unattemptedCount: attempts.length - answered.length,
            correctPct,
            incorrectPct,
            unattemptedPct,
            avgTime,
            needsReview: correctPct < 50 && attempts.length > 0,
          }
        })

        const scoring = attempts.map((attempt) => {
          const evaluation = evaluateAttempt(exam, attempt)
          return {
            attemptId: attempt.id,
            studentId: attempt.studentId,
            studentName: findUser(attempt.studentId)?.name || attempt.studentId,
            submittedAt: attempt.submittedAt,
            status: attempt.status,
            ...evaluation.totals,
          }
        })

        const scores = scoring.map((entry) => Math.max(entry.awardedMarks, 0))
        const average = scores.length ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length, 1) : 0
        const distribution = [
          { band: '0–25%', count: 0 },
          { band: '25–50%', count: 0 },
          { band: '50–75%', count: 0 },
          { band: '75–100%', count: 0 },
        ]
        scoring.forEach((entry) => {
          const percentage = Math.max(0, entry.percentage)
          if (percentage < 25) distribution[0].count += 1
          else if (percentage < 50) distribution[1].count += 1
          else if (percentage < 75) distribution[2].count += 1
          else distribution[3].count += 1
        })

        const difficultyBuckets = ['Easy', 'Medium', 'Hard'].map((difficulty) => {
          const rows = itemRows.filter((row) => row.difficulty === difficulty)
          const correctPct = rows.length ? round(rows.reduce((sum, row) => sum + row.correctPct, 0) / rows.length, 1) : 0
          return { difficulty, questions: rows.length, correctPct }
        })

        return {
          exam: {
            id: exam.id,
            title: exam.title,
            type: exam.type,
            status: exam.status,
            startAt: exam.startAt,
            endAt: exam.endAt,
            durationMinutes: exam.durationMinutes,
            batchIds: exam.batchIds,
            negativeMarking: exam.negativeMarking,
          },
          candidates: scoring.length,
          stats: {
            average: Math.max(0, average),
            highest: scores.length ? Math.max(...scores) : 0,
            lowest: scores.length ? Math.min(...scores) : 0,
            maxMarks: questions.reduce((total, entry) => total + (entry.question?.marks ?? 4), 0),
          },
          itemRows,
          scoring: sortBy(scoring, (entry) => entry.awardedMarks, 'desc'),
          distribution,
          difficultyBuckets,
          frequentlyMissed: [...itemRows].filter((row) => row.attempts > 0).sort((a, b) => a.correctPct - b.correctPct).slice(0, 5),
          topicPerformance: groupByTopic(
            itemRows.map((row) => ({
              topicId: row.topicId,
              subjectId: row.subjectId,
              marksAwarded: 0,
              marks: 0,
              status: row.correctPct >= 50 ? 'correct' : 'incorrect',
              timeSpentSeconds: 0,
              difficulty: row.difficulty,
            })),
          ).map((bucket) => ({ ...bucket, topicName: topicLabel(bucket.topicId), subjectName: subjectName(bucket.subjectId) })),
        }
      },
      { label: 'item analysis', latency: 320 },
    )
  },

  async getItemAnalysisOverview(facultyId) {
    return request(() => {
      const store = loadStore()
      const exams = store.exams.filter(
        (exam) =>
          (!facultyId || exam.createdBy === facultyId) &&
          ['published', 'completed'].includes(exam.status) &&
          store.attempts.some((attempt) => attempt.examId === exam.id && attempt.status !== 'in-progress'),
      )
      return exams.map((exam) => {
        const attempts = store.attempts.filter((attempt) => attempt.examId === exam.id && attempt.status !== 'in-progress')
        const evaluations = attempts.map((attempt) => evaluateAttempt(exam, attempt))
        const average = evaluations.length
          ? round(evaluations.reduce((sum, evaluation) => sum + evaluation.totals.percentage, 0) / evaluations.length, 1)
          : 0
        const hardest = evaluations.length
          ? evaluations
              .flatMap((evaluation) => evaluation.items)
              .sort((a, b) => (a.status === 'correct' ? 1 : 0) - (b.status === 'correct' ? 1 : 0))[0]
          : null
        return {
          examId: exam.id,
          title: exam.title,
          type: exam.type,
          candidates: attempts.length,
          average,
          startAt: exam.startAt,
          status: exam.status,
          hardestTopic: hardest ? topicLabel(hardest.topicId) : null,
        }
      })
    }, { latency: 200 })
  },

  /** Performance trends for one student, derived from their graded attempts. */
  async getStudentPerformance(studentId) {
    return request(
      () => {
        const store = loadStore()
        const attempts = store.attempts.filter(
          (attempt) => attempt.studentId === studentId && attempt.status !== 'in-progress',
        )
        const points = attempts
          .map((attempt) => {
            const exam = store.exams.find((item) => item.id === attempt.examId)
            if (!exam) return null
            const evaluation = evaluateAttempt(exam, attempt)
            return {
              attemptId: attempt.id,
              examId: exam.id,
              examTitle: exam.title,
              examType: exam.type,
              submittedAt: attempt.submittedAt || attempt.startedAt,
              ...evaluation.totals,
              subjectBreakdown: groupBySubject(evaluation.items).map((bucket) => ({
                ...bucket,
                subjectName: subjectName(bucket.subjectId),
              })),
              topics: groupByTopic(evaluation.items).map((bucket) => ({
                ...bucket,
                topicName: topicLabel(bucket.topicId),
                subjectName: subjectName(bucket.subjectId),
              })),
            }
          })
          .filter(Boolean)

        const chronological = [...points].sort(
          (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
        )

        const subjectTrend = ['sub_phy', 'sub_chem', 'sub_math', 'sub_bio'].map((subjectId) => {
          const series = chronological
            .map((point, index) => {
              const bucket = point.subjectBreakdown.find((entry) => entry.subjectId === subjectId)
              if (!bucket) return null
              return { index: index + 1, label: `T${index + 1}`, percentage: bucket.percentage, accuracy: bucket.accuracy }
            })
            .filter(Boolean)
          return { subjectId, subjectName: subjectName(subjectId), series }
        }).filter((entry) => entry.series.length > 0)

        const topicMap = new Map()
        chronological.forEach((point) => {
          point.topics.forEach((topic) => {
            const existing = topicMap.get(topic.topicId) || {
              topicId: topic.topicId,
              topicName: topic.topicName,
              subjectName: topic.subjectName,
              attempts: 0,
              correct: 0,
              answered: 0,
              percentageTotal: 0,
              timeTotal: 0,
            }
            existing.attempts += 1
            existing.correct += topic.correct
            existing.answered += topic.answered
            existing.percentageTotal += topic.percentage
            existing.timeTotal += topic.timeSpent
            topicMap.set(topic.topicId, existing)
          })
        })
        const topicTrend = [...topicMap.values()]
          .map((entry) => ({
            ...entry,
            accuracy: entry.answered ? round((entry.correct / entry.answered) * 100, 1) : 0,
            averagePercentage: round(entry.percentageTotal / entry.attempts, 1),
          }))
          .sort((a, b) => a.accuracy - b.accuracy)

        return {
          points: chronological.reverse(),
          subjectTrend,
          topicTrend,
          summary: {
            attempts: chronological.length,
            averagePercentage: chronological.length
              ? round(chronological.reduce((sum, point) => sum + Math.max(point.percentage, 0), 0) / chronological.length, 1)
              : 0,
            bestPercentage: chronological.length
              ? Math.max(...chronological.map((point) => Math.max(point.percentage, 0)))
              : 0,
            averageAccuracy: chronological.length
              ? round(chronological.reduce((sum, point) => sum + point.accuracy, 0) / chronological.length, 1)
              : 0,
            averageTimePerQuestion: chronological.length
              ? round(chronological.reduce((sum, point) => sum + point.averageTimePerQuestion, 0) / chronological.length, 1)
              : 0,
            totalNegative: round(chronological.reduce((sum, point) => sum + point.negativeTotal, 0), 1),
          },
        }
      },
      { label: 'performance', latency: 300 },
    )
  },

  async getBatchPerformance(batchId) {
    return request(() => {
      const store = loadStore()
      const batch = store.batches.find((item) => item.id === batchId)
      assert(batch, 'That batch does not exist.', { code: 'not-found', status: 404 })
      const exams = store.exams.filter(
        (exam) => (exam.batchIds || []).includes(batchId) && ['published', 'completed'].includes(exam.status),
      )
      return exams.map((exam) => {
        const attempts = store.attempts.filter(
          (attempt) => attempt.examId === exam.id && attempt.status !== 'in-progress',
        )
        const evaluations = attempts.map((attempt) => evaluateAttempt(exam, attempt))
        return {
          examId: exam.id,
          title: exam.title,
          candidates: attempts.length,
          average: evaluations.length
            ? round(evaluations.reduce((sum, evaluation) => sum + evaluation.totals.percentage, 0) / evaluations.length, 1)
            : 0,
          highest: evaluations.length
            ? Math.max(...evaluations.map((evaluation) => evaluation.totals.percentage))
            : 0,
        }
      })
    }, { latency: 220 })
  },

  async getStudentRosterPerformance(studentIds) {
    return request(() => {
      const store = loadStore()
      return studentIds
        .map((studentId) => {
          const user = store.users.find((item) => item.id === studentId)
          const attempts = store.attempts.filter(
            (attempt) => attempt.studentId === studentId && attempt.status !== 'in-progress',
          )
          const evaluations = attempts
            .map((attempt) => {
              const exam = store.exams.find((item) => item.id === attempt.examId)
              return exam ? evaluateAttempt(exam, attempt) : null
            })
            .filter(Boolean)
          if (!user) return null
          return {
            studentId,
            name: user.name,
            email: publicUser(user).email,
            attempts: evaluations.length,
            average: evaluations.length
              ? round(evaluations.reduce((sum, evaluation) => sum + Math.max(evaluation.totals.percentage, 0), 0) / evaluations.length, 1)
              : 0,
            best: evaluations.length
              ? Math.max(...evaluations.map((evaluation) => Math.max(evaluation.totals.percentage, 0)))
              : 0,
            accuracy: evaluations.length
              ? round(evaluations.reduce((sum, evaluation) => sum + evaluation.totals.accuracy, 0) / evaluations.length, 1)
              : 0,
          }
        })
        .filter(Boolean)
    }, { latency: 200 })
  },
}

export { QUESTION_STATUS }
