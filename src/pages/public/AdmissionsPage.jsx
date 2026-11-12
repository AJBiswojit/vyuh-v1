import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarClock, Info, MapPin, Phone, Mail, MessagesSquare } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import PageHero from '../../components/public/PageHero'
import SectionHeading from '../../components/public/SectionHeading'
import CTASection from '../../components/public/CTASection'
import ProgramCard from '../../components/public/ProgramCard'
import EnquiryForm from '../../components/public/EnquiryForm'
import FAQAccordion from '../../components/public/FAQAccordion'
import ContactInformation from '../../components/public/ContactInformation'
import StatusBadge from '../../components/public/StatusBadge'
import useReveal from '../../hooks/useReveal'
import {
  ADMISSIONS_HERO,
  ADMISSION_AVAILABLE_PROGRAMS,
  ADMISSION_JOURNEY,
  ELIGIBILITY_PLACEHOLDER,
  ADMISSIONS_FAQS,
  COUNSELLING_INFO,
} from '../../data/site/admissions'
import { CONTACT_FIELDS } from '../../data/site/institute'
import { CTA_LINKS } from '../../data/site/navigation'

/* ------------------------------------------------------------------
   ADMISSIONS — conversion-focused, and scrupulous about what is real.

   Order follows the brief: hero → available programmes → admission journey →
   eligibility → enquiry form → counselling → FAQ → contact CTA. The form is the
   anchor target (#enquiry) that every "admission enquiry" CTA on the site points
   at, including the ?programme= prefill used by the programme cards.
------------------------------------------------------------------- */

