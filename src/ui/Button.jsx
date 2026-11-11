import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  sky: 'btn-sky',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

const SIZES = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
}

/**
 * Button with a loading state. `loading` disables the control and swaps the
 * leading icon for a spinner so asynchronous actions always have feedback.
 */
export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  type = 'button',
  fullWidth = false,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn ${VARIANTS[variant] || VARIANTS.secondary} ${SIZES[size] || ''} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      ) : null}
      {children}
      {IconRight && !loading ? <IconRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
    </button>
  )
}

export function IconButton({ label, icon: Icon, className = '', ...rest }) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
