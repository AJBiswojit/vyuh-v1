/* ------------------------------------------------------------------
   PUBLIC SITE — Knowledge Hub resources.

   IMPORTANT — honesty contract for this file:

   The repository contains exactly one kind of real, downloadable study asset:
   the four class-deck slide images and the two short demonstration media files
   in `public/media/`. There are no PDFs, no notes archives and no question
   papers on disk.

   Therefore each record below declares where its content actually lives:

     kind: 'media'     → a file that exists in public/media and really opens
     kind: 'article'   → content written on this site, readable at /resources/:id
     kind: 'pending'   → no document exists yet; the card renders an explicit
                         "being prepared" state and offers an enquiry route,
                         never a fake download.

   Do not change a record to `file` unless the file is committed to this
   repository. tools/audit-public-site.mjs checks that every declared path
   exists on disk.
------------------------------------------------------------------- */

export const RESOURCE_CATEGORIES = [
  {
    id: 'study-materials',
    label: 'Study Materials',
    description: 'Class decks, revision sheets and concept walkthroughs from the academic team.',
  },
  {
    id: 'previous-year-questions',
    label: 'Previous Year Questions',
    description: 'Past examination questions organised by subject and topic, with worked solutions.',
  },
  {
    id: 'preparation-guides',
    label: 'Preparation Guides',
    description: 'Long-form guidance on planning a preparation cycle, revision and examination technique.',
  },
  {
    id: 'examination-updates',
    label: 'Examination Updates',
    description: 'Official examination-body announcements that affect JEE and NEET candidates.',
  },
  {
    id: 'academic-articles',
    label: 'Academic Articles',
    description: 'Subject explainers written by the teaching team — reasoning, not shortcuts.',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    description: 'Institute notices: schedules, sessions and platform changes.',
  },
]

export const EXAM_FILTERS = [
  { id: 'jee', label: 'JEE Main & Advanced' },
  { id: 'neet', label: 'NEET UG' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'all', label: 'All examinations' },
]

