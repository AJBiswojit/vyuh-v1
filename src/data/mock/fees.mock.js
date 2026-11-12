/* ------------------------------------------------------------------\n   VYUH — centralized fee, payment and fee-request seed definitions.\n   These are the only authored charge amounts in the demo. Pages never invent\n   a tuition/examination/registration/other charge: fees are generated from the\n   plan for the student's actual course and batch at seed time.\n------------------------------------------------------------------- */

export const FEE_CATEGORIES = [
  { id: 'tuition', label: 'Tuition', description: 'Course instruction instalment' },
  { id: 'exam', label: 'Examination', description: 'Test series and examination charge' },
  { id: 'registration', label: 'Registration', description: 'One-time enrolment charge' },
  { id: 'other', label: 'Other charges', description: 'Material and digital-resource charge' },
]

export const FEE_CATEGORY_LABELS = Object.fromEntries(FEE_CATEGORIES.map((item) => [item.id, item.label]))

export const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (demo)', description: 'Simulated UPI; no identifier is requested.' },
  { id: 'netbanking', label: 'Net Banking (demo)', description: 'Simulated bank transfer; no banking credentials.' },
  { id: 'card', label: 'Card (demo)', description: 'Demo card; no card number, PIN or CVV is requested.' },
  { id: 'bank-transfer', label: 'Bank transfer', description: 'Offline institute-recorded transfer.' },
  { id: 'cash', label: 'Cash / office', description: 'Offline payment recorded at the institute office.' },
]

export const PAYMENT_METHOD_LABELS = Object.fromEntries(PAYMENT_METHODS.map((item) => [item.id, item.label]))
export const PAYMENT_STATUSES = ['success', 'failed', 'pending']
export const PAYMENT_STATUS_LABELS = { success: 'Successful', failed: 'Failed', pending: 'Pending' }

export const FEE_REQUEST_TYPES = [
  { id: 'query', label: 'Fee query', description: 'Ask a question about a fee or payment record.' },
  { id: 'correction', label: 'Correction / dispute', description: 'Request a correction to an amount or record.' },
  { id: 'extension', label: 'Deadline extension', description: 'Request a later due date for an outstanding fee.' },
  { id: 'instalment', label: 'Instalment request', description: 'Request an instalment schedule for an outstanding fee.' },
]

export const FEE_REQUEST_TYPE_LABELS = Object.fromEntries(
  FEE_REQUEST_TYPES.map((item) => [item.id, item.label]),
)
export const FEE_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'resolved']
export const FEE_REQUEST_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  resolved: 'Resolved',
}

export const COURSE_FEE_PLANS = [
  {
    courseId: 'course_jee',
    name: 'JEE Advanced Program',
    components: [
      {
        category: 'registration',
        title: 'Registration & enrolment',
        description: 'One-time registration for the JEE Advanced 2026 program.',
        amount: 5000,
        dueOffsetDays: -45,
      },
      {
        category: 'tuition',
        title: 'Tuition — Winter term instalment',
        description: 'Instructor-led JEE Advanced Winter term instalment.',
        amount: 42000,
        dueOffsetDays: -15,
      },
      {
        category: 'exam',
        title: 'Examination & test series',
        description: 'Full-length computer-based tests and result analysis.',
        amount: 6000,
        dueOffsetDays: 18,
      },
      {
        category: 'other',
        title: 'Study material & digital resources',
        description: 'Printed practice sets and digital classroom resources.',
        amount: 3500,
        dueOffsetDays: 35,
      },
    ],
  },
  {
    courseId: 'course_neet',
    name: 'NEET UG Program',
    components: [
      {
        category: 'registration',
        title: 'Registration & enrolment',
        description: 'One-time registration for the NEET UG 2026 program.',
        amount: 4500,
        dueOffsetDays: -45,
      },
      {
        category: 'tuition',
        title: 'Tuition — Winter term instalment',
        description: 'Biology-led NEET UG Winter term instalment.',
        amount: 38000,
        dueOffsetDays: -15,
      },
      {
        category: 'exam',
        title: 'Examination & test series',
        description: 'NEET-pattern mock tests and item analysis.',
        amount: 5500,
        dueOffsetDays: 18,
      },
      {
        category: 'other',
        title: 'Study material & digital resources',
        description: 'NCERT-aligned worksheets and digital classroom resources.',
        amount: 3000,
        dueOffsetDays: 35,
      },
    ],
  },
  {
    courseId: 'course_foundation',
    name: 'Foundation Program',
    components: [
      {
        category: 'registration',
        title: 'Registration & enrolment',
        description: 'One-time registration for the Foundation X program.',
        amount: 3000,
        dueOffsetDays: -45,
      },
      {
        category: 'tuition',
        title: 'Tuition — Winter term instalment',
        description: 'School-syllabus foundation Winter term instalment.',
        amount: 24000,
        dueOffsetDays: -15,
      },
      {
        category: 'exam',
        title: 'Examination & test series',
        description: 'Foundation chapter tests and periodic assessments.',
        amount: 2500,
        dueOffsetDays: 18,
      },
      {
        category: 'other',
        title: 'Study material & digital resources',
        description: 'Foundation workbooks and digital classroom resources.',
        amount: 2000,
        dueOffsetDays: 35,
      },
    ],
  },
]

