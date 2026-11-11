/* Batch + subject directory service. */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord, writeSingleton } from '../data/mock/mock-storage.js'
import { addAuditEvent, publicUser, findSubject } from './repository.js'
import { evaluateAttempt } from '../lib/exam-calculations.js'
import { round } from './api.js'

function decorateBatch(batch) {
  const store = loadStore()
  const students = batch.studentIds.map((id) => store.users.find((user) => user.id === id)).filter(Boolean)
  const faculty = batch.facultyIds.map((id) => store.users.find((user) => user.id === id)).filter(Boolean)
  return {
    ...batch,
    students: students.map(publicUser),
    faculty: faculty.map(publicUser),
    subjects: batch.subjectIds.map(findSubject).filter(Boolean),
    studentCount: students.length,
    facultyCount: faculty.length,
    utilisation: batch.capacity ? round((students.length / batch.capacity) * 100, 0) : 0,
  }
}

export const batchService = {
  async listBatches({ status, program, search } = {}) {
    return request(() => {
      let batches = readAll('batches')
      if (status && status !== 'all') batches = batches.filter((batch) => batch.status === status)
      if (program && program !== 'all') batches = batches.filter((batch) => batch.program === program)
      if (search) {
        const needle = String(search).toLowerCase()
        batches = batches.filter(
          (batch) => batch.name.toLowerCase().includes(needle) || batch.code.toLowerCase().includes(needle),
        )
      }
      return sortBy(batches, (batch) => batch.createdAt, 'desc').map(decorateBatch)
    }, { latency: 220 })
  },

  async getBatch(batchId) {
    return request(() => {
      const batch = readAll('batches').find((item) => item.id === batchId)
      assert(batch, 'That batch does not exist.', { code: 'not-found', status: 404 })
      const store = loadStore()
      const exams = store.exams.filter((exam) => (exam.batchIds || []).includes(batchId))
      const classes = store.classes.filter((item) => item.batchId === batchId)
      const attendanceRecords = store.attendance.filter((record) => {
        const klass = store.classes.find((item) => item.id === record.classId)
        return klass?.batchId === batchId
      })
      const attempts = store.attempts.filter((attempt) => batch.studentIds.includes(attempt.studentId) && attempt.status !== 'in-progress')
      const evaluations = attempts
        .map((attempt) => {
          const exam = store.exams.find((item) => item.id === attempt.examId)
          return exam ? evaluateAttempt(exam, attempt).totals.percentage : null
        })
        .filter((value) => value !== null)
      return {
        ...decorateBatch(batch),
        exams: exams.map((exam) => ({ id: exam.id, title: exam.title, status: exam.status, startAt: exam.startAt })),
        classes: classes.map((klass) => ({
          id: klass.id,
          title: klass.title,
          status: klass.status,
          scheduledStartAt: klass.scheduledStartAt,
        })),
        attendanceRecords: attendanceRecords.length,
        performance: {
          attempts: evaluations.length,
          average: evaluations.length
            ? round(evaluations.reduce((sum, value) => sum + Math.max(value, 0), 0) / evaluations.length, 1)
            : 0,
        },
      }
    }, { latency: 240 })
  },

  async createBatch(payload, actor) {
    return request(() => {
      const store = loadStore()
      const { name, code, program, section, capacity, startDate, endDate, subjectIds = [], facultyIds = [], description } = payload
      assert(String(name || '').trim().length >= 3, 'Give the batch a name.', { code: 'validation' })
      assert(String(code || '').trim().length >= 3, 'Give the batch a code.', { code: 'validation' })
      assert(
        !store.batches.some((batch) => batch.code.toLowerCase() === String(code).toLowerCase()),
        'A batch with that code already exists.',
        { code: 'conflict', status: 409 },
      )
      assert(program, 'Choose a programme.', { code: 'validation' })
      assert(Number(capacity) > 0, 'Capacity must be greater than zero.', { code: 'validation' })
      assert(startDate && endDate, 'Set the batch start and end dates.', { code: 'validation' })
      assert(new Date(endDate) > new Date(startDate), 'The end date must be after the start date.', { code: 'validation' })

      const id = createId('batch')
      const batch = {
        id,
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        section: section || 'A',
        program,
        studentIds: [],
        facultyIds,
        subjectIds,
        schedule: payload.schedule || [],
        startDate,
        endDate,
        status: 'active',
        capacity: Number(capacity),
        attendanceThreshold: Number(payload.attendanceThreshold ?? 75),
        createdAt: nowIso(),
        description: description || '',
      }
      insert('batches', batch)
      addAuditEvent({
        actor,
        action: 'batch.created',
        actionLabel: 'Batch created',
        entityType: 'batch',
        entityId: id,
        entityLabel: batch.name,
        previousValue: null,
        newValue: `${batch.code} · capacity ${batch.capacity}`,
        reason: 'Administrative batch creation',
      })
      return decorateBatch(batch)
    }, { latency: 320 })
  },

  async updateBatch(batchId, payload, actor) {
    return request(() => {
      const store = loadStore()
      const batch = store.batches.find((item) => item.id === batchId)
      assert(batch, 'That batch does not exist.', { code: 'not-found', status: 404 })
      if (payload.capacity !== undefined) {
        assert(Number(payload.capacity) >= batch.studentIds.length, `Capacity cannot be below the current enrolment of ${batch.studentIds.length}.`, {
          code: 'validation',
        })
      }
      if (payload.startDate && payload.endDate) {
        assert(new Date(payload.endDate) > new Date(payload.startDate), 'The end date must be after the start date.', {
          code: 'validation',
        })
      }
      updateRecord('batches', batchId, { ...payload, capacity: payload.capacity !== undefined ? Number(payload.capacity) : batch.capacity })
      addAuditEvent({
        actor,
        action: 'batch.changed',
        actionLabel: 'Batch changed',
        entityType: 'batch',
        entityId: batchId,
        entityLabel: batch.name,
        previousValue: JSON.stringify({ name: batch.name, capacity: batch.capacity }),
        newValue: JSON.stringify({ name: payload.name ?? batch.name, capacity: payload.capacity ?? batch.capacity }),
        reason: payload.reason || 'Administrative update',
      })
      return decorateBatch(loadStore().batches.find((item) => item.id === batchId))
    })
  },

  async archiveBatch(batchId, actor) {
    return request(() => {
      const batch = readAll('batches').find((item) => item.id === batchId)
      assert(batch, 'That batch does not exist.', { code: 'not-found', status: 404 })
      updateRecord('batches', batchId, { status: 'archived' })
      addAuditEvent({
        actor,
        action: 'batch.archived',
        actionLabel: 'Batch archived',
        entityType: 'batch',
        entityId: batchId,
        entityLabel: batch.name,
        previousValue: batch.status,
        newValue: 'archived',
        reason: 'Batch concluded',
      })
      return decorateBatch(loadStore().batches.find((item) => item.id === batchId))
    })
  },

  async assignStudents(batchId, studentIds, actor) {
    return request(() => {
      const store = loadStore()
      const batch = store.batches.find((item) => item.id === batchId)
      assert(batch, 'That batch does not exist.', { code: 'not-found', status: 404 })
      assert(studentIds.length <= batch.capacity, `This batch has capacity for ${batch.capacity} students.`, {
        code: 'validation',
      })
      const previous = batch.studentIds.length
      writeSingleton(
        'batches',
        store.batches.map((item) => (item.id === batchId ? { ...item, studentIds } : item)),
      )
      // Keep student profiles in sync so the student workspace reflects the move.
      writeSingleton(
        'students',
        store.students.map((profile) =>
          studentIds.includes(profile.id) ? { ...profile, batchId } : profile,
        ),
      )
      writeSingleton(
        'users',
        store.users.map((user) =>
          user.role === 'student' && studentIds.includes(user.id) ? { ...user, batchIds: [batchId] } : user,
        ),
      )
      addAuditEvent({
        actor,
        action: 'batch.roster-changed',
        actionLabel: 'Batch roster changed',
        entityType: 'batch',
        entityId: batchId,
        entityLabel: batch.name,
        previousValue: `${previous} students`,
        newValue: `${studentIds.length} students`,
        reason: 'Roster updated by the administrator',
      })
      return decorateBatch(loadStore().batches.find((item) => item.id === batchId))
    })
  },

  async assignFaculty(batchId, facultyIds, actor) {
    return request(() => {
      const store = loadStore()
      const batch = store.batches.find((item) => item.id === batchId)
      assert(batch, 'That batch does not exist.', { code: 'not-found', status: 404 })
      writeSingleton(
        'batches',
        store.batches.map((item) => (item.id === batchId ? { ...item, facultyIds } : item)),
      )
      writeSingleton(
        'faculty',
        store.faculty.map((profile) =>
          profile.id ? { ...profile, batchIds: [...new Set([...(profile.batchIds || []), batchId])] } : profile,
        ),
      )
      addAuditEvent({
        actor,
        action: 'batch.faculty-changed',
        actionLabel: 'Batch faculty changed',
        entityType: 'batch',
        entityId: batchId,
        entityLabel: batch.name,
        previousValue: `${batch.facultyIds.length} faculty`,
        newValue: `${facultyIds.length} faculty`,
        reason: 'Faculty assignment updated',
      })
      return decorateBatch(loadStore().batches.find((item) => item.id === batchId))
    })
  },

  async listSubjects() {
    return request(() => readAll('subjects'), { latency: 100 })
  },

  async getBatchPerformance(batchId) {
    return request(() => {
      const store = loadStore()
      const batch = store.batches.find((item) => item.id === batchId)
      assert(batch, 'That batch does not exist.', { code: 'not-found', status: 404 })
      return batch.studentIds.map((studentId) => {
        const user = store.users.find((item) => item.id === studentId)
        const attempts = store.attempts.filter(
          (attempt) => attempt.studentId === studentId && attempt.status !== 'in-progress',
        )
        const evaluations = attempts
          .map((attempt) => {
            const exam = store.exams.find((item) => item.id === attempt.examId)
            return exam ? evaluateAttempt(exam, attempt).totals : null
          })
          .filter(Boolean)
        return {
          studentId,
          name: user?.name || studentId,
          attempts: evaluations.length,
          average: evaluations.length
            ? round(evaluations.reduce((sum, item) => sum + Math.max(item.percentage, 0), 0) / evaluations.length, 1)
            : 0,
          accuracy: evaluations.length
            ? round(evaluations.reduce((sum, item) => sum + item.accuracy, 0) / evaluations.length, 1)
            : 0,
        }
      })
    }, { latency: 200 })
  },
}
