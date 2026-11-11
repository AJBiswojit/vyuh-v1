/* Authentication service — frontend demonstration only.
   Credentials are validated against a hashed value in the mock store. This is
   NOT secure authentication: see docs/VYUH_BACKEND_INTEGRATION_NOTES.md. */

import { ApiError, request, nowIso } from './api.js'
import {
  loadStore,
  updateRecord,
  readSingleton,
  writeSingleton,
  verifyPassword,
  hashPassword,
} from '../data/mock/mock-storage.js'
import { DEMO_PASSWORD, USERS } from '../data/mock/users.mock.js'
import { STORAGE_KEY as STORE_KEY } from '../data/mock/mock-storage.js'
import { validatePassword } from '../lib/validation.js'

const SESSION_KEY = 'vyuh:session:v1'
export const SESSION_STORAGE_KEY = SESSION_KEY

const ROLE_HOME = {
  student: '/student/dashboard',
  faculty: '/faculty/dashboard',
  admin: '/admin/overview',
}

function safeUser(user) {
  if (!user) return null
  const { passwordHash, ...rest } = user
  return rest
}

function readSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.userId || !parsed?.issuedAt) return null
    return parsed
  } catch {
    return null
  }
}

function writeSession(session) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable — session lives in memory for this page load */
  }
}

export function roleHome(role) {
  return ROLE_HOME[role] || '/login'
}

/** Keeps local changes after a page refresh, but starts a fresh demo dataset
    once a tab is reopened later (a new browsing session), so nobody is stuck
    with accidental edits from a previous visit. */
function rollDemoDataSession() {
  if (typeof window === 'undefined' || !window.sessionStorage) return
  try {
    if (window.sessionStorage.getItem('vyuh:demo-session')) return
    window.sessionStorage.setItem('vyuh:demo-session', '1')
    if (window.localStorage.getItem(SESSION_KEY)) return
    if (window.localStorage.getItem(STORE_KEY)) window.localStorage.removeItem(STORE_KEY)
  } catch {
    /* storage unavailable — the mock store simply stays in memory */
  }
}

/**
 * Where a signed-in user should land. One resolver, used by the guard, the
 * sign-in screen and /app, so a deep link is honoured identically everywhere.
 */
export function destinationFor({ role, mustChangePassword } = {}, from) {
  if (mustChangePassword) return { to: '/change-password', state: { forced: true, from } }
  if (from && typeof from === 'string' && from.startsWith(`/${role}/`)) return { to: from }
  return { to: roleHome(role) }
}


export function getCurrentSession() {
  rollDemoDataSession()
  const session = readSession()
  if (!session) return null
  const store = loadStore()
  const user = store.users.find((item) => item.id === session.userId)
  if (!user || user.status !== 'active') return null
  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    issuedAt: session.issuedAt,
    mustChangePassword: user.mustChangePassword,
    user: safeUser(user),
  }
}

