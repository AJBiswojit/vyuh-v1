/* ------------------------------------------------------------------
   PUBLIC SITE — About page content.

   Integrity rules applied to this file:
     · No founding story beyond the recorded establishment year (2021).
     · No awards, rankings, accreditations, pass rates or student counts —
       none of these exist in the repository.
     · The three educators are the seeded faculty already published on the
       landing page, with the titles they hold in the seed.
     · Where the institute must supply a statement, the copy is written as an
       explicitly labelled placeholder (see PLACEHOLDERS).
------------------------------------------------------------------- */

export const ABOUT_HERO = {
  eyebrow: 'About Vyuh',
  title: 'An academic institute built for',
  titleEmphasis: 'serious',
  titleTail: 'preparation',
  lede:
    'Vyuh is a focused learning institute for students preparing for the JEE, NEET UG and school foundation levels. We teach concepts first, examine students the way the real examination does, and then show both student and teacher exactly what the attempt reveals.',
}

export const OUR_STORY = {
  heading: 'Why Vyuh exists',
  emphasis: 'Why',
  paragraphs: [
    'Most students do not fail an entrance examination because they did not study. They fail because nobody showed them what their studying was actually producing. A chapter can feel finished in a notebook and still collapse in a timed paper, and until a student sees that gap measured, they cannot close it.',
    'Vyuh was built around that gap. Teaching, examination and analysis are one system here: every concept taught feeds a question, every question feeds an examined attempt, and every attempt feeds the next revision decision — for the student and for the faculty member who set the paper.',
    'The institute began in 2021 with a small academic team and one conviction — that preparation should be legible. A student should be able to see, in their own records, what they understand, what they can execute under time pressure, and what they should do next.',
  ],
}

export const VISION = {
  heading: 'Our vision',
  emphasis: 'vision',
  statement:
    'To make examination preparation legible: every student able to see exactly what they understand, what they can execute under time pressure, and what to do next.',
  supporting:
    'A vision for an academic institution should be about what it refuses to leave to chance. Here, the thing we refuse to leave to chance is feedback — the distance between what a student believes they know and what their examined work proves.',
}

export const MISSION = {
  heading: 'Our mission',
  emphasis: 'mission',
  pillars: [
    {
      id: 'teach',
      label: 'Teach for understanding',
      description:
        'Concept-first instruction in every chapter, with worked reasoning rather than shortcut drilling, so knowledge transfers to unfamiliar problems.',
    },
    {
      id: 'examine',
      label: 'Examine like the real paper',
      description:
        'Computer-based tests in the actual examination pattern, including negative marking, section structure and an on-screen timer.',
    },
    {
      id: 'measure',
      label: 'Measure what happened',
      description:
        'Question-level analysis after every attempt: correctness, time spent, topic accuracy and the cost of negative marking — recorded, not remembered.',
    },
    {
      id: 'support',
      label: 'Support consistently',
      description:
        'Live classrooms, recordings, faculty doubt threads and attendance records that make consistency visible before it becomes a problem.',
    },
  ],
}

export const PHILOSOPHY = {
  heading: 'Academic philosophy',
  emphasis: 'philosophy',
  lede:
    'Three commitments shape how we teach, what we assess, and what we ask of a student between sessions.',
  principles: [
    {
      id: 'clarity',
      number: '01',
      title: 'Conceptual clarity',
      body:
        'A formula memorised is a liability: it works until the paper asks the question a different way. We teach the derivation and the reasoning first, and we test the reasoning separately from the calculation. Students are encouraged to attempt a question from first principles before reaching for a shortcut.',
      points: [
        'Derivations and reasoning taught before formula practice',
        'Worked examples that expose the decision, not just the arithmetic',
        'Unfamiliar-problem drills to test transfer, not recall',
      ],
    },
    {
      id: 'discipline',
      number: '02',
      title: 'Discipline',
      body:
        'Consistency is a skill and it can be scheduled. Attendance is recorded per session, live classes are timetabled, and recordings exist so that a missed session becomes a deferred session rather than a lost chapter. Nothing about this is punitive; the record exists so the student and the faculty member can act on it early.',
      points: [
        'Session-level attendance, not a monthly impression',
        'Recordings published for revision, with faculty control over publication',
        'A fixed revision ladder that returns to earlier chapters on purpose',
      ],
    },
    {
      id: 'improvement',
      number: '03',
      title: 'Consistent improvement',
      body:
        'Improvement should be measured, not felt. Every examined attempt produces a record, and those records are compared across papers — accuracy by topic, time per question, the marks lost to wrong answers. A student who can see the direction of their improvement studies differently in the following week.',
      points: [
        'Question-level analysis on every published paper',
        'Topic strength and weakness ranked by measured accuracy',
        'Time-management insight drawn from actual attempt timings',
      ],
    },
  ],
}

