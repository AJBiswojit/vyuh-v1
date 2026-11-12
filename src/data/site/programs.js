/* ------------------------------------------------------------------
   PUBLIC SITE — program content.

   WHAT IS CONFIRMED (sourced from the repository, not invented):
     · JEE and NEET are the two examination-preparation tracks.
     · Foundation is an existing third track: batch `batch_003` "Foundation X",
       grade-10 school syllabus with olympiad extension — it is shown because it
       is confirmed to be offered, and labelled as such.
     · Subject coverage comes from the shared academic taxonomy
       (src/data/mock/subjects.mock.js): JEE = Physics, Chemistry, Mathematics;
       NEET = Physics, Chemistry, Biology; Foundation = Mathematics, Physics.
     · Teaching, assessment and support capabilities are the capabilities that
       actually exist in this codebase (see `SUPPORT_CAPABILITIES`).

   WHAT IS DELIBERATELY ABSENT (unverified, so not published):
     · fees, batch start dates, class timetables, seat counts, eligibility cut-
       offs, faculty-to-batch assignment, duration in months.
   Each omission is surfaced on the page as a clearly identifiable
   "to be confirmed" item instead of a plausible-looking invented value.
------------------------------------------------------------------- */

export const PROGRAM_ENQUIRY_TOPICS = [
  { id: 'jee', label: 'JEE Main & Advanced' },
  { id: 'neet', label: 'NEET UG' },
  { id: 'foundation', label: 'Foundation (Class X)' },
  { id: 'undecided', label: 'Not sure yet — please advise' },
]

export const PROGRAMS = [
  {
    id: 'jee',
    number: '01',
    title: 'JEE Main & Advanced',
    shortTitle: 'JEE Main & Advanced',
    targetExam: 'JEE Main and JEE Advanced',
    audience:
      'Students preparing for the JEE Main and Advanced examinations who want concept-first teaching backed by computer-based practice and question-level feedback.',
    overview:
      'A two-examination track: JEE Main pattern practice and JEE Advanced problem depth are taught together, so a student does not have to choose between speed and rigour. Physics, Chemistry and Mathematics are taught as one coordinated syllabus with weekly computer-based tests and a written analysis of every attempt.',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    subjectDetail: [
      'Physics — mechanics, work and energy, rotational dynamics, current electricity and optics.',
      'Chemistry — mole concept, chemical equilibrium and bonding, organic basics and electrochemistry.',
      'Mathematics — quadratic equations, trigonometry, differential calculus, vectors and three-dimensional geometry, probability.',
    ],
    teaching: [
      'Concept-first explanation before any question practice, in every chapter.',
      'Worked examples that show the reasoning, not only the final answer.',
      'Sectional problem clinics that revisit a chapter after the first test.',
      'Revision ladders that return to earlier chapters on a fixed interval.',
    ],
    assessment: [
      'Unit tests in the JEE Advanced section format: single-correct, multiple-correct and numerical.',
      'Full-length three-subject mock papers on the current JEE Advanced pattern.',
      'Computer-based delivery with the on-screen timer, save-and-next flow and question palette used in the examination.',
      'Question-level analysis after every paper: correctness, time spent, topic accuracy and negative-marking impact.',
    ],
    support: [
      'Live digital classrooms with a shared session room and attendance recorded per session.',
      'Published class recordings for revision, subject to faculty publication.',
      'Faculty doubt threads answered inside the student workspace.',
      'A local academic assistant for platform and study-record questions (see the note below).',
    ],
    enquiryTopicId: 'jee',
    image: '/assets/program-jee.webp',
    imageAlt: 'Illustration of a student solving physics and mathematics problems',
  },
  {
    id: 'neet',
    number: '02',
    title: 'NEET UG',
    shortTitle: 'NEET UG',
    targetExam: 'NEET UG',
    audience:
      'Students preparing for the NEET UG examination who need a biology-led plan with Physics and Chemistry support that is examined to the same standard.',
    overview:
      'A biology-led preparation track: NCERT-aligned concept ladders in Biology are paired with focused Physics and Chemistry revision, then tested in full-length NEET pattern mocks. Physiology receives dedicated revision sessions because that is where accuracy is most often lost.',
    subjects: ['Physics', 'Chemistry', 'Biology'],
    subjectDetail: [
      'Biology — cell biology, genetics, human physiology and ecology.',
      'Physics — mechanics, current electricity and optics at NEET depth and speed.',
      'Chemistry — mole concept, equilibrium, bonding and organic basics.',
    ],
    teaching: [
      'Biology taught from the NCERT line outward, with diagram and terminology drills.',
      'Dedicated physiology and genetics revision sessions.',
      'Physics and Chemistry taught for accuracy-per-minute rather than maximum depth.',
      'Fortnightly full-length tests that keep the biology-led schedule honest.',
    ],
    assessment: [
      'Chapter tests and an NEET-pattern biology mock with the full three-subject paper.',
      'Computer-based delivery with negative marking and an on-screen timer.',
      'Accuracy and time-per-question analysis by topic, with the weakest topics listed first.',
      'Result visibility is set per paper by the faculty who publishes it.',
    ],
    support: [
      'Live digital classrooms, including a weekend full-length mock session.',
      'Recordings for the sessions where faculty publish them.',
      'Faculty doubt threads with a seeded mentor per student.',
      'Question-level analysis that separates unanswered from incorrect — a large score gap usually means attempts were left out, not that concepts failed.',
    ],
    enquiryTopicId: 'neet',
    image: '/assets/program-neet.webp',
    imageAlt: 'Illustration of a student studying biology with a microscope',
  },
  {
    id: 'foundation',
    number: '03',
    title: 'Foundation (Class X)',
    shortTitle: 'Foundation',
    targetExam: 'School syllabus, with olympiad extension work',
    audience:
      'Class X students who want the school syllabus taught solidly, with olympiad-style extension problems for students who need more stretch.',
    overview:
      'A school-syllabus foundation track that does not rush toward an entrance examination. Mathematics and Physics are taught to a depth that makes later JEE or NEET preparation easier, with olympiad enrichment for students ready for it. This track is confirmed as an existing offering but is deliberately smaller in scope than the two examination tracks.',
    subjects: ['Mathematics', 'Physics'],
    subjectDetail: [
      'Mathematics — algebra, geometry and number work at Class X depth, with olympiad extension problems.',
      'Physics — motion, forces, work and energy, taught with classroom demonstrations.',
    ],
    teaching: [
      'School-syllabus coverage first; enrichment is added, not substituted.',
      'Two sessions a week — Mathematics and Physics — in a small cohort.',
      'Olympiad extension problems for students who finish core work early.',
    ],
    assessment: [
      'Chapter checks aligned to school examinations.',
      'The same computer-based test engine as the examination tracks, so assessment habits form early.',
    ],
    support: [
      'Live classroom sessions with recorded attendance.',
      'Recordings where faculty publish them.',
      'Doubt support through the same faculty threads used by the examination tracks.',
    ],
    enquiryTopicId: 'foundation',
    image: '/assets/program-academic.webp',
    imageAlt: 'Illustration of a student revising with textbooks and notes',
  },
]