export const authService = {
  async login({ email, password }) {
    return request(
      () => {
        const store = loadStore()
        const normalised = String(email || '').trim().toLowerCase()
        if (!normalised || !password) {
          throw new ApiError('Enter your institute email and password.', { code: 'validation' })
        }
        const user = store.users.find((item) => item.email.toLowerCase() === normalised)
        if (!user) {
          throw new ApiError('No account matches that institute email address.', { code: 'invalid-credentials' })
        }
        if (user.status !== 'active') {
          throw new ApiError(
            'This account is inactive. Contact the institute administrator to restore access.',
            { code: 'inactive-account', status: 403 },
          )
        }
        if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
          throw new ApiError(
            'Too many failed attempts. The account is temporarily locked. Contact the administrator.',
            { code: 'locked', status: 423 },
          )
        }
        if (!verifyPassword(password, user.passwordHash)) {
          const failedAttempts = (user.failedAttempts || 0) + 1
          const policy = readSingleton('policies')?.account
          const maxFailed = policy?.maxFailedAttempts ?? 5
          updateRecord('users', user.id, {
            failedAttempts,
            lockedUntil: failedAttempts >= maxFailed ? new Date(Date.now() + 15 * 60000).toISOString() : null,
          })
          throw new ApiError(
            `That password is not correct.${failedAttempts >= 3 ? ` ${maxFailed - failedAttempts} attempts remain before the account locks.` : ''}`,
            { code: 'invalid-credentials' },
          )
        }

        updateRecord('users', user.id, {
          lastLoginAt: nowIso(),
          failedAttempts: 0,
          lockedUntil: null,
        })
        writeSession({ userId: user.id, issuedAt: nowIso(), role: user.role })

        return {
          user: safeUser({ ...user, lastLoginAt: nowIso() }),
          role: user.role,
          redirectTo: user.mustChangePassword ? '/change-password' : roleHome(user.role),
          mustChangePassword: Boolean(user.mustChangePassword),
        }
      },
      { label: 'sign-in', latency: 420, errorRate: 0 },
    )
  },

  async logout() {
    writeSession(null)
    return { ok: true }
  },

  async changePassword({ currentPassword, nextPassword, confirmPassword }) {
    return request(() => {
      const session = readSession()
      if (!session) throw new ApiError('Your session has expired. Sign in again.', { code: 'unauthenticated', status: 401 })
      const store = loadStore()
      const user = store.users.find((item) => item.id === session.userId)
      if (!user) throw new ApiError('Account not found.', { code: 'not-found', status: 404 })

      if (!verifyPassword(currentPassword, user.passwordHash)) {
        throw new ApiError('The current password is not correct.', { code: 'invalid-credentials' })
      }
      if (nextPassword !== confirmPassword) {
        throw new ApiError('The new passwords do not match.', { code: 'validation' })
      }
      const policy = readSingleton('policies')?.account
      const problem = validatePassword(nextPassword, policy)
      if (problem) throw new ApiError(problem, { code: 'validation' })
      if (verifyPassword(nextPassword, user.passwordHash)) {
        throw new ApiError('Choose a password you have not used before.', { code: 'validation' })
      }

      updateRecord('users', user.id, {
        passwordHash: hashPassword(nextPassword),
        mustChangePassword: false,
        passwordUpdatedAt: nowIso(),
      })
      appendAudit(user, 'user.password-changed', 'Password changed', 'user', user.id, user.name, null, 'Self-service change', 'Security')
      return { ok: true }
    })
  },

  async requestPasswordReset({ email, reason }) {
    return request(
      () => {
        const store = loadStore()
        const normalised = String(email || '').trim().toLowerCase()
        if (!normalised) throw new ApiError('Enter the institute email on your account.', { code: 'validation' })
        const user = store.users.find((item) => item.email.toLowerCase() === normalised)
        // Always respond the same way so the form cannot be used to enumerate accounts.
        if (user) {
          const existing = store.supportTickets.find(
            (ticket) => ticket.category === 'Account' && ticket.userId === user.id && ticket.status !== 'closed',
          )
          if (!existing) {
            const ticket = {
              id: `ticket_${Date.now().toString(36)}`,
              code: `TKT-${1100 + store.supportTickets.length}`,
              userId: user.id,
              role: user.role,
              category: 'Account',
              subject: 'Password reset requested from the sign-in screen',
              description: reason || 'Reset requested by the account holder from the forgot-password screen.',
              priority: 'high',
              status: 'open',
              createdAt: nowIso(),
              updatedAt: nowIso(),
              attachments: [],
              replies: [],
              assignedTo: null,
            }
            store.supportTickets = [...store.supportTickets, ticket]
            store.notifications = [
              ...store.notifications,
              {
                id: `notif_${Date.now().toString(36)}`,
                userId: 'admin_001',
                type: 'support-update',
                title: 'Password recovery request',
                body: `${user.name} requested a password reset. Issue a temporary credential from Users.`,
                createdAt: nowIso(),
                read: false,
                link: `/admin/users/${user.id}`,
                entityId: user.id,
              },
            ]
            writeSingleton('supportTickets', store.supportTickets)
            writeSingleton('notifications', store.notifications)
          }
        }
        return {
          ok: true,
          message:
            'If that address belongs to an active account, the request has been sent to the institute administrator. Recovery is admin-controlled — there is no self-service reset in this demonstration.',
        }
      },
      { label: 'password recovery', latency: 380, errorRate: 0 },
    )
  },

  async getDemoAccounts() {
    /* Read from the seeded store, but fall back to the seed itself if the store
       was cleared (a reset, a new browser, private mode). The account list is a
       documented part of this demonstration, so it must not depend on storage
       having been initialised first. */
    const store = loadStore()
    const find = (id) => store.users?.find((user) => user.id === id) || USERS.find((user) => user.id === id)
    const student = find('stu_001')
    const faculty = find('fac_001')
    const admin = find('admin_001')
    return [
      { role: 'student', label: 'Student', name: student?.name, email: student?.email },
      { role: 'faculty', label: 'Faculty', name: faculty?.name, email: faculty?.email },
      { role: 'admin', label: 'Institute Admin', name: admin?.name, email: admin?.email },
    ].filter((account) => account.email)
  },

  demoPassword() {
    return DEMO_PASSWORD
  },
}

/* Local helper kept here to avoid importing the audit repo into auth (which
   would create a cycle through services that depend on auth). */
function appendAudit(actor, action, actionLabel, entityType, entityId, entityLabel, previousValue, newValue, reason) {
  const store = loadStore()
  store.audit = [
    ...store.audit,
    {
      id: `audit_${Date.now().toString(36)}`,
      actorId: actor.id,
      actorRole: actor.role,
      action,
      actionLabel,
      entityType,
      entityId,
      entityLabel,
      at: nowIso(),
      previousValue,
      newValue,
      reason,
      ipLabel: 'This browser (demo)',
    },
  ]
  writeSingleton('audit', store.audit)
}
