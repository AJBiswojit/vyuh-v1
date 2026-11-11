/* Support tickets for students and faculty. Administrators manage them from the
   moderation/support workflow — there is no separate admin navigation section. */

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
    status: 'open',
    createdAt: '2026-11-08T11:00:00.000Z',
    updatedAt: '2026-11-08T11:00:00.000Z',
    attachments: [],
    replies: [],
    assignedTo: null,
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
        id: 'support_reply_003',
        authorId: 'admin_001',
        authorRole: 'admin',
        body: 'Marked for review in the question bank. You can archive it from the bank once the current papers are concluded.',
        createdAt: '2026-11-07T05:00:00.000Z',
      },
    ],
    assignedTo: 'admin_001',
  },
]

export const SUPPORT_CATEGORIES = ['Examination', 'Attendance', 'Recordings', 'Live Class', 'Account', 'Other']
export const SUPPORT_STATUSES = ['open', 'in-progress', 'resolved', 'closed']
export const SUPPORT_PRIORITIES = ['low', 'normal', 'high']