/* Items that are real parts of what a family needs to know but are NOT placed in
   this repository, so the public site shows them as pending rather than guessed. */
export const PROGRAM_UNVERIFIED_DETAILS = [
  { id: 'fees', label: 'Programme fees and payment schedule', note: 'Not published yet — confirm with the admissions office.' },
  { id: 'intake', label: 'Next batch start date and intake size', note: 'Batch dates are set per cohort; confirm with admissions.' },
  { id: 'schedule', label: 'Weekly class timetable for the upcoming batch', note: 'Published on the workspace calendar once a batch is confirmed.' },
  { id: 'eligibility', label: 'Eligibility and admission criteria', note: 'The institute has not published these criteria on this website.' },
]

/* Comparison rows. `value` functions read the programme record, so a change in
   one place updates the comparison table everywhere. */
export const COMPARISON_ROWS = [
  { id: 'target', label: 'Target examination', value: (program) => program.targetExam },
  { id: 'subjects', label: 'Subjects', value: (program) => program.subjects.join(' · ') },
  {
    id: 'audience',
    label: 'Intended student',
    value: (program) =>
      program.id === 'jee'
        ? 'JEE Main / Advanced aspirants'
        : program.id === 'neet'
          ? 'NEET UG aspirants'
          : 'Class X students building fundamentals',
  },
  {
    id: 'assessment',
    label: 'Assessment style',
    value: (program) =>
      program.id === 'jee'
        ? 'Unit + full-length JEE Advanced pattern'
        : program.id === 'neet'
          ? 'Chapter + full-length NEET pattern'
          : 'School-aligned chapter checks',
  },
  {
    id: 'support',
    label: 'Learning support',
    value: (program) =>
      program.id === 'foundation'
        ? 'Live class, recordings, faculty doubts'
        : 'Live class, recordings, faculty doubts, performance intelligence',
  },
  {
    id: 'fees',
    label: 'Fees',
    value: () => null,
    note: 'Not published',
  },
  {
    id: 'duration',
    label: 'Duration',
    value: () => null,
    note: 'To be confirmed',
  },
]

/* Capabilities the programmes draw on. Each id matches a section on the
   Learning Experience page, so the link is a real destination. */
export const SUPPORT_CAPABILITIES = [
  { id: 'computer-based-examinations', label: 'Computer-based examinations' },
  { id: 'examination-analysis', label: 'Question-level examination analysis' },
  { id: 'live-digital-classrooms', label: 'Live digital classrooms' },
  { id: 'class-recordings', label: 'Class recordings' },
  { id: 'faculty-doubt-support', label: 'Faculty doubt support' },
  { id: 'attendance-tracking', label: 'Attendance tracking' },
]
