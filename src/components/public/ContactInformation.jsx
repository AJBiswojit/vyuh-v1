import { MapPin, Phone, Mail, Clock, ArrowUpRight, ExternalLink } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { CONTACT_FIELDS, mapSearchUrl } from '../../data/site/institute'

/* ------------------------------------------------------------------
   ContactInformation — the institute contact block.

   Values come from the repository's institute record. Each entry that has not
   been independently confirmed for public display carries a small "Confirm" note
   rather than being presented as final; entries with no value at all render the
   explicit placeholder supplied by the data file.
------------------------------------------------------------------- */

function ConfirmNote({ children = 'Pending public confirmation' }) {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full border border-charcoal/15 px-2 py-[1px] text-[9.5px] font-medium uppercase tracking-[0.1em] text-charcoal/50">
      {children}
    </span>
  )
}

export default function ContactInformation({ variant = 'full', className = '' }) {
  const telHref = `tel:${CONTACT_FIELDS.phone.value.replace(/[^\d+]/g, '')}`

  if (variant === 'inline') {
    return (
      <ul className={`grid gap-2.5 text-[13px] ${className}`}>
        <li className="flex items-start gap-2.5">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/45" aria-hidden="true" />
          <span>
            <a href={telHref} className="text-charcoal/80 underline-offset-4 hover:text-charcoal hover:underline">
              {CONTACT_FIELDS.phone.value}
            </a>
            <ConfirmNote />
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/45" aria-hidden="true" />
          <span>
            <a
              href={`mailto:${CONTACT_FIELDS.admissionsEmail.value}`}
              className="text-charcoal/80 underline-offset-4 hover:text-charcoal hover:underline"
            >
              {CONTACT_FIELDS.admissionsEmail.value}
            </a>
            <ConfirmNote />
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/45" aria-hidden="true" />
          <span className="text-charcoal/70">
            {CONTACT_FIELDS.address.value}
            <ConfirmNote />
          </span>
        </li>
      </ul>
    )
  }

  return (
    <div className={className}>
      <div className="public-card overflow-hidden">
        <div className="border-b border-charcoal/10 bg-cream/45 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-charcoal/55">
              Institute office
            </p>
            <StatusBadge tone="outline">From institute record</StatusBadge>
          </div>
        </div>

        <dl className="divide-y divide-charcoal/8">
          <div className="flex gap-3.5 px-5 py-4 sm:px-6">
            <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-charcoal/40" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-charcoal/50">
                {CONTACT_FIELDS.address.label}
              </dt>
              <dd className="mt-1 text-[14px] leading-[1.6] text-charcoal/85">
                {CONTACT_FIELDS.address.value}
                <span className="mt-0.5 block text-[13px] text-charcoal/60">
                  {CONTACT_FIELDS.address.locality}
                </span>
                <ConfirmNote>Verify before visiting</ConfirmNote>
              </dd>
              <dd className="mt-2.5">
                <a
                  href={mapSearchUrl()}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-charcoal/75 underline-offset-4 hover:text-charcoal hover:underline"
                >
                  Open this address in Google Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
            </div>
          </div>

          <div className="flex gap-3.5 px-5 py-4 sm:px-6">
            <Phone className="mt-0.5 h-[18px] w-[18px] shrink-0 text-charcoal/40" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-charcoal/50">
                {CONTACT_FIELDS.phone.label}
              </dt>
              <dd className="mt-1">
                <a
                  href={telHref}
                  className="text-[14px] text-charcoal/85 underline-offset-4 hover:text-charcoal hover:underline"
                >
                  {CONTACT_FIELDS.phone.value}
                </a>
                <ConfirmNote />
              </dd>
            </div>
          </div>

          <div className="flex gap-3.5 px-5 py-4 sm:px-6">
            <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0 text-charcoal/40" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-charcoal/50">
                {CONTACT_FIELDS.admissionsEmail.label}
              </dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${CONTACT_FIELDS.admissionsEmail.value}`}
                  className="break-all text-[14px] text-charcoal/85 underline-offset-4 hover:text-charcoal hover:underline"
                >
                  {CONTACT_FIELDS.admissionsEmail.value}
                </a>
                <ConfirmNote />
              </dd>
            </div>
          </div>

          <div className="flex gap-3.5 px-5 py-4 sm:px-6">
            <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0 text-charcoal/40" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-charcoal/50">
                {CONTACT_FIELDS.supportEmail.label}
              </dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${CONTACT_FIELDS.supportEmail.value}`}
                  className="break-all text-[14px] text-charcoal/85 underline-offset-4 hover:text-charcoal hover:underline"
                >
                  {CONTACT_FIELDS.supportEmail.value}
                </a>
                <ConfirmNote />
              </dd>
            </div>
          </div>

          <div className="flex gap-3.5 px-5 py-4 sm:px-6">
            <Clock className="mt-0.5 h-[18px] w-[18px] shrink-0 text-charcoal/40" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-charcoal/50">
                {CONTACT_FIELDS.officeHours.label}
              </dt>
              <dd className="mt-1 rounded-lg border border-dashed border-charcoal/20 bg-cream/30 px-2.5 py-1.5 text-[12.5px] text-charcoal/55">
                {CONTACT_FIELDS.officeHours.placeholder}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-charcoal/10 bg-white/70 px-4 py-3">
        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 rotate-45 text-charcoal/40" aria-hidden="true" />
        <p className="text-[11.5px] leading-[1.6] text-charcoal/60">
          Address, phone and email are read from the institute profile record held by the
          administration. They are shown as pending public confirmation — please verify by phone
          before travelling or sending documents.
        </p>
      </div>
    </div>
  )
}
