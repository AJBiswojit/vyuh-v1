import SupportWorkspace from '../shared/SupportWorkspace.jsx'

const FAQS = [
  {
    question: 'How do I publish an examination that needs approval?',
    answer:
      'Submit it for approval from the examination page. It moves to pending-approval and the administrator decides; on approval every student in the target batches is notified automatically.',
  },
  {
    question: 'Why can I not edit a published examination?',
    answer:
      'Published and completed papers are locked so candidates see a stable paper. Duplicate the examination to create an editable copy.',
  },
  {
    question: 'How is attendance computed for my sessions?',
    answer:
      'Eligible attended minutes divided by eligible class minutes. Join and leave events are paired and merged, so a student who reconnects is never double counted.',
  },
  {
    question: 'Can I correct a student attendance record directly?',
    answer:
      'No — corrections go through a request. The administrator approves it, and only then are the join/leave events rewritten and audited.',
  },
  {
    question: 'What happens to a session recording after class?',
    answer:
      'Ending a session queues the recording for processing. You publish it when the media is ready; downloads follow the institute policy.',
  },
  {
    question: 'Is AI Auto Support a real AI?',
    answer:
      'No. It is a deterministic mock response service with local teaching context, not a hosted language model. Verify conceptual answers yourself and use Admin Support for operational changes.',
  },
]

const GUIDE_ITEMS = [
  'Include the examination, question, session or recording ID when describing an issue.',
  'Attendance corrections use the request flow, not a support ticket or a direct edit.',
  'Recordings may need processing time after a session ends.',
  'Resolved and closed tickets can be reopened with a reason; replies stay in the same thread.',
]

export default function FacultySupportPage() {
  return (
    <SupportWorkspace
      role="faculty"
      faqs={FAQS}
      guideTitle="Before you raise a ticket"
      guideItems={GUIDE_ITEMS}
      description="Operational help with examinations, attendance, recordings and doubts. AI Auto Support is a clearly labelled local mock response service; Admin Support creates a shared ticket."
    />
  )
}
