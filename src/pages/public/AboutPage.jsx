import { Link } from 'react-router-dom'
import { ArrowUpRight, Info } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import PageHero from '../../components/public/PageHero'
import SectionHeading from '../../components/public/SectionHeading'
import CTASection from '../../components/public/CTASection'
import StatusBadge from '../../components/public/StatusBadge'
import useReveal from '../../hooks/useReveal'
import {
  ABOUT_HERO,
  OUR_STORY,
  VISION,
  MISSION,
  PHILOSOPHY,
  METHODOLOGY,
  DIFFERENTIATORS,
  ABOUT_PLACEHOLDERS,
  FACULTY_ROSTER_NOTE,
} from '../../data/site/about'
import { EDUCATORS, INSTITUTE_IDENTITY } from '../../data/site/institute'
import { CTA_LINKS } from '../../data/site/navigation'

/* ------------------------------------------------------------------
   ABOUT — editorial long-form page.

   Composition: sky hero with a portrait aside → cream story band → vision
   pull-quote → mission pillars → philosophy (three numbered essays) →
   methodology steps → the Vyuh difference → faculty roster → placeholders →
   closing CTA.
------------------------------------------------------------------- */

export default function AboutPage() {
  const revealRef = useReveal('about')

  return (
    <PublicLayout metaKey="about">
      <div ref={revealRef}>
        <PageHero
          eyebrow={ABOUT_HERO.eyebrow}
          title={
            <>
              {ABOUT_HERO.title}{' '}
              <span className="serif-word">{ABOUT_HERO.titleEmphasis}</span>{' '}
              {ABOUT_HERO.titleTail}
            </>
          }
          lede={ABOUT_HERO.lede}
          actions={[
            { to: CTA_LINKS.programmes.to, label: CTA_LINKS.programmes.label },
            { to: CTA_LINKS.contact.to, label: CTA_LINKS.contact.label, variant: 'secondary' },
          ]}
          aside={
            <div className="relative mx-auto max-w-[380px]">
              <div className="relative overflow-hidden rounded-[26px] border border-white/70 bg-white/45 p-4 backdrop-blur-[2px]">
                <img
                  src="/assets/about-mentor.webp"
                  alt="Vyuh academic mentor holding study material"
                  width="326"
                  height="713"
                  className="mx-auto block h-[300px] w-auto object-contain object-top sm:h-[340px]"
                />
              </div>
              <div className="absolute -bottom-5 left-4 right-4 rounded-2xl border border-charcoal/10 bg-white/95 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(36,39,41,0.55)] sm:left-8 sm:right-8">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-charcoal/50">
                  Established {INSTITUTE_IDENTITY.established}
                </p>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-charcoal/75">
                  {INSTITUTE_IDENTITY.tagline}
                </p>
              </div>
            </div>
          }
        />

        {/* ---------------------------- our story ---------------------------- */}
        <section id="story" className="wash-cream">
          <div className="shell grid gap-10 py-14 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:py-20">
            <div className="reveal">
              <SectionHeading
                eyebrow="Our story"
                title={
                  <>
                    <span className="serif-word">{OUR_STORY.emphasis}</span> Vyuh exists
                  </>
                }
              />
              <dl className="mt-8 grid gap-4 border-t border-charcoal/15 pt-6">
                {[
                  { label: 'Institute', value: INSTITUTE_IDENTITY.name },
                  { label: 'Established', value: String(INSTITUTE_IDENTITY.established) },
                  { label: 'Academic year', value: INSTITUTE_IDENTITY.academicYear },
                  { label: 'Programmes', value: 'JEE · NEET UG · Foundation' },
                ].map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-charcoal/50">
                      {row.label}
                    </dt>
                    <dd className="text-[13.5px] text-charcoal/80">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="reveal">
              {OUR_STORY.paragraphs.map((paragraph, index) => (
                <p
                  key={paragraph.slice(0, 24)}
                  className={
                    index === 0
                      ? 'text-[17px] leading-[1.72] text-charcoal/85 sm:text-[19px] lg:text-[20px]'
                      : 'mt-5 text-[14.5px] leading-[1.78] text-charcoal/72 sm:text-[15.5px]'
                  }
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ vision ----------------------------- */}
        <section id="vision" className="bg-white">
          <div className="shell py-14 sm:py-16 lg:py-20">
            <div className="reveal mx-auto max-w-[860px] text-center">
              <p className="eyebrow justify-center">
                <span className="eyebrow-dot" />
                Our vision
              </p>
              <blockquote className="mt-5 font-serif text-[26px] leading-[1.28] tracking-[-0.025em] text-charcoal sm:text-[34px] lg:text-[40px]">
                “{VISION.statement}”
              </blockquote>
              <p className="mx-auto mt-6 max-w-[620px] text-[14px] leading-[1.75] text-charcoal/65">
                {VISION.supporting}
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------ mission ---------------------------- */}
        <section id="mission" className="wash-sky border-y border-charcoal/8">
          <div className="shell py-14 sm:py-16 lg:py-20">
            <div className="reveal">
              <SectionHeading
                eyebrow="Our mission"
                title={
                  <>
                    <span className="serif-word">How</span> we support students
                  </>
                }
                lede="Four commitments that each have an operational counterpart in the platform — a claim we can show, not only state."
              />
            </div>

            <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:mt-11 lg:grid-cols-4 lg:gap-5">
              {MISSION.pillars.map((pillar, index) => (
                <li
                  key={pillar.id}
                  className="reveal public-card flex flex-col p-6"
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <span className="serif-word text-[15px] leading-none text-charcoal/40">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 text-[15.5px] font-medium leading-[1.35] tracking-[-0.01em]">{pillar.label}</h3>
                  <p className="mt-2.5 text-[13px] leading-[1.68] text-charcoal/70">{pillar.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------- philosophy --------------------------- */}
        <section id="philosophy" className="bg-white">
          <div className="shell py-14 sm:py-16 lg:py-20">
            <div className="reveal">
              <SectionHeading
                eyebrow="Academic philosophy"
                title={
                  <>
                    Conceptual clarity, discipline and{' '}
                    <span className="serif-word">consistent</span> improvement
                  </>
                }
                lede={PHILOSOPHY.lede}
              />
            </div>

            <div className="mt-10 grid gap-10 lg:gap-12">
              {PHILOSOPHY.principles.map((principle, index) => (
                <article
                  key={principle.id}
                  id={principle.id}
                  className={`reveal grid gap-6 border-t border-charcoal/12 pt-8 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)] lg:gap-14 ${
                    index === 0 ? 'border-t-0 pt-0' : ''
                  }`}
                >
                  <div>
                    <span className="serif-word text-[13px] leading-none text-charcoal/40">{principle.number}</span>
                    <h3 className="mt-2 font-serif text-[24px] leading-[1.2] tracking-[-0.02em] sm:text-[28px]">
                      {principle.title}
                    </h3>
                  </div>
                  <div>
                    <p className="max-w-[640px] text-[14.5px] leading-[1.78] text-charcoal/75">{principle.body}</p>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-1">
                      {principle.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5 text-[13px] leading-[1.6] text-charcoal/65">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-charcoal/45" aria-hidden="true" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------- methodology --------------------------- */}
        <section id="methodology" className="wash-cream">
          <div className="shell py-14 sm:py-16 lg:py-20">
            <div className="reveal grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end lg:gap-16">
              <SectionHeading
                eyebrow="Teaching methodology"
                title={
                  <>
                    A structured cycle, repeated for{' '}
                    <span className="serif-word">every</span> chapter
                  </>
                }
              />
              <p className="max-w-[560px] text-[14.5px] leading-[1.75] text-charcoal/70">{METHODOLOGY.lede}</p>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
              {METHODOLOGY.steps.map((step, index) => (
                <li
                  key={step.id}
                  className="reveal relative flex flex-col rounded-[20px] border border-white/70 bg-white/70 p-5 backdrop-blur-[2px]"
                  style={{ transitionDelay: `${index * 55}ms` }}
                >
                  <span className="serif-word text-[26px] leading-none text-charcoal/30">{step.number}</span>
                  <h3 className="mt-3 text-[14.5px] font-medium tracking-[-0.01em]">{step.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-[1.65] text-charcoal/68">{step.body}</p>
                </li>
              ))}
            </ol>

            <p className="reveal mt-6 max-w-[760px] text-[12px] leading-[1.7] text-charcoal/55">
              Examination preparation follows this cycle at the target paper’s own depth. See{' '}
              <Link to="/learning-experience" className="underline decoration-charcoal/25 underline-offset-2 hover:decoration-charcoal">
                Learning Experience
              </Link>{' '}
              for the platform capabilities that support each step.
            </p>
          </div>
        </section>

        {/* --------------------------- the difference ------------------------ */}
        <section id="difference" className="bg-white">
          <div className="shell py-14 sm:py-16 lg:py-20">
            <div className="reveal max-w-[720px]">
              <SectionHeading
                eyebrow="The Vyuh difference"
                title={
                  <>
                    What is <span className="serif-word">different</span> in practice
                  </>
                }
                lede="Not a list of adjectives — four choices about how teaching, examining and feedback are arranged."
              />
            </div>

            <div className="mt-9 grid gap-px overflow-hidden rounded-[22px] border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2">
              {DIFFERENTIATORS.map((item) => (
                <article key={item.id} className="reveal bg-white p-6 lg:p-8">
                  <h3 className="text-[16px] font-medium leading-[1.4] tracking-[-0.012em]">{item.title}</h3>
                  <p className="mt-2.5 text-[13.5px] leading-[1.72] text-charcoal/70">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ faculty ---------------------------- */}
        <section id="team" className="wash-sky border-t border-charcoal/8">
          <div className="shell py-14 sm:py-16 lg:py-20">
            <div className="reveal">
              <SectionHeading
                eyebrow="The academic team"
                title={
                  <>
                    Educators who <span className="serif-word">teach</span>, examine and analyse
                  </>
                }
                lede={FACULTY_ROSTER_NOTE}
              />
            </div>

            <ul className="mt-9 grid gap-4 sm:grid-cols-3 lg:gap-5">
              {EDUCATORS.map((educator, index) => (
                <li
                  key={educator.name}
                  className="reveal public-card flex items-center gap-4 p-5"
                  style={{ transitionDelay: `${index * 55}ms` }}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream text-[13px] font-medium text-charcoal/70">
                    {educator.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium leading-tight">{educator.name}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-charcoal/50">{educator.role}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="reveal mt-5 flex items-start gap-2 text-[11.5px] leading-[1.65] text-charcoal/55">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              These are the educators already published on the Vyuh home page and in the institute
              record. Qualification details are not invented for this website.
            </p>
          </div>
        </section>

        {/* --------------------- institute input required -------------------- */}
        <section id="institute-input" className="bg-white">
          <div className="shell py-14 sm:py-16 lg:py-20">
            <div className="reveal mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">
                  <span className="eyebrow-dot" />
                  Institute input required
                </p>
                <h2 className="mt-3 text-[22px] leading-[1.25] tracking-[-0.022em] sm:text-[26px]">
                  Content placeholders on this page
                </h2>
              </div>
              <StatusBadge tone="outline">Clearly identifiable, per the brief</StatusBadge>
            </div>

            <ul className="grid gap-4 sm:grid-cols-3">
              {ABOUT_PLACEHOLDERS.map((placeholder) => (
                <li key={placeholder.id} className="reveal rounded-2xl border border-dashed border-charcoal/25 bg-cream/25 p-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/45">
                    Placeholder
                  </p>
                  <h3 className="mt-1.5 text-[14px] font-medium">{placeholder.label}</h3>
                  <p className="mt-2 text-[12.5px] leading-[1.68] text-charcoal/65">{placeholder.prompt}</p>
                </li>
              ))}
            </ul>

            <div className="reveal mt-6">
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-charcoal underline decoration-charcoal/30 underline-offset-4 hover:decoration-charcoal"
              >
                Supply institute information
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <CTASection
          eyebrow="Next"
          title={
            <>
              Explore the <span className="serif-word">programmes</span>, or speak to the institute
            </>
          }
          lede="Programme pages describe subject coverage, teaching approach, assessment and the learning support available. The admissions page explains the enquiry process."
          actions={[
            { to: CTA_LINKS.programmes.to, label: CTA_LINKS.programmes.label },
            { to: CTA_LINKS.admissions.to, label: CTA_LINKS.admissions.label, variant: 'secondary' },
          ]}
        />
      </div>
    </PublicLayout>
  )
}
