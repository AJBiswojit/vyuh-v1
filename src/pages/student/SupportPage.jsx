import SupportWorkspace from '../shared/SupportWorkspace.jsx'

const FAQS = [
  {
    question: 'Why does my exam timer keep running when I switch tabs?',
    answer:
      'The examination timer is server-authoritative in production. In this demonstration it is anchored to your attempt start time, so leaving the tab does not pause it. Leaving the tab is recorded as an integrity event — it does not, on its own, count as misconduct.',
  },
  {
    question: 'How is attendance calculated?',
    answer:
      'Eligible attended minutes divided by eligible class minutes, multiplied by 100. Join and leave events are merged so reconnecting during the same class never double-counts time. Minutes outside the eligible session window are excluded.',
  },
  {
    question: 'Why is my attendance below 60% even though I joined every class?',
    answer:
      'Partial attendance counts only the time you were connected. If you joined late or left early, the attended minutes are lower than the session length. Open Attendance and choose a date to see the exact intervals.',
  },
  {
    question: 'Can I download every recording?',
    answer:
      'Only where the institute policy allows downloads for your batch. Playback is always available once a recording is published.',
  },
  {
    question: 'Is AI Auto Support a real AI?',
    answer:
      'No. It is a clearly labelled mock response service: deterministic local templates grounded in Vyuh mock records. It does not use a hosted language model. Verify academic advice with faculty and escalate to Admin Support for a human response.',
  },
  {
    question: 'Where do I see my result and analysis?',
    answer:
      'Results appear after an attempt is submitted and evaluated. Open the examination from the Exams page and choose Result or Analysis, or use the Examination analysis tab on Performance.',
  },
  {
    question: 'How do I pay a fee or dispute an amount?',
    answer:
      'Open Payment & Dues. Pay Now is a simulated local demonstration with no real payment gateway or banking/card credentials. Use a fee request for a correction, deadline extension or instalment; Admin Workspace records the decision in the same request.',
  },
]

const GUIDE_ITEMS = [
  'Check Attendance and Performance before raising an academic question.',
  'For fees, include the fee ID and use a fee request instead of a support ticket where possible.',
  'Reply in the same ticket thread; resolved and closed tickets can be reopened with a reason.',
  'Attachment metadata records filenames and sizes only; no file content is uploaded.',
]

export default function SupportPage() {
  return (
    <SupportWorkspace
      role="student"
      faqs={FAQS}
      guideTitle="Before you raise a ticket"
      guideItems={GUIDE_ITEMS}
      description="Ask the clearly labelled Mock response service, track Admin Support tickets in one thread, or read the workspace FAQ. Escalation creates a shared in-app ticket."
    />
  )
}
