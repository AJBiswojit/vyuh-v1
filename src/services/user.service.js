/* User, student and faculty directory service. */

import { ApiError, request, assert, nowIso, createId, paginate } from './api.js'
import {
  insert,
  loadStore,
  readAll,
  updateRecord,
  writeSingleton,
  hashPassword,
  removeRecord,
} from '../data/mock/mock-storage.js'
import {
  publicUser,
  studentDetail,
  facultyDetail,
  addAuditEvent,
  studentsOfBatch,
} from './repository.js'
import { validatePassword, isEmail, isPhone } from '../lib/validation.js'
import { getPolicies } from './repository.js'
import { DEMO_PASSWORD } from '../data/mock/users.mock.js'

function nextEnrollmentId(store) {
  const year = new Date().getFullYear()
  const count = store.users.filter((user) => user.role === 'student').length + 1
  return `VY-${year}-${String(count).padStart(4, '0')}`
}

function nextEmployeeId(store) {
  const count = store.users.filter((user) => user.role === 'faculty').length + 1
  return `FAC-${String(count + 31).padStart(3, '0')}`
}

export const userService = {
  async list({ role, status, batchId, search, page = 1, pageSize = 25, sort = 'name' } = {}) {
    return request(() => {
      const store = loadStore()
      let users = store.users.map(publicUser)
      if (role && role !== 'all') users = users.filter((user) => user.role === role)
      if (status && status !== 'all') users = users.filter((user) => user.status === status)
      if (batchId && batchId !== 'all') {
        users = users.filter((user) => {
          if (user.role === 'student') {
            const profile = store.students.find((item) => item.id === user.id)
            return profile?.batchId === batchId
          }
          return (user.batchIds || []).includes(batchId)
        })
      }
      if (search) {
        const needle = String(search).toLowerCase()
        users = users.filter(
          (user) =>
            user.name.toLowerCase().includes(needle) ||
            user.email.toLowerCase().includes(needle) ||
            (user.enrollmentId || '').toLowerCase().includes(needle) ||
            (user.employeeId || '').toLowerCase().includes(needle),
        )
      }
      users = [...users].sort((a, b) => a[sort]?.localeCompare?.(b[sort]) ?? 0)
      return paginate(users, page, pageSize)
    })
  },

  async getAllUsers({ role } = {}) {
    return request(() => {
      const users = readAll('users').map(publicUser)
      return role ? users.filter((user) => user.role === role) : users
    })
  },

  async getStudent(studentId) {
    return request(() => {
      const detail = studentDetail(studentId)
      assert(detail, 'Student not found.', { code: 'not-found', status: 404 })
      return detail
    })
  },

  async getFaculty(facultyId) {
    return request(() => {
      const detail = facultyDetail(facultyId)
      assert(detail, 'Faculty member not found.', { code: 'not-found', status: 404 })
      return detail
    })
  },

  async getUser(userId) {
    return request(() => {
      const store = loadStore()
      const user = store.users.find((item) => item.id === userId)
      assert(user, 'Account not found.', { code: 'not-found', status: 404 })
      const base = publicUser(user)
      if (user.role === 'student') return studentDetail(userId)
      if (user.role === 'faculty') return facultyDetail(userId)
      return base
    })
  },

  async updateProfile(userId, payload, actor) {
    return request(() => {
      const { name, phone, bio, goal, guardianName, guardianPhone, officeHours } = payload
      if (name !== undefined) assert(String(name).trim().length >= 3, 'Enter the full name (at least 3 characters).', { code: 'validation' })
      if (phone !== undefined && phone && !isPhone(phone)) {
        throw new ApiError('Enter a valid phone number.', { code: 'validation' })
      }
      const store = loadStore()
      const existing = store.users.find((item) => item.id === userId)
      assert(existing, 'Account not found.', { code: 'not-found', status: 404 })

      updateRecord('users', userId, {
        name: name ?? existing.name,
        phone: phone ?? existing.phone,
        ...(officeHours !== undefined && existing.role === 'faculty' ? { officeHours } : {}),
      })

      if (existing.role === 'student' && (bio !== undefined || goal !== undefined || guardianName !== undefined || guardianPhone !== undefined)) {
        const profile = store.students.find((item) => item.id === userId)
        if (profile) {
          const students = store.students.map((item) =>
            item.id === userId
              ? {
                  ...item,
                  ...(bio !== undefined ? { bio } : {}),
                  ...(goal !== undefined ? { goal } : {}),
                  ...(guardianName !== undefined ? { guardianName } : {}),
                  ...(guardianPhone !== undefined ? { guardianPhone } : {}),
                }
              : item,
          )
          writeSingleton('students', students)
        }
      }

      addAuditEvent({
        actor,
        action: 'user.edited',
        actionLabel: 'Account details updated',
        entityType: 'user',
        entityId: userId,
        entityLabel: existing.name,
        previousValue: existing.name,
        newValue: name ?? existing.name,
        reason: 'Profile update',
      })
      return publicUser(loadStore().users.find((item) => item.id === userId))
    })
  },

  async createUser(payload, actor) {
    return request(
      () => {
        const store = loadStore()
        const policy = getPolicies()?.account
        const { role, name, email, phone, batchIds = [], subjectIds = [] } = payload

        assert(['student', 'faculty'].includes(role), 'Choose a valid role.', { code: 'validation' })
        assert(String(name || '').trim().length >= 3, 'Enter the full name (at least 3 characters).', { code: 'validation' })
        assert(isEmail(email), 'Enter a valid institute email address.', { code: 'validation' })
        assert(isPhone(phone), 'Enter a valid phone number.', { code: 'validation' })
        const clash = store.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase())
        assert(!clash, 'An account with that email already exists.', { code: 'conflict', status: 409 })
        if (role === 'student') assert(batchIds.length > 0, 'Assign at least one batch.', { code: 'validation' })
        if (role === 'faculty') assert(subjectIds.length > 0, 'Assign at least one subject.', { code: 'validation' })

        const temporaryPassword = payload.temporaryPassword || DEMO_PASSWORD
        const problem = validatePassword(temporaryPassword, policy)
        assert(!problem, problem || 'Invalid temporary password.', { code: 'validation' })

        const id = role === 'student' ? createId('stu') : createId('fac')
        const user = {
          id,
          role,
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          phone,
          status: 'active',
          mustChangePassword: true,
          failedAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
          joinedAt: nowIso(),
          passwordHash: hashPassword(temporaryPassword),
          passwordUpdatedAt: nowIso(),
          avatarTone: ['sky', 'cream', 'charcoal'][store.users.length % 3],
          ...(role === 'student'
            ? { enrollmentId: nextEnrollmentId(store), batchIds }
            : { employeeId: nextEmployeeId(store), title: payload.title || 'Faculty', subjectIds, batchIds }),
        }
        insert('users', user)

        if (role === 'student') {
          const primaryBatch = store.batches.find((batch) => batch.id === batchIds[0])
          const mentorId = primaryBatch?.facultyIds?.[0] || null
          insert('students', {
            id,
            userId: id,
            batchId: batchIds[0],
            program: primaryBatch?.name || 'Unassigned',
            section: primaryBatch?.section || '—',
            rollNumber: `${primaryBatch?.section?.[0] || 'X'}-${100 + store.students.length + 1}`,
            guardianName: payload.guardianName || '—',
            guardianPhone: payload.guardianPhone || '—',
            targetExam: primaryBatch?.program || '—',
            joinedAt: nowIso(),
            mentorFacultyId: mentorId,
            bio: payload.bio || 'Newly enrolled student.',
            goal: payload.goal || 'Set a study goal with the mentor.',
          })
        } else {
          insert('faculty', {
            id,
            userId: id,
            subjectIds,
            batchIds,
            designation: payload.title || 'Faculty',
            qualification: payload.qualification || '—',
            experienceYears: Number(payload.experienceYears) || 0,
            officeHours: payload.officeHours || 'To be confirmed',
            loadHours: 0,
            availability: 'Newly onboarded',
          })
        }

        const batches = store.batches.map((batch) => {
          const inScope = batchIds.includes(batch.id)
          if (!inScope) return batch
          if (role === 'student') return { ...batch, studentIds: [...new Set([...batch.studentIds, id])] }
          return { ...batch, facultyIds: [...new Set([...batch.facultyIds, id])] }
        })
        writeSingleton('batches', batches)

        addAuditEvent({
          actor,
          action: 'user.created',
          actionLabel: 'User created',
          entityType: 'user',
          entityId: id,
          entityLabel: `${user.name} · ${role === 'student' ? 'student' : 'faculty'}`,
          previousValue: null,
          newValue: 'Temporary credentials issued; first-login password change required',
          reason: payload.reason || 'Account provisioned by the administrator',
        })

        return {
          user: publicUser(user),
          oneTimeCredentials: {
            email: user.email,
            temporaryPassword,
            note: 'Shown once. Share it through a secure channel; it is never displayed again.',
          },
        }
      },
      { label: 'account creation', latency: 420 },
    )
  },

  async setStatus(userId, status, reason, actor) {
    return request(() => {
      assert(['active', 'inactive'].includes(status), 'Choose a valid account status.', { code: 'validation' })
      const store = loadStore()
      const user = store.users.find((item) => item.id === userId)
      assert(user, 'Account not found.', { code: 'not-found', status: 404 })
      if (user.role === 'admin' && status === 'inactive') {
        throw new ApiError('The institute administrator account cannot be deactivated from this screen.', {
          code: 'policy',
          status: 403,
        })
      }
      updateRecord('users', userId, { status })
      addAuditEvent({
        actor,
        action: status === 'active' ? 'user.activated' : 'user.deactivated',
        actionLabel: status === 'active' ? 'User activated' : 'User deactivated',
        entityType: 'user',
        entityId: userId,
        entityLabel: user.name,
        previousValue: user.status,
        newValue: status,
        reason: reason || 'No reason supplied',
      })
      return publicUser(loadStore().users.find((item) => item.id === userId))
    })
  },

  async resetCredentials(userId, actor) {
    return request(() => {
      const store = loadStore()
      const user = store.users.find((item) => item.id === userId)
      assert(user, 'Account not found.', { code: 'not-found', status: 404 })
      const temporaryPassword = DEMO_PASSWORD
      updateRecord('users', userId, {
        passwordHash: hashPassword(temporaryPassword),
        mustChangePassword: true,
        failedAttempts: 0,
        lockedUntil: null,
        passwordUpdatedAt: nowIso(),
      })
      addAuditEvent({
        actor,
        action: 'user.credentials-reset',
        actionLabel: 'Temporary credentials issued',
        entityType: 'user',
        entityId: userId,
        entityLabel: user.name,
        previousValue: 'Existing credential',
        newValue: 'Temporary credential; change required at next sign-in',
        reason: 'Administrator-initiated recovery',
      })
      return {
        oneTimeCredentials: {
          email: user.email,
          temporaryPassword,
          note: 'Shown once. The user must choose a new password at the next sign-in.',
        },
      }
    })
  },

  async deleteUser(userId, actor) {
    return request(() => {
      const store = loadStore()
      const user = store.users.find((item) => item.id === userId)
      assert(user, 'Account not found.', { code: 'not-found', status: 404 })
      assert(user.role !== 'admin', 'Administrator accounts cannot be deleted.', { code: 'policy', status: 403 })

      removeRecord('users', userId)
      if (user.role === 'student') removeRecord('students', userId)
      if (user.role === 'faculty') removeRecord('faculty', userId)

      const batches = store.batches.map((batch) => ({
        ...batch,
        studentIds: batch.studentIds.filter((id) => id !== userId),
        facultyIds: batch.facultyIds.filter((id) => id !== userId),
      }))
      writeSingleton('batches', batches)

      addAuditEvent({
        actor,
        action: 'user.deleted',
        actionLabel: 'User deleted',
        entityType: 'user',
        entityId: userId,
        entityLabel: `${user.name} (${user.email})`,
        previousValue: 'Account existed with role ' + user.role,
        newValue: 'Account removed',
        reason: 'Deleted by the administrator with confirmation',
      })
      return { ok: true }
    })
  },

  async assignBatches(userId, batchIds, actor) {
    return request(() => {
      const store = loadStore()
      const user = store.users.find((item) => item.id === userId)
      assert(user, 'Account not found.', { code: 'not-found', status: 404 })
      assert(Array.isArray(batchIds) && batchIds.length > 0, 'Select at least one batch.', { code: 'validation' })

      updateRecord('users', userId, { batchIds })
      if (user.role === 'student') {
        const students = store.students.map((profile) =>
          profile.id === userId ? { ...profile, batchId: batchIds[0] } : profile,
        )
        writeSingleton('students', students)
      }
      if (user.role === 'faculty') {
        const faculty = store.faculty.map((profile) =>
          profile.id === userId ? { ...profile, batchIds } : profile,
        )
        writeSingleton('faculty', faculty)
      }
      const batches = store.batches.map((batch) => {
        const shouldContain = batchIds.includes(batch.id)
        if (user.role === 'student') {
          const contains = batch.studentIds.includes(userId)
          if (shouldContain && !contains) return { ...batch, studentIds: [...batch.studentIds, userId] }
          if (!shouldContain && contains) return { ...batch, studentIds: batch.studentIds.filter((id) => id !== userId) }
        } else {
          const contains = batch.facultyIds.includes(userId)
          if (shouldContain && !contains) return { ...batch, facultyIds: [...batch.facultyIds, userId] }
          if (!shouldContain && contains) return { ...batch, facultyIds: batch.facultyIds.filter((id) => id !== userId) }
        }
        return batch
      })
      writeSingleton('batches', batches)

      addAuditEvent({
        actor,
        action: 'user.batch-assigned',
        actionLabel: 'Batch assignment changed',
        entityType: 'user',
        entityId: userId,
        entityLabel: user.name,
        previousValue: (user.batchIds || []).join(', ') || '—',
        newValue: batchIds.join(', '),
        reason: 'Batch assignment updated by the administrator',
      })
      return publicUser(loadStore().users.find((item) => item.id === userId))
    })
  },

  async assignSubjects(userId, subjectIds, actor) {
    return request(() => {
      const store = loadStore()
      const user = store.users.find((item) => item.id === userId)
      assert(user, 'Account not found.', { code: 'not-found', status: 404 })
      assert(user.role === 'faculty', 'Subjects can only be assigned to faculty accounts.', { code: 'validation' })
      assert(subjectIds.length > 0, 'Select at least one subject.', { code: 'validation' })
      updateRecord('users', userId, { subjectIds })
      const faculty = store.faculty.map((profile) => (profile.id === userId ? { ...profile, subjectIds } : profile))
      writeSingleton('faculty', faculty)
      addAuditEvent({
        actor,
        action: 'user.subjects-assigned',
        actionLabel: 'Teaching responsibilities changed',
        entityType: 'user',
        entityId: userId,
        entityLabel: user.name,
        previousValue: (user.subjectIds || []).join(', ') || '—',
        newValue: subjectIds.join(', '),
        reason: 'Subject assignment updated by the administrator',
      })
      return publicUser(loadStore().users.find((item) => item.id === userId))
    })
  },

  async batchRoster(batchId) {
    return request(() => studentsOfBatch(batchId))
  },

  async getActivity(userId) {
    return request(() => {
      const audit = readAll('audit').filter((event) => event.entityId === userId || event.actorId === userId)
      const attempts = readAll('attempts').filter((attempt) => attempt.studentId === userId)
      const doubts = readAll('doubts').filter((doubt) => doubt.studentId === userId || doubt.facultyId === userId)
      return { audit, attempts, doubts }
    })
  },
}
