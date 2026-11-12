import { CheckCircle2, Clock3, Info } from 'lucide-react'

/* ------------------------------------------------------------------
   InterfacePreview — a faithful, code-drawn view of what a screen in the
   actual product looks like.

   Why not screenshots: this repository has no captured product screenshots, and
   an AI-generated "screenshot" would be a fabricated interface. These panels are
   recreated from the real components' structure and the same data shapes the
   workspaces use, and they are explicitly labelled as a representation.

   Where a real asset exists (the class deck slides and the session recording in
   public/media) the preview uses the real file instead.
------------------------------------------------------------------- */

function Frame({ label, note, children, tone = 'sky' }) {
  return (
    <figure className="public-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-charcoal/10 bg-[#F6FAFD] px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-charcoal/15" />
          <span className="h-2 w-2 rounded-full bg-charcoal/15" />
          <span className="h-2 w-2 rounded-full bg-charcoal/15" />
        </div>
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-charcoal/50">{label}</p>
        <p className="hidden shrink-0 text-[10px] text-charcoal/40 sm:block">{note}</p>
      </div>
      <div className={`${tone === 'cream' ? 'bg-cream/40' : 'bg-white'} p-4 sm:p-5`}>{children}</div>
      <figcaption className="border-t border-charcoal/8 bg-white px-4 py-2 text-[10.5px] leading-[1.5] text-charcoal/45">
        Interface representation, not a photograph — recreated from the product’s own screen structure.
      </figcaption>
    </figure>
  )
}

