import { Link } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import PageHero from '../../components/public/PageHero'
import SectionHeading from '../../components/public/SectionHeading'
import CTASection from '../../components/public/CTASection'
import StatusBadge, { StatusLegend } from '../../components/public/StatusBadge'
import InterfacePreview from '../../components/public/InterfacePreview'
import useReveal from '../../hooks/useReveal'
import {
  FEATURES,
  JOURNEY,
  STATUS_LABELS,
  POLICY_EXCERPTS,
  PREVIEW_NOTE,
  TECH_STACK_NOTE,
} from '../../data/site/learning'
import { SUPPORT_CAPABILITIES } from '../../data/site/programs'
import { CTA_LINKS } from '../../data/site/navigation'

/* ------------------------------------------------------------------
   LEARNING EXPERIENCE — nine capability sections + the journey that joins them.

   Layout rhythm: staggered two-column rows. Odd features put the copy left and
   the screen right; even features invert. Every feature carries its status badge
   at the top of the copy column, and the demonstration-only items carry the
   honest note in addition — so the distinction the brief demands is impossible
   to miss without being buried.
------------------------------------------------------------------- */

const LEGEND_ITEMS = ['shipped', 'simulated', 'planned'].map((id) => ({
  tone: STATUS_LABELS[id].tone,
  label: STATUS_LABELS[id].label,
  description: STATUS_LABELS[id].description,
}))

