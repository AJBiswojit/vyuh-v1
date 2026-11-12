/* ------------------------------------------------------------------
   PUBLIC SITE — Contact page content.
   Address, phone and email come from CONTACT_FIELDS in institute.js. Nothing
   in this file adds a phone number, email address, social account or office
   hours that is not recorded elsewhere in the repository.
------------------------------------------------------------------- */

export const CONTACT_TOPICS = [
  'Admission enquiry',
  'Academic programme question',
  'Fees and payment (general)',
  'Existing student support',
  'Faculty or careers',
  'Website or technical issue',
  'Something else',
]

export const CONTACT_FAQS = [
  {
    id: 'response-time',
    question: 'How quickly will the institute respond?',
    answer:
      'The existing public support address commits to a response within one working day. The admissions office sets its own response time, and both are reachable during the hours the office is open. Office hours have not been published on this website, so confirm them at the number on this page before travelling to the campus.',
  },
  {
    id: 'visit',
    question: 'Can I visit the campus?',
    answer:
      'Visits are arranged with the admissions office rather than on a walk-in basis. Call or email first so that a subject faculty member can be available for the conversation.',
  },
  {
    id: 'student-support',
    question: 'I am an enrolled student and have an account issue.',
    answer:
      'Sign in and raise an Admin Support ticket from your workspace — that is the tracked channel and it reaches the institute administrator directly. The public contact details on this page are for prospective students and general enquiries.',
  },
  {
    id: 'address',
    question: 'Is the address on this page the confirmed campus address?',
    answer:
      'The address shown is the institute profile record held by the institute administration. It is marked as pending public confirmation on this page; please verify it with the office by phone before planning a visit.',
  },
  {
    id: 'demo',
    question: 'This site looks like a demonstration build — is my information stored?',
    answer:
      'Yes. Forms on this website are a frontend demonstration: submissions are kept in your own browser and are never sent to an institute server. See the privacy and data notice for the exact list of what is stored.',
  },
]

export const ENQUIRY_ROUTING_NOTE =
  'Enquiries submitted here are stored locally in this browser as a demonstration. If you need the institute to receive your message, use the phone number or email address on this page.'
