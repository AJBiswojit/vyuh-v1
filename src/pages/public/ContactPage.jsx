import { Link } from 'react-router-dom'
import { ArrowUpRight, ExternalLink, Info, MapPin, Navigation } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import PageHero from '../../components/public/PageHero'
import SectionHeading from '../../components/public/SectionHeading'
import ContactInformation from '../../components/public/ContactInformation'
import EnquiryForm from '../../components/public/EnquiryForm'
import FAQAccordion from '../../components/public/FAQAccordion'
import CTASection from '../../components/public/CTASection'
import StatusBadge from '../../components/public/StatusBadge'
import useReveal from '../../hooks/useReveal'
import { CONTACT_FAQS, ENQUIRY_ROUTING_NOTE } from '../../data/site/contact'
import { CONTACT_FIELDS, mapSearchUrl } from '../../data/site/institute'
import { CTA_LINKS } from '../../data/site/navigation'

/* ------------------------------------------------------------------
   CONTACT — the complete contact page.

   Left: institute contact record (address, phone, two email addresses, office
   hours placeholder, social placeholder) and the map panel.
   Right: the general enquiry form.
   Below: FAQ and a routing panel for existing students.

   The map is an address-derived Google Maps search link plus a locally drawn
   locality panel — there is no embedded third-party iframe, no API key and no
   invented map pin. That keeps the page honest and free of tracking.
------------------------------------------------------------------- */

