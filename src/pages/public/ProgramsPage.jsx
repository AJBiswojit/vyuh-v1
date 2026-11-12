import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Info } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import PageHero from '../../components/public/PageHero'
import SectionHeading from '../../components/public/SectionHeading'
import CTASection from '../../components/public/CTASection'
import ProgramCard from '../../components/public/ProgramCard'
import StatusBadge from '../../components/public/StatusBadge'
import useReveal from '../../hooks/useReveal'
import {
  PROGRAMS,
  PROGRAM_UNVERIFIED_DETAILS,
  COMPARISON_ROWS,
  SUPPORT_CAPABILITIES,
} from '../../data/site/programs'
import { CTA_LINKS } from '../../data/site/navigation'

/* ------------------------------------------------------------------
   PROGRAMS — full detail for each confirmed programme.

   Each programme block is laid out as an editorial two-column section: the
   identity column (number, title, target, subjects, enquiry CTA) and the detail
   column (overview, audience, teaching, assessment, support).

   The comparison table and the "not published" panel exist precisely so the page
   can be complete without inventing fees, durations, schedules or eligibility.
------------------------------------------------------------------- */

const DETAIL_BLOCKS = [
  { key: 'audience', label: 'Intended student', render: (program) => <p>{program.audience}</p> },
  { key: 'teaching', label: 'Teaching approach', render: (program) => <List items={program.teaching} /> },
  { key: 'assessment', label: 'Assessment approach', render: (program) => <List items={program.assessment} /> },
  { key: 'support', label: 'Available learning support', render: (program) => <List items={program.support} /> },
]

function List({ items }) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[13.5px] leading-[1.7] text-charcoal/72">
          <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-charcoal/40" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  )
}