function AiTranscript({ lines }) {
  return (
    <div className="public-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-charcoal/10 bg-[#F6FAFD] px-4 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-charcoal/50">
          Academic assistant
        </p>
        <StatusBadge tone="warn" dot>
          Mock response service
        </StatusBadge>
      </div>
      <ul className="grid gap-3 p-4 sm:p-5">
        {lines.map((line, index) => (
          <li key={index} className={`flex ${line.role === 'student' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-[1.65] ${
                line.role === 'student'
                  ? 'bg-charcoal text-white'
                  : 'border border-charcoal/10 bg-cream/40 text-charcoal/80'
              }`}
            >
              <p className={`mb-1 text-[9px] uppercase tracking-[0.12em] ${line.role === 'student' ? 'text-white/50' : 'text-charcoal/40'}`}>
                {line.role === 'student' ? 'Student' : 'Assistant'}
              </p>
              {line.text}
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-charcoal/8 bg-white px-4 py-2 text-[10.5px] leading-[1.5] text-charcoal/45">
        Deterministic templates grounded in the demonstration records. No live model is connected.
      </p>
    </div>
  )
}

export default function LearningExperiencePage() {
  const revealRef = useReveal('learning')

  return (
    <PublicLayout metaKey="learning">
      <div ref={revealRef}>
        <PageHero
          eyebrow="Learning experience"
          title={
            <>
              Academic teaching, with the <span className="serif-word">evidence</span> built in
            </>
          }
          lede="Vyuh runs on one web application for students, faculty and administration. These are the capabilities that carry a student through a chapter — and the record that tells everyone what actually happened. Each capability is labelled with what it really is in this build."
          actions={[
            { to: '#journey', label: 'Follow the learning journey' },
            { to: CTA_LINKS.programmes.to, label: CTA_LINKS.programmes.label, variant: 'secondary' },
          ]}
        />

        {/* ------------------------------ legend ---------------------------- */}
        <section className="wash-cream border-y border-charcoal/8">
          <div className="shell py-8 sm:py-9">
            <div className="reveal flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <p className="max-w-[420px] text-[13px] leading-[1.7] text-charcoal/70">
                <span className="font-medium text-charcoal">Three labels are used throughout.</span>{' '}
                They describe the status of each capability in this build — not what Vyuh intends to
                become.
              </p>
              <p className="text-[11px] leading-[1.6] text-charcoal/50 sm:max-w-[300px] sm:text-right">
                {TECH_STACK_NOTE}
              </p>
            </div>
            <StatusLegend items={LEGEND_ITEMS} className="reveal mt-5" />
          </div>
        </section>

        {/* ------------------------- feature sections ----------------------- */}
        <div className="bg-white">
          {FEATURES.map((feature, index) => {
            const status = STATUS_LABELS[feature.status]
            const inverted = index % 2 === 1
            return (
              <section
                key={feature.id}
                id={feature.id}
                className={`scroll-mt-24 border-t border-charcoal/8 ${inverted ? 'wash-sky' : 'bg-white'}`}
              >
                <div className="shell py-12 sm:py-14 lg:py-16">
                  {/* minmax(0,1fr) on the mobile track lets a long unbreakable
                      row shrink instead of forcing the page wider than 320px. */}
                  <div
                    className={`grid grid-cols-[minmax(0,1fr)] items-center gap-9 lg:grid-cols-2 lg:gap-14 ${
                      inverted ? 'lg:[&>*:first-child]:order-2' : ''
                    }`}
                  >
                    {/* copy */}
                    <div className="reveal">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF7FC] text-[12px] font-medium text-charcoal/65">
                          {feature.index}
                        </span>
                        <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/40">
                          {feature.number} / 09
                        </span>
                        <StatusBadge tone={status.tone} title={status.description}>
                          {status.label}
                        </StatusBadge>
                      </div>

                      <h2 className="mt-4 font-serif text-[27px] leading-[1.16] tracking-[-0.024em] sm:text-[33px] lg:text-[36px]">
                        {feature.title}
                      </h2>
                      <p className="mt-3.5 max-w-[560px] text-[14.5px] leading-[1.72] text-charcoal/75 sm:text-[15.5px]">
                        {feature.summary}
                      </p>

                      <ul className="mt-5 grid gap-2">
                        {feature.detail.map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-2.5 text-[13px] leading-[1.7] text-charcoal/68"
                          >
                            <span
                              className="mt-[9px] h-[3px] w-[3px] shrink-0 rounded-full bg-charcoal/45"
                              aria-hidden="true"
                            />
                            {line}
                          </li>
                        ))}
                      </ul>

                      {status.tone === 'warn' || status.tone === 'neutral' ? (
                        <p className="mt-5 flex items-start gap-2.5 rounded-2xl border border-charcoal/15 bg-cream/50 px-4 py-3 text-[12px] leading-[1.68] text-charcoal/70">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal/45" aria-hidden="true" />
                          <span>
                            <strong className="font-medium text-charcoal">Status clarification — </strong>
                            {feature.honesty}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    {/* screen */}
                    <div className="reveal">
                      {feature.evidence?.kind === 'panel' ? (
                        <AiTranscript lines={feature.evidence.lines} />
                      ) : feature.screen ? (
                        <InterfacePreview mock={feature.screen.mock} />
                      ) : null}
                      <p className="mt-3 text-[11px] leading-[1.6] text-charcoal/50">
                        {feature.screen ? `${feature.screen.label} · ${feature.screen.note}. ` : ''}
                        {PREVIEW_NOTE}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        {/* --------------------------- the journey -------------------------- */}
        <section id="journey" className="wash-cream scroll-mt-24 border-t border-charcoal/8">
          <div className="shell py-14 sm:py-16 lg:py-20">
            <div className="reveal">
              <SectionHeading
                eyebrow="The student learning journey"
                title={
                  <>
                    How these capabilities <span className="serif-word">work together</span>
                  </>
                }
                lede="A capability list is not a system. This is the loop the platform actually closes: the class produces a session record, the session produces an attempt, the attempt produces analysis, and the analysis decides the next revision."
              />
            </div>

            <ol className="relative mt-10 grid gap-5 lg:grid-cols-4 lg:gap-4">
              {JOURNEY.map((step, index) => (
                <li key={step.id} className="reveal relative" style={{ transitionDelay: `${index * 60}ms` }}>
                  <div className="public-card flex h-full flex-col p-5">
                    <span className="serif-word text-[34px] leading-none text-charcoal/18">{step.number}</span>
                    <h3 className="mt-2 text-[16px] font-medium tracking-[-0.012em]">{step.title}</h3>
                    <p className="mt-2 text-[12.5px] leading-[1.68] text-charcoal/68">{step.body}</p>
                    <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
                      {step.features.map((featureId) => {
                        const feature = FEATURES.find((entry) => entry.id === featureId)
                        const capability = SUPPORT_CAPABILITIES.find((entry) => entry.id === featureId)
                        const label = feature?.title || capability?.label || featureId
                        return (
                          <li key={featureId}>
                            <a
                              href={`#${featureId}`}
                              className="inline-flex rounded-full border border-charcoal/12 bg-cream/40 px-2.5 py-1 text-[10.5px] text-charcoal/65 transition hover:border-charcoal/30 hover:text-charcoal"
                            >
                              {label}
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>

            <div className="reveal mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/resources"
                className="inline-flex items-center gap-2 rounded-full border border-charcoal/20 bg-white/70 px-5 py-2.5 text-[13px] font-medium text-charcoal transition hover:border-charcoal/40"
              >
                See what students receive in the Knowledge Hub
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------- policy excerpts ------------------------ */}
        <section className="bg-white border-t border-charcoal/8">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
              <div className="reveal">
                <SectionHeading
                  eyebrow="How the rules are set"
                  title={
                    <>
                      Institute policy, not <span className="serif-word">guesswork</span>
                    </>
                  }
                  lede="Thresholds, windows and retention periods are policy values held by the institute and editable by an administrator. These are the current defaults."
                />
              </div>
              <dl className="reveal grid gap-px overflow-hidden rounded-[20px] border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2">
                {POLICY_EXCERPTS.map((row) => (
                  <div key={row.label} className="bg-white px-4 py-3.5">
                    <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-charcoal/45">
                      {row.label}
                    </dt>
                    <dd className="mt-1 text-[13px] leading-[1.55] text-charcoal/80">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <CTASection
          eyebrow="Next"
          title={
            <>
              See it inside a <span className="serif-word">programme</span>
            </>
          }
          lede="Programme pages show which of these capabilities each track draws on, and the admissions page explains how to arrange a counselling walkthrough of the workspace."
          actions={[
            { to: CTA_LINKS.programmes.to, label: CTA_LINKS.programmes.label },
            { to: CTA_LINKS.admissionsInfo.to, label: CTA_LINKS.admissionsInfo.label, variant: 'secondary' },
          ]}
        />
      </div>
    </PublicLayout>
  )
}
