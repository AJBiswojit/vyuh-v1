/* Performance service — composes academic (examination) performance with
   participation metrics (attendance, classes, doubts). Academic and
   participation signals are kept in separate blocks on purpose: an "overall
   academic score" is never fabricated from unrelated indicators. Every figure
   in `overview` is derived from saved graded attempts and their responses. */

import { request, round } from './api.js'
import { loadStore } from '../data/mock/mock-storage.js'
import { analysisService } from './analysis.service.js'
import { attendanceService } from './attendance.service.js'
import { getPolicies } from './repository.js'
import { computeAttendance } from '../lib/attendance-calculations.js'
import { subjectName } from '../data/mock/subjects.mock.js'

function sum(points, key) {
  return points.reduce((total, point) => total + (Number(point[key]) || 0), 0)
}

function attemptSnapshot(point) {
  if (!point) return null
  return {
    attemptId: point.attemptId,
    examId: point.examId,
    examTitle: point.examTitle,
    examType: point.examType,
    submittedAt: point.submittedAt,
    percentage: Math.max(point.percentage, 0),
    accuracy: point.accuracy,
    averageTimePerQuestion: point.averageTimePerQuestion,
    awardedMarks: point.awardedMarks,
    maxMarks: point.maxMarks,
    correctCount: point.correctCount,
    incorrectCount: point.incorrectCount,
    unattemptedCount: point.unattemptedCount,
    partialCount: point.partialCount,
    answeredCount: point.answeredCount,
    negativeTotal: point.negativeTotal,
    totalQuestions: point.totalQuestions,
    totalTimeSpent: point.totalTimeSpent,
  }
}

