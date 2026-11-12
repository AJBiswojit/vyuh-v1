/* Attendance service. Reads raw join/leave events and always computes durations
   through lib/attendance-calculations.js so every workspace sees identical
   numbers for the same class session. */

import { ApiError, request, assert, nowIso, createId, round } from './api.js'
import { insert, loadStore, updateRecord } from '../data/mock/mock-storage.js'
import { findUser, addAuditEvent, notify, getPolicies, publicUser } from './repository.js'
import {
  computeAttendance,
  summariseAttendance,
  attendanceTone,
  decorateAttendanceTiming,
  buildAttendanceDayView,
} from '../lib/attendance-calculations.js'

function classIndex() {
  const store = loadStore()
  return new Map(store.classes.map((klass) => [klass.id, klass]))
}

export const attendanceService = {
  /** Attendance for one student across every session they have a record for. */
  async getStudentAttendance(studentId) {
    return request(
      () => {
        const store = loadStore()
        const policy = getPolicies()
        const student = store.users.find((user) => user.id === studentId)
        assert(student, 'Student not found.', { code: 'not-found', status: 404 })
        const klasses = classIndex()
        const now = new Date()
        const records = store.attendance
          .filter((record) => record.studentId === studentId)
          .map((record) => {
            const klass = klasses.get(record.classId)
            const computed = computeAttendance(record, klass, policy)
            return decorateAttendanceTiming({
              ...computed,
              classTitle: klass?.title || 'Class session',
              subjectId: klass?.subjectId || 'sub_phy',
              facultyId: klass?.facultyId || null,
              facultyName: findUser(klass?.facultyId)?.name || '—',
              scheduledStartAt: klass?.scheduledStartAt,
              scheduledEndAt: klass?.scheduledEndAt,
              classStatus: klass?.status,
            }, klass, policy)
          })

        const summary = summariseAttendance(records, klasses)
        const threshold = policy?.attendance?.defaultThresholdPercent ?? 75
        const dayView = buildAttendanceDayView(records, { policy, now })

        const bySubjectMap = new Map()
        records.forEach((record) => {
          const bucket = bySubjectMap.get(record.subjectId) || {
            subjectId: record.subjectId,
            sessions: 0,
            attendedMinutes: 0,
            eligibleMinutes: 0,
            present: 0,
            missed: 0,
            lateArrivals: 0,
            earlyDepartures: 0,
            warnings: 0,
          }
          bucket.sessions += 1
          bucket.attendedMinutes += record.attendedDuration
          bucket.eligibleMinutes += record.eligibleDuration
          if (record.status === 'present') bucket.present += 1
          if (record.status === 'absent') bucket.missed += 1
          if (record.lateArrival) bucket.lateArrivals += 1
          if (record.earlyDeparture) bucket.earlyDepartures += 1
          if (record.isEligible && !record.meetsThreshold) bucket.warnings += 1
          bySubjectMap.set(record.subjectId, bucket)
        })

        const bySubject = [...bySubjectMap.values()].map((bucket) => ({
          ...bucket,
          attendedMinutes: round(bucket.attendedMinutes, 1),
          eligibleMinutes: round(bucket.eligibleMinutes, 1),
          percentage: bucket.eligibleMinutes ? round((bucket.attendedMinutes / bucket.eligibleMinutes) * 100, 1) : 0,
        }))

        const byMonth = dayView.monthly

        return {
          records,
          sessions: records.map((record) => ({
            classId: record.classId,
            title: record.classTitle,
            subjectId: record.subjectId,
            facultyName: record.facultyName,
            scheduledStartAt: record.scheduledStartAt,
            scheduledEndAt: record.scheduledEndAt,
            sessionStartedAt: record.sessionStartedAt,
            sessionEndedAt: record.sessionEndedAt,
            attendedMinutes: record.attendedDuration,
            eligibleMinutes: record.eligibleDuration,
            percentage: record.attendancePercentage,
            status: record.status,
            meetsThreshold: record.meetsThreshold,
            connections: record.joinEvents.length,
            intervals: record.intervals,
            threshold: record.threshold,
            dateKey: record.dateKey,
            dateLabel: record.dateLabel,
            firstIn: record.firstIn,
            lastOut: record.lastOut,
            firstInLabel: record.firstInLabel,
            lastOutLabel: record.lastOutLabel,
            checkoutNote: record.checkoutNote,
            lateArrivalMinutes: record.lateArrivalMinutes,
            earlyDepartureMinutes: record.earlyDepartureMinutes,
            lateArrival: record.lateArrival,
            earlyDeparture: record.earlyDeparture,
            reconnectionCount: record.reconnectionCount,
            isEligible: record.isEligible,
            isPending: record.isPending,
            classStatus: record.classStatus,
          })),
          summary: {
            ...summary,
            threshold,
            percentage: summary.attendancePercentage,
            missedSessions: summary.absentCount,
            eligibleSessions: summary.sessions,
            policyNote:
              'Attendance is eligible attended minutes divided by eligible class minutes. Reconnects are merged into one interval and never double-counted.',
            tone: attendanceTone(summary.attendancePercentage, threshold),
          },
          bySubject,
          byMonth,
          dayView,
          timingWarnings: dayView.timingWarnings,
          missingHours: round(Math.max(0, summary.eligibleMinutes - summary.attendedMinutes) / 60, 1),
          attendedHours: round(summary.attendedMinutes / 60, 1),
          warnings: records.filter((record) => record.isEligible && !record.meetsThreshold && record.status !== 'excused'),
        }
      },
      { label: 'attendance', latency: 240 },
    )
  },

  /** Attendance register for one class session (faculty view). */
  async getClassAttendance(classId) {
    return request(() => {
      const store = loadStore()
      const policy = getPolicies()
      const klass = store.classes.find((item) => item.id === classId)
      assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
      const batch = store.batches.find((item) => item.id === klass.batchId)
      const studentIds = batch?.studentIds || []
      const records = studentIds.map((studentId) => {
        const existing = store.attendance.find(
          (record) => record.classId === classId && record.studentId === studentId,
        )
        const base = existing || {
          id: null,
          classId,
          sessionId: klass.sessionId,
          studentId,
          joinEvents: [],
          leaveEvents: [],
          reconnectionEvents: [],
          status: 'absent',
          correctionRequested: false,
        }
        const computed = computeAttendance(base, klass, policy)
        const user = findUser(studentId)
        return {
          ...computed,
          name: user?.name || studentId,
          email: publicUser(user)?.email,
          enrollmentId: publicUser(user)?.enrollmentId,
        }
      })
      const summary = summariseAttendance(records, classIndex())
      return { klass, batch, records, summary }
    }, { latency: 200 })
  },

  async getFacultyAttendance(facultyId) {
    return request(() => {
      const store = loadStore()
      const policy = getPolicies()
      const classes = store.classes.filter(
        (item) => item.facultyId === facultyId && ['ended', 'recording-processing', 'recording-published', 'live'].includes(item.status),
      )
      return classes.map((klass) => {
        const batch = store.batches.find((item) => item.id === klass.batchId)
        const studentIds = batch?.studentIds || []
        const records = studentIds.map((studentId) => {
          const existing = store.attendance.find(
            (record) => record.classId === klass.id && record.studentId === studentId,
          )
          const base =
            existing ||
            {
              id: null,
              classId: klass.id,
              sessionId: klass.sessionId,
              studentId,
              joinEvents: [],
              leaveEvents: [],
              reconnectionEvents: [],
              status: 'absent',
              correctionRequested: false,
            }
          return computeAttendance(base, klass, policy)
        })
        const summary = summariseAttendance(records, classIndex())
        return {
          klass,
          batch,
          records,
          summary,
          corrections: store.attendance.filter(
            (record) => record.classId === klass.id && record.correctionRequested,
          ),
        }
      })
    }, { latency: 260 })
  },

  async getInstituteAttendance() {
    return request(() => {
      const store = loadStore()
      const policy = getPolicies()
      const klasses = classIndex()
      const records = store.attendance.map((record) =>
        computeAttendance(record, klasses.get(record.classId), policy),
      )
      const batchRows = store.batches.map((batch) => {
        const batchStudents = new Set(batch.studentIds)
        const batchRecords = records.filter((record) => batchStudents.has(record.studentId))
        const summary = summariseAttendance(batchRecords, klasses)
        return {
          batchId: batch.id,
          name: batch.name,
          section: batch.section,
          students: batch.studentIds.length,
          ...summary,
        }
      })
      const subjectRows = store.subjects.map((subject) => {
        const subjectRecords = records.filter((record) => klasses.get(record.classId)?.subjectId === subject.id)
        const summary = summariseAttendance(subjectRecords, klasses)
        return { subjectId: subject.id, name: subject.name, ...summary }
      })
      const overall = summariseAttendance(records, klasses)
      const exceptions = records
        .filter((record) => record.eligibleDuration > 0 && !record.meetsThreshold)
        .map((record) => {
          const user = findUser(record.studentId)
          const klass = klasses.get(record.classId)
          return {
            ...record,
            name: user?.name || record.studentId,
            classTitle: klass?.title || 'Class session',
            subjectId: klass?.subjectId,
            scheduledStartAt: klass?.scheduledStartAt,
          }
        })
      return { records, overall, batchRows, subjectRows, exceptions, threshold: policy?.attendance?.defaultThresholdPercent }
    }, { latency: 300 })
  },

  async requestCorrection(classId, studentId, reason, actor) {
    return request(() => {
      const store = loadStore()
      assert(String(reason || '').trim().length >= 12, 'Explain why the attendance needs correction (at least 12 characters).', {
        code: 'validation',
      })
      const klass = store.classes.find((item) => item.id === classId)
      assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
      const existing = store.attendance.find((record) => record.classId === classId && record.studentId === studentId)
      if (existing) {
        updateRecord('attendance', existing.id, { correctionRequested: true, correctionReason: reason })
      } else {
        insert('attendance', {
          id: createId('att'),
          classId,
          sessionId: klass.sessionId,
          studentId,
          joinEvents: [],
          leaveEvents: [],
          reconnectionEvents: [],
          status: 'absent',
          correctionRequested: true,
          correctionReason: reason,
        })
      }
      const policy = getPolicies()
      const approvalId = createId('approval')
      if (policy?.attendance?.correctionRequiresApproval) {
        insert('approvals', {
          id: approvalId,
          type: 'attendance-correction',
          title: `Attendance correction — ${findUser(studentId)?.name || studentId}, ${klass.title}`,
          summary: reason,
          entityType: 'attendance',
          entityId: existing?.id || classId,
          requestedBy: actor?.id || studentId,
          requestedAt: nowIso(),
          status: 'pending',
          priority: 'normal',
          details: [
            { label: 'Class', value: klass.title },
            { label: 'Student', value: findUser(studentId)?.name || studentId },
          ],
          reviewedBy: null,
          reviewedAt: null,
          reason: null,
        })
        store.users
          .filter((user) => user.role === 'admin')
          .forEach((admin) =>
            notify({
              userId: admin.id,
              type: 'approval-pending',
              title: 'Attendance correction awaiting approval',
              body: `${klass.title} · ${findUser(studentId)?.name || studentId}`,
              link: '/admin/approvals',
              entityId: approvalId,
            }),
          )
      }
      addAuditEvent({
        actor,
        action: 'attendance.corrected',
        actionLabel: 'Attendance correction requested',
        entityType: 'attendance',
        entityId: existing?.id || classId,
        entityLabel: `${findUser(studentId)?.name || studentId} · ${klass.title}`,
        previousValue: 'Recorded attendance unchanged',
        newValue: 'Correction requested with approval',
        reason,
      })
      return { ok: true, approvalId }
    })
  },

  /** Applies an approved correction. Only reachable from the approval workflow. */
  async applyCorrection(attendanceId, { joinEvents, leaveEvents, reason }, actor) {
    return request(() => {
      const store = loadStore()
      const record = store.attendance.find((item) => item.id === attendanceId)
      assert(record, 'That attendance record does not exist.', { code: 'not-found', status: 404 })
      assert(Array.isArray(joinEvents) || Array.isArray(leaveEvents), 'Provide corrected join or leave events.', {
        code: 'validation',
      })
      const classRecord = store.classes.find((item) => item.id === record.classId)
      const previous = computeAttendance(record, classRecord, getPolicies())
      updateRecord('attendance', attendanceId, {
        joinEvents: joinEvents ?? record.joinEvents,
        leaveEvents: leaveEvents ?? record.leaveEvents,
        correctionRequested: false,
        correctedAt: nowIso(),
        correctedBy: actor?.id || null,
        correctionReason: reason,
      })
      const updated = computeAttendance(
        loadStore().attendance.find((item) => item.id === attendanceId),
        classRecord,
        getPolicies(),
      )
      addAuditEvent({
        actor,
        action: 'attendance.corrected',
        actionLabel: 'Attendance corrected',
        entityType: 'attendance',
        entityId: attendanceId,
        entityLabel: `${findUser(record.studentId)?.name || record.studentId} · ${classRecord?.title}`,
        previousValue: `${previous.attendedDuration} min (${previous.attendancePercentage}%)`,
        newValue: `${updated.attendedDuration} min (${updated.attendancePercentage}%)`,
        reason,
      })
      notify({
        userId: record.studentId,
        type: 'attendance-updated',
        title: 'Attendance record updated',
        body: `Your attendance for ${classRecord?.title} is now ${updated.attendancePercentage}%.`,
        link: '/student/attendance',
        entityId: attendanceId,
      })
      return updated
    })
  },

  /** Records attendance when a student joins or leaves the demo classroom. */
  async recordSessionEvent(classId, studentId, kind) {
    return request(() => {
      const store = loadStore()
      const klass = store.classes.find((item) => item.id === classId)
      if (!klass) throw new ApiError('That class does not exist.', { code: 'not-found', status: 404 })
      const existing = store.attendance.find(
        (record) => record.classId === classId && record.studentId === studentId,
      )
      const at = nowIso()
      if (!existing) {
        if (kind !== 'join') return { ok: false, reason: 'no-record' }
        insert('attendance', {
          id: createId('att'),
          classId,
          sessionId: klass.sessionId,
          studentId,
          joinEvents: [{ at }],
          leaveEvents: [],
          reconnectionEvents: [],
          status: 'present',
          correctionRequested: false,
        })
        return { ok: true, created: true }
      }
      if (kind === 'join') {
        const rejoin = existing.joinEvents.length > 0
        updateRecord('attendance', existing.id, {
          joinEvents: [...existing.joinEvents, { at }],
          reconnectionEvents: rejoin
            ? [...existing.reconnectionEvents, { at, reason: 'rejoined the classroom' }]
            : existing.reconnectionEvents,
        })
      } else {
        updateRecord('attendance', existing.id, { leaveEvents: [...existing.leaveEvents, { at }] })
      }
      return { ok: true }
    }, { latency: 80 })
  },

  async getAttendanceContext(classId, studentId) {
    return request(() => {
      const store = loadStore()
      const record = store.attendance.find(
        (item) => item.classId === classId && item.studentId === studentId,
      )
      if (!record) return null
      const klass = store.classes.find((item) => item.id === classId)
      return computeAttendance(record, klass, getPolicies())
    }, { latency: 100 })
  },

  /** Bulk session export used by faculty/admin reports (CSV string). */
  async exportClassAttendance(classId) {
    const { records, klass } = await this.getClassAttendance(classId)
    const header = ['Student', 'Enrollment', 'Joined', 'Left', 'Attended minutes', 'Eligible minutes', 'Percentage', 'Status']
    const rows = records.map((record) => [
      record.name,
      record.enrollmentId || '',
      record.joinEvents.map((event) => event.at).join(' | '),
      record.leaveEvents.map((event) => event.at).join(' | '),
      record.attendedDuration,
      record.eligibleDuration,
      record.attendancePercentage,
      record.status,
    ])
    return {
      filename: `attendance-${klass?.id || classId}.csv`,
      content: [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n'),
    }
  },
}
