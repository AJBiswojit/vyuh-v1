/* Subjects and topics — shared academic taxonomy for every workspace. */

export const SUBJECTS = [
  {
    id: 'sub_phy',
    name: 'Physics',
    code: 'PHY',
    accent: 'sky',
    topics: [
      { id: 'top_phy_kinematics', name: 'Kinematics' },
      { id: 'top_phy_laws', name: "Newton's Laws" },
      { id: 'top_phy_work', name: 'Work, Energy & Power' },
      { id: 'top_phy_rotation', name: 'Rotational Motion' },
      { id: 'top_phy_current', name: 'Current Electricity' },
      { id: 'top_phy_optics', name: 'Ray Optics' },
    ],
  },
  {
    id: 'sub_chem',
    name: 'Chemistry',
    code: 'CHE',
    accent: 'cream',
    topics: [
      { id: 'top_chem_mole', name: 'Mole Concept' },
      { id: 'top_chem_equilibrium', name: 'Chemical Equilibrium' },
      { id: 'top_chem_bonding', name: 'Chemical Bonding' },
      { id: 'top_chem_organic', name: 'Organic Basics' },
      { id: 'top_chem_electro', name: 'Electrochemistry' },
    ],
  },
  {
    id: 'sub_math',
    name: 'Mathematics',
    code: 'MAT',
    accent: 'sky',
    topics: [
      { id: 'top_math_quadratic', name: 'Quadratic Equations' },
      { id: 'top_math_trig', name: 'Trigonometry' },
      { id: 'top_math_calculus', name: 'Differential Calculus' },
      { id: 'top_math_vectors', name: 'Vectors & 3D' },
      { id: 'top_math_probability', name: 'Probability' },
    ],
  },
  {
    id: 'sub_bio',
    name: 'Biology',
    code: 'BIO',
    accent: 'cream',
    topics: [
      { id: 'top_bio_cell', name: 'Cell Biology' },
      { id: 'top_bio_genetics', name: 'Genetics' },
      { id: 'top_bio_human', name: 'Human Physiology' },
      { id: 'top_bio_ecology', name: 'Ecology' },
    ],
  },
]

export const SUBJECT_BY_ID = SUBJECTS.reduce((accumulator, subject) => {
  accumulator[subject.id] = subject
  return accumulator
}, {})

export const TOPICS = SUBJECTS.flatMap((subject) =>
  subject.topics.map((topic) => ({ ...topic, subjectId: subject.id, subjectName: subject.name })),
)

export const TOPIC_BY_ID = TOPICS.reduce((accumulator, topic) => {
  accumulator[topic.id] = topic
  return accumulator
}, {})

export function subjectName(subjectId) {
  return SUBJECT_BY_ID[subjectId]?.name || 'General'
}

export function topicName(topicId) {
  return TOPIC_BY_ID[topicId]?.name || 'General'
}
