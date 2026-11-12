/* ------------------------------------------------------------------
   PUBLIC SITE — institute identity and contact record.

   Every value here is mirrored from a record that already exists in this
   repository, so nothing is invented for the public site:

     · name / shortName / tagline / address / city / state / country / phone /
       email / website / established  → INSTITUTE in src/data/mock/seed.js
     · the academic mailbox office@vyuhacademy.edu.in → the single verified
       address for the institute. The legacy hello@vyuh.in mailbox was on a
       different domain from the verified institute domain, so it was retired
       rather than published next to it.
     · faculty names and roles → src/data/mock/users.mock.js (the same three
       educators already published on the landing page).

   This file is a static mirror on purpose: the public site must render without
   touching the browser demonstration store. If the institute record changes,
   update it here too — `CONTACT_FIELDS` below is the list the contact page
   renders directly.
------------------------------------------------------------------- */

export const INSTITUTE_IDENTITY = {
  name: 'Vyuh Academy',
  shortName: 'Vyuh',
  tagline: 'One academic ecosystem — students, faculty and administration.',
  established: 2021,
  code: 'VYUH-AC-2026',
  academicYear: '2026–27',
}

/* `needsConfirmation` is rendered as a small, clearly identifiable note rather
   than being presented as final public information. The address and phone come
   from the institute profile record, which is editable by an institute admin —
   they are not independently verified for public display. */
export const CONTACT_FIELDS = {
  address: {
    label: 'Campus address',
    value: '3rd Floor, Trident House, Saheed Nagar, Bhubaneswar 751007',
    locality: 'Bhubaneswar, Odisha, India',
    source: 'institute profile record',
    needsConfirmation: true,
  },
  phone: {
    label: 'Institute office',
    value: '+91 674 400 1200',
    source: 'institute profile record',
    needsConfirmation: true,
  },
  admissionsEmail: {
    label: 'Admissions & general enquiries',
    value: 'office@vyuhacademy.edu.in',
    source: 'institute profile record',
    needsConfirmation: true,
  },
  supportEmail: {
    label: 'Platform & student support',
    value: 'office@vyuhacademy.edu.in',
    source: 'institute profile record',
    needsConfirmation: true,
    note: 'One verified mailbox handles both admissions and support until the institute publishes separate addresses.',
  },
  officeHours: {
    label: 'Office hours',
    value: null,
    source: null,
    needsConfirmation: true,
    placeholder: 'Office hours have not been published yet.',
  },
  social: {
    label: 'Social media',
    value: null,
    needsConfirmation: true,
    placeholder: 'No verified social media accounts are published.',
  },
}

/* Google Maps search for the recorded address — a genuine lookup link built from
   the address string, not an embedded third-party map with an unverified pin. */
export function mapSearchUrl(address = CONTACT_FIELDS.address.value) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export const INSTITUTE_SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology']

/* Existing educators, exactly as seeded and already published on the landing
   page. No qualification, tenure or achievement is added here. */
export const EDUCATORS = [
  { name: 'Aarav Mishra', role: 'Senior Physics Educator', subject: 'Physics' },
  { name: 'Rohan Sen', role: 'Chemistry Faculty', subject: 'Chemistry' },
  { name: 'Vikram Das', role: 'Mathematics Faculty', subject: 'Mathematics' },
]

export const PAGE_META = {
  home: {
    title: 'Vyuh — Focused learning for serious aspirants',
    description:
      'Vyuh is a focused learning platform that helps students prepare, practice, and perform better in their competitive and academic exams.',
  },
  about: {
    title: 'About — Vyuh Academy',
    description:
      'Why Vyuh exists: an academic institute built around conceptual clarity, disciplined practice and consistent, measured improvement.',
  },
  programs: {
    title: 'Programs — Vyuh Academy',
    description:
      'JEE Main and Advanced, NEET UG and Foundation programs: subject coverage, teaching approach, assessment and available learning support.',
  },
  learning: {
    title: 'Learning Experience — Vyuh Academy',
    description:
      'How Vyuh combines academic teaching with technology: computer-based examinations, examination analysis, live classrooms, recordings, attendance and faculty doubt support.',
  },
  resources: {
    title: 'Resources — Vyuh Academy',
    description:
      'The Vyuh Knowledge Hub: study materials, previous year questions, preparation guides, examination updates, academic articles and announcements.',
  },
  admissions: {
    title: 'Admissions — Vyuh Academy',
    description:
      'Admissions information for JEE Main and Advanced, NEET UG and Foundation programs, the admission journey, eligibility information and enquiry form.',
  },
  contact: {
    title: 'Contact — Vyuh Academy',
    description:
      'Contact Vyuh Academy: campus address, office phone, admissions and support email addresses, enquiry form and frequently asked questions.',
  },
  legal: {
    title: 'Legal & data notice — Vyuh Academy',
    description:
      'What this website stores in your browser, how enquiry information is handled in this demonstration build, and how to contact the institute.',
  },
}
