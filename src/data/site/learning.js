/* ------------------------------------------------------------------
   PUBLIC SITE — Learning Experience content.

   Every capability below is described with an explicit status:

     shipped    — implemented and used in the student / faculty workspaces
     simulated  — implemented in the frontend demonstration layer only; there is
                  no hosted provider, no backend and no live model behind it
     planned    — described as a direction, not claimable as a working feature

   The status is rendered on the page as a badge next to each feature and is
   explained in a legend, so a visitor is never told that a demonstration is a
   live production capability.
------------------------------------------------------------------- */

export const STATUS_LABELS = {
  shipped: {
    label: 'Working in the product',
    tone: 'good',
    description: 'Implemented and used in the student and faculty workspaces.',
  },
  simulated: {
    label: 'Demonstration only',
    tone: 'warn',
    description:
      'Implemented in the frontend demonstration. No backend, broadcast service or external provider is connected in this build.',
  },
  planned: {
    label: 'Planned',
    tone: 'neutral',
    description: 'On the academic roadmap; not available to students yet.',
  },
}

export const FEATURES = [
  {
    id: 'ai-academic-assistance',
    number: '01',
    index: 'AI',
    title: 'AI Academic Assistance',
    status: 'simulated',
    summary:
      'An in-workspace academic assistant that answers questions about attendance, examination performance, fees and support tickets using the student’s own records.',
    detail: [
      'Replies are composed from the student’s saved attempt, attendance, fee and ticket records rather than from general advice.',
      'Faculty receive a parallel assistant for examination, class, doubt and recording questions.',
      'Questions it cannot route to a known intent are escalated to the Admin Support desk instead of being answered with a guess.',
    ],
    honesty:
      'In this build there is no hosted language model, API key or external AI provider. Replies are deterministic templates matched by keyword intent — the interface labels them as a mock response service wherever they appear.',
    evidence: { kind: 'panel', title: 'Assistant, as it appears in the workspace', lines: [
      { role: 'student', text: 'How is attendance calculated?' },
      {
        role: 'assistant',
        text: 'Attendance is eligible attended minutes divided by eligible class minutes, not a class count. Your saved records currently show 78% across 6 recorded sessions; the threshold is 75%.',
      },
      { role: 'student', text: 'What fees are outstanding?' },
      {
        role: 'assistant',
        text: 'Your Payment & Dues records show the tuition instalment billed, part paid, with the balance outstanding. Pay Now is a simulated local demo — no real gateway is contacted.',
      },
    ] },
    screen: { label: 'Mock response service', note: 'Deterministic templates · no live model' },
  },
  {
    id: 'computer-based-examinations',
    number: '02',
    index: 'Q',
    title: 'Computer-Based Examinations',
    status: 'shipped',
    summary:
      'Examinations are attempted on screen in the target paper’s own pattern: sections, negative marking, a countdown timer and a question palette.',
    detail: [
      'Instructions must be acknowledged before the paper unlocks, mirroring the examination-day flow.',
      'Every response, mark-for-review and answer change is recorded as it happens, so a reconnection restores the attempt.',
      'The paper auto-submits when the timer reaches zero; the last saved responses are treated as final.',
      'Faculty build papers from a shared question bank, so a question is never owned privately by one paper.',
    ],
    honesty: 'The engine is functional. Papers are seeded demonstration examinations; no external examination body is connected.',
    screen: {
      label: 'Examination screen',
      note: 'Timer · section navigation · question palette',
      mock: 'exam',
    },
  },
  {
    id: 'examination-analysis',
    number: '03',
    index: 'A',
    title: 'Detailed Examination Analysis',
    status: 'shipped',
    summary:
      'After publication, every attempt becomes a question-level analysis: accuracy by topic, time per question, marks lost to negative marking and the weakest topics ranked first.',
    detail: [
      'Score percentage is shown against accuracy, so unanswered questions are not mistaken for wrong concepts.',
      'Topic-level breakdown separates strong from developing areas using measured accuracy.',
      'Time-management and answer-change insight is derived from the attempt’s own timings, not an average.',
      'Faculty see the same analysis at paper level through item analysis, which closes the loop with the teaching.',
    ],
    honesty: 'Calculated from saved attempts and question records in the demonstration store. All figures are derived, never authored.',
    screen: {
      label: 'Analysis view',
      note: 'Topic accuracy · time per question · negative impact',
      mock: 'analysis',
    },
  },
  {
    id: 'live-digital-classrooms',
    number: '04',
    index: 'L',
    title: 'Live Digital Classrooms',
    status: 'simulated',
    summary:
      'A shared session room with a participant list, hand raising, in-session chat and polls, plus local camera, microphone and screen-share controls.',
    detail: [
      'Students join a started session from the class list; the join and leave events feed the attendance record.',
      'Faculty start and end a session, share a screen, launch polls and answer chat during the class.',
      'Class material is presented as a deck of slides inside the session.',
    ],
    honesty:
      'The classroom uses the browser’s real camera, microphone and screen-share APIs where permission is granted, but it does not broadcast media to remote participants: there is no signalling server in this frontend build. Participant joins and polls are simulated.',
    screen: {
      label: 'Classroom session',
      note: 'Participants · chat · polls · local media',
      mock: 'classroom',
    },
  },
  {
    id: 'class-recordings',
    number: '05',
    index: 'R',
    title: 'Class Recordings',
    status: 'shipped',
    summary:
      'Published sessions are available to the batch as playable recordings, with a poster frame and download where the faculty has allowed it.',
    detail: [
      'Faculty control publication: a recording can remain in processing or draft state.',
      'Visibility is batch-scoped; a recording is never presented to a student outside its batch.',
      'Download availability is a per-recording faculty setting.',
    ],
    honesty: 'Playback is real — the sample recording in this repository really plays. The clip is a short demonstration capture, not a full lesson.',
    screen: {
      label: 'Recording',
      note: 'Poster · playback · download availability',
      mock: 'recording',
    },
  },
  {
    id: 'performance-intelligence',
    number: '06',
    index: 'P',
    title: 'Performance Intelligence',
    status: 'shipped',
    summary:
      'A cross-examination performance view that compares attempts over time and keeps academic and participation signals deliberately separate.',
    detail: [
      'Score and accuracy trends are drawn across published attempts, not from a single paper.',
      'Academic performance and participation (attendance, classes, doubts) are reported in separate blocks — an “overall academic score” is never manufactured out of unrelated indicators.',
      'Topic-level strength maps carry forward to the next revision decision.',
    ],
    honesty: 'Every figure is derived from graded attempts. A student with no graded attempt sees an empty state, not a placeholder number.',
    screen: {
      label: 'Performance view',
      note: 'Attempt trend · topic strength · participation kept separate',
      mock: 'performance',
    },
  },
  {
    id: 'attendance-tracking',
    number: '07',
    index: 'T',
    title: 'Attendance Tracking',
    status: 'shipped',
    summary:
      'Attendance is computed from session join and leave events as eligible minutes, not as a count of classes attended.',
    detail: [
      'Late arrival and early departure are measured inside the session rather than treated as a binary present or absent.',
      'Reconnections are merged so a network gap is never double-counted.',
      'Late-join allowance, grace minutes and the attendance threshold are institute policy values, editable by an administrator.',
      'Attendance below the threshold is surfaced to the student and flagged to the institute.',
    ],
    honesty: 'Records are created when a student joins a started session in this demonstration — including the sample live class seeded for today.',
    screen: {
      label: 'Attendance record',
      note: 'Joined · left · late arrival · early departure',
      mock: 'attendance',
    },
  },
  {
    id: 'faculty-doubt-support',
    number: '08',
    index: 'D',
    title: 'Faculty Doubt Support',
    status: 'shipped',
    summary:
      'Students raise a doubt in their workspace; the faculty member who teaches the subject replies in the same thread, with an optional screenshot or document reference.',
    detail: [
      'A doubt carries a subject, a topic, a question reference and the student’s own attempt, so the reply has context.',
      'Threads are resolved, reopened and audited; a resolved doubt remains searchable.',
      'Faculty see an inbox ranked by age and subject rather than a shared mailbox.',
    ],
    honesty: 'Attachments are recorded as file metadata in this demonstration — no file upload service is connected.',
    screen: {
      label: 'Doubt thread',
      note: 'Subject · topic · attachment reference · reply',
      mock: 'doubt',
    },
  },
  {
    id: 'academic-progress-monitoring',
    number: '09',
    index: 'M',
    title: 'Academic Progress Monitoring',
    status: 'shipped',
    summary:
      'Faculty and administration see cohort-level progress — published papers, attempt completion, topic weakness across a batch and attendance — without reading individual notebooks.',
    detail: [
      'Item analysis at paper level shows which questions the cohort answered well and which need re-teaching.',
      'Batch rosters carry attendance and result status together, so a student who is drifting is visible early.',
      'Reports can be exported from the administration workspace.',
    ],
    honesty: 'Cohort reporting runs on seeded demonstration records in this build.',
    screen: {
      label: 'Cohort view',
      note: 'Paper-level item analysis · batch progress',
      mock: 'cohort',
    },
  },
]

