/* ------------------------------------------------------------------\n   VYUH — support tickets, admin-desk status vocabulary and the clearly\n   identified mock AI Auto Support provider data. All records live here; pages\n   consume them through support.service.js and support-ai.service.js.\n------------------------------------------------------------------- */

export const SUPPORT_TICKETS = [
  {
    id: 'ticket_001',
    code: 'TKT-1001',
    userId: 'stu_001',
    role: 'student',
    category: 'Examination',
    subject: 'Could not see the Save & Next button on a small screen',
    description:
      'On my laptop the examination screen worked, but when I resized the browser the bottom controls became hard to reach.',
    priority: 'normal',
    status: 'open',
    createdAt: '2026-11-09T06:00:00.000Z',
    updatedAt: '2026-11-09T06:00:00.000Z',
    attachments: [],
    replies: [],
    assignedTo: null,
  },
  {
    id: 'ticket_002',
    code: 'TKT-1002',
    userId: 'stu_004',
    role: 'student',
    category: 'Attendance',
    subject: 'Attendance shows absent for a class I joined late',
    description:
      'I joined the Work–Energy session at 16:20 and stayed until the end, but the attendance record says partial only.',
    priority: 'high',
    status: 'in-progress',
    createdAt: '2026-11-10T07:00:00.000Z',
    updatedAt: '2026-11-10T09:30:00.000Z',
    attachments: [],
    replies: [
      {
        id: 'support_reply_001',
        authorId: 'admin_001',
        authorRole: 'admin',
        body: 'We have opened an attendance correction request with the faculty for this session. You will be notified once a decision is recorded.',
        createdAt: '2026-11-10T09:30:00.000Z',
      },
    ],
    assignedTo: 'admin_001',
  },
  {
    id: 'ticket_003',
    code: 'TKT-1003',
    userId: 'fac_004',
    role: 'faculty',
    category: 'Recordings',
    subject: 'Recording upload stalled twice',
    description:
      'The whiteboard capture uploaded to 80% and then failed. The second attempt produced a file with distorted audio.',
    priority: 'high',
    status: 'resolved',
    createdAt: '2026-11-09T14:40:00.000Z',
    updatedAt: '2026-11-09T16:20:00.000Z',
    attachments: [],
    replies: [
      {
        id: 'support_reply_002',
        authorId: 'admin_001',
        authorRole: 'admin',
        body: 'The upload limit was reached for that session. Re-upload in two parts; the distorted recording has been flagged for moderation so students do not rely on it.',
        createdAt: '2026-11-09T16:20:00.000Z',
      },
    ],
    assignedTo: 'admin_001',
  },
  {
    id: 'ticket_004',
    code: 'TKT-1004',
    userId: 'stu_006',
    role: 'student',
    category: 'Account',
    subject: 'Password reset not received',
    description: 'I requested a password reset but no email arrived. My account still signs in with the old password.',
    priority: 'normal',
    status: 'waiting-for-student',
    createdAt: '2026-11-08T11:00:00.000Z',
    updatedAt: '2026-11-10T05:10:00.000Z',
    attachments: [],
    replies: [
      {
        id: 'support_reply_003',
        authorId: 'admin_001',
        authorRole: 'admin',
        body: 'We need the approximate time you requested the reset. Please reply here and we will check the account audit trail.',
        createdAt: '2026-11-10T05:10:00.000Z',
      },
    ],
    assignedTo: 'admin_001',
  },
  {
    id: 'ticket_005',
    code: 'TKT-1005',
    userId: 'fac_001',
    role: 'faculty',
    category: 'Examination',
    subject: 'Need a duplicate question flagged in the bank',
    description:
      'Question q_phy_kin_02 appears similar to an older item. Please help me mark it for review before the next paper.',
    priority: 'low',
    status: 'closed',
    createdAt: '2026-11-06T05:00:00.000Z',
    updatedAt: '2026-11-07T05:00:00.000Z',
    attachments: [],
    replies: [
      {
        id: 'support_reply_004',
        authorId: 'admin_001',
        authorRole: 'admin',
        body: 'Marked for review in the question bank. You can archive it from the bank once the current papers are concluded.',
        createdAt: '2026-11-07T05:00:00.000Z',
      },
    ],
    assignedTo: 'admin_001',
  },
  {
    id: 'ticket_006',
    code: 'TKT-1006',
    userId: 'stu_002',
    role: 'student',
    category: 'Fees & Payments',
    subject: 'Please confirm my tuition receipt reference',
    description:
      'I can see the tuition payment in Payment & Dues but would like the office to confirm which receipt reference belongs to this instalment.',
    priority: 'normal',
    status: 'open',
    createdAt: '2026-11-10T10:15:00.000Z',
    updatedAt: '2026-11-10T10:15:00.000Z',
    attachments: [
      { name: 'fee-note.txt', type: 'text/plain', size: 184, note: 'Attachment metadata only — no file upload in the demo.' },
    ],
    replies: [],
    assignedTo: null,
  },
]

export const SUPPORT_CATEGORIES = [
  'Examination',
  'Attendance',
  'Recordings',
  'Live Class',
  'Account',
  'Fees & Payments',
  'Application',
  'Other',
]
export const SUPPORT_STATUSES = ['open', 'in-progress', 'waiting-for-student', 'resolved', 'closed']
export const SUPPORT_STATUS_LABELS = {
  open: 'Open',
  'in-progress': 'In Progress',
  'waiting-for-student': 'Waiting for Student',
  resolved: 'Resolved',
  closed: 'Closed',
}
export const SUPPORT_PRIORITIES = ['low', 'normal', 'high']

