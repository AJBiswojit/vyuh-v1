/* Report definitions. Values are produced by services from live mock records —
   the definitions here only describe which reports exist and how they filter. */

export const REPORT_DEFINITIONS = [
  {
    id: 'report_student_performance',
    name: 'Student performance',
    description: 'Attempt-level scores, accuracy and time management for every student in a batch.',
    filters: ['batchId', 'subjectId', 'dateRange'],
    metrics: ['attempts', 'averagePercentage', 'bestPercentage', 'accuracy', 'averageTimePerQuestion'],
  },
  {
    id: 'report_faculty_activity',
    name: 'Faculty activity',
    description: 'Classes conducted, examinations authored, doubts resolved and attendance compliance.',
    filters: ['dateRange', 'subjectId'],
    metrics: ['classesHeld', 'examsAuthored', 'doubtsResolved', 'averageAttendance'],
  },
  {
    id: 'report_batch_performance',
    name: 'Batch performance',
    description: 'Batch-level average scores, attendance and participation compared across cohorts.',
    filters: ['program', 'dateRange'],
    metrics: ['studentCount', 'averagePercentage', 'attendancePercent', 'activeExams'],
  },
  {
    id: 'report_exam_statistics',
    name: 'Examination statistics',
    description: 'Per-examination participation, score distribution and item difficulty.',
    filters: ['examId', 'batchId'],
    metrics: ['candidates', 'submitted', 'averageScore', 'highestScore', 'hardestQuestion'],
  },
  {
    id: 'report_attendance',
    name: 'Attendance',
    description: 'Duration-based attendance by batch, subject and student, with policy exceptions.',
    filters: ['batchId', 'subjectId', 'month'],
    metrics: ['averageAttendancePercent', 'belowThreshold', 'classesHeld', 'attendedHours'],
  },
  {
    id: 'report_live_participation',
    name: 'Live class participation',
    description: 'Join counts, average attended minutes and participation rate per session.',
    filters: ['batchId', 'dateRange'],
    metrics: ['sessions', 'averageJoinRate', 'averageAttendedMinutes', 'reconnections'],
  },
  {
    id: 'report_recording_engagement',
    name: 'Recording engagement',
    description: 'Published recordings with view counts and download activity.',
    filters: ['subjectId', 'batchId'],
    metrics: ['publishedRecordings', 'totalViews', 'downloadsAllowed', 'flaggedRecordings'],
  },
  {
    id: 'report_doubt_resolution',
    name: 'Doubt resolution',
    description: 'Volume, median response time and unresolved backlog by faculty and subject.',
    filters: ['subjectId', 'dateRange'],
    metrics: ['totalDoubts', 'resolved', 'open', 'medianResponseHours'],
  },
  {
    id: 'report_support',
    name: 'Support tickets',
    description: 'Ticket volume, status mix and resolution time by category.',
    filters: ['role', 'status'],
    metrics: ['total', 'open', 'resolved', 'medianResolutionHours'],
  },
]
