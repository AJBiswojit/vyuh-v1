/* ------------------------------------------------------------------
   VYUH — single seeding mechanism
   Every mock collection is assembled here exactly once. Nothing else in the
   application creates initial records.
------------------------------------------------------------------- */

import { USERS, STUDENT_PROFILES, FACULTY_PROFILES, DEMO_PASSWORD } from './users.mock.js'
import { BATCHES } from './batches.mock.js'
import { SUBJECTS } from './subjects.mock.js'
import { QUESTIONS } from './questions.mock.js'
import { EXAMS } from './exams.mock.js'
import { ATTEMPTS } from './attempts.mock.js'
import { CLASSES } from './classes.mock.js'
import { ATTENDANCE_EVENTS } from './attendance.mock.js'
import { RECORDINGS } from './recordings.mock.js'
import { DOUBTS, AI_CONVERSATIONS } from './doubts.mock.js'
import { NOTIFICATIONS } from './notifications.mock.js'
import { DEFAULT_POLICIES } from './policies.mock.js'
import { APPROVALS } from './approvals.mock.js'
import { INTEGRITY_EVENTS, EXAM_CONTROLS } from './integrity.mock.js'
import { SUPPORT_TICKETS } from './support.mock.js'
import { AUDIT_EVENTS } from './audit.mock.js'
import { SCHEMA_VERSION, emptyStore, hashPassword } from './mock-storage.js'
import { rebaseDemoTimeline } from './demo-timeline.js'

export const INSTITUTE = {
  id: 'inst_001',
  name: 'Vyuh Academy',
  shortName: 'Vyuh',
  code: 'VYUH-AC-2026',
  tagline: 'One academic ecosystem — students, faculty and administration.',
  address: '3rd Floor, Trident House, Saheed Nagar, Bhubaneswar 751007',
  city: 'Bhubaneswar',
  state: 'Odisha',
  country: 'India',
  phone: '+91 674 400 1200',
  email: 'office@vyuhacademy.edu.in',
  website: 'vyuhacademy.edu.in',
  established: 2021,
  timezone: 'Asia/Kolkata',
  academicYear: '2026–27',
  term: 'Winter term',
  logoMark: 'VY',
}

const SETTINGS = {
  instituteProfileVisible: true,
  demoMode: true,
  demoCredentialHint: DEMO_PASSWORD,
  defaultNotificationChannel: 'in-app',
  maintenanceBanner: null,
  lastPolicyReviewAt: '2026-11-04T09:40:00.000Z',
}

export function buildSeed() {
  const store = emptyStore()
  const passwordHash = hashPassword(DEMO_PASSWORD)

  store.version = SCHEMA_VERSION
  store.institute = INSTITUTE
  store.users = USERS.map((user) => ({
    ...user,
    passwordHash,
    failedAttempts: 0,
    lockedUntil: null,
    passwordUpdatedAt: user.joinedAt,
  }))
  store.students = STUDENT_PROFILES.map((profile) => ({ ...profile }))
  store.faculty = FACULTY_PROFILES.map((profile) => ({ ...profile }))
  store.batches = BATCHES.map((batch) => ({ ...batch }))
  store.subjects = SUBJECTS.map((subject) => ({ ...subject }))
  store.questions = QUESTIONS.map((question) => ({
    ...question,
    status: 'active',
    version: 1,
    createdAt: '2026-10-01T06:00:00.000Z',
    updatedAt: '2026-11-05T06:00:00.000Z',
    usageCount: 0,
  }))
  store.exams = EXAMS.map((exam) => ({ ...exam }))
  store.attempts = ATTEMPTS.map((attempt) => ({ ...attempt }))
  store.classes = CLASSES.map((item) => ({ ...item }))
  store.attendance = ATTENDANCE_EVENTS.map((record) => ({ ...record }))
  store.recordings = RECORDINGS.map((recording) => ({ ...recording }))
  store.doubts = DOUBTS.map((doubt) => ({ ...doubt }))
  store.notifications = NOTIFICATIONS.map((notification) => ({ ...notification }))
  store.policies = JSON.parse(JSON.stringify(DEFAULT_POLICIES))
  store.approvals = APPROVALS.map((approval) => ({ ...approval }))
  store.integrity = INTEGRITY_EVENTS.map((event) => ({ ...event }))
  store.examControls = EXAM_CONTROLS.map((control) => ({ ...control }))
  store.supportTickets = SUPPORT_TICKETS.map((ticket) => ({ ...ticket }))
  store.audit = AUDIT_EVENTS.map((event) => ({ ...event }))
  store.aiConversations = AI_CONVERSATIONS.map((conversation) => ({ ...conversation }))
  store.settings = { ...SETTINGS }

  // usageCount is derived from exam composition at seed time so the question
  // bank shows real reuse counts rather than invented numbers.
  store.questions = store.questions.map((question) => {
    const usageCount = store.exams.reduce((total, exam) => {
      const used = (exam.sections || []).some((section) => (section.questionIds || []).includes(question.id))
      return total + (used ? 1 : 0)
    }, 0)
    return { ...question, usageCount }
  })

  /* The authored teaching week is treated as "today" so live sessions, open
     examinations and upcoming classes stay believable whenever the demo is run. */
  return rebaseDemoTimeline(store)
}
