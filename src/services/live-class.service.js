/* Live class service — the shared session lifecycle:
   scheduled → starting → live → ended → recording-processing → recording-published
   Faculty studio, student classroom, attendance and recordings all use these
   same class/session IDs. */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord, writeSingleton } from '../data/mock/mock-storage.js'
import {
  findUser,
  findBatch,
  findSubject,
  addAuditEvent,
  notifyMany,
  publicUser,
  getPolicies,
} from './repository.js'
import { startRecordingForSession } from './recording.service.js'

export function decorateClass(klass) {
  if (!klass) return null
  const batch = findBatch(klass.batchId)
  const subject = findSubject(klass.subjectId)
  const faculty = findUser(klass.facultyId)
  const recording = klass.recordingId ? loadStore().recordings.find((item) => item.id === klass.recordingId) : null
  return {
    ...klass,
    batch,
    subject,
    faculty: publicUser(faculty),
    recording,
    participantCount: batch?.studentIds?.length || 0,
    joinable: ['live', 'starting'].includes(klass.status) || (klass.status === 'scheduled' && new Date(klass.scheduledStartAt).getTime() - Date.now() < 30 * 60000),
  }
}

function studentBatchIds(studentId) {
  const store = loadStore()
  const profile = store.students.find((item) => item.id === studentId)
  return profile?.batchId ? [profile.batchId] : []
}

