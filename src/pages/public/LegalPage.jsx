import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import CTASection from '../../components/public/CTASection'
import useReveal from '../../hooks/useReveal'
import { ENQUIRY_STORAGE_KEY } from '../../services/enquiry.service'
import { CONTACT_FIELDS } from '../../data/site/institute'

/* ------------------------------------------------------------------
   LEGAL — privacy/data notice, accessibility statement and the accreditation
   placeholder the footer links to.

   This page exists so that every footer link resolves, and because a site that
   collects a name and a phone number into a browser store owes the visitor a
   plain statement of what it does. It describes this build accurately.
------------------------------------------------------------------- */

const SECTIONS = [
  {
    id: 'privacy',
    title: 'Privacy and data notice',
    body: [
      'This website is a frontend demonstration of the Vyuh public site. It has no server, no analytics and no third-party trackers, and it sets no advertising cookies.',
      'Two forms on this site — the admission enquiry on /admissions and the message form on /contact — store what you type in your own browser’s local storage. Nothing is transmitted anywhere. The record is visible only on this device and clears when you clear site data.',
      'Nothing else about you is collected. There is no account, no upload and no payment on the public site.',
    ],
  },
  {
    id: 'stored',
    title: 'What is stored, exactly',
    body: [
      'Only the fields you submit in an enquiry: student name, optional guardian name, phone, email, programme or topic, current class, your message, a consent flag and a generated reference code such as VYUH-ENQ-0001.',
      'The record lives under one local-storage key, listed below. You can delete it at any time by clearing site data in your browser; the confirmation panel also offers to overwrite it with a new submission.',
    ],
    detail: [
      { label: 'Storage key', value: ENQUIRY_STORAGE_KEY },
      { label: 'Maximum records kept', value: '40 (oldest dropped first)' },
      { label: 'Sent to a server', value: 'No' },
      { label: 'Used for analytics', value: 'No' },
    ],
  },
  {
    id: 'not-collected',
    title: 'What this site never collects',
    body: [
      'No password, no payment card, no bank or UPI detail, no identity document and no photograph is requested by any public page. Any message claiming otherwise is not from this institute.',
      'If you need to share documents with the admissions office, do it directly with the office after they confirm the process — not through this website.',
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    body: [
      'The public site aims at WCAG 2.1 AA: every page has one h1 and a skip link, form fields have real labels and error messages announced through alert regions, navigation marks the current page with aria-current, the FAQ uses buttons with aria-expanded, and every control is reachable by keyboard.',
      'Motion follows the operating system’s reduce-motion setting: the fade-up reveals and the gentle float animations are disabled when reduced motion is requested, and smooth scrolling is turned off.',
      'If something on this site is not usable for you, tell us through the contact page and describe the page and the control.',
    ],
  },
  {
    id: 'approvals',
    title: 'Accreditation and approvals',
    body: [
      'No accreditation, affiliation, ranking, award or regulatory approval is claimed anywhere on this website. None is recorded in this repository, and inventing one would be worse than leaving the section out.',
      'The institute should supply verified accreditation and affiliation details here before this page is published as a live institute site. Until then, families should ask the office directly and check any claim with the issuing body.',
    ],
    placeholder: true,
  },
  {
    id: 'accuracy',
    title: 'Accuracy of published information',
    body: [
      'Programme content, policy defaults and contact details on this site are drawn from the institute’s own records in this repository. Where a fact has not been supplied — fees, deadlines, eligibility criteria, office hours, social accounts, accreditation — the page says so instead of publishing a plausible value.',
      'Institute information that is marked as pending public confirmation should be verified with the office before it is relied on for a decision.',
    ],
  },
]

export default function LegalPage() {
  const revealRef = useReveal('legal')

  return (
    <PublicLayout metaKey="legal">
      <div ref={revealRef}>
        <section className="hero-sky-page">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <p className="eyebrow reveal">
              <span className="eyebrow-dot" />
              Legal &amp; data
            </p>
            <h1 className="reveal mt-3 text-[30px] leading-[1.1] tracking-[-0.03em] sm:text-[40px] lg:text-[46px]">
              Privacy, data and <span className="serif-word">accessibility</span>
            </h1>
            <p className="reveal mt-4 max-w-[640px] text-[15px] leading-[1.7] text-charcoal/78 sm:text-[16px]">
              A plain description of what this website stores, what it does not collect, and which
              institute information is still pending confirmation.
            </p>
          </div>
        </section>

        <div className="bg-white">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:gap-16">
              <nav aria-label="Legal sections" className="reveal lg:sticky lg:top-28 lg:self-start">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/45">On this page</p>
                <ul className="mt-3 grid gap-2">
                  {SECTIONS.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="text-[12.5px] leading-[1.5] text-charcoal/65 underline-offset-4 hover:text-charcoal hover:underline"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="grid gap-10">
                {SECTIONS.map((section) => (
                  <section key={section.id} id={section.id} className="reveal scroll-mt-28">
                    <h2 className="font-serif text-[22px] leading-[1.25] tracking-[-0.015em] sm:text-[26px]">
                      {section.title}
                    </h2>
                    <div className="mt-3 grid gap-3">
                      {section.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 24)} className="max-w-[700px] text-[14px] leading-[1.78] text-charcoal/75">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {section.detail ? (
                      <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-charcoal/10 bg-charcoal/10 sm:grid-cols-2">
                        {section.detail.map((row) => (
                          <div key={row.label} className="bg-white px-4 py-3">
                            <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-charcoal/45">
                              {row.label}
                            </dt>
                            <dd className="mt-1 break-all font-mono text-[12px] text-charcoal/75">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}

                    {section.placeholder ? (
                      <p className="mt-4 flex items-start gap-2.5 rounded-2xl border border-dashed border-charcoal/25 bg-cream/30 px-4 py-3 text-[12px] leading-[1.7] text-charcoal/65">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-charcoal/40" aria-hidden="true" />
                        <span>
                          <strong className="font-medium text-charcoal">Institute input required.</strong>{' '}
                          This section is a placeholder. Supply verified accreditation and affiliation
                          details, with the issuing body and reference number, before publication.
                        </span>
                      </p>
                    ) : null}
                  </section>
                ))}

                <section id="contact-legal" className="reveal scroll-mt-28 rounded-2xl border border-charcoal/10 bg-cream/25 p-5">
                  <h2 className="text-[15px] font-medium">Questions about this notice</h2>
                  <p className="mt-2 text-[13px] leading-[1.7] text-charcoal/70">
                    Write to{' '}
                    <a
                      href={`mailto:${CONTACT_FIELDS.admissionsEmail.value}`}
                      className="underline decoration-charcoal/30 underline-offset-2 hover:decoration-charcoal"
                    >
                      {CONTACT_FIELDS.admissionsEmail.value}
                    </a>{' '}
                    or use the{' '}
                    <Link to="/contact" className="underline decoration-charcoal/30 underline-offset-2 hover:decoration-charcoal">
                      contact page
                    </Link>
                    .
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>

        <CTASection
          eyebrow="Continue"
          title={
            <>
              Back to the <span className="serif-word">institute</span>
            </>
          }
          actions={[
            { to: '/about', label: 'About Vyuh' },
            { to: '/contact', label: 'Contact', variant: 'secondary' },
          ]}
        />
      </div>
    </PublicLayout>
  )
}