/* The journey that ties the features together. Each step names the feature ids
   it draws on so the page can link both ways. */
export const JOURNEY = [
  {
    id: 'learn',
    number: '01',
    title: 'Learn',
    body: 'Concepts are taught in a live classroom, with the session deck, chat and polls in the same room.',
    features: ['live-digital-classrooms', 'class-recordings', 'faculty-doubt-support'],
  },
  {
    id: 'practise',
    number: '02',
    title: 'Practise',
    body: 'Computer-based tests reproduce the real paper: sections, negative marking and the countdown timer.',
    features: ['computer-based-examinations', 'ai-academic-assistance'],
  },
  {
    id: 'review',
    number: '03',
    title: 'Review',
    body: 'Every attempt becomes question-level analysis, and a doubt thread carries the ones that still do not make sense.',
    features: ['examination-analysis', 'faculty-doubt-support'],
  },
  {
    id: 'improve',
    number: '04',
    title: 'Improve',
    body: 'Performance intelligence ranks the weakest measured topic first, and attendance keeps the habit visible.',
    features: ['performance-intelligence', 'attendance-tracking', 'academic-progress-monitoring'],
  },
]

/* Verbatim excerpts from the existing policy record, so the "how we work" panel
   on this page cannot drift from the product defaults. */
export const POLICY_EXCERPTS = [
  { label: 'Attendance threshold', value: '75% of eligible minutes (institute default)' },
  { label: 'Grace period', value: '5 minutes' },
  { label: 'Late-join allowance', value: '15 minutes after a session starts' },
  { label: 'Minimum eligible session', value: '10 minutes' },
  { label: 'Examination access window', value: 'Questions unlock 15 minutes before the paper begins' },
  { label: 'Auto-submit on expiry', value: 'Enabled' },
  { label: 'Recording retention', value: '180 days' },
]

export const TECH_STACK_NOTE =
  'Vyuh runs as a single web application for students, faculty and administration. The screens shown on this page come from that application, not from a separate marketing mock-up.'

/* Screens recreated on the page. `evidence.kind: 'panel'` draws a transcript;
   `screen.mock` selects one of the InterfacePreview panels. */
export const PREVIEW_NOTE =
  'The panels on this page are drawn from the product’s own screen structure and data shapes. They are labelled as representations rather than passed off as photographs of a live account.'
