/* ------------------------------------------------------------------
   Shared notification semantics.

   Priority and read status are two independent properties:
     priority (high / normal) describes WHAT the notification is about,
     read (true / false) describes WHETHER the student has seen it.
   An important notification therefore keeps its warm treatment after it
   has been read — only its emphasis softens.

   Both values come from the existing notification record (`type`, optional
   `priority`, `title`, `body`) produced by the mock services. No notification
   arrays are defined here.
------------------------------------------------------------------- */

/* Time-critical or action-required event types. Everything else is a normal
   update: replies, published recordings, results, routine class changes. */
const HIGH_PRIORITY_TYPES = new Set([
  'exam-upcoming',
  'exam-starting',
  'exam-live',
  'exam-schedule-change',
  'exam-cancelled',
  'class-starting',
  'class-live',
  'class-cancelled',
  'attendance-warning',
  'attendance-alert',
  'academic-deadline',
  'deadline',
  'late-join',
  'integrity-alert',
  'approval-pending',
  'approval-request',
  'urgent-announcement',
])

/* Institute broadcasts are stored as `type: 'announcement'`. An urgent one is
   recognised from its own text rather than from a new field in the service. */
const URGENT_WORDS = /\burgent\b|\bimmediately\b|\bdeadline\b|\blast date\b|\bfinal date\b/i

const CATEGORY_BY_TYPE = {
  'exam-upcoming': 'exam',
  'exam-starting': 'exam',
  'exam-live': 'exam',
  'exam-schedule-change': 'exam',
  'exam-published': 'exam',
  'exam-cancelled': 'exam',
  'exam-submitted': 'exam',
  'exam-result': 'exam',
  'result-published': 'exam',
  'late-join': 'exam',
  'academic-deadline': 'exam',
  deadline: 'exam',
  'class-live': 'class',
  'class-scheduled': 'class',
  'class-starting': 'class',
  'class-cancelled': 'class',
  'class-reconnection': 'class',
  'recording-published': 'recording',
  moderation: 'recording',
  'doubt-new': 'doubt',
  'doubt-reply': 'doubt',
  'support-update': 'support',
  'approval-pending': 'approval',
  'approval-request': 'approval',
  'approval-decided': 'approval',
  'attendance-warning': 'attendance',
  'attendance-correction': 'attendance',
  'attendance-updated': 'attendance',
  'integrity-alert': 'institute',
  announcement: 'institute',
  'urgent-announcement': 'institute',
}

export const NOTIFICATION_CATEGORY_LABEL = {
  exam: 'Exam',
  class: 'Class',
  recording: 'Recording',
  doubt: 'Doubt',
  institute: 'Institute',
  support: 'Support',
  approval: 'Approval',
  attendance: 'Attendance',
  general: 'Update',
}

/** Explicit `priority` wins; otherwise derive it from the event type. */
export function notificationPriority(notification) {
  const explicit = String(notification?.priority || '').toLowerCase()
  if (explicit === 'high' || explicit === 'important' || explicit === 'urgent') return 'high'
  if (explicit === 'normal' || explicit === 'low') return 'normal'
  const type = String(notification?.type || '').toLowerCase()
  if (HIGH_PRIORITY_TYPES.has(type)) return 'high'
  if (type === 'announcement' && URGENT_WORDS.test(`${notification?.title || ''} ${notification?.body || ''}`)) {
    return 'high'
  }
  return 'normal'
}

export function notificationCategory(notification) {
  const type = String(notification?.type || '').toLowerCase()
  return CATEGORY_BY_TYPE[type] || 'general'
}

/** Two ordered groups for the inbox. Service order (newest first) is kept
 *  inside each group; empty groups are dropped. */
export function groupNotifications(items) {
  const groups = [
    { key: 'high', label: 'Important', items: [] },
    { key: 'normal', label: 'Updates', items: [] },
  ]
  for (const item of items) {
    const group = groups.find((entry) => entry.key === notificationPriority(item))
    group.items.push(item)
  }
  return groups.filter((group) => group.items.length > 0)
}
