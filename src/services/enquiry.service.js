/* ------------------------------------------------------------------
   PUBLIC SITE — enquiry service.

   This is a frontend demonstration workflow, and it says so everywhere it is
   used. It:

     · validates the submission through the shared validator (src/lib/validation.js)
     · assigns a reference code the visitor can quote (VYUH-ENQ-0001)
     · stores the record in this browser only, under its own key — never in the
       workspace store, so public forms can never disturb seeded accounts
     · returns the saved record so the UI can show a genuine confirmation

   It does NOT send anything to the institute. Swapping this module for a real
   POST endpoint is the only change a backend integration needs, because the
   page talks to `enquiryService`, not to storage.
------------------------------------------------------------------- */

import { ApiError, createId, nowIso } from './api.js'
import { isEmail, isPhone, rules, validateForm } from '../lib/validation.js'
import { PROGRAM_OPTIONS } from '../data/site/admissions.js'
import { CONTACT_TOPICS } from '../data/site/contact.js'

export const ENQUIRY_STORAGE_KEY = 'vyuh:public-enquiries:v1'
const MAX_RECORDS = 40

export const ENQUIRY_TYPES = [
  { id: 'admission', label: 'Admission enquiry' },
  { id: 'contact', label: 'General contact' },
]

function hasStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function readRecords() {
  if (!hasStorage()) return []
  try {
    const raw = window.localStorage.getItem(ENQUIRY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRecords(records) {
  if (!hasStorage()) return false
  try {
    window.localStorage.setItem(ENQUIRY_STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)))
    return true
  } catch {
    return false
  }
}

function nextReference(records) {
  const highest = records.reduce((max, record) => {
    const match = String(record.reference || '').match(/VYUH-ENQ-(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `VYUH-ENQ-${String(highest + 1).padStart(4, '0')}`
}

/* Field rules, split by form so a field that does not exist on one form is
   never required by it. A student may not have a phone of their own, so either
   a phone number or an email address must be present; that cross-field check
   lives in `validateEnquiry`. */
const COMMON_RULES = {
  studentName: [
    rules.required('Student name'),
    rules.minLength(2, 'Student name'),
    rules.maxLength(80, 'Student name'),
  ],
  parentName: [rules.maxLength(80, 'Parent or guardian name')],
  phone: [
    {
      test: (value) => !value || isPhone(value),
      message: 'Enter a valid contact number, including the country or area code.',
    },
  ],
  email: [rules.required('Email address'), rules.email('Email address')],
  message: [rules.maxLength(1200, 'Message')],
  consent: [
    {
      test: (value) => value === true,
      message: 'Please confirm that the enquiry may be stored in this browser.',
    },
  ],
}

export const enquiryRules = {
  admission: {
    ...COMMON_RULES,
    program: [rules.required('Interested programme')],
    currentClass: [rules.required('Current class')],
  },
  contact: {
    ...COMMON_RULES,
    topic: [rules.maxLength(80, 'Topic')],
  },
}

function normalise(payload, type) {
  return {
    type,
    studentName: String(payload.studentName || '').trim(),
    parentName: String(payload.parentName || '').trim(),
    phone: String(payload.phone || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    program: String(payload.program || '').trim(),
    currentClass: String(payload.currentClass || '').trim(),
    topic: String(payload.topic || '').trim(),
    message: String(payload.message || '').trim(),
    consent: payload.consent === true,
  }
}

/**
 * Validate an enquiry or a contact message.
 * @returns {{ valid: boolean, errors: Record<string,string> }}
 */
export function validateEnquiry(form, type = 'admission') {
  const base = enquiryRules[type] || enquiryRules.admission
  const { errors } = validateForm(form, base)

  if (!String(form.phone || '').trim() && !String(form.email || '').trim()) {
    errors.phone = 'Enter a phone number or an email address so the office can reply.'
  }
  if (type === 'contact' && !String(form.message || '').trim()) {
    errors.message = 'Tell us what the enquiry is about.'
  }
  if (type === 'admission') {
    if (!PROGRAM_OPTIONS.includes(form.program)) errors.program = 'Choose the programme you are considering.'
    if (String(form.message || '').trim().length > 0 && String(form.message).trim().length < 10) {
      errors.message = 'Add a little more detail, or leave the message empty.'
    }
  } else if (form.topic && !CONTACT_TOPICS.includes(form.topic)) {
    errors.topic = 'Choose the topic that fits best.'
  }
  return { valid: Object.keys(errors).length === 0, errors }
}

export const enquiryService = {
  /**
   * Save a public enquiry locally. Resolves with the saved record including its
   * reference code. `delivered` is always false in this build — the UI must not
   * describe this as a submission to the institute.
   */
  async submitEnquiry(payload, { type = 'admission', latency = 420 } = {}) {
    const normalised = normalise(payload, type)
    const { valid, errors } = validateEnquiry(normalised, type)
    if (!valid) {
      throw new ApiError('Some required details are missing or need correcting.', {
        code: 'validation',
        details: { fields: errors },
      })
    }

    await new Promise((resolve) => setTimeout(resolve, latency))

    const records = readRecords()
    const record = {
      id: createId('enq'),
      reference: nextReference(records),
      ...normalised,
      createdAt: nowIso(),
      delivery: 'local-demonstration',
      delivered: false,
      deliveryNote:
        'Stored in this browser only. The institute did not receive this enquiry — use the phone number or email address on the contact page for a real response.',
    }

    const stored = writeRecords([...records, record])
    return { ...record, stored, emailValid: isEmail(record.email) }
  },

  /** Saved enquiries, newest first. Used by the confirmation panel only. */
  listEnquiries() {
    return readRecords().slice().reverse()
  },

  latestEnquiry() {
    const records = readRecords()
    return records.length ? records[records.length - 1] : null
  },

  clearEnquiries() {
    if (hasStorage()) {
      try {
        window.localStorage.removeItem(ENQUIRY_STORAGE_KEY)
      } catch {
        return false
      }
    }
    return true
  },

  /** Exposed so the confirmation screen can label the destination truthfully. */
  deliveryLabel() {
    return 'Local demonstration — stored in this browser, not sent to the institute'
  },
}
