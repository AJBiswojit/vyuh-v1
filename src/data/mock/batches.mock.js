/* Batches — the shared grouping between students, faculty, exams and classes. */

export const BATCHES = [
  {
    id: 'batch_001',
    name: 'JEE Advanced 2026',
    code: 'JEE-A26',
    section: 'Alpha',
    program: 'JEE',
    studentIds: ['stu_001', 'stu_002', 'stu_003', 'stu_004', 'stu_005', 'stu_010'],
    facultyIds: ['fac_001', 'fac_002', 'fac_003'],
    subjectIds: ['sub_phy', 'sub_chem', 'sub_math'],
    schedule: [
      { day: 'Monday', slots: ['16:00 – 17:30 Physics', '17:45 – 19:15 Mathematics'] },
      { day: 'Wednesday', slots: ['16:00 – 17:30 Chemistry', '17:45 – 19:15 Physics'] },
      { day: 'Friday', slots: ['16:00 – 17:30 Mathematics', '17:45 – 19:15 Chemistry'] },
    ],
    startDate: '2025-04-02',
    endDate: '2026-05-20',
    status: 'active',
    capacity: 30,
    attendanceThreshold: 75,
    createdAt: '2025-03-20T00:00:00.000Z',
    description:
      'Full-length JEE Advanced preparation: mechanics, physical chemistry and calculus with weekly CBT mocks.',
  },
  {
    id: 'batch_002',
    name: 'NEET 2026',
    code: 'NEET-B26',
    section: 'Beta',
    program: 'NEET',
    studentIds: ['stu_006', 'stu_007', 'stu_008', 'stu_009'],
    facultyIds: ['fac_001', 'fac_002', 'fac_004'],
    subjectIds: ['sub_phy', 'sub_chem', 'sub_bio'],
    schedule: [
      { day: 'Tuesday', slots: ['10:00 – 11:30 Biology', '12:00 – 13:30 Chemistry'] },
      { day: 'Thursday', slots: ['10:00 – 11:30 Biology', '12:00 – 13:30 Physics'] },
      { day: 'Saturday', slots: ['10:00 – 12:00 Full-length mock'] },
    ],
    startDate: '2025-04-02',
    endDate: '2026-05-03',
    status: 'active',
    capacity: 28,
    attendanceThreshold: 80,
    createdAt: '2025-03-20T00:00:00.000Z',
    description:
      'NEET UG biology-led preparation with physiology focus sessions and fortnightly full-length tests.',
  },
  {
    id: 'batch_003',
    name: 'Foundation X',
    code: 'FND-C26',
    section: 'Gamma',
    program: 'Foundation',
    studentIds: ['stu_011', 'stu_012'],
    facultyIds: ['fac_003'],
    subjectIds: ['sub_math', 'sub_phy'],
    schedule: [
      { day: 'Monday', slots: ['09:00 – 10:15 Mathematics'] },
      { day: 'Thursday', slots: ['09:00 – 10:15 Physics'] },
    ],
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    status: 'active',
    capacity: 24,
    attendanceThreshold: 75,
    createdAt: '2026-03-12T00:00:00.000Z',
    description: 'Class X foundation batch covering school syllabus with olympiad enrichment.',
  },
  {
    id: 'batch_004',
    name: 'JEE Advanced 2025',
    code: 'JEE-A25',
    section: 'Alpha',
    program: 'JEE',
    studentIds: [],
    facultyIds: ['fac_001', 'fac_002', 'fac_003'],
    subjectIds: ['sub_phy', 'sub_chem', 'sub_math'],
    schedule: [],
    startDate: '2024-04-01',
    endDate: '2025-05-18',
    status: 'archived',
    capacity: 30,
    attendanceThreshold: 75,
    createdAt: '2024-03-15T00:00:00.000Z',
    description: 'Archived 2025 cohort retained for reporting and historical comparison.',
  },
]

export const BATCH_BY_ID = BATCHES.reduce((accumulator, batch) => {
  accumulator[batch.id] = batch
  return accumulator
}, {})

export const COURSES = [
  {
    id: 'course_jee',
    name: 'JEE Advanced Program',
    program: 'JEE',
    batchIds: ['batch_001', 'batch_004'],
    subjectIds: ['sub_phy', 'sub_chem', 'sub_math'],
    durationWeeks: 60,
    description: 'Two-year integrated JEE Advanced track with NTA-style CBT practice.',
  },
  {
    id: 'course_neet',
    name: 'NEET UG Program',
    program: 'NEET',
    batchIds: ['batch_002'],
    subjectIds: ['sub_phy', 'sub_chem', 'sub_bio'],
    durationWeeks: 60,
    description: 'Biology-led NEET UG track with NCERT-aligned concept ladders.',
  },
  {
    id: 'course_foundation',
    name: 'Foundation Program',
    program: 'Foundation',
    batchIds: ['batch_003'],
    subjectIds: ['sub_math', 'sub_phy'],
    durationWeeks: 44,
    description: 'School-syllabus foundation with olympiad extension work.',
  },
]