/* --------------------------------------------------- exam screen */
function ExamMock() {
  return (
    <Frame label="Examination · Physics Unit Test 03" note="30:00 · Section A">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-charcoal px-3 py-2 text-white">
        <span className="text-[11px]">Physics Unit Test 03</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[11px] tabular-nums">24:12</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_86px]">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-charcoal/45">Question 4</p>
          <p className="mt-1 text-[12.5px] leading-[1.6] text-charcoal/85">
            A hoop of radius 0.5 m rolls without slipping down a 30° incline. Its acceleration is…
          </p>
          <ul className="mt-2.5 grid gap-1.5">
            {['5.0 m/s²', '2.5 m/s²', '3.2 m/s²', '1.8 m/s²'].map((option, index) => (
              <li
                key={option}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11.5px] ${
                  index === 1
                    ? 'border-charcoal/60 bg-[#EFF7FC] text-charcoal'
                    : 'border-charcoal/10 text-charcoal/70'
                }`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full border border-charcoal/25 text-[9px]">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[9.5px] uppercase tracking-[0.1em] text-charcoal/40">Palette</p>
          <div className="mt-1.5 grid grid-cols-4 gap-1 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <span
                key={index}
                className={`flex h-[18px] items-center justify-center rounded text-[9px] ${
                  index < 3
                    ? 'bg-charcoal text-white'
                    : index === 3
                      ? 'border border-charcoal/50 text-charcoal'
                      : 'bg-charcoal/8 text-charcoal/50'
                }`}
              >
                {index + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['Save & Next', 'Clear Response', 'Mark for Review'].map((label) => (
          <span key={label} className="rounded-md border border-charcoal/15 px-2 py-1 text-[9.5px] text-charcoal/60">
            {label}
          </span>
        ))}
      </div>
    </Frame>
  )
}

/* --------------------------------------------------- analysis */
function AnalysisMock() {
  const topics = [
    { name: 'Rotational Motion', value: 86, tone: 'bg-charcoal' },
    { name: 'Current Electricity', value: 72, tone: 'bg-charcoal/70' },
    { name: 'Ray Optics', value: 41, tone: 'bg-charcoal/45' },
    { name: 'Work, Energy & Power', value: 33, tone: 'bg-charcoal/30' },
  ]
  return (
    <Frame label="Examination analysis" note="Question level · 24 questions">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Score', value: '68%' },
          { label: 'Accuracy', value: '74%' },
          { label: 'Above time', value: '5 Q' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg bg-cream/50 px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/45">{stat.label}</p>
            <p className="mt-0.5 font-serif text-[17px] leading-none text-charcoal">{stat.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3.5 text-[9.5px] uppercase tracking-[0.1em] text-charcoal/45">Topic accuracy · weakest first</p>
      <ul className="mt-1.5 grid gap-1.5">
        {topics.map((topic) => (
          <li key={topic.name} className="flex items-center gap-2">
            <span className="w-[112px] shrink-0 truncate text-[10px] text-charcoal/65">{topic.name}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-charcoal/8">
              <span className={`block h-full rounded-full ${topic.tone}`} style={{ width: `${topic.value}%` }} />
            </span>
            <span className="w-8 text-right text-[10px] tabular-nums text-charcoal/60">{topic.value}%</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-lg border border-charcoal/10 px-2.5 py-2">
        <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/45">Negative impact</p>
        <p className="mt-0.5 text-[11px] text-charcoal/70">18 marks lost to incorrect answers · 3 unanswered</p>
      </div>
    </Frame>
  )
}

/* --------------------------------------------------- classroom */
function ClassroomMock() {
  return (
    <Frame label="Live classroom · Rotational Dynamics" note="Session live · 12 participants">
      <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-charcoal/10">
          <img
            src="/media/slides/slide-03.png"
            alt="Class deck slide: worked hoop-on-incline example"
            width="960"
            height="540"
            loading="lazy"
            className="block w-full"
          />
        </div>
        <div className="rounded-lg border border-charcoal/10 p-2">
          <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/45">Participants</p>
          <ul className="mt-1 grid gap-1">
            {['Aarav Mishra · Faculty', 'Ananya Sharma', 'Ritwik Sahoo', 'Sneha Mohanty'].map((name) => (
              <li key={name} className="flex items-center gap-1.5 text-[10px] text-charcoal/65">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7aa8c4]" aria-hidden="true" />
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[9.5px] text-charcoal/45">
        <Info className="h-3 w-3" aria-hidden="true" />
        Demo session — participants and polls are simulated in this build.
      </div>
    </Frame>
  )
}

/* --------------------------------------------------- recording */
function RecordingMock() {
  return (
    <Frame label="Recording · Work–Energy Theorem" note="Published · batch-scoped">
      <div className="overflow-hidden rounded-lg border border-charcoal/10 bg-charcoal">
        <video
          className="block w-full"
          controls
          preload="none"
          poster="/media/slides/slide-01.png"
          aria-label="Sample class recording: Work–Energy Theorem"
        >
          <source src="/media/video/recording-rotational-dynamics.mp4" type="video/mp4" />
        </video>
      </div>
      <p className="mt-2 text-[10px] leading-[1.5] text-charcoal/50">
        The sample recording in this repository — it really plays. The clip is a short demonstration
        capture, not a full lesson.
      </p>
    </Frame>
  )
}

/* --------------------------------------------------- performance */
function PerformanceMock() {
  const points = [38, 46, 44, 57, 61, 68, 74]
  const max = 100
  const width = 220
  const height = 56
  const step = width / (points.length - 1)
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${index * step} ${height - (point / max) * height}`)
    .join(' ')
  return (
    <Frame label="Performance" note="Across published attempts">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[#EFF7FC] px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/45">Score trend</p>
          <p className="mt-0.5 font-serif text-[18px] leading-none text-charcoal">+36 pts</p>
          <p className="text-[9px] text-charcoal/50">7 graded attempts</p>
        </div>
        <div className="rounded-lg bg-cream/50 px-2.5 py-2">
          <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/45">Attendance</p>
          <p className="mt-0.5 font-serif text-[18px] leading-none text-charcoal">78%</p>
          <p className="text-[9px] text-charcoal/50">Threshold 75%</p>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" role="img" aria-label="Score trend rising across seven attempts">
        <path d={path} fill="none" stroke="#242729" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={index} cx={index * step} cy={height - (point / max) * height} r="1.8" fill="#242729" />
        ))}
      </svg>
      <p className="mt-1 text-[9.5px] text-charcoal/45">
        Academic performance and participation are reported separately, never merged into one score.
      </p>
    </Frame>
  )
}