/* Suggested questions shown by AI Auto Support. These are prompts, not records
   created inside the page. The academic/application split is intentional. */
export const SUPPORT_AI_SUGGESTED_QUESTIONS = [
  { id: 'sq_attendance', label: 'How is attendance calculated?', text: 'How is attendance calculated?', area: 'academic' },
  { id: 'sq_analysis', label: 'Where is my exam analysis?', text: 'Where do I see my examination analysis and question-level results?', area: 'academic' },
  { id: 'sq_performance', label: 'How am I performing?', text: 'What do my recent exam scores and accuracy show?', area: 'academic' },
  { id: 'sq_fees', label: 'What fees are outstanding?', text: 'Which course fees are outstanding, and when is the next deadline?', area: 'application' },
  { id: 'sq_payment', label: 'How does Pay Now work?', text: 'How do I pay a fee and download a receipt in this demonstration?', area: 'application' },
  { id: 'sq_extension', label: 'Can I request an extension?', text: 'How can I request a fee deadline extension or instalment?', area: 'application' },
  { id: 'sq_ticket', label: 'How do I contact Admin Support?', text: 'How do I raise a ticket and track an admin response?', area: 'application' },
  { id: 'sq_classes', label: 'Where are live classes?', text: 'Where can I join a live class or watch a published recording?', area: 'application' },
]

/* Prompts for faculty are distinct: they cover teaching operations rather than
   student fees or personal examination results. */
export const SUPPORT_AI_FACULTY_SUGGESTED_QUESTIONS = [
  { id: 'fq_exam', label: 'How do I publish an exam?', text: 'How do I submit an examination for approval before publishing?', area: 'teaching' },
  { id: 'fq_questions', label: 'Why is a published exam locked?', text: 'Why can I not edit a published examination or question?', area: 'teaching' },
  { id: 'fq_attendance', label: 'How is attendance computed?', text: 'How do paired join and leave events affect attendance for my session?', area: 'teaching' },
  { id: 'fq_recording', label: 'What happens after a class ends?', text: 'How do I publish a class recording after the session ends?', area: 'operations' },
  { id: 'fq_doubt', label: 'Where do student doubts appear?', text: 'Where do I answer student doubts and attach an explanation?', area: 'operations' },
  { id: 'fq_ticket', label: 'How do I contact Admin Support?', text: 'How do I raise a support ticket and reopen a closed issue?', area: 'operations' },
]

/* Deterministic intent routing for the mock response service. Keywords support
   free-text/natural-language questions; no hosted model is contacted. */
export const SUPPORT_AI_INTENTS = [
  {
    id: 'attendance',
    category: 'Attendance',
    keywords: ['attendance', 'present', 'absent', 'late arrival', 'early departure', 'class duration', 'eligible'],
    followUps: ['Why is my percentage below the threshold?', 'What does a partial class mean?', 'Escalate an attendance correction'],
  },
  {
    id: 'fees',
    category: 'Fees & Payments',
    keywords: ['fee', 'fees', 'dues', 'payment', 'pay', 'receipt', 'outstanding', 'invoice', 'instal', 'extension', 'transaction'],
    followUps: ['How does the simulated Pay Now flow work?', 'How do I request an instalment?', 'Escalate this fee question'],
  },
  {
    id: 'performance',
    category: 'Examination',
    keywords: ['performance', 'analysis', 'score', 'accuracy', 'exam', 'result', 'topic', 'attempt', 'question-level', 'speed'],
    followUps: ['Which topics are weakest?', 'How is accuracy different from score?', 'Escalate a result question'],
  },
  {
    id: 'support',
    category: 'Application',
    keywords: ['ticket', 'admin support', 'support desk', 'reply', 'status', 'escalate', 'reopen', 'notification'],
    followUps: ['What does Waiting for Student mean?', 'How do I reopen a resolved ticket?', 'Escalate to Admin Support'],
  },
  {
    id: 'classes',
    category: 'Live Class',
    keywords: ['live class', 'class', 'join', 'recording', 'classroom', 'schedule'],
    followUps: ['Where do I find published recordings?', 'Why is a class not eligible for attendance?', 'Escalate a classroom issue'],
  },
  {
    id: 'account',
    category: 'Account',
    keywords: ['password', 'login', 'profile', 'account', 'sign in', 'email'],
    followUps: ['Where do I update my profile?', 'How do I report a sign-in issue?', 'Escalate an account issue'],
  },
]

/* Seeded AI Auto Support history. The source labels identify the deterministic
   mock response service; there is no claim of a live language model. */
export const SUPPORT_AI_CONVERSATIONS = [
  {
    id: 'supportchat_001',
    userId: 'stu_001',
    channel: 'ai-auto-support',
    title: 'Where is my examination analysis?',
    createdOffsetDays: -2,
    updatedOffsetDays: -2,
    messages: [
      {
        id: 'supportmsg_001',
        role: 'student',
        text: 'Where do I find detailed examination analysis?',
        atOffsetMinutes: 0,
      },
      {
        id: 'supportmsg_002',
        role: 'assistant',
        text: 'Open Performance for a cross-exam summary, then use the Examination analysis tab for one attempt. The full question-level analysis remains linked from that tab and from each exam result.',
        atOffsetMinutes: 1,
        topic: 'performance',
        category: 'Examination',
        sourceLabel: 'Mock response service · deterministic template, not a live AI model',
        suggested: ['What do my recent scores show?', 'How do I contact Admin Support?'],
      },
    ],
  },
]
