import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Info, LoaderCircle } from 'lucide-react'
import { enquiryService, validateEnquiry, ENQUIRY_STORAGE_KEY } from '../../services/enquiry.service'
import { CLASS_OPTIONS, PROGRAM_OPTIONS } from '../../data/site/admissions'
import { CONTACT_TOPICS } from '../../data/site/contact'
import { CONTACT_FIELDS } from '../../data/site/institute'

/* ------------------------------------------------------------------
   EnquiryForm — one form, two modes.

     mode="admission"  student, guardian, contact, programme, current class,
                       message, consent  (Admissions page)
     mode="contact"    name, contact, topic, message, consent  (Contact page)

   Behaviour that this component is responsible for:
     · client-side validation with per-field messages and an error summary
     · focus moved to the first invalid field on a failed submit
     · a genuine confirmation panel with the saved reference code
     · a truthful statement that the record is stored in this browser only
     · a ?programme= / ?topic= prefill read from the URL, so programme CTAs on
       other pages arrive with the right option selected

   It never says "we will get back to you" — nothing was transmitted.
------------------------------------------------------------------- */

const EMPTY_ADMISSION = {
  studentName: '',
  parentName: '',
  phone: '',
  email: '',
  program: '',
  currentClass: '',
  message: '',
  consent: false,
}

const EMPTY_CONTACT = {
  studentName: '',
  parentName: '',
  phone: '',
  email: '',
  topic: '',
  currentClass: '',
  program: '',
  message: '',
  consent: false,
}

const PROGRAM_BY_SLUG = {
  jee: 'JEE Main & Advanced',
  neet: 'NEET UG',
  foundation: 'Foundation (Class X)',
  undecided: 'Not sure yet — please advise',
}

const TOPIC_BY_SLUG = {
  admissions: 'Admission enquiry',
  academic: 'Academic programme question',
  fees: 'Fees and payment (general)',
  student: 'Existing student support',
  careers: 'Faculty or careers',
  website: 'Website or technical issue',
  other: 'Something else',
}

