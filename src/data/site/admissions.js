/* ------------------------------------------------------------------
   PUBLIC SITE — Admissions content.

   Integrity rules for this file:
     · No deadline, fee, seat count or eligibility cut-off is stated as fact.
       Anything the institute has not published is written as "awaiting
       confirmation" with an enquiry route.
     · The journey describes the process this build can actually demonstrate
       (enquiry → admissions conversation → campus/online counselling → enrolment
       via the office). It does not promise an online application or payment.
------------------------------------------------------------------- */

export const ADMISSIONS_HERO = {
  eyebrow: 'Admissions',
  title: 'Admissions for the',
  titleEmphasis: '2026–27',
  titleTail: 'academic year',
  lede:
    'Admission to Vyuh begins with a conversation, not a checkout. Submit an enquiry with the student’s current class and the programme they are considering; the admissions office will confirm the current intake, assessment and next steps for that programme.',
}

export const ADMISSION_AVAILABLE_PROGRAMS = [
  {
    id: 'jee',
    title: 'JEE Main & Advanced',
    subjects: 'Physics · Chemistry · Mathematics',
    detail: 'Concept-first teaching with computer-based JEE Advanced pattern testing and question-level analysis.',
    to: '/programs#jee',
    enquiryTopicId: 'jee',
  },
  {
    id: 'neet',
    title: 'NEET UG',
    subjects: 'Physics · Chemistry · Biology',
    detail: 'Biology-led preparation with NCERT-aligned concept ladders and full-length NEET pattern mocks.',
    to: '/programs#neet',
    enquiryTopicId: 'neet',
  },
  {
    id: 'foundation',
    title: 'Foundation (Class X)',
    subjects: 'Mathematics · Physics',
    detail: 'School syllabus taught solidly, with olympiad extension work for students who need more stretch.',
    to: '/programs#foundation',
    enquiryTopicId: 'foundation',
  },
]

export const ADMISSION_JOURNEY = [
  {
    id: 'enquiry',
    number: '01',
    title: 'Submit an enquiry',
    body: 'Use the form on this page. Student name, current class, the programme under consideration and a contact number are all the admissions office needs to start.',
    note: 'The form on this website is a demonstration workflow — it stores your enquiry in this browser and gives you a reference, it does not transmit to the institute.',
  },
  {
    id: 'conversation',
    number: '02',
    title: 'Admissions conversation',
    body: 'A member of the admissions office contacts the number you provide to understand the student’s current preparation, target year and the programme that fits.',
    note: 'Timelines are set by the admissions office and are not published on this website.',
  },
  {
    id: 'counselling',
    number: '03',
    title: 'Counselling session',
    body: 'A subject-level counselling conversation with the academic team, covering the programme structure, the assessment pattern and what a typical week looks like.',
    note: null,
  },
  {
    id: 'assessment',
    number: '04',
    title: 'Diagnostic assessment',
    body: 'Where the programme requires it, the student sits a short diagnostic paper on the same computer-based examination platform used during teaching.',
    note: 'The diagnostic paper’s format and role are confirmed by the admissions office at the counselling stage.',
  },
  {
    id: 'enrolment',
    number: '05',
    title: 'Enrolment',
    body: 'Admission is completed with the institute office. Enrolled students receive workspace credentials and a programme orientation.',
    note: 'Fees, documents and payment steps are handled by the office; they are not published or collected on this website.',
  },
]

export const ELIGIBILITY_PLACEHOLDER = {
  title: 'Eligibility information',
  body:
    'Vyuh has not published programme eligibility criteria, minimum marks or age requirements on this website. Because these are governed by the programme and the target examination body, we do not restate them here rather than risk publishing an outdated rule.',
  items: [
    'The JEE Main and Advanced eligibility rules are set by the National Testing Agency, and the NEET UG rules by the National Testing Agency and the relevant counselling authority. Always confirm against the current official information bulletin for the year of the examination.',
    'Class X Foundation admission is discussed with the admissions office, since it depends on the student’s current school board and grade.',
  ],
  enquiryPrompt: 'Ask the admissions office for the criteria that apply to this intake.',
}

/* FAQ — the answers here restate how this build actually behaves. */
export const ADMISSIONS_FAQS = [
  {
    id: 'submitted',
    question: 'Has my enquiry been submitted to the institute?',
    answer:
      'Not by this website. The enquiry form on this page is a frontend demonstration: it stores your details in this browser and shows you a reference number so the workflow can be reviewed end to end. No institute backend receives it. Until the institute connects a real intake system, please also contact the admissions office directly by phone or email.',
  },
  {
    id: 'fees',
    question: 'What are the programme fees?',
    answer:
      'Fees are not published on this website. The institute has not supplied a public fee schedule, and we do not display an invented figure. Ask the admissions office for the current fee structure, inclusions and payment schedule for the programme you are considering.',
  },
  {
    id: 'dates',
    question: 'When does the next batch start?',
    answer:
      'Start dates are set per cohort and are not published here. The admissions office confirms the next intake for each programme during the admissions conversation.',
  },
  {
    id: 'test',
    question: 'Is there an entrance test for admission?',
    answer:
      'The admissions journey includes a diagnostic assessment at the counselling stage, taken on the same computer-based platform used in teaching. Whether a particular programme requires it, and how the result is used, is confirmed by the admissions office.',
  },
  {
    id: 'online',
    question: 'Can I complete admission online?',
    answer:
      'No. This website does not offer an online application, document upload or payment. Enrolment is completed with the institute office, and no payment details should ever be entered on this website.',
  },
  {
    id: 'trial',
    question: 'Can a student attend a class before deciding?',
    answer:
      'The academic team arranges an observation session during counselling where scheduling allows. Ask the admissions office to arrange one for the programme under consideration.',
  },
  {
    id: 'current-class',
    question: 'What class should a student be in to join?',
    answer:
      'The JEE and NEET tracks are built for students preparing for those examinations, and the Foundation track is for Class X students. Say which class the student is in on the enquiry form and the admissions office will confirm whether the current intake fits.',
  },
]

export const COUNSELLING_INFO = {
  title: 'Counselling',
  body: 'Counselling is a subject-level conversation, not a sales call. It exists so that a student and their family can see the actual weekly structure, the assessment pattern and the teaching team before enrolling.',
  includes: [
    'Programme structure, weekly rhythm and the assessment calendar for the intake.',
    'A walkthrough of the student workspace: classes, tests, analysis and doubt threads.',
    'A subject conversation with the teaching team for the programme under consideration.',
    'An honest view of what the programme expects from the student between sessions.',
  ],
  format:
    'Counselling is arranged by the admissions office by phone or in person at the campus. Times are set per family; no fixed public counselling slots are advertised on this website.',
}

export const CLASS_OPTIONS = [
  'Class VIII',
  'Class IX',
  'Class X',
  'Class XI',
  'Class XII',
  'Completed Class XII',
  'Other / not sure',
]

export const PROGRAM_OPTIONS = [
  'JEE Main & Advanced',
  'NEET UG',
  'Foundation (Class X)',
  'Not sure yet — please advise',
]