/* --------------------------------------------------- attendance */
function AttendanceMock() {
  return (
    <Frame label="Attendance" note="Eligible minutes, not class count">
      <div className="flex items-center justify-between rounded-lg bg-cream/45 px-3 py-2">
        <div>
          <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/45">Eligible attended</p>
          <p className="font-serif text-[19px] leading-none text-charcoal">78%</p>
        </div>
        <span className="rounded-full border border-charcoal/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] text-charcoal/55">
          Above 75%
        </span>
      </div>
      <ul className="mt-2 grid gap-1">
        {[
          { time: '16:02 – 17:30', note: 'Joined on time' },
          { time: '16:18 – 17:30', note: 'Late arrival · 18 min' },
          { time: '17:45 – 18:52', note: 'Early departure · 23 min' },
        ].map((row) => (
          <li key={row.time} className="flex items-center justify-between gap-2 border-b border-charcoal/8 py-1 text-[10px] last:border-0">
            <span className="inline-flex items-center gap-1.5 text-charcoal/65">
              <Clock3 className="h-3 w-3 text-charcoal/35" aria-hidden="true" />
              {row.time}
            </span>
            <span className="text-charcoal/50">{row.note}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

/* --------------------------------------------------- doubt */
function DoubtMock() {
  return (
    <Frame label="Doubt thread" note="Physics · Rotational Motion">
      <div className="rounded-lg bg-[#F6FAFD] px-3 py-2">
        <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/45">Student · Q4, Unit Test 03</p>
        <p className="mt-1 text-[11px] leading-[1.55] text-charcoal/75">
          I get 2.5 m/s² using the hoop formula, but the answer key says 5.0 m/s². Which line is wrong?
        </p>
      </div>
      <div className="mt-2 rounded-lg border border-charcoal/10 px-3 py-2">
        <p className="text-[9px] uppercase tracking-[0.1em] text-charcoal/45">Faculty · replied</p>
        <p className="mt-1 text-[11px] leading-[1.55] text-charcoal/75">
          Your formula is right, but the question says “hoop”, so I = MR² and the denominator is 1 + 1 = 2.
          Check whether you used the disc ratio by mistake.
        </p>
        <p className="mt-1.5 inline-flex items-center gap-1 text-[9px] text-charcoal/45">
          <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
          Resolved
        </p>
      </div>
    </Frame>
  )
}

/* --------------------------------------------------- cohort */
function CohortMock() {
  return (
    <Frame label="Cohort · item analysis" note="JEE Advanced Full Mock 12">
      <ul className="grid gap-1.5">
        {[
          { q: 'Q7 · multiple-correct', detail: '84% correct', tone: 'bg-charcoal/80' },
          { q: 'Q11 · numerical', detail: '61% correct', tone: 'bg-charcoal/60' },
          { q: 'Q14 · single-correct', detail: '38% correct · re-teach', tone: 'bg-charcoal/40' },
          { q: 'Q19 · numerical', detail: '22% correct · re-teach', tone: 'bg-charcoal/25' },
        ].map((row) => (
          <li key={row.q} className="flex items-center gap-2 rounded-md border border-charcoal/10 px-2 py-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.tone}`} aria-hidden="true" />
            <span className="flex-1 text-[10px] text-charcoal/70">{row.q}</span>
            <span className="text-[9.5px] text-charcoal/50">{row.detail}</span>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

const MOCKS = {
  exam: ExamMock,
  analysis: AnalysisMock,
  classroom: ClassroomMock,
  recording: RecordingMock,
  performance: PerformanceMock,
  attendance: AttendanceMock,
  doubt: DoubtMock,
  cohort: CohortMock,
}

export default function InterfacePreview({ mock }) {
  const Component = MOCKS[mock]
  return Component ? <Component /> : null
}
