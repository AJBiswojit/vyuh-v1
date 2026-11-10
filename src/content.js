export const NAV_LINKS = [
  { label: 'Home', to: '/', active: true },
  { label: 'Features', to: '/#features' },
  { label: 'Programs', to: '/programs' },
  { label: 'Resources', to: '/#resources' },
  { label: 'Pricing', to: '/pricing' },
]

export const HERO_STATS = { value: '25K', label: 'ACTIVE LEARNERS' }

export const ABOUT_STATS = [
  { value: 'Top 1%', label: 'RESULT ACHIEVERS' },
  { value: '25K+', label: 'ACTIVE LEARNERS' },
  { value: '50K+', label: 'QUESTIONS PRACTICED' },
]

export const LEARNING_CARDS = [
  {
    id: 'structured-courses',
    title: 'Structured Courses',
    description:
      'Concept-focused courses with clear explanations, examples, and practice sets for stronger fundamentals.',
    image: '/assets/card-structured.webp',
    imageAlt:
      'Illustration of a student studying on a laptop at a desk with notes and a plant',
    to: '/programs',
  },
  {
    id: 'practice-analysis',
    title: 'Practice & Analysis',
    description:
      'Attempt topic-wise and full-length tests, analyze your performance, and track improvement with detailed insights.',
    image: '/assets/card-practice.webp',
    imageAlt: 'Illustration of two students collaborating over a laptop',
    to: '/#features',
  },
  {
    id: 'study-resources',
    title: 'Study Resources',
    description:
      'Access high-quality notes, PYQs, and curated materials to support your preparation anytime, anywhere.',
    image: '/assets/card-resources.webp',
    imageAlt: 'Illustration of an educator holding an open book with study notes',
    to: '/#resources',
  },
]

export const EXPERTS = [
  {
    id: 'aarav',
    name: 'Aarav Mishra',
    role: 'PHYSICS EDUCATOR',
    image: '/assets/expert-01.webp',
    tone: 'mist',
  },
  {
    id: 'rohan',
    name: 'Rohan Sen',
    role: 'CHEMISTRY EDUCATOR',
    image: '/assets/expert-02.webp',
    tone: 'cream',
  },
  {
    id: 'vikram',
    name: 'Vikram Das',
    role: 'MATHEMATICS EDUCATOR',
    image: '/assets/expert-03.webp',
    tone: 'sand',
  },
]

export const CAPABILITIES = [
  { id: 'concept', label: 'Concept Learning', icon: 'concept' },
  { id: 'doubt', label: 'Doubt Support', icon: 'doubt' },
  { id: 'tests', label: 'Test Series', icon: 'tests' },
  { id: 'analytics', label: 'Performance Analytics', icon: 'analytics' },
  { id: 'materials', label: 'Study Materials', icon: 'materials' },
]

export const PROCESS_STEPS = [
  {
    number: '01',
    title: 'Learn Effectively',
    description: 'Build strong concepts with structured and easy-to-follow content.',
  },
  {
    number: '02',
    title: 'Practice Smartly',
    description: 'Improve accuracy and speed with a wide range of practice tests.',
  },
  {
    number: '03',
    title: 'Track Your Growth',
    description: 'Get detailed analytics, identify gaps, and stay on the right track.',
  },
]

export const JOURNEY_STEPS = [
  {
    id: 'understand',
    number: '01',
    title: 'Understand',
    description:
      'Build strong foundations with structured lessons, clear explanations and concept-focused learning.',
    image: '/assets/journey-understand.webp',
    imageAlt: 'Illustration of a student learning concepts on a laptop',
    to: '/programs',
  },
  {
    id: 'practice',
    number: '02',
    title: 'Practice',
    description:
      'Strengthen your knowledge through topic-wise questions, mock tests and focused practice.',
    image: '/assets/journey-practice.webp',
    imageAlt: 'Illustration of a student practising questions on a tablet',
    to: '/#features',
  },
  {
    id: 'improve',
    number: '03',
    title: 'Improve',
    description:
      'Understand your performance, identify weak areas and make every next attempt better.',
    image: '/assets/journey-improve.webp',
    imageAlt: 'Illustration of a student reviewing a performance chart',
    to: '/#results',
  },
]

export const PROGRAMS = [
  {
    id: 'jee',
    number: '01',
    title: 'JEE Preparation',
    description:
      'Strengthen concepts, practise problem-solving and improve your performance through structured preparation.',
    image: '/assets/program-jee.webp',
    imageAlt: 'Illustration of a student solving physics and mathematics problems',
    to: '/programs',
  },
  {
    id: 'neet',
    number: '02',
    title: 'NEET Preparation',
    description:
      'Build subject knowledge, practise questions and evaluate your exam readiness with focused preparation.',
    image: '/assets/program-neet.webp',
    imageAlt: 'Illustration of a student studying biology with a microscope',
    to: '/programs',
  },
  {
    id: 'academic',
    number: '03',
    title: 'Academic Learning',
    description:
      'Develop strong fundamentals, revise important topics and stay consistent with your academic goals.',
    image: '/assets/program-academic.webp',
    imageAlt: 'Illustration of a student revising with textbooks and notes',
    to: '/programs',
  },
]

export const TESTIMONIALS = [
  {
    id: 'ananya',
    quote:
      'Vyuh made my preparation more focused and systematic. The practice tests and analysis really helped me improve.',
    name: 'Ananya Pradhan',
    role: 'NEET Aspirant',
    avatar: '/assets/learner-ananya.webp',
  },
  {
    id: 'ritwik',
    quote:
      'The structured content and performance insights on Vyuh gave me the right direction. It’s a complete platform for serious aspirants.',
    name: 'Ritwik Sahoo',
    role: 'JEE Aspirant',
    avatar: '/assets/learner-ritwik.webp',
  },
  {
    id: 'sneha',
    quote:
      'Clear concepts, quality materials, and great support. Vyuh has everything I need in one place.',
    name: 'Sneha Mohanty',
    role: 'JEE Aspirant',
    avatar: '/assets/learner-sneha.webp',
  },
]

export const FOOTER_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Programs', to: '/programs' },
  { label: 'Support', to: '/support' },
  { label: 'Contact', to: '/contact' },
]
