/* Shared lookups and side effects used by multiple services. Keeping them here
   prevents circular imports between feature services. */

import { insert, loadStore, readAll, readOne, writeSingleton } from '../data/mock/mock-storage.js'
import { createId, nowIso } from './api.js'

export { createId, nowIso }

export function allUsers() {
  return readAll('users')
}

export function findUser(userId) {
  return readOne('users', userId)
}

export function findStudentProfile(studentId) {
  return readOne('students', studentId)
}

export function findFacultyProfile(facultyId) {
  return readOne('faculty', facultyId)
}

export function findBatch(batchId) {
  return readOne('batches', batchId)
}

export function findSubject(subjectId) {
  return readOne('subjects', subjectId)
}

export function findQuestion(questionId) {
  return readOne('questions', questionId)
}

export function findExam(examId) {
  return readOne('exams', examId)
}

export function findClass(classId) {
  return readOne('classes', classId)
}

export function findAttempt(attemptId) {
  return readOne('attempts', attemptId)
}

export function findRecording(recordingId) {
  return readOne('recordings', recordingId)
}

export function findDoubt(doubtId) {
  return readOne('doubts', doubtId)
}

export function getPolicies() {
  return loadStore().policies
}

export function getInstitute() {
  return loadStore().institute
}

export function getSettings() {
  return loadStore().settings || {}
}

/** Public shape of a user, never including the password hash. */
export function publicUser(user) {
  if (!user) return null
  const { passwordHash, ...rest } = user
  return rest
}

/** Rich student view: identity + profile + batch + mentor. */
export function studentDetail(studentId) {
  const user = findUser(studentId)
  if (!user) return null
  const profile = findStudentProfile(studentId)
  const batch = profile ? findBatch(profile.batchId) : null
  const mentor = profile?.mentorFacultyId ? findUser(profile.mentorFacultyId) : null
  return {
    ...publicUser(user),
    profile,
    batch,
    mentor: publicUser(mentor),
  }
}

/** Rich faculty view: identity + profile + subjects + batches. */
export function facultyDetail(facultyId) {
  const user = findUser(facultyId)
  if (!user) return null
  const profile = findFacultyProfile(facultyId)
  const subjects = (user.subjectIds || profile?.subjectIds || []).map(findSubject).filter(Boolean)
  const batches = (user.batchIds || profile?.batchIds || []).map(findBatch).filter(Boolean)
  return { ...publicUser(user), profile, subjects, batches }
}

export function studentsOfBatch(batchId) {
  const batch = findBatch(batchId)
  if (!batch) return []
  return batch.studentIds.map((studentId) => findUser(studentId)).filter(Boolean).map(publicUser)
}

export function facultyOfBatch(batchId) {
  const batch = findBatch(batchId)
  if (!batch) return []
  return batch.facultyIds.map((facultyId) => findUser(facultyId)).filter(Boolean).map(publicUser)
}

/* ------------------------------ side effects ----------------------------- */

export function addAuditEvent({
  actor,
  action,
  actionLabel,
  entityType,
  entityId,
  entityLabel,
  previousValue = null,
  newValue = null,
  reason = null,
  ipLabel = 'This browser (demo)',
}) {
  const event = {
    id: createId('audit'),
    actorId: actor?.id ?? 'system',
    actorRole: actor?.role ?? 'system',
    action,
    actionLabel,
    entityType,
    entityId,
    entityLabel,
    at: nowIso(),
    previousValue,
    newValue,
    reason,
    ipLabel,
  }
  insert('audit', event)
  return event
}

export function notify({ userId, type, title, body, link = null, entityId = null }) {
  if (!userId) return null
  const notification = {
    id: createId('notif'),
    userId,
    type,
    title,
    body,
    createdAt: nowIso(),
    read: false,
    link,
    entityId,
  }
  insert('notifications', notification)
  return notification
}

export function notifyMany(userIds, payload) {
  return userIds.filter(Boolean).map((userId) => notify({ userId, ...payload }))
}

/** Persists a collection back through the singleton writer (used by services
    that need to update several records at once). */
export function commit(collection, records) {
  writeSingleton(collection, records)
  return records
}

export function getCollection(collection) {
  return readAll(collection)
}

export function findIntegrity(eventId) {
  return readAll('integrity').find((event) => event.id === eventId) || null
}

export function getExamControls(examId) {
  const store = loadStore()
  const controls = store.examControls || []
  return examId ? controls.filter((control) => control.examId === examId) : controls
}