function buildOverview(examPerformance) {
  const points = examPerformance.points || []
  const chronological = [...points].reverse()
  const totals = {
    attempts: chronological.length,
    totalQuestions: sum(chronological, 'totalQuestions'),
    correct: sum(chronological, 'correctCount'),
    incorrect: sum(chronological, 'incorrectCount'),
    unattempted: sum(chronological, 'unattemptedCount'),
    partial: sum(chronological, 'partialCount'),
    answered: sum(chronological, 'answeredCount'),
    negativeMarks: round(sum(chronological, 'negativeTotal'), 1),
    totalTimeSpent: sum(chronological, 'totalTimeSpent'),
  }
  const distribution = [
    { key: 'correct', label: 'Correct', value: totals.correct, colorKey: 'good' },
    { key: 'incorrect', label: 'Incorrect', value: totals.incorrect, colorKey: 'bad' },
    { key: 'unattempted', label: 'Unattempted', value: totals.unattempted, colorKey: 'track' },
    { key: 'partial', label: 'Partially correct', value: totals.partial, colorKey: 'cream' },
  ]
    .filter((entry) => entry.value > 0)
    .map((entry) => ({
      ...entry,
      percentage: totals.totalQuestions ? round((entry.value / totals.totalQuestions) * 100, 1) : 0,
    }))

  const latest = attemptSnapshot(chronological[chronological.length - 1])
  const previous = attemptSnapshot(chronological[chronological.length - 2])
  const comparison = previous && latest
    ? {
        latest,
        previous,
        deltas: {
          score: round(latest.percentage - previous.percentage, 1),
          accuracy: round(latest.accuracy - previous.accuracy, 1),
          pace: round(latest.averageTimePerQuestion - previous.averageTimePerQuestion, 1),
          correct: latest.correctCount - previous.correctCount,
          incorrect: latest.incorrectCount - previous.incorrectCount,
          unattempted: latest.unattemptedCount - previous.unattemptedCount,
          marks: round(latest.awardedMarks - previous.awardedMarks, 1),
        },
      }
    : null

  const subjectMomentum = (examPerformance.subjectTrend || []).map((subject) => {
    const series = subject.series || []
    const last = series[series.length - 1]
    const before = series[series.length - 2]
    const delta = last && before ? round(last.percentage - before.percentage, 1) : null
    return {
      subjectId: subject.subjectId,
      subjectName: subject.subjectName || subjectName(subject.subjectId),
      series,
      latestPercentage: last?.percentage ?? null,
      latestAccuracy: last?.accuracy ?? null,
      delta,
      direction: delta === null ? 'baseline' : delta >= 2 ? 'improving' : delta <= -2 ? 'declining' : 'steady',
      appearances: series.length,
    }
  })

  const topicGroups = (examPerformance.topicTrend || []).reduce(
    (groups, topic) => {
      const strength = topic.accuracy >= 75 ? 'strong' : topic.accuracy >= 45 ? 'developing' : 'weak'
      const enriched = {
        ...topic,
        strength,
        strengthLabel: strength === 'strong' ? 'Strength' : strength === 'developing' ? 'Developing' : 'Needs attention',
      }
      groups[strength].push(enriched)
      return groups
    },
    { strong: [], developing: [], weak: [] },
  )
  topicGroups.strong.sort((a, b) => b.accuracy - a.accuracy)
  topicGroups.developing.sort((a, b) => a.accuracy - b.accuracy)
  topicGroups.weak.sort((a, b) => a.accuracy - b.accuracy)

  const weakest = topicGroups.weak[0] || topicGroups.developing[0]
  const unattemptedRate = totals.totalQuestions ? round((totals.unattempted / totals.totalQuestions) * 100, 1) : 0
  const recommendations = []
  if (weakest) {
    recommendations.push({
      id: 'rec_topic_focus',
      title: `Revisit ${weakest.topicName}`,
      body: `Saved responses show ${weakest.accuracy}% accuracy across ${weakest.attempts} appearance(s). Review the question explanations for this topic before the next paper.`,
      priority: 'high',
    })
  }
  if (totals.unattempted > 0 && unattemptedRate >= 10) {
    recommendations.push({
      id: 'rec_attempt_rate',
      title: 'Use your full attempt window',
      body: `${totals.unattempted} of ${totals.totalQuestions} questions were unattempted (${unattemptedRate}%). Plan a first pass for familiar questions, then return to the rest.`,
      priority: 'medium',
    })
  }
  if (totals.negativeMarks > 0) {
    recommendations.push({
      id: 'rec_negative_marks',
      title: 'Check negative-marking decisions',
      body: `${totals.negativeMarks} marks were lost to incorrect responses. Compare the explanation for each incorrect answer before guessing in the next examination.`,
      priority: 'medium',
    })
  }
  const slowAverage = examPerformance.summary?.averageTimePerQuestion || 0
  if (slowAverage > 90) {
    recommendations.push({
      id: 'rec_pace',
      title: 'Practise under a tighter time budget',
      body: `Your saved attempts average ${slowAverage} seconds per question. Use timed topic practice to protect time for later sections.`,
      priority: 'low',
    })
  }
  if (!recommendations.length) {
    recommendations.push({
      id: 'rec_maintain',
      title: 'Maintain the current pattern',
      body: 'The saved attempts show no dominant weak topic, unattempted cluster or negative-marking issue. Keep using the examination analysis after each submission.',
      priority: 'low',
    })
  }

  return {
    summary: {
      attempts: examPerformance.summary.attempts,
      averagePercentage: examPerformance.summary.averagePercentage,
      bestPercentage: examPerformance.summary.bestPercentage,
      averageAccuracy: examPerformance.summary.averageAccuracy,
      averageTimePerQuestion: examPerformance.summary.averageTimePerQuestion,
      totalNegative: examPerformance.summary.totalNegative,
    },
    totals,
    distribution,
    comparison,
    latest,
    previous,
    subjectMomentum,
    topicGroups,
    recommendations,
    unattemptedRate,
    sourceNote: 'All academic figures are calculated from graded attempts, their saved responses and question marks. Participation is shown separately.',
  }
}

