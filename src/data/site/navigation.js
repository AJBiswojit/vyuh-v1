/* ------------------------------------------------------------------
   PUBLIC SITE — navigation, footer and shared calls to action.
   Single source of truth: the navbar, footer and every in-page CTA read
   from these records, so no two pages can drift apart.
------------------------------------------------------------------- */

export const PUBLIC_NAV = [
  { label: 'Home', to: '/', match: ['/'] },
  { label: 'About', to: '/about', match: ['/about'] },
  { label: 'Programs', to: '/programs', match: ['/programs'] },
  { label: 'Learning Experience', to: '/learning-experience', match: ['/learning-experience'] },
  { label: 'Resources', to: '/resources', match: ['/resources'] },
  { label: 'Admissions', to: '/admissions', match: ['/admissions'] },
  { label: 'Contact', to: '/contact', match: ['/contact'] },
]

/* Footer columns. `label` is the visible heading; every target is a real React
   Router route — no hash-only or dead links. */
export const FOOTER_COLUMNS = [
  {
    title: 'Institute',
    links: [
      { label: 'About Vyuh', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Admissions', to: '/admissions' },
      { label: 'Sign in', to: '/login' },
    ],
  },
  {
    title: 'Academic programs',
    links: [
      { label: 'JEE Main & Advanced', to: '/programs#jee' },
      { label: 'NEET UG', to: '/programs#neet' },
      { label: 'Foundation', to: '/programs#foundation' },
      { label: 'Compare programs', to: '/programs#compare' },
    ],
  },
  {
    title: 'Learning experience',
    links: [
      { label: 'AI academic assistance', to: '/learning-experience#ai-academic-assistance' },
      { label: 'Computer-based examinations', to: '/learning-experience#computer-based-examinations' },
      { label: 'Examination analysis', to: '/learning-experience#examination-analysis' },
      { label: 'Live digital classrooms', to: '/learning-experience#live-digital-classrooms' },
      { label: 'Faculty doubt support', to: '/learning-experience#faculty-doubt-support' },
    ],
  },
  {
    title: 'Knowledge hub',
    links: [
      { label: 'Study materials', to: '/resources?category=study-materials' },
      { label: 'Previous year questions', to: '/resources?category=previous-year-questions' },
      { label: 'Preparation guides', to: '/resources?category=preparation-guides' },
      { label: 'Examination updates', to: '/resources?category=examination-updates' },
      { label: 'Announcements', to: '/resources?category=announcements' },
    ],
  },
]

export const FOOTER_LEGAL = [
  { label: 'Privacy & data notice', to: '/legal' },
  { label: 'Accessibility', to: '/legal#accessibility' },
  { label: 'Accreditation & approvals', to: '/legal#approvals' },
]

/* Reusable calls to action. The enquiry destination is the admissions form, and
   the anchor survives a direct visit to /admissions. */
export const CTA_LINKS = {
  admissions: { to: '/admissions#enquiry', label: 'Start an admission enquiry' },
  admissionsInfo: { to: '/admissions', label: 'Admissions information' },
  programmes: { to: '/programs', label: 'Explore programs' },
  contact: { to: '/contact', label: 'Contact the institute' },
  resources: { to: '/resources', label: 'Open the Knowledge Hub' },
  learning: { to: '/learning-experience', label: 'See the learning experience' },
  login: { to: '/login', label: 'Log in' },
}