export const RESOURCES = [
  /* ---------------- real media from public/media ---------------- */
  {
    id: 'deck-rotational-dynamics',
    title: 'Rotational Dynamics — class deck',
    category: 'study-materials',
    exams: ['jee'],
    subjects: ['Physics'],
    kind: 'media',
    format: 'Slide deck · 4 slides',
    source: 'Class 14 · JEE Alpha · Aarav Mishra',
    summary:
      'The deck used in the JEE Alpha rotational-dynamics class: moment of inertia, rolling motion and a worked hoop-on-incline example.',
    asset: '/media/slides/slide-01.png',
    gallery: [
      { src: '/media/slides/slide-01.png', caption: 'Session opening: scope of the chapter' },
      { src: '/media/slides/slide-02.png', caption: 'Moment-of-inertia results table' },
      { src: '/media/slides/slide-03.png', caption: 'Worked example with the rolling condition' },
      { src: '/media/slides/slide-04.png', caption: 'Closing poll for the classroom panel' },
    ],
    updatedAt: '2026-11-10',
  },
  {
    id: 'recording-rotational-dynamics',
    title: 'Rotational Dynamics — session recording',
    category: 'study-materials',
    exams: ['jee'],
    subjects: ['Physics'],
    kind: 'media',
    format: 'Video · 17 seconds (sample clip)',
    source: 'Recorded session · JEE Alpha',
    summary:
      'A short demonstration capture of the class recording feature. The published clip is a sample for the platform, not the full lesson.',
    asset: '/media/video/recording-rotational-dynamics.mp4',
    poster: '/media/slides/slide-01.png',
    updatedAt: '2026-11-10',
  },

  /* ---------------- articles written on this site ---------------- */
  {
    id: 'score-vs-accuracy',
    title: 'Score percentage and accuracy are not the same number',
    category: 'preparation-guides',
    exams: ['jee', 'neet'],
    subjects: [],
    kind: 'article',
    format: 'Guide · 4 minute read',
    source: 'Academic team',
    summary:
      'A large gap between your score and your accuracy usually means unanswered questions, not weak concepts. How to read the two figures, and what to change in the next attempt.',
    updatedAt: '2026-11-08',
    content: [
      {
        type: 'p',
        text: 'Two students can leave an examination with the same score percentage and need completely different advice. The figure that separates them is accuracy — correct answers as a share of the questions actually attempted.',
      },
      { type: 'h2', text: 'What the two numbers measure' },
      {
        type: 'p',
        text: 'Score percentage is marks obtained divided by maximum marks. Accuracy is correct answers divided by attempted questions. A paper with negative marking punishes wrong answers twice: once in the mark lost and once in the mark the correct answer would have earned.',
      },
      { type: 'h2', text: 'Reading the gap' },
      {
        type: 'list',
        items: [
          'High accuracy, low score: the student is not attempting enough. The work is a selection and confidence problem, not a knowledge problem.',
          'Low accuracy, moderate score: the student is attempting everything and gambling. The next revision should target the topics where speed is pushing them into guesses.',
          'Both low: a genuine coverage gap. Return to the chapter before writing another full-length paper.',
        ],
      },
      {
        type: 'p',
        text: 'This is why the analysis view in Vyuh shows score percentage against accuracy rather than in two separate tabs. The gap between them is the finding.',
      },
      { type: 'h2', text: 'What to do in the next attempt' },
      {
        type: 'p',
        text: 'Pick one number to change, not both. If the gap is attempts, add a deliberate attempt target to the next paper and accept a lower score. If the gap is accuracy, drop the attempt target and re-read the weakest two topics first. Changing both at once usually changes neither.',
      },
    ],
  },
  {
    id: 'moment-of-inertia-why-rings-lose',
    title: 'Why a ring reaches the bottom last',
    category: 'academic-articles',
    exams: ['jee'],
    subjects: ['Physics'],
    kind: 'article',
    format: 'Article · 3 minute read',
    source: 'Aarav Mishra · Physics',
    summary:
      'A short derivation that explains why the rolling body with mass furthest from its axis is always the slowest down an incline — and the one line that makes it obvious.',
    updatedAt: '2026-11-06',
    content: [
      {
        type: 'p',
        text: 'Roll a ring, a disc and a solid sphere down the same incline. The solid sphere wins every time. The result is not about mass and it is not about radius; both cancel. It is about where the mass sits relative to the axis it turns around.',
      },
      { type: 'h2', text: 'The one line that settles it' },
      {
        type: 'p',
        text: 'For a body rolling without slipping, the acceleration along the incline is a = g sinθ / (1 + I/(MR²)). Everything that distinguishes one body from another is inside the dimensionless ratio I/(MR²) — the shape factor.',
      },
      { type: 'table', head: ['Body', 'I/(MR²)', 'a / (g sinθ)'], rows: [
        ['Ring (about axis)', '1', '1/2'],
        ['Disc (about axis)', '1/2', '2/3'],
        ['Solid sphere', '2/5', '5/7'],
      ] },
      {
        type: 'p',
        text: 'The ring carries all of its mass at the rim, so it must spend the most energy on rotation for a given linear speed. That is why it arrives last — not because it is heavier, but because a larger share of the same drop is converted into spin.',
      },
      { type: 'h2', text: 'The examination trap' },
      {
        type: 'p',
        text: 'The common error is to assume the lighter body wins. Change the mass of the sphere and the ring, keep the shapes, and the order never changes. If a question changes the mass, it is asking about something else — usually friction or the slipping condition.',
      },
    ],
  },
  {
    id: 'revision-that-returns',
    title: 'A revision ladder that actually returns',
    category: 'preparation-guides',
    exams: ['jee', 'neet', 'foundation'],
    subjects: [],
    kind: 'article',
    format: 'Guide · 5 minute read',
    source: 'Academic team',
    summary:
      'Most revision plans are a list of chapters read again. A ladder is a schedule of returns. How to build one that survives a bad week.',
    updatedAt: '2026-11-04',
    content: [
      {
        type: 'p',
        text: 'A revision plan that says “revise thermodynamics in week 12” fails for a predictable reason: week 12 arrives with new material that still needs work, and the plan is abandoned. A ladder is built differently — it schedules returns on a fixed interval, and it assumes that some returns will be missed.',
      },
      { type: 'h2', text: 'The interval matters more than the list' },
      {
        type: 'p',
        text: 'Return to a chapter one day after it is taught, then one week, then one month. The first return is short — ten minutes and two questions. The second is a problem set. The third is a timed section. Each return should be cheaper than re-learning the chapter, or the ladder will be abandoned.',
      },
      { type: 'h2', text: 'Build the ladder from evidence' },
      {
        type: 'list',
        items: [
          'After every test, list the two topics with the lowest measured accuracy.',
          'Put those two at the front of the next revision session, before anything new.',
          'Keep a chapter on the ladder until one timed attempt is clean, not until it feels understood.',
        ],
      },
      {
        type: 'p',
        text: 'The analysis view exists to make this cheap: the weakest topics are already ranked by measured accuracy, so the ladder is a decision you can make in a minute rather than a review of the whole syllabus.',
      },
    ],
  },
  {
    id: 'reading-an-exam-analysis',
    title: 'How to read your examination analysis',
    category: 'preparation-guides',
    exams: ['jee', 'neet'],
    subjects: [],
    kind: 'article',
    format: 'Guide · 6 minute read',
    source: 'Academic team',
    summary:
      'A walkthrough of every block in the Vyuh analysis view — topic accuracy, time per question, negative-marking cost and the answer-change insight — and the decision each one should trigger.',
    updatedAt: '2026-11-02',
    content: [
      {
        type: 'p',
        text: 'An analysis view is only useful if each block leads to a decision. This walkthrough takes the blocks in the order they appear and states what each one is for.',
      },
      { type: 'h2', text: 'Score against accuracy' },
      {
        type: 'p',
        text: 'Read the gap first. If it is wide, the attempt was selective or incomplete; if it is narrow and low, coverage is the problem.',
      },
      { type: 'h2', text: 'Topic accuracy, weakest first' },
      {
        type: 'p',
        text: 'The view sorts topics by accuracy, not by syllabus order, so the first row is the topic to revise. Ignore topic volume here — a single wrong answer in a small topic can look worse than it is; use the attempt count shown beside the accuracy.',
      },
      { type: 'h2', text: 'Time per question' },
      {
        type: 'p',
        text: 'A topic answered correctly but slowly costs more than its marks suggest, because the time comes out of another section. Compare time per question inside the same topic across papers rather than across topics.',
      },
      { type: 'h2', text: 'Negative-marking cost' },
      {
        type: 'p',
        text: 'This block states the marks lost to incorrect answers. If it is larger than the marks you gained in your strongest topic, the next paper should be attempted more selectively.',
      },
      { type: 'h2', text: 'Answer changes' },
      {
        type: 'p',
        text: 'The insight compares answer changes that improved the score with those that reduced it. A net negative is a signal to stop second-guessing on the first read, not a reason to stop reviewing.',
      },
    ],
  },
  {
    id: 'ncert-first-biology',
    title: 'Biology is an NCERT paper — read it that way',
    category: 'academic-articles',
    exams: ['neet'],
    subjects: ['Biology'],
    kind: 'article',
    format: 'Article · 3 minute read',
    source: 'Teaching team · Biology',
    summary:
      'Why NEET Biology rewards line-level familiarity with the prescribed textbook, and a method for reading a chapter so that the details stay.',
    updatedAt: '2026-10-30',
    content: [
      {
        type: 'p',
        text: 'Biology in NEET is examined at a level of detail that surprises students who prepare from summaries. The questions are rarely about a grand idea; they are about which of four statements is the exception, and the exception is usually a phrase on a single line of the prescribed textbook.',
      },
      { type: 'h2', text: 'Read for the exception' },
      {
        type: 'p',
        text: 'Every chapter contains formulations with an exception — “all except”, “in most cases”, “except in”. Mark these on the first read. A page of biology is mostly description, and the examinable part is the qualifier.',
      },
      { type: 'h2', text: 'Diagram and label drills' },
      {
        type: 'list',
        items: [
          'Redraw the chapter diagram from memory, then check the labels against the textbook.',
          'Say the pathway out loud in order before writing it.',
          'Turn every table in the chapter into a question with one wrong cell.',
        ],
      },
      {
        type: 'p',
        text: 'This is slower than reading a summary, and it is meant to be. Physiology and genetics reward familiarity with terminology more than familiarity with themes.',
      },
    ],
  },
  {
    id: 'exam-day-checklist',
    title: 'The last 48 hours before a paper',
    category: 'preparation-guides',
    exams: ['jee', 'neet'],
    subjects: [],
    kind: 'article',
    format: 'Guide · 3 minute read',
    source: 'Academic team',
    summary:
      'What to do — and what to stop doing — in the two days before an examination, written for a student who has already prepared.',
    updatedAt: '2026-10-28',
    content: [
      {
        type: 'p',
        text: 'The last two days are not for learning new material. They are for making sure that what is already known can be produced under time pressure, from a fresh start, in the pattern of the actual paper.',
      },
      { type: 'h2', text: 'Two days out' },
      {
        type: 'list',
        items: [
          'One full-length paper at the real start time, in one sitting, with the instructions acknowledgement.',
          'Review only the analysis of that paper.',
          'Read the weakest two topics from your own notes — no new question banks.',
        ],
      },
      { type: 'h2', text: 'One day out' },
      {
        type: 'list',
        items: [
          'Formula and definition sweep: your own list, not a bought compendium.',
          'No new chapters. No new question sources.',
          'Confirm the examination centre, reporting time and permitted items.',
        ],
      },
      { type: 'h2', text: 'The morning of the paper' },
      {
        type: 'p',
        text: 'Arrive early enough that the first ten minutes of the paper are not spent settling down. Start with the section you are most confident in only if that is what you rehearsed; otherwise follow the paper order. Do not change your attempt strategy on the day.',
      },
    ],
  },
  {
    id: 'attendance-and-outcomes',
    title: 'Attendance is a study signal, not a discipline record',
    category: 'academic-articles',
    exams: ['jee', 'neet', 'foundation'],
    subjects: [],
    kind: 'article',
    format: 'Article · 3 minute read',
    source: 'Academic team',
    summary:
      'Why Vyuh measures attendance in minutes rather than classes, and how a session record becomes an early academic warning.',
    updatedAt: '2026-10-24',
    content: [
      {
        type: 'p',
        text: 'Counting classes attended hides the thing that matters. A student who joins every session twenty minutes late has perfect attendance and a serious problem. Vyuh records join and leave events and computes eligible attended minutes, because the minutes are what carry the lesson.',
      },
      { type: 'h2', text: 'What the record contains' },
      {
        type: 'list',
        items: [
          'When the student joined and when they left, per session.',
          'Whether the arrival was late and whether the departure was early, against policy grace periods.',
          'Merged reconnections, so a dropped network does not create a false absence.',
        ],
      },
      { type: 'h2', text: 'Why it is shared' },
      {
        type: 'p',
        text: 'The student sees the same record as the faculty member and the institute. A shared number cannot become an argument about memory, and it lets a mentor intervene in week three rather than at the end of a term.',
      },
    ],
  },

  /* ---------------- pending records: no document yet ---------------- */
  {
    id: 'pyq-jee-physics',
    title: 'JEE Physics — previous year questions by topic',
    category: 'previous-year-questions',
    exams: ['jee'],
    subjects: ['Physics'],
    kind: 'pending',
    format: 'Question bank · in preparation',
    source: 'Academic team',
    summary:
      'Past JEE questions sorted by topic with worked solutions, intended for the Knowledge Hub. The compiled document is being prepared and is not published yet.',
    availabilityNote:
      'The institute has not published this question bank on the website yet, so no download is offered. Request it through the enquiry form and the academic team will respond.',
    updatedAt: '2026-10-20',
  },
  {
    id: 'pyq-neet-biology',
    title: 'NEET Biology — previous year questions by chapter',
    category: 'previous-year-questions',
    exams: ['neet'],
    subjects: ['Biology'],
    kind: 'pending',
    format: 'Question bank · in preparation',
    source: 'Teaching team · Biology',
    summary:
      'Chapter-wise NEET biology questions with answer keys, intended for the Knowledge Hub once the answer review is complete.',
    availabilityNote:
      'Not published yet — the answer review is incomplete. Request it through the enquiry form to be told when it opens.',
    updatedAt: '2026-10-20',
  },
  {
    id: 'updates-nta',
    title: 'Official examination-body notices',
    category: 'examination-updates',
    exams: ['jee'],
    subjects: [],
    kind: 'pending',
    format: 'Update feed · not yet connected',
    source: 'Official examination body',
    summary:
      'Vyuh will republish verified notices from the official JEE and NEET examination bodies here. No feed is connected in this build, so nothing is mirrored on this page yet.',
    availabilityNote:
      'To avoid publishing unverified dates or deadlines, this page links only to official sources once they are confirmed by the academic office. Until then, check the examination body’s own website.',
    updatedAt: '2026-10-18',
  },
  {
    id: 'announcement-winter-term',
    title: 'Winter term academic calendar',
    category: 'announcements',
    exams: ['all'],
    subjects: [],
    kind: 'pending',
    format: 'Notice · awaiting institute confirmation',
    source: 'Institute office',
    summary:
      'The public academic calendar for the winter term — class start dates, test weeks and holidays — will be published here once the institute office confirms it.',
    availabilityNote:
      'Academic dates are not published on this website yet. Enrolled students see confirmed dates on their workspace calendar; prospective students should contact the admissions office.',
    updatedAt: '2026-10-18',
  },
  {
    id: 'study-foundation-sheets',
    title: 'Foundation mathematics — practice sheets',
    category: 'study-materials',
    exams: ['foundation'],
    subjects: ['Mathematics'],
    kind: 'pending',
    format: 'Practice sheets · in preparation',
    source: 'Vikram Das · Mathematics',
    summary:
      'Graded practice sheets for the Foundation mathematics track, currently being sequenced against the syllabus for publication.',
    availabilityNote: 'Not published yet. Request the current set through the enquiry form.',
    updatedAt: '2026-10-16',
  },
]

export const RESOURCE_KIND_LABELS = {
  media: 'Available now',
  article: 'Read on this site',
  pending: 'In preparation',
}

export function resourcesByCategory(categoryId) {
  return RESOURCES.filter((resource) => resource.category === categoryId)
}

export function findResource(id) {
  return RESOURCES.find((resource) => resource.id === id) || null
}

/** A small, honest summary of what the hub currently holds. */
export function resourceCounts() {
  return RESOURCES.reduce(
    (totals, resource) => {
      totals.total += 1
      totals[resource.kind] = (totals[resource.kind] || 0) + 1
      return totals
    },
    { total: 0, media: 0, article: 0, pending: 0 },
  )
}