export const performanceService = {
  async getStudentPerformance(studentId) {
    const [examPerformance, attendance] = await Promise.all([
      analysisService.getStudentPerformance(studentId),
      attendanceService.getStudentAttendance(studentId),
    ])

    return request(
      () => {
        const store = loadStore()
        const classes = store.classes.filter((klass) => {
          const profile = store.students.find((item) => item.id === studentId)
          return profile ? klass.batchId === profile.batchId : false
        })
        const attended = attendance.records.filter((record) => record.attendedDuration > 0)
        const doubts = store.doubts.filter((doubt) => doubt.studentId === studentId)

        const attendanceTrend = attendance.byMonth || []
        const subjectAverages = new Map()
        examPerformance.points.forEach((point) => {
          point.subjectBreakdown.forEach((bucket) => {
            const existing = subjectAverages.get(bucket.subjectId) || {
              subjectId: bucket.subjectId,
              subjectName: subjectName(bucket.subjectId),
              total: 0,
              count: 0,
              best: 0,
            }
            existing.total += Math.max(bucket.percentage, 0)
            existing.count += 1
            existing.best = Math.max(existing.best, Math.max(bucket.percentage, 0))
            subjectAverages.set(bucket.subjectId, existing)
          })
        })

        return {
          overview: buildOverview(examPerformance),
          academic: {
            ...examPerformance.summary,
            points: examPerformance.points,
            subjectTrend: examPerformance.subjectTrend,
            topicTrend: examPerformance.topicTrend,
            subjectAverages: [...subjectAverages.values()].map((entry) => ({
              ...entry,
              average: round(entry.total / entry.count, 1),
            })),
          },
          participation: {
            attendance: {
              percentage: attendance.summary.attendancePercentage,
              attendedHours: attendance.attendedHours,
              missingHours: attendance.missingHours,
              sessions: attendance.summary.sessions,
              eligibleSessions: attendance.dayView?.eligibleSessionCount ?? attendance.summary.sessions,
              threshold: attendance.summary.threshold,
              tone: attendance.summary.tone,
              monthly: attendanceTrend,
              timingWarnings: attendance.timingWarnings?.length || 0,
            },
            classes: {
              scheduled: classes.filter((klass) => klass.status === 'scheduled').length,
              attended: attended.length,
              liveSessions: classes.length,
            },
            doubts: {
              total: doubts.length,
              resolved: doubts.filter((doubt) => doubt.status === 'resolved').length,
              answered: doubts.filter((doubt) => doubt.status === 'answered').length,
              open: doubts.filter((doubt) => doubt.status === 'open').length,
              responseRate: doubts.length
                ? round((doubts.filter((doubt) => doubt.replies.length > 0).length / doubts.length) * 100, 1)
                : 0,
            },
          },
          notes: {
            academicNote:
              'Academic figures are derived only from graded examination attempts: marks, accuracy, correct/incorrect/unattempted responses and time management.',
            participationNote:
              'Participation figures come from live-class attendance and doubt activity. They are not combined into an academic score.',
          },
        }
      },
      { label: 'performance', latency: 240 },
    )
  },

  async getFacultyTeachingPerformance(facultyId) {
    return request(() => {
      const store = loadStore()
      const classes = store.classes.filter((klass) => klass.facultyId === facultyId)
      const exams = store.exams.filter((exam) => exam.createdBy === facultyId)
      const doubts = store.doubts.filter((doubt) => doubt.facultyId === facultyId)
      const attendanceRecords = store.attendance.filter((record) =>
        classes.some((klass) => klass.id === record.classId),
      )
      const classById = new Map(classes.map((klass) => [klass.id, klass]))
      const computedAttendance = attendanceRecords.map((record) =>
        computeAttendance(record, classById.get(record.classId), getPolicies()),
      )
      const attendedMinutes = computedAttendance.reduce((total, record) => total + record.attendedDuration, 0)
      const eligibleMinutes = computedAttendance.reduce((total, record) => total + record.eligibleDuration, 0)

      return {
        classes: {
          total: classes.length,
          completed: classes.filter((klass) => ['ended', 'recording-processing', 'recording-published'].includes(klass.status)).length,
          upcoming: classes.filter((klass) => klass.status === 'scheduled').length,
          live: classes.filter((klass) => klass.status === 'live').length,
        },
        exams: {
          total: exams.length,
          published: exams.filter((exam) => exam.status === 'published').length,
          drafts: exams.filter((exam) => exam.status === 'draft').length,
          completed: exams.filter((exam) => exam.status === 'completed').length,
        },
        attendance: {
          averagePercentage: eligibleMinutes ? round((attendedMinutes / eligibleMinutes) * 100, 1) : 0,
          sessions: classes.length,
          records: attendanceRecords.length,
          attendedMinutes: round(attendedMinutes, 1),
          eligibleMinutes: round(eligibleMinutes, 1),
        },
        doubts: {
          total: doubts.length,
          resolved: doubts.filter((doubt) => ['answered', 'resolved'].includes(doubt.status)).length,
          pending: doubts.filter((doubt) => doubt.status === 'open').length,
        },
      }
    }, { latency: 200 })
  },
}
