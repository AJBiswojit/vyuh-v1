/* ------------------------------------------------------------------
   StatusBadge — the honest-labelling primitive used wherever the public site
   must distinguish a working capability from a demonstration or a placeholder.

   Tones are drawn from the locked palette only: cream/charcoal for neutral
   notes, white/sky for informational, and a muted sky-grey for the "pending"
   state so nothing on the public site reads as a warning banner.
------------------------------------------------------------------- */

const TONES = {
  good: 'border-charcoal/15 bg-charcoal text-white',
  warn: 'border-charcoal/15 bg-cream text-charcoal/85',
  neutral: 'border-charcoal/15 bg-white text-charcoal/70',
  sky: 'border-charcoal/12 bg-[#EAF4FA] text-charcoal/80',
  outline: 'border-charcoal/20 bg-transparent text-charcoal/65',
}

export default function StatusBadge({ tone = 'neutral', children, dot = false, className = '', title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-medium uppercase leading-none tracking-[0.12em] ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

/* Small legend shared by the Learning Experience and Resources pages so the same
   three words mean the same thing everywhere. */
export function StatusLegend({ items, className = '' }) {
  return (
    <dl className={`grid gap-3 sm:grid-cols-3 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-charcoal/10 bg-white/80 p-4">
          <dt>
            <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
          </dt>
          <dd className="mt-2 text-[12px] leading-[1.6] text-charcoal/65">{item.description}</dd>
        </div>
      ))}
    </dl>
  )
}
