/* Institute administration: approvals, policies, integrity, moderation,
   audit log, settings, reports and the admin overview. */

import { request, assert, nowIso, createId, round, sortBy } from './api.js'
import { loadStore, readAll, updateRecord, writeSingleton, resetStore } from '../data/mock/mock-storage.js'
import {
  addAuditEvent,
  notify,
  notifyMany,
  publicUser,
  findUser,
  getPolicies,
  getSettings,
} from './repository.js'
import { evaluateAttempt } from '../lib/exam-calculations.js'
import { computeAttendance } from '../lib/attendance-calculations.js'
import { monthKey } from '../lib/time.js'

function flattenPolicies(policies) {
  const rows = []
  Object.entries(policies || {}).forEach(([group, values]) => {
    Object.entries(values || {}).forEach(([key, value]) => {
      rows.push({ group, key, path: `${group}.${key}`, value })
    })
  })
  return rows
}

export const adminService = {
  async getOverview() {
    return request(
      () => {
        const store = loadStore()
        const policies = store.policies
        const students = store.users.filter((user) => user.role === 'student')
        const facultyUsers = store.users.filter((user) => user.role === 'faculty')
        const activeBatches = store.batches.filter((batch) => batch.status === 'active')
        const now = Date.now()
        const activeExams = store.exams.filter(
          (exam) => exam.status === 'published' && new Date(exam.startAt).getTime() <= now && new Date(exam.endAt).getTime() >= now,
        )
        const todaysClasses = store.classes.filter((klass) => {
          const start = new Date(klass.scheduledStartAt)
          const today = new Date()
          return (
            start.getFullYear() === today.getFullYear() &&
            start.getMonth() === today.getMonth() &&
            start.getDate() === today.getDate()
          )
        })
        const attendanceRecords = store.attendance.map((record) =>
          computeAttendance(record, store.classes.find((klass) => klass.id === record.classId), policies),
        )
        const attended = attendanceRecords.reduce((total, record) => total + record.attendedDuration, 0)
        const eligible = attendanceRecords.reduce((total, record) => total + record.eligibleDuration, 0)
        const attemptsGraded = store.attempts.filter((attempt) => attempt.status !== 'in-progress')
        const evaluations = attemptsGraded.map((attempt) => {
          const exam = store.exams.find((item) => item.id === attempt.examId)
          return exam ? evaluateAttempt(exam, attempt).totals : null
        }).filter(Boolean)

        const recentAudit = sortBy(store.audit, (event) => event.at, 'desc').slice(0, 8)
        const pendingApprovals = store.approvals.filter((approval) => approval.status === 'pending')
        const unresolvedIntegrity = (store.integrity || []).filter((event) => !event.resolved)

        return {
          counts: {
            students: students.length,
            activeStudents: students.filter((user) => user.status === 'active').length,
            faculty: facultyUsers.length,
            activeFaculty: facultyUsers.filter((user) => user.status === 'active').length,
            batches: activeBatches.length,
            archivedBatches: store.batches.filter((batch) => batch.status === 'archived').length,
            activeExams: activeExams.length,
            classesToday: todaysClasses.length,
            liveClasses: store.classes.filter((klass) => klass.status === 'live').length,
            pendingApprovals: pendingApprovals.length,
            openTickets: store.supportTickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
            unresolvedIntegrity: unresolvedIntegrity.length,
            flaggedRecordings: store.recordings.filter((recording) => recording.moderationState === 'flagged').length,
          },
          attendance: {
            percentage: eligible ? round((attended / eligible) * 100, 1) : 0,
            attendedHours: round(attended / 60, 1),
            eligibleHours: round(eligible / 60, 1),
            belowThreshold: attendanceRecords.filter((record) => !record.meetsThreshold && record.attendedDuration > 0).length,
            threshold: policies?.attendance?.defaultThresholdPercent ?? 75,
          },
          academics: {
            gradedAttempts: evaluations.length,
            averagePercentage: evaluations.length
              ? round(evaluations.reduce((sum, item) => sum + Math.max(item.percentage, 0), 0) / evaluations.length, 1)
              : 0,
            averageAccuracy: evaluations.length
              ? round(evaluations.reduce((sum, item) => sum + item.accuracy, 0) / evaluations.length, 1)
              : 0,
          },
          activeExams: activeExams.map((exam) => ({
            id: exam.id,
            title: exam.title,
            endAt: exam.endAt,
            candidateCount: store.attempts.filter((attempt) => attempt.examId === exam.id).length,
          })),
          todayClasses: todaysClasses
            .map((klass) => ({
              id: klass.id,
              title: klass.title,
              status: klass.status,
              scheduledStartAt: klass.scheduledStartAt,
              facultyName: findUser(klass.facultyId)?.name,
              batchName: store.batches.find((batch) => batch.id === klass.batchId)?.name,
            }))
            .sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt)),
          pendingApprovals: pendingApprovals.slice(0, 5).map((approval) => ({
            ...approval,
            requester: publicUser(findUser(approval.requestedBy)),
          })),
          recentAudit,
          alerts: [
            ...unresolvedIntegrity.slice(0, 3).map((event) => ({
              id: event.id,
              tone: event.severity === 'warning' ? 'warning' : 'info',
              title: event.label,
              body: `${findUser(event.studentId)?.name || 'Candidate'} · ${store.exams.find((exam) => exam.id === event.examId)?.title || 'Live class'}`,
              link: event.examId ? `/admin/integrity/exams/${event.examId}` : '/admin/integrity',
            })),
            ...store.recordings
              .filter((recording) => recording.moderationState === 'flagged')
              .slice(0, 2)
              .map((recording) => ({
                id: recording.id,
                tone: 'warning',
                title: 'Recording flagged for moderation',
                body: recording.title,
                link: '/admin/moderation',
              })),
          ],
          insights: [
            {
              label: 'Attendance policy',
              value: `${policies?.attendance?.defaultThresholdPercent ?? 75}% threshold`,
              body: `${attendanceRecords.filter((record) => !record.meetsThreshold && record.attendedDuration > 0).length} session records fall below the threshold.`,
            },
            {
              label: 'Examination pipeline',
              value: `${store.exams.filter((exam) => exam.status === 'published').length} published`,
              body: `${pendingApprovals.filter((approval) => approval.type === 'exam-publish').length} publication requests are waiting for review.`,
            },
            {
              label: 'Doubt backlog',
              value: `${store.doubts.filter((doubt) => doubt.status === 'open').length} open`,
              body: 'Unanswered doubts block student progress; faculty inboxes show the oldest first.',
            },
          ],
        }
      },
      { label: 'institute overview', latency: 340 },
    )
  },

  /* ----------------------------- approvals ----------------------------- */

  async listApprovals({ status = 'all', type = 'all' } = {}) {
    return request(() => {
      let approvals = readAll('approvals')
      if (status !== 'all') approvals = approvals.filter((approval) => approval.status === status)
      if (type !== 'all') approvals = approvals.filter((approval) => approval.type === type)
      return sortBy(approvals, (approval) => approval.requestedAt, 'desc').map((approval) => ({
        ...approval,
        requester: publicUser(findUser(approval.requestedBy)),
        reviewer: publicUser(findUser(approval.reviewedBy)),
      }))
    }, { latency: 220 })
  },

  async decideApproval(approvalId, decision, reason, actor) {
    return request(() => {
      const store = loadStore()
      const approval = store.approvals.find((item) => item.id === approvalId)
      assert(approval, 'That approval does not exist.', { code: 'not-found', status: 404 })
      assert(approval.status === 'pending', 'This approval has already been decided.', { code: 'conflict', status: 409 })
      assert(['approved', 'rejected'].includes(decision), 'Choose approve or reject.', { code: 'validation' })
      if (decision === 'rejected') {
        assert(String(reason || '').trim().length >= 8, 'Give a short reason for rejecting the request.', {
          code: 'validation',
        })
      }

      updateRecord('approvals', approvalId, {
        status: decision,
        reviewedBy: actor?.id,
        reviewedAt: nowIso(),
        reason: reason || 'Approved as submitted',
      })

      // Apply the decision to the underlying entity so approvals are not cosmetic.
      if (approval.type === 'exam-publish' && approval.entityType === 'exam') {
        const exam = store.exams.find((item) => item.id === approval.entityId)
        if (exam) {
          if (decision === 'approved') {
            updateRecord('exams', exam.id, { status: 'published', publishedAt: nowIso(), approvalId })
            const studentIds = store.batches
              .filter((batch) => (exam.batchIds || []).includes(batch.id))
              .flatMap((batch) => batch.studentIds)
            notifyMany(studentIds, {
              type: 'exam-published',
              title: `New examination: ${exam.title}`,
              body: `Approved by the administrator. Starts ${new Date(exam.startAt).toISOString()}.`,
              link: `/student/exams/${exam.id}/instructions`,
              entityId: exam.id,
            })
          } else {
            updateRecord('exams', exam.id, { status: 'draft', rejectedReason: reason })
          }
          notify({
            userId: exam.createdBy,
            type: 'approval-decided',
            title: `Examination ${decision}`,
            body: `${exam.title}: ${reason || 'Decision recorded by the administrator.'}`,
            link: `/faculty/exams/${exam.id}`,
            entityId: exam.id,
          })
        }
      }

      if (approval.type === 'attendance-correction' && decision === 'approved') {
        const attendance = store.attendance.find((item) => item.id === approval.entityId)
        const klass = attendance ? store.classes.find((item) => item.id === attendance.classId) : null
        if (attendance && klass) {
          const sessionStart = new Date(klass.sessionStartedAt || klass.scheduledStartAt).getTime()
          const sessionEnd = new Date(klass.sessionEndedAt || klass.scheduledEndAt).getTime()
          const correctedJoin = new Date(sessionStart + 5 * 60000).toISOString()
          const correctedLeave = new Date(Math.min(sessionEnd, sessionStart + 55 * 60000)).toISOString()
          updateRecord('attendance', attendance.id, {
            joinEvents: [{ at: correctedJoin }],
            leaveEvents: [{ at: correctedLeave }],
            correctionRequested: false,
            correctedAt: nowIso(),
            correctedBy: actor?.id,
            correctionReason: reason,
          })
          notify({
            userId: attendance.studentId,
            type: 'attendance-updated',
            title: 'Attendance correction approved',
            body: `Your record for ${klass.title} was updated after review.`,
            link: '/student/attendance',
            entityId: attendance.id,
          })
        }
      }

      if (approval.type === 'recording-publish' && decision === 'approved') {
        const recording = store.recordings.find((item) => item.id === approval.entityId)
        if (recording) {
          updateRecord('recordings', recording.id, { status: 'published', publishedAt: nowIso() })
        }
      }

      if (approval.type === 'support-escalation' && decision === 'approved') {
        const ticket = store.supportTickets.find((item) => item.id === approval.entityId)
        if (ticket) updateRecord('supportTickets', ticket.id, { priority: 'high', status: 'in-progress' })
      }

      notify({
        userId: approval.requestedBy,
        type: 'approval-decided',
        title: `Request ${decision}`,
        body: `${approval.title}${reason ? ` — ${reason}` : ''}`,
        link: approval.type === 'exam-publish' ? '/faculty/exams' : '/admin/approvals',
        entityId: approvalId,
      })

      addAuditEvent({
        actor,
        action: 'approval.decided',
        actionLabel: 'Approval decided',
        entityType: 'approval',
        entityId: approvalId,
        entityLabel: approval.title,
        previousValue: 'pending',
        newValue: decision,
        reason: reason || 'Approved as submitted',
      })

      return {
        ...loadStore().approvals.find((item) => item.id === approvalId),
        requester: publicUser(findUser(approval.requestedBy)),
      }
    }, { latency: 320 })
  },

  /* ------------------------------ policies ----------------------------- */

  async getPolicies() {
    return request(() => getPolicies(), { latency: 120 })
  },

  async updatePolicy(path, value, actor) {
    return request(() => {
      const store = loadStore()
      const [group, key] = path.split('.')
      assert(group && key, 'Invalid policy path.', { code: 'validation' })
      assert(store.policies?.[group], 'That policy group does not exist.', { code: 'not-found', status: 404 })
      const previous = store.policies[group][key]
      assert(previous !== value, 'That value is unchanged.', { code: 'validation' })

      if (typeof previous === 'number') {
        assert(!Number.isNaN(Number(value)), 'Enter a valid number.', { code: 'validation' })
        assert(Number(value) >= 0, 'Policy values cannot be negative.', { code: 'validation' })
        if (key.toLowerCase().includes('percent')) {
          assert(Number(value) <= 100, 'Percentage policies cannot exceed 100.', { code: 'validation' })
        }
      }
      if (typeof previous === 'boolean' && typeof value !== 'boolean') {
        throw new Error('Boolean policy expected')
      }

      const policies = {
        ...store.policies,
        [group]: { ...store.policies[group], [key]: value },
      }
      writeSingleton('policies', policies)
      addAuditEvent({
        actor,
        action: 'policy.changed',
        actionLabel: 'Policy changed',
        entityType: 'policy',
        entityId: path,
        entityLabel: `${group} · ${key}`,
        previousValue: String(previous),
        newValue: String(value),
        reason: 'Policy updated by the administrator',
      })
      return policies
    }, { latency: 260 })
  },

  async listPolicyRows() {
    return request(() => flattenPolicies(getPolicies()), { latency: 100 })
  },

  /* ----------------------------- integrity ----------------------------- */

  async listIntegrity({ examId, resolved } = {}) {
    return request(() => {
      const store = loadStore()
      let events = store.integrity || []
      if (examId) events = events.filter((event) => event.examId === examId)
      if (resolved === true) events = events.filter((event) => event.resolved)
      if (resolved === false) events = events.filter((event) => !event.resolved)
      return sortBy(events, (event) => event.at, 'desc').map((event) => ({
        ...event,
        studentName: findUser(event.studentId)?.name || '—',
        examTitle: store.exams.find((exam) => exam.id === event.examId)?.title || null,
        attemptStatus: store.attempts.find((attempt) => attempt.id === event.attemptId)?.status || null,
      }))
    }, { latency: 220 })
  },

  async getIntegrityExamDetail(examId) {
    return request(() => {
      const store = loadStore()
      const exam = store.exams.find((item) => item.id === examId)
      assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
      const now = Date.now()
      const batchStudentIds = store.batches
        .filter((batch) => (exam.batchIds || []).includes(batch.id))
        .flatMap((batch) => batch.studentIds)
      const attempts = store.attempts.filter((attempt) => attempt.examId === examId)
      const candidates = batchStudentIds.map((studentId) => {
        const attempt = attempts.find((item) => item.studentId === studentId)
        const answered = attempt ? attempt.responses.filter((response) => response.answer !== null && response.answer !== undefined).length : 0
        const total = attempt ? attempt.responses.length : (exam.sections || []).reduce((sum, section) => sum + (section.questionIds?.length || 0), 0)
        const lastEvent = (store.integrity || [])
          .filter((event) => event.attemptId === attempt?.id)
          .sort((a, b) => new Date(b.at) - new Date(a.at))[0]
        return {
          studentId,
          name: findUser(studentId)?.name || studentId,
          enrollmentId: publicUser(findUser(studentId))?.enrollmentId,
          attemptId: attempt?.id || null,
          status: attempt ? attempt.status : 'not-started',
          startedAt: attempt?.startedAt || null,
          submittedAt: attempt?.submittedAt || null,
          answered,
          total,
          remainingTime: attempt?.deadlineAt ? Math.max(0, Math.round((new Date(attempt.deadlineAt).getTime() - now) / 1000)) : null,
          lastActivityAt: attempt?.lastActivityAt || null,
          connection: lastEvent?.type === 'reconnection' ? 'reconnected' : attempt ? 'connected' : 'n/a',
          events: (store.integrity || []).filter((event) => event.attemptId === attempt?.id).length,
        }
      })
      const controls = (store.examControls || []).filter((control) => control.examId === examId)
      return {
        exam: {
          id: exam.id,
          title: exam.title,
          status: exam.status,
          startAt: exam.startAt,
          endAt: exam.endAt,
          durationMinutes: exam.durationMinutes,
          batchIds: exam.batchIds,
        },
        candidates,
        events: (store.integrity || []).filter((event) => event.examId === examId),
        controls,
        summary: {
          active: candidates.filter((candidate) => candidate.status === 'in-progress').length,
          submitted: candidates.filter((candidate) => ['submitted', 'expired'].includes(candidate.status)).length,
          notStarted: candidates.filter((candidate) => candidate.status === 'not-started').length,
        },
      }
    }, { latency: 260 })
  },

  async resolveIntegrity(eventId, resolution, actor) {
    return request(() => {
      const store = loadStore()
      const event = (store.integrity || []).find((item) => item.id === eventId)
      assert(event, 'That integrity event does not exist.', { code: 'not-found', status: 404 })
      assert(String(resolution || '').trim().length >= 5, 'Record how the event was resolved.', { code: 'validation' })
      updateRecord('integrity', eventId, {
        resolved: true,
        resolution,
        resolvedBy: actor?.id,
        resolvedAt: nowIso(),
      })
      addAuditEvent({
        actor,
        action: 'integrity.resolved',
        actionLabel: 'Integrity incident resolved',
        entityType: 'integrity',
        entityId: eventId,
        entityLabel: event.label,
        previousValue: 'unresolved',
        newValue: resolution,
        reason: resolution,
      })
      return loadStore().integrity.find((item) => item.id === eventId)
    }, { latency: 240 })
  },

  async examControl(examId, action, payload, actor) {
    return request(() => {
      const store = loadStore()
      const exam = store.exams.find((item) => item.id === examId)
      assert(exam, 'That examination does not exist.', { code: 'not-found', status: 404 })
      assert(['pause', 'resume', 'extend', 'force-submit', 'end'].includes(action), 'Unknown examination control.', {
        code: 'validation',
      })
      const label = {
        pause: 'Examination paused',
        resume: 'Examination resumed',
        extend: 'Examination time extended',
        'force-submit': 'Attempt force-submitted',
        end: 'Examination ended',
      }[action]

      if (action === 'end') {
        updateRecord('exams', examId, { status: 'completed', endedAt: nowIso(), endedReason: payload?.reason })
      }
      if (action === 'pause') {
        updateRecord('exams', examId, { monitoringPaused: true })
      }
      if (action === 'resume') {
        updateRecord('exams', examId, { monitoringPaused: false })
      }
      if (action === 'extend') {
        const minutes = Number(payload?.minutes)
        assert(minutes > 0 && minutes <= 30, 'Extension must be between 1 and 30 minutes.', { code: 'validation' })
        const attempts = store.attempts.filter((attempt) => attempt.examId === examId && attempt.status === 'in-progress')
        attempts.forEach((attempt) => {
          const deadline = new Date(attempt.deadlineAt || attempt.startedAt).getTime() + minutes * 60000
          updateRecord('attempts', attempt.id, { deadlineAt: new Date(deadline).toISOString() })
        })
      }
      if (action === 'force-submit') {
        const { attemptId } = payload
        assert(attemptId, 'Choose an attempt to force-submit.', { code: 'validation' })
        const attempt = store.attempts.find((item) => item.id === attemptId)
        assert(attempt && attempt.status === 'in-progress', 'Only an in-progress attempt can be force-submitted.', {
          code: 'conflict',
          status: 409,
        })
        updateRecord('attempts', attempt.id, {
          status: 'submitted',
          submittedAt: nowIso(),
          submittedReason: payload.reason || 'Force-submitted by the administrator',
        })
      }

      const control = {
        id: createId('control'),
        examId,
        action,
        note: payload?.reason || label,
        actorId: actor?.id,
        at: nowIso(),
        affectedStudentIds: payload?.affectedStudentIds || [],
      }
      writeSingleton('examControls', [...(store.examControls || []), control])

      addAuditEvent({
        actor,
        action: `exam.${action}`,
        actionLabel: label,
        entityType: 'exam',
        entityId: examId,
        entityLabel: exam.title,
        previousValue: exam.status,
        newValue: payload?.reason || label,
        reason: payload?.reason || 'Authorised examination control',
      })
      return control
    }, { latency: 280 })
  },

  /* ----------------------------- moderation ---------------------------- */

  async listModerationCases() {
    return request(() => {
      const store = loadStore()
      const recordingCases = store.recordings
        .filter((recording) => recording.moderationState === 'flagged' || recording.status === 'removed')
        .map((recording) => ({
          id: `mod_${recording.id}`,
          kind: 'recording',
          entityId: recording.id,
          title: recording.title,
          reportedBy: 'Student report',
          reason: recording.flagReason || 'Removed by moderation',
          state: recording.moderationState,
          at: recording.createdAt,
          subject: recording.subjectId,
          facultyName: findUser(recording.facultyId)?.name,
        }))
      const doubtCases = store.doubts
        .filter((doubt) => doubt.flagged || doubt.moderationState === 'flagged')
        .map((doubt) => ({
          id: `mod_${doubt.id}`,
          kind: 'doubt',
          entityId: doubt.id,
          title: doubt.title,
          reportedBy: 'Faculty report',
          reason: doubt.flagReason || 'Reported for inappropriate content',
          state: 'flagged',
          at: doubt.createdAt,
          subject: doubt.subjectId,
          facultyName: findUser(doubt.facultyId)?.name,
        }))
      return sortBy([...recordingCases, ...doubtCases], (item) => item.at, 'desc')
    }, { latency: 220 })
  },

  async updateModerationCase(caseId, state, note, actor) {
    return request(() => {
      const store = loadStore()
      const [prefix, entityId] = [caseId.slice(0, 4), caseId.slice(4)]
      assert(String(note || '').trim().length >= 5, 'Record a moderation note.', { code: 'validation' })
      assert(['clear', 'removed', 'restricted'].includes(state), 'Choose a valid moderation state.', { code: 'validation' })

      if (prefix === 'mod_') {
        const recording = store.recordings.find((item) => item.id === entityId)
        if (recording) {
          updateRecord('recordings', entityId, {
            moderationState: state === 'clear' ? 'clear' : state,
            moderationNote: note,
            moderatedBy: actor?.id,
            moderatedAt: nowIso(),
            ...(state === 'removed' ? { status: 'removed' } : {}),
          })
          addAuditEvent({
            actor,
            action: 'moderation.decided',
            actionLabel: 'Moderation case decided',
            entityType: 'recording',
            entityId,
            entityLabel: recording.title,
            previousValue: recording.moderationState,
            newValue: state,
            reason: note,
          })
          return { ok: true }
        }
        const doubt = store.doubts.find((item) => item.id === entityId)
        if (doubt) {
          updateRecord('doubts', entityId, { moderationState: state, flagged: state !== 'clear' })
          addAuditEvent({
            actor,
            action: 'moderation.decided',
            actionLabel: 'Moderation case decided',
            entityType: 'doubt',
            entityId,
            entityLabel: doubt.title,
            previousValue: 'flagged',
            newValue: state,
            reason: note,
          })
          return { ok: true }
        }
      }
      // Fallback for cases keyed without a prefix.
      const recording = store.recordings.find((item) => item.id === caseId)
      assert(recording, 'That moderation case does not exist.', { code: 'not-found', status: 404 })
      updateRecord('recordings', caseId, { moderationState: state, moderationNote: note, moderatedAt: nowIso() })
      return { ok: true }
    }, { latency: 280 })
  },

  /* ------------------------------ audit log ---------------------------- */

  async listAudit({ query, action, actorRole, entityType, from, to } = {}) {
    return request(() => {
      let events = readAll('audit')
      if (query) {
        const needle = String(query).toLowerCase()
        events = events.filter(
          (event) =>
            event.entityLabel.toLowerCase().includes(needle) ||
            event.actionLabel.toLowerCase().includes(needle) ||
            (findUser(event.actorId)?.name || '').toLowerCase().includes(needle),
        )
      }
      if (action && action !== 'all') events = events.filter((event) => event.action === action)
      if (actorRole && actorRole !== 'all') events = events.filter((event) => event.actorRole === actorRole)
      if (entityType && entityType !== 'all') events = events.filter((event) => event.entityType === entityType)
      if (from) events = events.filter((event) => new Date(event.at) >= new Date(from))
      if (to) events = events.filter((event) => new Date(event.at) <= new Date(to))
      return sortBy(events, (event) => event.at, 'desc').map((event) => ({
        ...event,
        actorName: findUser(event.actorId)?.name || (event.actorRole === 'system' ? 'System' : event.actorId),
      }))
    }, { latency: 240 })
  },

  /* ------------------------------- settings ---------------------------- */

  async getSettings() {
    return request(
      () => ({
        institute: loadStore().institute,
        settings: getSettings(),
        policies: getPolicies(),
      }),
      { latency: 160 },
    )
  },

  async updateInstitute(payload, actor) {
    return request(() => {
      const store = loadStore()
      assert(String(payload.name || '').trim().length >= 3, 'Institute name is required.', { code: 'validation' })
      const updated = { ...store.institute, ...payload }
      writeSingleton('institute', updated)
      addAuditEvent({
        actor,
        action: 'institute.updated',
        actionLabel: 'Institute profile updated',
        entityType: 'institute',
        entityId: updated.id,
        entityLabel: updated.name,
        previousValue: store.institute.name,
        newValue: updated.name,
        reason: 'Settings update',
      })
      return updated
    }, { latency: 260 })
  },

  async updateSettings(payload, actor) {
    return request(() => {
      const store = loadStore()
      const settings = { ...(store.settings || {}), ...payload }
      writeSingleton('settings', settings)
      addAuditEvent({
        actor,
        action: 'settings.updated',
        actionLabel: 'Settings updated',
        entityType: 'settings',
        entityId: 'settings',
        entityLabel: 'Display and notification settings',
        previousValue: JSON.stringify(store.settings),
        newValue: JSON.stringify(settings),
        reason: 'Preferences update',
      })
      return settings
    }, { latency: 240 })
  },

  /* -------------------------------- reports --------------------------- */

  async getReportData(reportId, filters = {}) {
    return request(
      () => {
        const store = loadStore()
        switch (reportId) {
          case 'report_student_performance': {
            const batch = filters.batchId && filters.batchId !== 'all'
              ? store.batches.find((item) => item.id === filters.batchId)
              : null
            const studentIds = batch ? batch.studentIds : store.users.filter((user) => user.role === 'student').map((user) => user.id)
            const rows = studentIds.map((studentId) => {
              const attempts = store.attempts.filter(
                (attempt) => attempt.studentId === studentId && attempt.status !== 'in-progress',
              )
              const evaluations = attempts
                .map((attempt) => {
                  const exam = store.exams.find((item) => item.id === attempt.examId)
                  if (!exam) return null
                  if (filters.subjectId && filters.subjectId !== 'all') {
                    const usesSubject = (exam.sections || []).some((section) => section.subjectId === filters.subjectId)
                    if (!usesSubject) return null
                  }
                  return evaluateAttempt(exam, attempt).totals
                })
                .filter(Boolean)
              return {
                studentId,
                name: findUser(studentId)?.name || studentId,
                attempts: evaluations.length,
                averagePercentage: evaluations.length
                  ? round(evaluations.reduce((sum, item) => sum + Math.max(item.percentage, 0), 0) / evaluations.length, 1)
                  : 0,
                bestPercentage: evaluations.length
                  ? Math.max(...evaluations.map((item) => Math.max(item.percentage, 0)))
                  : 0,
                accuracy: evaluations.length
                  ? round(evaluations.reduce((sum, item) => sum + item.accuracy, 0) / evaluations.length, 1)
                  : 0,
                averageTimePerQuestion: evaluations.length
                  ? round(evaluations.reduce((sum, item) => sum + item.averageTimePerQuestion, 0) / evaluations.length, 1)
                  : 0,
              }
            })
            return {
              columns: [
                { key: 'name', label: 'Student' },
                { key: 'attempts', label: 'Attempts', align: 'right' },
                { key: 'averagePercentage', label: 'Average %', align: 'right' },
                { key: 'bestPercentage', label: 'Best %', align: 'right' },
                { key: 'accuracy', label: 'Accuracy %', align: 'right' },
                { key: 'averageTimePerQuestion', label: 'Avg sec/question', align: 'right' },
              ],
              rows: sortBy(rows, (row) => row.averagePercentage, 'desc'),
            }
          }
          case 'report_faculty_activity': {
            const facultyUsers = store.users.filter((user) => user.role === 'faculty')
            const rows = facultyUsers.map((faculty) => {
              const classes = store.classes.filter(
                (klass) => klass.facultyId === faculty.id && ['ended', 'recording-processing', 'recording-published'].includes(klass.status),
              )
              const exams = store.exams.filter((exam) => exam.createdBy === faculty.id)
              const doubts = store.doubts.filter((doubt) => doubt.facultyId === faculty.id)
              const attendanceRecords = store.attendance.filter((record) =>
                classes.some((klass) => klass.id === record.classId),
              )
              const attended = attendanceRecords.reduce((total, record) => total + record.attendedDuration, 0)
              const eligible = attendanceRecords.reduce((total, record) => total + record.eligibleDuration, 0)
              return {
                facultyId: faculty.id,
                name: faculty.name,
                subjectNames: (faculty.subjectIds || []).join(', '),
                classesHeld: classes.length,
                examsAuthored: exams.length,
                doubtsResolved: doubts.filter((doubt) => ['answered', 'resolved'].includes(doubt.status)).length,
                averageAttendance: eligible ? round((attended / eligible) * 100, 1) : 0,
              }
            })
            return {
              columns: [
                { key: 'name', label: 'Faculty' },
                { key: 'classesHeld', label: 'Classes held', align: 'right' },
                { key: 'examsAuthored', label: 'Exams authored', align: 'right' },
                { key: 'doubtsResolved', label: 'Doubts resolved', align: 'right' },
                { key: 'averageAttendance', label: 'Class attendance %', align: 'right' },
              ],
              rows,
            }
          }
          case 'report_batch_performance': {
            const rows = store.batches.map((batch) => {
              const attempts = store.attempts.filter(
                (attempt) => batch.studentIds.includes(attempt.studentId) && attempt.status !== 'in-progress',
              )
              const evaluations = attempts
                .map((attempt) => {
                  const exam = store.exams.find((item) => item.id === attempt.examId)
                  return exam ? evaluateAttempt(exam, attempt).totals.percentage : null
                })
                .filter((value) => value !== null)
              const attendanceRecords = store.attendance.filter(
                (record) => store.classes.find((klass) => klass.id === record.classId)?.batchId === batch.id,
              )
              const attended = attendanceRecords.reduce((total, record) => total + record.attendedDuration, 0)
              const eligible = attendanceRecords.reduce((total, record) => total + record.eligibleDuration, 0)
              return {
                batchId: batch.id,
                name: batch.name,
                program: batch.program,
                students: batch.studentIds.length,
                averagePercentage: evaluations.length
                  ? round(evaluations.reduce((sum, value) => sum + Math.max(value, 0), 0) / evaluations.length, 1)
                  : 0,
                attendancePercent: eligible ? round((attended / eligible) * 100, 1) : 0,
                activeExams: store.exams.filter(
                  (exam) => (exam.batchIds || []).includes(batch.id) && exam.status === 'published',
                ).length,
              }
            })
            return {
              columns: [
                { key: 'name', label: 'Batch' },
                { key: 'program', label: 'Programme' },
                { key: 'students', label: 'Students', align: 'right' },
                { key: 'averagePercentage', label: 'Average %', align: 'right' },
                { key: 'attendancePercent', label: 'Attendance %', align: 'right' },
                { key: 'activeExams', label: 'Published exams', align: 'right' },
              ],
              rows,
            }
          }
          case 'report_exam_statistics': {
            const rows = store.exams.map((exam) => {
              const attempts = store.attempts.filter((attempt) => attempt.examId === exam.id && attempt.status !== 'in-progress')
              const evaluations = attempts.map((attempt) => evaluateAttempt(exam, attempt))
              const hardest = evaluations
                .flatMap((evaluation) => evaluation.items)
                .sort((a, b) => (a.status === 'correct' ? 1 : 0) - (b.status === 'correct' ? 1 : 0))[0]
              return {
                examId: exam.id,
                title: exam.title,
                type: exam.type,
                status: exam.status,
                candidates: attempts.length,
                submitted: attempts.filter((attempt) => ['submitted', 'expired'].includes(attempt.status)).length,
                averageScore: evaluations.length
                  ? round(evaluations.reduce((sum, evaluation) => sum + Math.max(evaluation.totals.awardedMarks, 0), 0) / evaluations.length, 1)
                  : 0,
                highestScore: evaluations.length
                  ? Math.max(...evaluations.map((evaluation) => Math.max(evaluation.totals.awardedMarks, 0)))
                  : 0,
                hardestQuestion: hardest ? hardest.question?.text.slice(0, 60) : '—',
              }
            })
            return {
              columns: [
                { key: 'title', label: 'Examination' },
                { key: 'type', label: 'Type' },
                { key: 'status', label: 'Status' },
                { key: 'candidates', label: 'Candidates', align: 'right' },
                { key: 'submitted', label: 'Submitted', align: 'right' },
                { key: 'averageScore', label: 'Average marks', align: 'right' },
                { key: 'highestScore', label: 'Highest', align: 'right' },
                { key: 'hardestQuestion', label: 'Most-missed question' },
              ],
              rows,
            }
          }
          case 'report_attendance': {
            const rows = store.users
              .filter((user) => user.role === 'student')
              .filter((user) => {
                if (!filters.batchId || filters.batchId === 'all') return true
                return store.students.find((profile) => profile.id === user.id)?.batchId === filters.batchId
              })
              .map((user) => {
                const records = store.attendance.filter((record) => record.studentId === user.id)
                const computed = records.map((record) =>
                  computeAttendance(record, store.classes.find((klass) => klass.id === record.classId), store.policies),
                )
                const attended = computed.reduce((total, record) => total + record.attendedDuration, 0)
                const eligible = computed.reduce((total, record) => total + record.eligibleDuration, 0)
                const percentage = eligible ? round((attended / eligible) * 100, 1) : 0
                return {
                  studentId: user.id,
                  name: user.name,
                  enrollmentId: user.enrollmentId,
                  sessions: computed.length,
                  attendedHours: round(attended / 60, 1),
                  attendancePercent: percentage,
                  belowThreshold: percentage < (store.policies?.attendance?.defaultThresholdPercent ?? 75),
                }
              })
            return {
              columns: [
                { key: 'name', label: 'Student' },
                { key: 'enrollmentId', label: 'Enrolment' },
                { key: 'sessions', label: 'Sessions', align: 'right' },
                { key: 'attendedHours', label: 'Attended hours', align: 'right' },
                { key: 'attendancePercent', label: 'Attendance %', align: 'right' },
                { key: 'belowThreshold', label: 'Below threshold' },
              ],
              rows,
            }
          }
          case 'report_live_participation': {
            const classes = store.classes.filter((klass) =>
              ['ended', 'recording-processing', 'recording-published', 'live'].includes(klass.status),
            )
            const rows = classes.map((klass) => {
              const batch = store.batches.find((item) => item.id === klass.batchId)
              const records = store.attendance.filter((record) => record.classId === klass.id)
              const computed = records.map((record) => computeAttendance(record, klass, store.policies))
              return {
                classId: klass.id,
                title: klass.title,
                batchName: batch?.name || '—',
                joined: computed.filter((record) => record.attendedDuration > 0).length,
                roster: batch?.studentIds.length || 0,
                averageAttendedMinutes: computed.length
                  ? round(computed.reduce((sum, record) => sum + record.attendedDuration, 0) / computed.length, 1)
                  : 0,
                reconnections: records.reduce((total, record) => total + record.reconnectionEvents.length, 0),
              }
            })
            return {
              columns: [
                { key: 'title', label: 'Session' },
                { key: 'batchName', label: 'Batch' },
                { key: 'joined', label: 'Joined', align: 'right' },
                { key: 'roster', label: 'Roster', align: 'right' },
                { key: 'averageAttendedMinutes', label: 'Avg attended min', align: 'right' },
                { key: 'reconnections', label: 'Reconnections', align: 'right' },
              ],
              rows,
            }
          }
          case 'report_recording_engagement': {
            const rows = store.recordings.map((recording) => ({
              id: recording.id,
              title: recording.title,
              subject: recording.subjectId,
              status: recording.status,
              views: recording.views,
              downloadsAllowed: recording.allowDownload ? 'Yes' : 'No',
              moderation: recording.moderationState,
            }))
            return {
              columns: [
                { key: 'title', label: 'Recording' },
                { key: 'status', label: 'Status' },
                { key: 'views', label: 'Views', align: 'right' },
                { key: 'downloadsAllowed', label: 'Downloads' },
                { key: 'moderation', label: 'Moderation' },
              ],
              rows,
            }
          }
          case 'report_doubt_resolution': {
            const facultyIds = [...new Set(store.doubts.map((doubt) => doubt.facultyId))]
            const rows = facultyIds.map((facultyId) => {
              const doubts = store.doubts.filter((doubt) => doubt.facultyId === facultyId)
              const responded = doubts.filter((doubt) => doubt.replies.length > 0)
              const responseTimes = responded.map(
                (doubt) => (new Date(doubt.replies[0].createdAt) - new Date(doubt.createdAt)) / 3600000,
              )
              return {
                facultyId,
                name: findUser(facultyId)?.name || facultyId,
                total: doubts.length,
                resolved: doubts.filter((doubt) => doubt.status === 'resolved').length,
                open: doubts.filter((doubt) => doubt.status === 'open').length,
                medianResponseHours: responseTimes.length
                  ? round(responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)], 1)
                  : null,
              }
            })
            return {
              columns: [
                { key: 'name', label: 'Faculty' },
                { key: 'total', label: 'Doubts', align: 'right' },
                { key: 'resolved', label: 'Resolved', align: 'right' },
                { key: 'open', label: 'Open', align: 'right' },
                { key: 'medianResponseHours', label: 'Median response (hrs)', align: 'right' },
              ],
              rows,
            }
          }
          case 'report_support': {
            const rows = store.supportTickets.map((ticket) => ({
              id: ticket.id,
              code: ticket.code,
              subject: ticket.subject,
              role: ticket.role,
              category: ticket.category,
              status: ticket.status,
              created: ticket.createdAt,
              resolved: ticket.status === 'resolved' || ticket.status === 'closed' ? ticket.updatedAt : '—',
            }))
            return {
              columns: [
                { key: 'code', label: 'Ticket' },
                { key: 'subject', label: 'Subject' },
                { key: 'role', label: 'Raised by' },
                { key: 'category', label: 'Category' },
                { key: 'status', label: 'Status' },
                { key: 'created', label: 'Created' },
                { key: 'resolved', label: 'Closed' },
              ],
              rows,
            }
          }
          default:
            return { columns: [], rows: [] }
        }
      },
      { latency: 420 },
    )
  },

  async getMonthlyAttendanceTrend() {
    return request(() => {
      const store = loadStore()
      const buckets = new Map()
      store.attendance.forEach((record) => {
        const klass = store.classes.find((item) => item.id === record.classId)
        const computed = computeAttendance(record, klass, store.policies)
        const key = monthKey(klass?.scheduledStartAt || nowIso())
        const bucket = buckets.get(key) || { key, attended: 0, eligible: 0 }
        bucket.attended += computed.attendedDuration
        bucket.eligible += computed.eligibleDuration
        buckets.set(key, bucket)
      })
      return [...buckets.values()]
        .map((bucket) => ({
          key: bucket.key,
          percentage: bucket.eligible ? round((bucket.attended / bucket.eligible) * 100, 1) : 0,
        }))
        .sort((a, b) => a.key.localeCompare(b.key))
    }, { latency: 180 })
  },

  /* ------------------------- demo data management ---------------------- */

  async resetDemoData(actor) {
    return request(() => {
      resetStore()
      addAuditEvent({
        actor,
        action: 'demo.reset',
        actionLabel: 'Demo data reset',
        entityType: 'settings',
        entityId: 'demo',
        entityLabel: 'Local demonstration dataset',
        previousValue: 'Existing local changes',
        newValue: 'Seed dataset restored',
        reason: 'Development-only reset from Settings',
      })
      return { ok: true }
    }, { latency: 300 })
  },
}

export { flattenPolicies }