export const METHODOLOGY = {
  heading: 'Teaching methodology',
  emphasis: 'methodology',
  lede:
    'A structured cycle runs through every chapter and every batch. It is the same cycle for JEE, NEET UG and Foundation — only the depth and the examination pattern change.',
  steps: [
    {
      id: 'concept',
      number: '01',
      title: 'Concept',
      body: 'A chapter opens with the reasoning: definitions, derivations and the conditions in which a result is valid. Practice comes after the idea, never instead of it.',
    },
    {
      id: 'practice',
      number: '02',
      title: 'Practice',
      body: 'Graded question sets move from direct application to examination-style problems, with numerical and multiple-correct formats where the target paper uses them.',
    },
    {
      id: 'examination',
      number: '03',
      title: 'Examine',
      body: 'A computer-based test in the real pattern: sections, negative marking, a countdown timer and an instructions acknowledgement before the paper unlocks.',
    },
    {
      id: 'analysis',
      number: '04',
      title: 'Analyse',
      body: 'Question-level results — correctness, time spent, topic accuracy and the marks lost to wrong answers — become a written record for the student and the faculty member.',
    },
    {
      id: 'revision',
      number: '05',
      title: 'Revise',
      body: 'The next cycle returns to the weakest measured topic first. Revision is scheduled from evidence rather than from where the syllabus happens to be.',
    },
  ],
}

export const DIFFERENTIATORS = [
  {
    id: 'one-record',
    title: 'Teaching and assessment share one record',
    body: 'The faculty member who taught a chapter sees the attempt data from it. Analysis is not handed to a separate team or produced after the cohort has moved on.',
  },
  {
    id: 'pattern-fidelity',
    title: 'The practice paper is the real paper',
    body: 'Section structure, negative marking, question palette and the countdown timer follow the target examination, so the practice attempt rehearses the conditions rather than only the content.',
  },
  {
    id: 'time-as-data',
    title: 'Time is treated as data',
    body: 'Most analysis stops at correct and incorrect. Vyuh records how long each question took, which makes it possible to separate a knowledge gap from a speed or decision problem.',
  },
  {
    id: 'human-in-loop',
    title: 'Human teaching, tool-assisted',
    body: 'Faculty own the teaching, the paper and the feedback. Technology records and surfaces what happened; it does not replace the judgement of the educator or the mentor relationship.',
  },
]

/* Copy that must be supplied by the institute before this page can be called
   complete. Rendered with a visible "Institute input required" marker. */
export const ABOUT_PLACEHOLDERS = [
  {
    id: 'story-detail',
    label: 'Institutional story detail',
    prompt:
      'The founding narrative above is written from the recorded establishment year only. Add the institute’s own account of how Vyuh began, the first cohort and the people who built it.',
  },
  {
    id: 'recognition',
    label: 'Recognition and accreditation',
    prompt:
      'No accreditation, affiliation, ranking or award is claimed on this page. Supply verified details here once they are available so families can check them independently.',
  },
  {
    id: 'outcomes',
    label: 'Student outcomes',
    prompt:
      'No pass rate, average score or result statistic is published on this site. Provide audited outcome data if the institute wants it shown; until then the page describes method, not numbers.',
  },
]

/* Existing educators, exactly as seeded. No credential is added. */
export const FACULTY_ROSTER_NOTE =
  'The academic team is listed with the roles they hold in the institute record. Qualification details, tenure and publications are not published on this website.'
