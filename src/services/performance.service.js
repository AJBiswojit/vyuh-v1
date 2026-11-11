/* Performance service — composes academic (examination) performance with
   participation metrics (attendance, classes, doubts). Academic and
   participation signals are kept in separate blocks on purpose: an "overall
   academic score" is never fabricated from unrelated indicators. */

import { request, round } from './api.js'
import { loadStore } from '../data/mock/mock-storage.js'
import { analysisService } from './analysis.service.js'
import { attendanceService } from './attendance.service.js'
import { subjectName } from '../data/mock/subjects.mock.js'

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
        const attended = store.attendance.filter(
          (record) => record.studentId === studentId && record.joinEvents.length > 0,
        )
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
              threshold: attendance.summary.threshold,
              tone: attendance.summary.tone,
              monthly: attendanceTrend,
            },
            classes: {
              scheduled: classes.filter((klass) => klass.status === 'scheduled').length,
              attended: attended.filter((record) => record.attendedDuration > 0).length,
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
              'Academic figures are derived only from graded examination attempts: marks, accuracy and time management.',
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
      const attended = attendanceRecords.reduce((total, record) => total + record.attendedDuration, 0)
      const eligible = attendanceRecords.reduce((total, record) => total + record.eligibleDuration, 0)

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
          averagePercentage: eligible ? round((attended / eligible) * 100, 1) : 0,
          sessions: classes.length,
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
