import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

/* Shared surface + heading primitives. */

export function Card({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={`surface ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function Panel({ children, className = '', padded = true, ...rest }) {
  return (
    <section className={`surface-flat ${padded ? 'p-4 sm:p-5' : ''} ${className}`} {...rest}>
      {children}
    </section>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  actionTo,
  actionLabel,
  className = '',
  children,
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow ? <p className="label-xs mb-1.5">{eyebrow}</p> : null}
        {title ? <h2 className="display-md text-ink">{title}</h2> : null}
        {description ? <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {actionTo && actionLabel ? (
          <Link to={actionTo} className="btn btn-secondary btn-sm">
            {actionLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
        {action}
      </div>
    </div>
  )
}

export function Metric({ label, value, hint, tone = 'default', className = '' }) {
  const toneClass =
    tone === 'sky' ? 'text-link' : tone === 'danger' ? 'text-[#8c2f2f]' : tone === 'good' ? 'text-[#375f34]' : 'text-ink'
  return (
    <div className={className}>
      <p className="label-xs">{label}</p>
      <p className={`stat-figure mt-2 ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1.5 text-[11.5px] leading-snug text-soft">{hint}</p> : null}
    </div>
  )
}

export function KeyValue({ items, columns = 2, className = '' }) {
  return (
    <dl className={`grid gap-x-4 gap-y-3 ${columns === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} ${className}`}>
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="label-xs">{item.label}</dt>
          <dd className="mt-1 truncate text-[13px] font-medium text-ink" title={typeof item.value === 'string' ? item.value : undefined}>
            {item.value ?? '—'}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Divider({ className = '' }) {
  return <div className={`h-px w-full bg-[var(--line)] ${className}`} aria-hidden="true" />
}

export function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-soft" /> : null}
      <div className="min-w-0">
        <p className="label-xs">{label}</p>
        <div className="mt-0.5 text-[13px] text-ink">{children}</div>
      </div>
    </div>
  )
}