/* Historical demonstration transactions. These are local records only; no real
   payment gateway or financial credential is involved. `amountFraction` keeps
   partial payment examples derived from the authored fee amount. */
export const INITIAL_PAYMENT_RULES = [
  {
    id: 'registration_all',
    categories: ['registration'],
    methodId: 'upi',
    paidOffsetDays: -44,
    amountFraction: 1,
    status: 'success',
    note: 'Seeded enrolment payment.',
  },
  {
    id: 'tuition_partial',
    studentIds: ['stu_001', 'stu_003', 'stu_006', 'stu_011'],
    categories: ['tuition'],
    methodId: 'netbanking',
    paidOffsetDays: -12,
    amountFraction: 0.5,
    status: 'success',
    note: 'Seeded first instalment.',
  },
  {
    id: 'tuition_paid',
    studentIds: ['stu_002', 'stu_007', 'stu_012'],
    categories: ['tuition'],
    methodId: 'bank-transfer',
    paidOffsetDays: -10,
    amountFraction: 1,
    status: 'success',
    note: 'Seeded full tuition payment.',
  },
  {
    id: 'exam_paid',
    studentIds: ['stu_004', 'stu_008'],
    categories: ['exam'],
    methodId: 'card',
    paidOffsetDays: -3,
    amountFraction: 1,
    status: 'success',
    note: 'Seeded examination charge payment.',
  },
  {
    id: 'tuition_failed',
    studentIds: ['stu_005', 'stu_009'],
    categories: ['tuition'],
    methodId: 'upi',
    paidOffsetDays: -2,
    amountFraction: 0.5,
    status: 'failed',
    note: 'Simulated gateway timeout — no funds moved.',
  },
]

/* Authored fee-request examples. IDs are deterministic so Student and Admin
   always read the same request. Offsets keep the history relative to seed day. */
export const FEE_REQUEST_SEED = [
  {
    id: 'feereq_seed_001',
    studentId: 'stu_001',
    feeComponent: 'exam',
    type: 'extension',
    subject: 'Request an extension for the examination fee',
    description:
      'The examination charge is due while my unit-test week is running. Could the deadline be moved to the end of the month?',
    proposedDueOffsetDays: 30,
    status: 'pending',
    createdOffsetDays: -2,
    updatedOffsetDays: -2,
    replies: [],
  },
  {
    id: 'feereq_seed_002',
    studentId: 'stu_002',
    feeComponent: 'tuition',
    type: 'correction',
    subject: 'Check the Winter tuition instalment amount',
    description:
      'My receipt and the fee breakdown show different instalment amounts. Please verify which value is approved for my batch.',
    status: 'approved',
    createdOffsetDays: -6,
    updatedOffsetDays: -3,
    decisionNote: 'The approved course plan amount is correct; no charge was changed.',
    replies: [
      {
        id: 'feereq_reply_seed_001',
        authorId: 'admin_001',
        authorRole: 'admin',
        body: 'We checked the approved JEE course plan and the tuition instalment is correct. No amount change was applied.',
        createdOffsetDays: -3,
        kind: 'decision',
      },
    ],
  },
  {
    id: 'feereq_seed_003',
    studentId: 'stu_006',
    feeComponent: 'registration',
    type: 'query',
    subject: 'Clarify the registration payment reference',
    description:
      'Please confirm which transaction reference belongs to my registration fee so I can reconcile the receipt with the office record.',
    status: 'resolved',
    createdOffsetDays: -8,
    updatedOffsetDays: -5,
    decisionNote: 'Registration transaction reference confirmed.',
    replies: [
      {
        id: 'feereq_reply_seed_002',
        authorId: 'admin_001',
        authorRole: 'admin',
        body: 'Your registration payment is the seeded UPI transaction listed in Payment History. The receipt reference is available there.',
        createdOffsetDays: -5,
        kind: 'decision',
      },
    ],
  },
]