export default function EnquiryForm({ mode = 'admission', heading = null, intro = null, className = '' }) {
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState(mode === 'admission' ? EMPTY_ADMISSION : EMPTY_CONTACT)
  const [errors, setErrors] = useState({})
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [hasSaved, setHasSaved] = useState(false)
  const formRef = useRef(null)
  const panelRef = useRef(null)
  const baseId = useId()

  /* Prefill from the query string, once, without fighting the user afterwards. */
  useEffect(() => {
    const programme = searchParams.get('programme')
    const topic = searchParams.get('topic')
    setForm((current) => {
      const next = { ...current }
      if (mode === 'admission' && programme && PROGRAM_BY_SLUG[programme]) {
        next.program = PROGRAM_BY_SLUG[programme]
      }
      if (mode === 'contact' && topic && TOPIC_BY_SLUG[topic]) {
        next.topic = TOPIC_BY_SLUG[topic]
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    try {
      setHasSaved(!!window.localStorage.getItem(ENQUIRY_STORAGE_KEY))
    } catch {
      setHasSaved(false)
    }
  }, [result])

  const fieldId = (name) => `${baseId}-${name}`

  const setField = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const focusFirstError = (nextErrors) => {
    const first = Object.keys(nextErrors)[0]
    if (!first) return
    const node = formRef.current?.querySelector(`#${CSS.escape(fieldId(first))}`)
    node?.focus()
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const submit = async (event) => {
    event.preventDefault()
    setSubmitError(null)
    const { valid, errors: nextErrors } = validateEnquiry(form, mode)
    setErrors(nextErrors)
    if (!valid) {
      focusFirstError(nextErrors)
      return
    }

    setPending(true)
    try {
      const saved = await enquiryService.submitEnquiry(form, { type: mode })
      setResult(saved)
      setForm(mode === 'admission' ? EMPTY_ADMISSION : EMPTY_CONTACT)
      window.setTimeout(() => panelRef.current?.focus(), 60)
    } catch (caught) {
      const fieldErrors = caught?.details?.fields
      if (fieldErrors) {
        setErrors(fieldErrors)
        focusFirstError(fieldErrors)
      }
      setSubmitError(caught?.message || 'The form could not be saved. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const errorList = Object.entries(errors)

  /* --------------------------- confirmation --------------------------- */
  if (result) {
    return (
      <div className={className}>
        <div
          ref={panelRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="public-card overflow-hidden outline-none"
        >
          <div className="border-b border-charcoal/10 bg-[#EFF7FC] px-5 py-5 sm:px-7">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-charcoal/70" aria-hidden="true" />
              <div>
                <h3 className="font-serif text-[21px] leading-tight tracking-[-0.015em]">
                  Enquiry saved in this browser
                </h3>
                <p className="mt-1.5 text-[13px] leading-[1.65] text-charcoal/70">
                  Your reference is{' '}
                  <span className="ref-code font-medium text-charcoal">{result.reference}</span>. Quote
                  it if you contact the office about this enquiry.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-7">
            <dl className="grid gap-2.5 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-charcoal/50">Student</dt>
                <dd className="mt-0.5 text-charcoal/85">{result.studentName}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-charcoal/50">
                  {mode === 'admission' ? 'Programme' : 'Topic'}
                </dt>
                <dd className="mt-0.5 text-charcoal/85">
                  {mode === 'admission' ? result.program : result.topic || 'General enquiry'}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-charcoal/50">Reply to</dt>
                <dd className="mt-0.5 break-all text-charcoal/85">{result.email}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-charcoal/50">
                  Saved at
                </dt>
                <dd className="mt-0.5 text-charcoal/85">
                  {new Date(result.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-2xl border border-charcoal/15 bg-cream/40 p-4">
              <p className="flex items-start gap-2 text-[12.5px] leading-[1.65] text-charcoal/75">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/50" aria-hidden="true" />
                <span>
                  <strong className="font-medium text-charcoal">
                    The institute has not received this enquiry.
                  </strong>{' '}
                  This website is a frontend demonstration: your details are stored only in this
                  browser. To reach the admissions office, call{' '}
                  <a
                    href={`tel:${CONTACT_FIELDS.phone.value.replace(/[^\d+]/g, '')}`}
                    className="underline decoration-charcoal/35 underline-offset-2 hover:decoration-charcoal"
                  >
                    {CONTACT_FIELDS.phone.value}
                  </a>{' '}
                  or email{' '}
                  <a
                    href={`mailto:${CONTACT_FIELDS.admissionsEmail.value}`}
                    className="break-all underline decoration-charcoal/35 underline-offset-2 hover:decoration-charcoal"
                  >
                    {CONTACT_FIELDS.admissionsEmail.value}
                  </a>
                  .
                </span>
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="inline-flex items-center gap-2 rounded-full border border-charcoal/20 px-5 py-2.5 text-[12.5px] font-medium text-charcoal transition hover:border-charcoal/40"
              >
                Send another enquiry
              </button>
              <Link
                to="/contact"
                className="text-[12.5px] text-charcoal/65 underline-offset-4 hover:text-charcoal hover:underline"
              >
                Institute contact details
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------- form ------------------------------- */
  return (
    <form ref={formRef} noValidate onSubmit={submit} className={className} aria-describedby={submitError ? `${baseId}-error` : undefined}>
      {heading ? (
        <h2 className="font-serif text-[24px] leading-[1.2] tracking-[-0.02em] sm:text-[28px]">{heading}</h2>
      ) : null}
      {intro ? <p className="mt-2.5 text-[13.5px] leading-[1.7] text-charcoal/68">{intro}</p> : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label htmlFor={fieldId('studentName')} className="mb-1.5 block text-[12px] font-medium text-charcoal/80">
            {mode === 'admission' ? 'Student name' : 'Your name'}
            <span className="text-charcoal/45"> *</span>
          </label>
          <input
            id={fieldId('studentName')}
            name="studentName"
            type="text"
            autoComplete="name"
            value={form.studentName}
            onChange={setField('studentName')}
            aria-invalid={errors.studentName ? 'true' : undefined}
            aria-describedby={errors.studentName ? `${fieldId('studentName')}-error` : undefined}
            className="public-field"
            placeholder="Full name"
          />
          {errors.studentName ? <FieldError id={`${fieldId('studentName')}-error`}>{errors.studentName}</FieldError> : null}
        </div>

        <div className="sm:col-span-1">
          <label htmlFor={fieldId('parentName')} className="mb-1.5 block text-[12px] font-medium text-charcoal/80">
            Parent / guardian name
            <span className="ml-1 text-[11px] font-normal text-charcoal/45">optional</span>
          </label>
          <input
            id={fieldId('parentName')}
            name="parentName"
            type="text"
            autoComplete="off"
            value={form.parentName}
            onChange={setField('parentName')}
            aria-invalid={errors.parentName ? 'true' : undefined}
            className="public-field"
            placeholder="Parent or guardian"
          />
          {errors.parentName ? <FieldError id={`${fieldId('parentName')}-error`}>{errors.parentName}</FieldError> : null}
        </div>

        <div>
          <label htmlFor={fieldId('phone')} className="mb-1.5 block text-[12px] font-medium text-charcoal/80">
            Phone number
            <span className="ml-1 text-[11px] font-normal text-charcoal/45">with country code</span>
          </label>
          <input
            id={fieldId('phone')}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={setField('phone')}
            aria-invalid={errors.phone ? 'true' : undefined}
            aria-describedby={errors.phone ? `${fieldId('phone')}-error` : undefined}
            className="public-field"
            placeholder="+91 98XXX XXXXX"
          />
          {errors.phone ? <FieldError id={`${fieldId('phone')}-error`}>{errors.phone}</FieldError> : null}
        </div>

        <div>
          <label htmlFor={fieldId('email')} className="mb-1.5 block text-[12px] font-medium text-charcoal/80">
            Email address<span className="text-charcoal/45"> *</span>
          </label>
          <input
            id={fieldId('email')}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={setField('email')}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? `${fieldId('email')}-error` : undefined}
            className="public-field"
            placeholder="name@example.com"
          />
          {errors.email ? <FieldError id={`${fieldId('email')}-error`}>{errors.email}</FieldError> : null}
        </div>

        {mode === 'admission' ? (
          <>
            <div>
              <label htmlFor={fieldId('program')} className="mb-1.5 block text-[12px] font-medium text-charcoal/80">
                Interested programme<span className="text-charcoal/45"> *</span>
              </label>
              <select
                id={fieldId('program')}
                name="program"
                value={form.program}
                onChange={setField('program')}
                aria-invalid={errors.program ? 'true' : undefined}
                aria-describedby={errors.program ? `${fieldId('program')}-error` : undefined}
                className="public-select"
              >
                <option value="">Select a programme</option>
                {PROGRAM_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.program ? <FieldError id={`${fieldId('program')}-error`}>{errors.program}</FieldError> : null}
            </div>

            <div>
              <label htmlFor={fieldId('currentClass')} className="mb-1.5 block text-[12px] font-medium text-charcoal/80">
                Current class<span className="text-charcoal/45"> *</span>
              </label>
              <select
                id={fieldId('currentClass')}
                name="currentClass"
                value={form.currentClass}
                onChange={setField('currentClass')}
                aria-invalid={errors.currentClass ? 'true' : undefined}
                aria-describedby={errors.currentClass ? `${fieldId('currentClass')}-error` : undefined}
                className="public-select"
              >
                <option value="">Select the current class</option>
                {CLASS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.currentClass ? (
                <FieldError id={`${fieldId('currentClass')}-error`}>{errors.currentClass}</FieldError>
              ) : null}
            </div>
          </>
        ) : (
          <div className="sm:col-span-2">
            <label htmlFor={fieldId('topic')} className="mb-1.5 block text-[12px] font-medium text-charcoal/80">
              What is this about?
            </label>
            <select
              id={fieldId('topic')}
              name="topic"
              value={form.topic}
              onChange={setField('topic')}
              aria-invalid={errors.topic ? 'true' : undefined}
              className="public-select"
            >
              <option value="">Select a topic</option>
              {CONTACT_TOPICS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.topic ? <FieldError id={`${fieldId('topic')}-error`}>{errors.topic}</FieldError> : null}
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor={fieldId('message')} className="mb-1.5 block text-[12px] font-medium text-charcoal/80">
            Message
            <span className="ml-1 text-[11px] font-normal text-charcoal/45">
              {mode === 'admission' ? 'optional' : 'required'}
            </span>
          </label>
          <textarea
            id={fieldId('message')}
            name="message"
            rows={4}
            value={form.message}
            onChange={setField('message')}
            aria-invalid={errors.message ? 'true' : undefined}
            aria-describedby={errors.message ? `${fieldId('message')}-error` : undefined}
            className="public-textarea"
            placeholder={
              mode === 'admission'
                ? 'Current preparation, target examination year, subjects the student finds hardest — anything that helps the office advise well.'
                : 'How can the institute help?'
            }
          />
          {errors.message ? <FieldError id={`${fieldId('message')}-error`}>{errors.message}</FieldError> : null}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={fieldId('consent')} className="flex items-start gap-2.5 text-[12.5px] leading-[1.6] text-charcoal/72">
            <input
              id={fieldId('consent')}
              name="consent"
              type="checkbox"
              checked={form.consent}
              onChange={setField('consent')}
              aria-invalid={errors.consent ? 'true' : undefined}
              aria-describedby={errors.consent ? `${fieldId('consent')}-error` : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--charcoal)]"
            />
            <span>
              I understand that this form is a website demonstration and that the details above are
              stored in this browser only.{' '}
              <Link to="/legal" className="underline decoration-charcoal/30 underline-offset-2 hover:decoration-charcoal">
                Privacy &amp; data notice
              </Link>
              <span className="text-charcoal/45"> (required)</span>
            </span>
          </label>
          {errors.consent ? <FieldError id={`${fieldId('consent')}-error`}>{errors.consent}</FieldError> : null}
        </div>
      </div>

      {errorList.length > 1 ? (
        <div className="mt-4 rounded-xl border border-[#c98a8a]/40 bg-[#fdf5f5] px-4 py-3" role="alert">
          <p className="text-[12px] font-medium text-[#8c2f2f]">
            {errorList.length} details need attention before this can be saved.
          </p>
        </div>
      ) : null}

      {submitError ? (
        <p id={`${baseId}-error`} role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-[#c98a8a]/40 bg-[#fdf5f5] px-4 py-3 text-[12.5px] text-[#8c2f2f]">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {submitError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[380px] text-[11px] leading-[1.6] text-charcoal/50">
          Required fields are marked *. No payment details, passwords or documents are collected on
          this page.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-charcoal px-6 py-3 text-[13.5px] font-medium text-white transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-charcoal/90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? 'Saving…' : mode === 'admission' ? 'Submit admission enquiry' : 'Send message'}
        </button>
      </div>

      {hasSaved && !pending ? (
        <p className="mt-4 rounded-xl border border-charcoal/10 bg-cream/35 px-3.5 py-2.5 text-[11.5px] leading-[1.6] text-charcoal/60">
          A previous enquiry from this browser is saved locally. Submitting again adds a new record;
          nothing is ever sent to a server.
        </p>
      ) : null}
    </form>
  )
}

function FieldError({ id, children }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-[1.5] text-[#8c2f2f]">
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}
