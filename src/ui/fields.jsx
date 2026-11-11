import { useId } from 'react'
import { AlertCircle, Check } from 'lucide-react'

/* Accessible form fields wired to the shared validator. */

export function Field({ label, hint, error, required, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-1 text-[var(--bad-700)]">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="field-error flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextInput({ label, error, hint, required, className = '', id, ...rest }) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>
      <input
        id={fieldId}
        className="field-input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...rest}
      />
    </Field>
  )
}

export function TextArea({ label, error, hint, required, className = '', id, rows = 4, ...rest }) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>
      <textarea
        id={fieldId}
        rows={rows}
        className="field-textarea"
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
    </Field>
  )
}

export function Select({ label, error, hint, required, options, className = '', id, children, ...rest }) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>
      <select id={fieldId} className="field-select" aria-invalid={error ? 'true' : undefined} {...rest}>
        {children ||
          (options || []).map((option) => {
            const value = typeof option === 'string' ? option : option.value
            const text = typeof option === 'string' ? option : option.label
            return (
              <option key={value} value={value}>
                {text}
              </option>
            )
          })}
      </select>
    </Field>
  )
}

export function Checkbox({ label, description, className = '', id, ...rest }) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <label htmlFor={fieldId} className={`checkbox-row ${className}`}>
      <input id={fieldId} type="checkbox" {...rest} />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{description}</span> : null}
      </span>
    </label>
  )
}

export function Radio({ label, name, value, checked, onChange, disabled, description }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-[12.5px] transition ${
        checked
          ? 'border-[var(--ink)] bg-[var(--sky-50)]'
          : 'border-[var(--line)] bg-white hover:border-[var(--line-strong)]'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-3.5 w-3.5 accent-[var(--ink)]"
      />
      <span className="min-w-0">
        <span className="block font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{description}</span> : null}
      </span>
    </label>
  )
}

export function Toggle({ label, description, checked, onChange, disabled, id }) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={fieldId} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{description}</p> : null}
      </div>
      <button
        id={fieldId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full border transition ${
          checked ? 'border-[var(--sky-700)] bg-[var(--sky-700)]' : 'border-[var(--line-strong)] bg-[var(--surface-sunken)]'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white transition-all ${
            checked ? 'left-[19px]' : 'left-[2px]'
          }`}
        />
      </button>
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '', label = 'Search' }) {
  return (
    <div className={`relative ${className}`}>
      <label className="sr-only" htmlFor={`search-${label.replace(/\s+/g, '-').toLowerCase()}`}>
        {label}
      </label>
      <input
        id={`search-${label.replace(/\s+/g, '-').toLowerCase()}`}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input pl-9"
      />
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export function FormError({ children }) {
  if (!children) return null
  return (
    <div className="flex items-start gap-2 rounded-[10px] border border-[var(--bad-300)] bg-[var(--bad-50)] px-3 py-2.5 text-[12px] text-[var(--bad-700)]">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function FormSuccess({ children }) {
  if (!children) return null
  return (
    <div className="flex items-start gap-2 rounded-[10px] border border-[var(--good-300)] bg-[var(--good-50)] px-3 py-2.5 text-[12px] text-[var(--good-800)]">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

/** Checkbox group used for multi-select lists (batches, subjects, questions). */
export function CheckboxGroup({ options, value = [], onChange, columns = 2, emptyLabel = 'Nothing available' }) {
  if (!options.length) {
    return <p className="rounded-[10px] border border-dashed border-[var(--line-strong)] px-3 py-3 text-[12px] text-soft">{emptyLabel}</p>
  }
  return (
    <div className={`grid gap-2 ${columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : ''}`}>
      {options.map((option) => {
        const checked = value.includes(option.value)
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-2 rounded-[10px] border px-3 py-2 text-[12.5px] transition ${
              checked ? 'border-[var(--ink)] bg-[var(--sky-50)]' : 'border-[var(--line)] hover:border-[var(--line-strong)]'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                onChange(checked ? value.filter((entry) => entry !== option.value) : [...value, option.value])
              }
              className="mt-0.5 h-3.5 w-3.5 accent-[var(--ink)]"
            />
            <span className="min-w-0">
              <span className="block font-medium leading-snug text-ink">{option.label}</span>
              {option.description ? <span className="block text-[11px] leading-snug text-muted">{option.description}</span> : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}