export default function AdmissionsPage() {
  const revealRef = useReveal('admissions')

  return (
    <PublicLayout metaKey="admissions">
      <div ref={revealRef}>
        <PageHero
          eyebrow={ADMISSIONS_HERO.eyebrow}
          title={
            <>
              Admissions for the{' '}
              <span className="serif-word whitespace-nowrap">{ADMISSIONS_HERO.titleEmphasis}</span>{' '}
              {ADMISSIONS_HERO.titleTail}
            </>
          }
          lede={ADMISSIONS_HERO.lede}
          actions={[
            { to: '#enquiry', label: 'Start an admission enquiry' },
            { to: '#journey', label: 'How admission works', variant: 'secondary' },
          ]}
          aside={
            <div className="rounded-[24px] border border-white/70 bg-white/55 p-5 backdrop-blur-[3px]">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/50">
                Before you begin
              </p>
              <ul className="mt-3 grid gap-2.5">
                {[
                  'Enquiries are reviewed by the admissions office, not an automated system.',
                  'Fees, deadlines and eligibility are confirmed by the office — they are not published on this site.',
                  'The form here is a demonstration; use the phone or email for a real reply.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[12.5px] leading-[1.6] text-charcoal/72">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-charcoal/40" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-charcoal/10 pt-3.5">
                <a
                  href={`tel:${CONTACT_FIELDS.phone.value.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-[12px] text-charcoal/75 underline-offset-4 hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {CONTACT_FIELDS.phone.value}
                </a>
                <a
                  href={`mailto:${CONTACT_FIELDS.admissionsEmail.value}`}
                  className="inline-flex items-center gap-1.5 text-[12px] text-charcoal/75 underline-offset-4 hover:underline"
                >
                  <Mail className="h-3 w-3" />
                  Email admissions
                </a>
              </div>
            </div>
          }
        />

        {/* ------------------------ programmes available -------------------- */}
        <section id="programmes" className="bg-white scroll-mt-24">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="reveal">
              <SectionHeading
                eyebrow="Programmes available"
                title={
                  <>
                    Three programmes are <span className="serif-word">open</span> for enquiry
                  </>
                }
                lede="Admission enquiries are accepted for the programmes the institute currently teaches. Each enquiry goes to the admissions office for the programme you select."
              />
            </div>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ADMISSION_AVAILABLE_PROGRAMS.map((program) => (
                <li key={program.id} className="reveal">
                  <ProgramCard program={program} variant="compact" />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------------------------- journey ----------------------------- */}
        <section id="journey" className="wash-cream scroll-mt-24 border-y border-charcoal/8">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="reveal max-w-[680px]">
              <SectionHeading
                eyebrow="Admission journey"
                title={
                  <>
                    From enquiry to <span className="serif-word">enrolment</span>
                  </>
                }
                lede="Five steps. Each one names who acts and what is confirmed at that stage; anything the institute has not published is stated as such rather than guessed."
              />
            </div>

            <ol className="mt-9 grid gap-4 lg:grid-cols-5 lg:gap-3">
              {ADMISSION_JOURNEY.map((step, index) => (
                <li
                  key={step.id}
                  className="reveal relative flex h-full flex-col rounded-[20px] border border-white/80 bg-white/85 p-5 backdrop-blur-[2px]"
                  style={{ transitionDelay: `${index * 55}ms` }}
                >
                  <span className="serif-word text-[26px] leading-none text-charcoal/25">{step.number}</span>
                  <h3 className="mt-2 text-[14.5px] font-medium tracking-[-0.01em]">{step.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-[1.68] text-charcoal/68">{step.body}</p>
                  {step.note ? (
                    <p className="mt-auto pt-3 text-[10.5px] leading-[1.55] text-charcoal/45">{step.note}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --------------------------- eligibility -------------------------- */}
        <section id="eligibility" className="bg-white scroll-mt-24">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
              <div className="reveal">
                <SectionHeading
                  eyebrow="Eligibility"
                  title={
                    <>
                      Eligibility is confirmed by the <span className="serif-word">office</span>
                    </>
                  }
                />
                <div className="mt-5 rounded-2xl border border-dashed border-charcoal/25 bg-cream/30 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12.5px] font-medium text-charcoal/80">Not published on this site</p>
                    <StatusBadge tone="outline">Pending</StatusBadge>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-[1.7] text-charcoal/65">{ELIGIBILITY_PLACEHOLDER.body}</p>
                </div>
              </div>

              <div className="reveal">
                <ul className="grid gap-4">
                  {ELIGIBILITY_PLACEHOLDER.items.map((item, index) => (
                    <li key={item.slice(0, 20)} className="flex gap-3.5 rounded-2xl border border-charcoal/10 bg-white p-5">
                      <span className="serif-word mt-0.5 text-[15px] leading-none text-charcoal/30">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[13px] leading-[1.72] text-charcoal/72">{item}</p>
                    </li>
                  ))}
                </ul>
                <Link
                  to="#enquiry"
                  className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-charcoal underline decoration-charcoal/30 underline-offset-4 hover:decoration-charcoal"
                >
                  {ELIGIBILITY_PLACEHOLDER.enquiryPrompt}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------- enquiry / form ------------------------- */}
        <section id="enquiry" className="wash-sky scroll-mt-24 border-y border-charcoal/8">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-9 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
              <div className="reveal">
                <SectionHeading
                  eyebrow="Enquiry form"
                  title={
                    <>
                      Start the <span className="serif-word">conversation</span>
                    </>
                  }
                  lede="Share the student’s current class and the programme under consideration. Required fields are marked; nothing is sent to a server from this page."
                />
                <div className="mt-6 rounded-2xl border border-charcoal/10 bg-white/80 p-5">
                  <p className="flex items-start gap-2.5 text-[12px] leading-[1.7] text-charcoal/70">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/45" aria-hidden="true" />
                    <span>
                      This form is a <strong className="font-medium text-charcoal">frontend demonstration</strong>.
                      A submitted enquiry is stored in this browser with a reference code and is
                      never transmitted. For a reply from the office, use the phone number or email on
                      the right — or on the{' '}
                      <Link to="/contact" className="underline decoration-charcoal/30 underline-offset-2">
                        contact page
                      </Link>
                      .
                    </span>
                  </p>
                </div>
              </div>

              <div className="reveal rounded-[26px] border border-charcoal/10 bg-white p-6 shadow-[0_22px_60px_-46px_rgba(36,39,41,0.6)] sm:p-8">
                <EnquiryForm mode="admission" />
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------- counselling -------------------------- */}
        <section id="counselling" className="bg-white scroll-mt-24">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-9 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
              <div className="reveal">
                <SectionHeading
                  eyebrow="Counselling"
                  title={
                    <>
                      A subject <span className="serif-word">conversation</span>, not a sales call
                    </>
                  }
                  lede={COUNSELLING_INFO.body}
                />
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/15 bg-cream/40 px-3 py-1.5 text-[11.5px] text-charcoal/70">
                    <MessagesSquare className="h-3.5 w-3.5" />
                    By appointment
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/15 bg-cream/40 px-3 py-1.5 text-[11.5px] text-charcoal/70">
                    <MapPin className="h-3.5 w-3.5" />
                    Campus or phone
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-charcoal/25 px-3 py-1.5 text-[11.5px] text-charcoal/55">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Public slots not published
                  </span>
                </div>
              </div>

              <div className="reveal">
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {COUNSELLING_INFO.includes.map((item) => (
                    <li key={item} className="rounded-2xl border border-charcoal/10 bg-cream/20 p-4 text-[12.5px] leading-[1.68] text-charcoal/72">
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl border border-charcoal/10 bg-white px-4 py-3 text-[11.5px] leading-[1.65] text-charcoal/60">
                  {COUNSELLING_INFO.format}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------- FAQ ----------------------------- */}
        <section id="faq" className="wash-cream scroll-mt-24 border-t border-charcoal/8">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-14">
              <div className="reveal lg:sticky lg:top-28 lg:self-start">
                <SectionHeading
                  eyebrow="Questions"
                  title={
                    <>
                      Frequently asked, <span className="serif-word">answered</span> plainly
                    </>
                  }
                  lede="These answers describe how this build actually behaves. Where a fact is not available, the answer says so and names who can confirm it."
                />
                <ContactInformation variant="inline" className="mt-6" />
              </div>
              <div className="reveal">
                <FAQAccordion items={ADMISSIONS_FAQS} defaultOpen={ADMISSIONS_FAQS[0].id} />
              </div>
            </div>
          </div>
        </section>

        <CTASection
          eyebrow="Still deciding?"
          title={
            <>
              Compare the <span className="serif-word">programmes</span> first
            </>
          }
          lede="The programme pages carry subject coverage, teaching approach, assessment and the learning support available for each track — the detail most families want before an admissions conversation."
          actions={[
            { to: CTA_LINKS.programmes.to, label: CTA_LINKS.programmes.label },
            { to: CTA_LINKS.contact.to, label: CTA_LINKS.contact.label, variant: 'secondary' },
          ]}
          note="Admission timelines, fees and eligibility criteria are set by the institute office and are not published on this website."
        />
      </div>
    </PublicLayout>
  )
}