export default function ProgramsPage() {
  const revealRef = useReveal('programs')
  const [activeProgram, setActiveProgram] = useState(PROGRAMS[0].id)

  return (
    <PublicLayout metaKey="programs">
      <div ref={revealRef}>
        <PageHero
          eyebrow="Academic programs"
          title={
            <>
              Two examination tracks, one <span className="serif-word">foundation</span>
            </>
          }
          lede="Every Vyuh programme is built on the same model — concept-first teaching, computer-based examination in the target pattern, and question-level analysis. What changes between programmes is the subject set, the examination pattern and the depth of preparation."
          actions={[
            { to: CTA_LINKS.admissions.to, label: 'Admission enquiry' },
            { to: '#compare', label: 'Compare programmes', variant: 'secondary' },
          ]}
          aside={
            <ul className="grid gap-2.5">
              {PROGRAMS.map((program) => (
                <li key={program.id}>
                  <a
                    href={`#${program.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/45 px-4 py-3 backdrop-blur-[2px] transition duration-500 ease-calm hover:-translate-y-[1px] hover:bg-white/80"
                  >
                    <span>
                      <span className="block text-[13.5px] font-medium text-charcoal">{program.title}</span>
                      <span className="mt-0.5 block text-[11.5px] text-charcoal/55">{program.subjects.join(' · ')}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-charcoal/45" />
                  </a>
                </li>
              ))}
            </ul>
          }
        />

        {/* ------------------------ programme overview ----------------------- */}
        <section className="bg-white">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="reveal">
              <SectionHeading
                eyebrow="At a glance"
                title={
                  <>
                    Confirmed <span className="serif-word">offerings</span>
                  </>
                }
                lede="Three programmes are taught at Vyuh. Each card opens the full programme detail below."
              />
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {PROGRAMS.map((program) => (
                <div key={program.id} className="reveal">
                  <ProgramCard program={program} />
                </div>
              ))}
            </div>

            <div className="reveal mt-6 flex items-start gap-2.5 rounded-2xl border border-charcoal/10 bg-cream/30 px-4 py-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/45" aria-hidden="true" />
              <p className="text-[12px] leading-[1.65] text-charcoal/60">
                <span className="font-medium text-charcoal/80">Why only three programmes?</span> JEE,
                NEET UG and Foundation are the programmes confirmed in the institute’s academic
                record. No additional programme is advertised on this site until the institute
                confirms it is offered.
              </p>
            </div>
          </div>
        </section>

        {/* ----------------------- detailed programme blocks ---------------- */}
        {PROGRAMS.map((program, index) => (
          <section
            key={program.id}
            id={program.id}
            className={`border-t border-charcoal/8 ${index % 2 === 0 ? 'wash-cream' : 'bg-white'}`}
          >
            <div className="shell py-12 sm:py-14 lg:py-16">
              <div className="grid gap-9 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-14">
                {/* identity column */}
                <div className="reveal lg:sticky lg:top-28 lg:self-start">
                  <div className="flex items-center gap-3">
                    <span className="serif-word text-[15px] leading-none text-charcoal/40">{program.number}</span>
                    <StatusBadge tone="sky">Confirmed offering</StatusBadge>
                  </div>
                  <h2 className="mt-3 font-serif text-[30px] leading-[1.12] tracking-[-0.025em] sm:text-[38px]">
                    {program.title}
                  </h2>
                  <dl className="mt-5 grid gap-3 border-t border-charcoal/15 pt-5">
                    <div>
                      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/50">
                        Target examination
                      </dt>
                      <dd className="mt-0.5 text-[13.5px] text-charcoal/80">{program.targetExam}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/50">
                        Subjects
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {program.subjects.map((subject) => (
                          <span
                            key={subject}
                            className="rounded-full border border-charcoal/12 bg-white/70 px-2.5 py-1 text-[11px] text-charcoal/70"
                          >
                            {subject}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    to={`/admissions#enquiry?programme=${program.enquiryTopicId}`}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-[13px] font-medium text-white transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-charcoal/90"
                  >
                    {program.shortTitle} programme enquiry
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* detail column */}
                <div className="reveal">
                  <p className="text-[15.5px] leading-[1.75] text-charcoal/80 sm:text-[16.5px]">
                    {program.overview}
                  </p>

                  <div className="mt-7 rounded-2xl border border-charcoal/10 bg-white/80 p-5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/50">
                      Subject coverage
                    </p>
                    <ul className="mt-2.5 grid gap-1.5">
                      {program.subjectDetail.map((line) => (
                        <li key={line} className="text-[13px] leading-[1.7] text-charcoal/70">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <dl className="mt-7 grid gap-6">
                    {DETAIL_BLOCKS.map((block) => (
                      <div key={block.key}>
                        <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/50">
                          {block.label}
                        </dt>
                        <dd className="mt-2 text-[13.5px] leading-[1.7] text-charcoal/72">
                          {block.render(program)}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-7 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-charcoal/45">
                      Supported by
                    </span>
                    {SUPPORT_CAPABILITIES.map((capability) => (
                      <Link
                        key={capability.id}
                        to={`/learning-experience#${capability.id}`}
                        className="rounded-full border border-charcoal/12 bg-white/70 px-2.5 py-1 text-[11px] text-charcoal/65 underline-offset-2 hover:border-charcoal/30 hover:text-charcoal hover:underline"
                      >
                        {capability.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* ------------------------------- compare -------------------------- */}
        <section id="compare" className="border-t border-charcoal/8 bg-white">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="reveal">
              <SectionHeading
                eyebrow="Comparison"
                title={
                  <>
                    Which programme <span className="serif-word">fits</span>
                  </>
                }
                lede="The comparison covers what is known. Fees and duration are deliberately shown as unpublished rather than estimated."
              />
            </div>

            {/* tab-style switcher on small screens, full table from sm up */}
            <div className="mt-7 flex flex-wrap gap-2 sm:hidden" role="tablist" aria-label="Programme comparison">
              {PROGRAMS.map((program) => (
                <button
                  key={program.id}
                  type="button"
                  role="tab"
                  aria-selected={activeProgram === program.id}
                  onClick={() => setActiveProgram(program.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] transition ${
                    activeProgram === program.id
                      ? 'border-charcoal bg-charcoal text-white'
                      : 'border-charcoal/20 text-charcoal/70'
                  }`}
                >
                  {program.shortTitle}
                </button>
              ))}
            </div>

            <div className="reveal mt-4 overflow-hidden rounded-[22px] border border-charcoal/10 sm:mt-8">
              {/* mobile: one programme at a time */}
              <dl className="divide-y divide-charcoal/8 sm:hidden">
                {COMPARISON_ROWS.map((row) => {
                  const program = PROGRAMS.find((entry) => entry.id === activeProgram)
                  const value = row.value(program)
                  return (
                    <div key={row.id} className="flex items-start justify-between gap-4 px-4 py-3">
                      <dt className="text-[11.5px] uppercase tracking-[0.08em] text-charcoal/50">{row.label}</dt>
                      <dd className="max-w-[58%] text-right text-[12.5px] text-charcoal/75">
                        {value || (
                          <span className="rounded-full border border-dashed border-charcoal/25 px-2 py-0.5 text-[11px] text-charcoal/50">
                            {row.note}
                          </span>
                        )}
                      </dd>
                    </div>
                  )
                })}
              </dl>

              {/* desktop table */}
              <table className="hidden w-full border-collapse text-left sm:table">
                <caption className="sr-only">Programme comparison</caption>
                <thead>
                  <tr className="bg-cream/45">
                    <th scope="col" className="w-[180px] px-5 py-3.5 text-[10px] font-medium uppercase tracking-[0.12em] text-charcoal/55">
                      Programme
                    </th>
                    {PROGRAMS.map((program) => (
                      <th key={program.id} scope="col" className="px-5 py-3.5">
                        <span className="block font-serif text-[16px] leading-tight tracking-[-0.01em] text-charcoal">
                          {program.title}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] font-normal uppercase tracking-[0.1em] text-charcoal/45">
                          {program.shortTitle}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.id} className="border-t border-charcoal/8">
                      <th scope="row" className="px-5 py-3.5 align-top text-[11.5px] font-medium uppercase tracking-[0.08em] text-charcoal/55">
                        {row.label}
                      </th>
                      {PROGRAMS.map((program) => {
                        const value = row.value(program)
                        return (
                          <td key={program.id} className="px-5 py-3.5 align-top text-[12.5px] leading-[1.6] text-charcoal/75">
                            {value || (
                              <span className="rounded-full border border-dashed border-charcoal/25 px-2 py-0.5 text-[11px] text-charcoal/50">
                                {row.note}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---------------------- not published details --------------------- */}
        <section className="wash-cream border-t border-charcoal/8">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="reveal max-w-[720px]">
              <p className="eyebrow">
                <span className="eyebrow-dot" />
                To be confirmed
              </p>
              <h2 className="mt-3 text-[24px] leading-[1.22] tracking-[-0.025em] sm:text-[30px]">
                What this page does <span className="serif-word">not</span> state
              </h2>
              <p className="mt-3.5 text-[14px] leading-[1.72] text-charcoal/70">
                Fees, intake dates, timetables and eligibility criteria are set by the institute and
                have not been published in this repository. Rather than print a plausible-looking
                number, the page lists them as pending and routes the question to the admissions
                office.
              </p>
            </div>

            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {PROGRAM_UNVERIFIED_DETAILS.map((item) => (
                <li key={item.id} className="reveal rounded-2xl border border-dashed border-charcoal/25 bg-white/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[13.5px] font-medium text-charcoal/85">{item.label}</p>
                    <StatusBadge tone="outline">Pending</StatusBadge>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-[1.6] text-charcoal/60">{item.note}</p>
                </li>
              ))}
            </ul>

            <div className="reveal mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/admissions#enquiry"
                className="inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-charcoal/90"
              >
                Ask admissions about these details
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/admissions#faq"
                className="text-[13px] text-charcoal/65 underline-offset-4 hover:text-charcoal hover:underline"
              >
                Read the admissions FAQ
              </Link>
            </div>
          </div>
        </section>

        <CTASection
          eyebrow="Admissions"
          title={
            <>
              Ready to talk to the <span className="serif-word">institute</span>?
            </>
          }
          lede="Submit an admission enquiry with the student’s current class and the programme under consideration. The admissions office confirms the current intake and next steps."
          actions={[
            { to: CTA_LINKS.admissions.to, label: CTA_LINKS.admissions.label },
            { to: CTA_LINKS.contact.to, label: CTA_LINKS.contact.label, variant: 'secondary' },
          ]}
        />
      </div>
    </PublicLayout>
  )
}
