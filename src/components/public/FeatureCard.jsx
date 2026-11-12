import { ArrowRight } from '../Icons'
import StatusBadge from './StatusBadge'
import { STATUS_LABELS } from '../../data/site/learning'

/* ------------------------------------------------------------------
   FeatureCard — one capability on the Learning Experience page.

   The status badge is not optional: a capability that is a demonstration is
   labelled as one on the card itself, not only in a footnote further down the
   page. `href` lets the card link into the detailed section below.
------------------------------------------------------------------- */

export default function FeatureCard({ feature, href, compact = false }) {
  const status = STATUS_LABELS[feature.status]

  return (
    <article
      className={`public-card public-card-lift flex h-full flex-col ${compact ? 'p-5' : 'p-6 lg:p-7'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF7FC] text-[13px] font-medium text-charcoal/70">
          {feature.index}
        </span>
        {status ? (
          <StatusBadge tone={status.tone} title={status.description}>
            {status.label}
          </StatusBadge>
        ) : null}
      </div>

      <h3 className={`mt-4 font-serif leading-[1.2] tracking-[-0.015em] ${compact ? 'text-[19px]' : 'text-[22px]'}`}>
        {feature.title}
      </h3>
      <p className="mt-2.5 text-[13.5px] leading-[1.66] text-charcoal/72">{feature.summary}</p>

      {href ? (
        <a
          href={href}
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[12.5px] font-medium text-charcoal/75 transition hover:text-charcoal"
        >
          How it works
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </article>
  )
}