export const liveClassService = {
  async listClasses({ batchId, facultyId, status, subjectId, forStudentId } = {}) {
    return request(() => {
      let classes = readAll('classes')
      if (batchId && batchId !== 'all') classes = classes.filter((item) => item.batchId === batchId)
      if (facultyId) classes = classes.filter((item) => item.facultyId === facultyId)
      if (status && status !== 'all') {
        const statuses = Array.isArray(status) ? status : [status]
        classes = classes.filter((item) => statuses.includes(item.status))
      }
      if (subjectId && subjectId !== 'all') classes = classes.filter((item) => item.subjectId === subjectId)
      if (forStudentId) {
        const batchIds = studentBatchIds(forStudentId)
        classes = classes.filter((item) => batchIds.includes(item.batchId))
      }
      return sortBy(classes, (item) => item.scheduledStartAt, 'desc').map(decorateClass)
    })
  },

  async getClass(classId) {
    return request(() => {
      const klass = readAll('classes').find((item) => item.id === classId)
      assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
      const attendance = readAll('attendance').filter((record) => record.classId === classId)
      return { ...decorateClass(klass), attendanceRecords: attendance }
    })
  },

  /** Student-facing schedule split into live / upcoming / completed. */
  async getStudentClasses(studentId) {
    return request(() => {
      const batchIds = studentBatchIds(studentId)
      const store = loadStore()
      const classes = store.classes
        .filter((item) => batchIds.includes(item.batchId))
        .map(decorateClass)
      const withAttendance = classes.map((klass) => {
        const record = store.attendance.find(
          (item) => item.classId === klass.id && item.studentId === studentId,
        )
        return { ...klass, attendanceRecord: record || null }
      })
      return {
        live: withAttendance.filter((item) => ['live', 'starting'].includes(item.status)),
        upcoming: withAttendance
          .filter((item) => item.status === 'scheduled')
          .sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt)),
        completed: withAttendance.filter((item) =>
          ['ended', 'recording-processing', 'recording-published', 'cancelled'].includes(item.status),
        ),
      }
    }, { latency: 240 })
  },

  /** Access control for the student classroom. */
  async getStudentClassroomAccess(classId, studentId) {
    return request(() => {
      const store = loadStore()
      const klass = store.classes.find((item) => item.id === classId)
      assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
      const student = store.users.find((item) => item.id === studentId)
      assert(student?.role === 'student', 'Only enrolled students can join a classroom.', { code: 'forbidden', status: 403 })
      const batchIds = studentBatchIds(studentId)
      assert(
        batchIds.includes(klass.batchId),
        'This class belongs to a batch you are not enrolled in.',
        { code: 'forbidden', status: 403 },
      )
      const policy = getPolicies()?.attendance
      const minutesSinceStart = klass.sessionStartedAt
        ? (Date.now() - new Date(klass.sessionStartedAt).getTime()) / 60000
        : null
      const pastLateWindow =
        klass.sessionStartedAt && !klass.lateJoinAllowed && minutesSinceStart > (policy?.lateJoinAllowanceMinutes ?? 15)

      let canJoin = false
      let reason = null
      if (klass.status === 'cancelled') reason = 'This session was cancelled.'
      else if (klass.status === 'scheduled') reason = 'The session has not started yet.'
      else if (['ended', 'recording-processing', 'recording-published'].includes(klass.status)) {
        reason = 'This session has ended. The recording is available in Recordings.'
      } else if (pastLateWindow) reason = 'Late joining is not permitted for this session.'
      else canJoin = true

      return {
        klass: decorateClass(klass),
        canJoin,
        reason,
        recording: klass.recordingId ? store.recordings.find((item) => item.id === klass.recordingId) : null,
        sessionInfo: {
          sessionId: klass.sessionId,
          faculty: publicUser(findUser(klass.facultyId)),
          batch: findBatch(klass.batchId),
          subject: findSubject(klass.subjectId),
        },
      }
    }, { latency: 200 })
  },

  async createClass(payload, actor) {
    return request(() => {
      const store = loadStore()
      const { title, description, batchId, subjectId, startAt, endAt, recordingEnabled = true, lateJoinAllowed = false } = payload
      assert(String(title || '').trim().length >= 5, 'Give the class a clear title (at least 5 characters).', { code: 'validation' })
      assert(batchId, 'Select a batch.', { code: 'validation' })
      assert(subjectId, 'Select a subject.', { code: 'validation' })
      assert(startAt && endAt, 'Set a start and end time.', { code: 'validation' })
      assert(new Date(endAt) > new Date(startAt), 'The end time must be after the start time.', { code: 'validation' })
      const durationMinutes = Math.round((new Date(endAt) - new Date(startAt)) / 60000)
      assert(durationMinutes >= 5 && durationMinutes <= 240, 'Class length must be between 5 and 240 minutes.', {
        code: 'validation',
      })
      const facultyId = payload.facultyId || actor?.id
      assert(facultyId, 'A faculty member must own the class.', { code: 'validation' })

      const id = createId('class')
      const klass = {
        id,
        sessionId: createId('sess'),
        title: String(title).trim(),
        description: description || '',
        batchId,
        subjectId,
        facultyId,
        scheduledStartAt: new Date(startAt).toISOString(),
        scheduledEndAt: new Date(endAt).toISOString(),
        durationMinutes,
        status: 'scheduled',
        sessionStartedAt: null,
        sessionEndedAt: null,
        lateJoinAllowed: Boolean(lateJoinAllowed),
        recordingEnabled: Boolean(recordingEnabled),
        recordingId: null,
        resourceName: payload.resourceName || null,
        polls: [],
        createdAt: nowIso(),
      }
      insert('classes', klass)

      const batch = store.batches.find((item) => item.id === batchId)
      notifyMany(batch?.studentIds || [], {
        type: 'class-scheduled',
        title: `Class scheduled: ${klass.title}`,
        body: `${findUser(facultyId)?.name || 'Faculty'} · ${new Date(klass.scheduledStartAt).toISOString()}`,
        link: `/student/live-classes/${klass.id}`,
        entityId: klass.id,
      })
      addAuditEvent({
        actor,
        action: 'class.created',
        actionLabel: 'Class scheduled',
        entityType: 'class',
        entityId: klass.id,
        entityLabel: klass.title,
        previousValue: null,
        newValue: `scheduled for ${klass.scheduledStartAt}`,
        reason: payload.reason || 'Faculty scheduled a live class',
      })
      return decorateClass(klass)
    })
  },

  async updateClass(classId, payload, actor) {
    return request(() => {
      const store = loadStore()
      const klass = store.classes.find((item) => item.id === classId)
      assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
      assert(!['live', 'ended', 'recording-processing', 'recording-published'].includes(klass.status), 'A class that has already run cannot be edited. Schedule a new session instead.', {
        code: 'locked',
        status: 409,
      })
      if (payload.startAt && payload.endAt) {
        assert(new Date(payload.endAt) > new Date(payload.startAt), 'The end time must be after the start time.', {
          code: 'validation',
        })
      }
      const previous = { startAt: klass.scheduledStartAt, title: klass.title }
      updateRecord('classes', classId, {
        ...payload,
        ...(payload.startAt ? { scheduledStartAt: new Date(payload.startAt).toISOString() } : {}),
        ...(payload.endAt ? { scheduledEndAt: new Date(payload.endAt).toISOString() } : {}),
        updatedAt: nowIso(),
      })
      addAuditEvent({
        actor,
        action: 'class.modified',
        actionLabel: 'Class updated',
        entityType: 'class',
        entityId: classId,
        entityLabel: klass.title,
        previousValue: JSON.stringify(previous),
        newValue: JSON.stringify({ startAt: payload.startAt ?? klass.scheduledStartAt, title: payload.title ?? klass.title }),
        reason: payload.reason || 'Faculty updated the schedule',
      })
      return decorateClass(loadStore().classes.find((item) => item.id === classId))
    })
  },

  async cancelClass(classId, reason, actor) {
    return request(() => {
      const store = loadStore()
      const klass = store.classes.find((item) => item.id === classId)
      assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
      assert(klass.status === 'scheduled', 'Only a scheduled class can be cancelled.', { code: 'conflict', status: 409 })
      assert(String(reason || '').trim().length >= 8, 'Give a short reason for cancelling.', { code: 'validation' })
      updateRecord('classes', classId, { status: 'cancelled', cancellationReason: reason })
      const batch = store.batches.find((item) => item.id === klass.batchId)
      notifyMany(batch?.studentIds || [], {
        type: 'class-cancelled',
        title: `Class cancelled: ${klass.title}`,
        body: reason,
        link: '/student/live-classes',
        entityId: klass.id,
      })
      addAuditEvent({
        actor,
        action: 'class.cancelled',
        actionLabel: 'Class cancelled',
        entityType: 'class',
        entityId: classId,
        entityLabel: klass.title,
        previousValue: 'scheduled',
        newValue: 'cancelled',
        reason,
      })
      return decorateClass(loadStore().classes.find((item) => item.id === classId))
    })
  },

  async startSession(classId, actor) {
    return request(
      () => {
        const store = loadStore()
        const klass = store.classes.find((item) => item.id === classId)
        assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
        assert(klass.status !== 'cancelled', 'A cancelled class cannot be started.', { code: 'conflict', status: 409 })
        if (klass.status === 'live') return decorateClass(klass)
        assert(klass.status === 'scheduled', 'This session has already been run.', { code: 'conflict', status: 409 })

        updateRecord('classes', classId, {
          status: 'live',
          sessionStartedAt: nowIso(),
        })
        const batch = store.batches.find((item) => item.id === klass.batchId)
        notifyMany(batch?.studentIds || [], {
          type: 'class-live',
          title: `${klass.title} is live`,
          body: `${findUser(klass.facultyId)?.name || 'Faculty'} started the session. Join now.`,
          link: `/student/live-classes/${klass.id}`,
          entityId: klass.id,
        })
        addAuditEvent({
          actor,
          action: 'class.started',
          actionLabel: 'Class session started',
          entityType: 'class',
          entityId: classId,
          entityLabel: klass.title,
          previousValue: 'scheduled',
          newValue: 'live',
          reason: 'Faculty started the session from the studio',
        })
        return decorateClass(loadStore().classes.find((item) => item.id === classId))
      },
      { latency: 300 },
    )
  },

  async endSession(classId, actor) {
    return request(
      () => {
        const store = loadStore()
        const klass = store.classes.find((item) => item.id === classId)
        assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
        assert(klass.status === 'live', 'Only a live session can be ended.', { code: 'conflict', status: 409 })

        updateRecord('classes', classId, {
          status: 'ended',
          sessionEndedAt: nowIso(),
        })

        let recording = null
        if (klass.recordingEnabled) {
          recording = startRecordingForSession(classId, actor)
          updateRecord('classes', classId, {
            status: 'recording-processing',
            recordingId: recording.id,
          })
        }

        addAuditEvent({
          actor,
          action: 'class.ended',
          actionLabel: 'Class session ended',
          entityType: 'class',
          entityId: classId,
          entityLabel: klass.title,
          previousValue: 'live',
          newValue: klass.recordingEnabled ? 'recording-processing' : 'ended',
          reason: 'Faculty ended the session',
        })

        const updated = loadStore().classes.find((item) => item.id === classId)
        return { klass: decorateClass(updated), recording }
      },
      { latency: 320 },
    )
  },

  /** Reconnection event recorded from the classroom UI. */
  async logReconnection(classId, studentId) {
    return request(() => {
      const store = loadStore()
      const record = store.attendance.find(
        (item) => item.classId === classId && item.studentId === studentId,
      )
      if (!record) return { ok: false }
      updateRecord('attendance', record.id, {
        reconnectionEvents: [...record.reconnectionEvents, { at: nowIso(), reason: 'connection interrupted' }],
      })
      insert('integrity', {
        id: createId('int_evt'),
        attemptId: null,
        examId: null,
        classId,
        studentId,
        type: 'class-reconnection',
        severity: 'info',
        label: 'Reconnected to a live class',
        detail: 'A brief connection interruption was recorded during the live session.',
        at: nowIso(),
        resolved: false,
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
      })
      return { ok: true }
    }, { latency: 90 })
  },

  async savePoll(classId, poll, actor) {
    return request(() => {
      const store = loadStore()
      const klass = store.classes.find((item) => item.id === classId)
      assert(klass, 'That class does not exist.', { code: 'not-found', status: 404 })
      assert(poll?.question && poll.options?.length >= 2, 'A poll needs a question and at least two options.', {
        code: 'validation',
      })
      const record = {
        id: createId('poll'),
        question: poll.question,
        options: poll.options,
        correctIndex: poll.correctIndex ?? null,
        startedAt: nowIso(),
        endedAt: null,
      }
      writeSingleton('classes', store.classes.map((item) =>
        item.id === classId ? { ...item, polls: [...item.polls, record] } : item,
      ))
      return record
    }, { latency: 120 })
  },

  /** Faculty dashboard preview of today's schedule + live sessions. */
  async getFacultyClassOverview(facultyId) {
    return request(() => {
      const store = loadStore()
      const classes = store.classes
        .filter((item) => item.facultyId === facultyId)
        .map(decorateClass)
        .sort((a, b) => new Date(b.scheduledStartAt) - new Date(a.scheduledStartAt))
      return {
        live: classes.filter((item) => item.status === 'live'),
        upcoming: classes
          .filter((item) => item.status === 'scheduled')
          .sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt)),
        recent: classes.filter((item) => ['ended', 'recording-processing', 'recording-published'].includes(item.status)),
        cancelled: classes.filter((item) => item.status === 'cancelled'),
      }
    }, { latency: 220 })
  },

  async getRoster(batchId) {
    return request(() => {
      const batch = findBatch(batchId)
      if (!batch) return []
      return batch.studentIds.map((studentId) => {
        const user = findUser(studentId)
        return { ...publicUser(user), id: studentId }
      })
    }, { latency: 120 })
  },
}