export default function ContactPage() {
  const revealRef = useReveal('contact')

  return (
    <PublicLayout metaKey="contact">
      <div ref={revealRef}>
        <PageHero
          eyebrow="Contact"
          title={
            <>
              Talk to the <span className="serif-word">institute</span>
            </>
          }
          lede="Admissions questions, programme details and general enquiries all start here. For a tracked account issue, sign in and raise a support ticket from your workspace instead — it reaches the administrator directly."
          actions={[
            { to: '/login', label: 'Log in to your workspace' },
            { to: '/admissions#enquiry', label: 'Admission enquiry', variant: 'secondary' },
          ]}
          compact
        />

        {/* ---------------------- details + form ---------------------- */}
        <section id="details" className="bg-white scroll-mt-24">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-9 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14">
              <div className="reveal">
                <SectionHeading
                  eyebrow="Institute contact"
                  title={
                    <>
                      Where to <span className="serif-word">find</span> us
                    </>
                  }
                  lede="These details are read from the institute profile record. Values that have not been independently confirmed for public display are marked."
                />
                <ContactInformation className="mt-6" />
              </div>

              <div className="reveal rounded-[26px] border border-charcoal/10 bg-white p-6 shadow-[0_22px_60px_-46px_rgba(36,39,41,0.6)] sm:p-8">
                <EnquiryForm
                  mode="contact"
                  heading="Send a message"
                  intro="Use this for admissions questions, programme details or anything about the institute. Existing students should raise a support ticket from inside their workspace."
                />
                <p className="mt-4 flex items-start gap-2 rounded-xl border border-charcoal/10 bg-cream/30 px-3.5 py-2.5 text-[11.5px] leading-[1.6] text-charcoal/60">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal/40" aria-hidden="true" />
                  {ENQUIRY_ROUTING_NOTE}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------- location -------------------------- */}
        <section id="location" className="wash-cream scroll-mt-24 border-y border-charcoal/8">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-14">
              <div className="reveal">
                <SectionHeading
                  eyebrow="Location"
                  title={
                    <>
                      {CONTACT_FIELDS.address.locality.split(',')[0]},{' '}
                      <span className="serif-word">{CONTACT_FIELDS.address.locality.split(',')[1]?.trim()}</span>
                    </>
                  }
                  lede="There is no embedded third-party map on this site. Use the address below in your own maps application, or open the search link — it queries the recorded address rather than a pin we have not verified."
                />
                <p className="mt-5 rounded-xl border border-charcoal/10 bg-white/70 px-4 py-3 text-[12.5px] leading-[1.65] text-charcoal/70">
                  {CONTACT_FIELDS.address.value}
                  <span className="mt-0.5 block text-[11.5px] text-charcoal/50">
                    {CONTACT_FIELDS.address.locality}
                  </span>
                </p>
                <a
                  href={mapSearchUrl()}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-[12.5px] font-medium text-white transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-charcoal/90"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Open in Google Maps
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
                <p className="mt-3 text-[11px] leading-[1.6] text-charcoal/50">
                  Address pending public confirmation. Please call before travelling; visits are
                  arranged with the admissions office.
                </p>
              </div>

              {/* Locally drawn locality panel — honest and dependency-free */}
              <div className="reveal">
                <div className="public-card overflow-hidden">
                  <div className="grid-paper relative h-[260px] bg-[#F3F8FB] sm:h-[320px]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-cream/40" aria-hidden="true" />
                    {/* roads */}
                    <div className="absolute left-0 right-0 top-[38%] h-[6px] bg-white/85" aria-hidden="true" />
                    <div className="absolute left-0 right-0 top-[39%] h-px bg-charcoal/10" aria-hidden="true" />
                    <div className="absolute bottom-0 left-[58%] top-0 w-[6px] bg-white/85" aria-hidden="true" />
                    <div className="absolute bottom-0 left-[59%] top-0 w-px bg-charcoal/10" aria-hidden="true" />
                    <div className="absolute bottom-[16%] left-0 right-0 h-[4px] bg-white/70" aria-hidden="true" />
                    <div className="absolute left-[18%] top-0 h-[38%] w-[3px] bg-white/70" aria-hidden="true" />

                    <div className="absolute left-[52%] top-[33%] -translate-x-1/2 -translate-y-full">
                      <div className="flex flex-col items-center">
                        <span className="rounded-full bg-charcoal px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_10px_22px_-14px_rgba(36,39,41,0.8)]">
                          Vyuh Academy
                        </span>
                        <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-charcoal/25 bg-white">
                          <MapPin className="h-3.5 w-3.5 text-charcoal" />
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-2.5 left-3 rounded-full border border-charcoal/10 bg-white/85 px-2.5 py-1 text-[9.5px] uppercase tracking-[0.1em] text-charcoal/55">
                      Locality map · schematic
                    </div>
                    <div className="absolute right-2.5 top-2.5">
                      <StatusBadge tone="outline">Illustrative, not to scale</StatusBadge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/8 px-4 py-3">
                    <p className="text-[11px] leading-[1.6] text-charcoal/55">
                      A schematic showing the recorded locality, drawn locally. It is not a survey
                      map and does not claim a verified entrance.
                    </p>
                    <Link
                      to="/legal"
                      className="inline-flex items-center gap-1 text-[11px] text-charcoal/60 underline-offset-2 hover:text-charcoal hover:underline"
                    >
                      Data notice
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------- FAQ ------------------------------ */}
        <section id="faq" className="bg-white scroll-mt-24">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-14">
              <div className="reveal">
                <SectionHeading
                  eyebrow="Contact questions"
                  title={
                    <>
                      Before you <span className="serif-word">write</span>
                    </>
                  }
                  lede="Five questions about response times, campus visits, student support and what this website actually stores."
                />
              </div>
              <div className="reveal">
                <FAQAccordion items={CONTACT_FAQS} defaultOpen={CONTACT_FAQS[0].id} />
              </div>
            </div>
          </div>
        </section>

        <CTASection
          eyebrow="Admissions"
          title={
            <>
              Looking for the <span className="serif-word">admissions</span> route?
            </>
          }
          lede="The admissions page covers the journey from enquiry to enrolment, the programmes open for enquiry, counselling, and eligibility information."
          actions={[
            { to: CTA_LINKS.admissions.to, label: CTA_LINKS.admissionsInfo.label },
            { to: CTA_LINKS.resources.to, label: CTA_LINKS.resources.label, variant: 'secondary' },
          ]}
        />
      </div>
    </PublicLayout>
  )
}
