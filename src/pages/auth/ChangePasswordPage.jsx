import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { Logo, Wordmark } from '../../components/Icons.jsx'
import { authService } from '../../services/auth.service.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLE_HOME } from '../../lib/navigation.js'
import { FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { passwordStrength, validatePassword } from '../../lib/validation.js'
import { getPolicies } from '../../services/repository.js'

const RULE_LABELS = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'upper', label: 'One uppercase letter' },
  { key: 'number', label: 'One number' },
  { key: 'symbol', label: 'One symbol' },
]

export default function ChangePasswordPage() {
  const { session, refresh, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const forced = Boolean(location.state?.forced || session?.mustChangePassword)

  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  const policy = useMemo(() => getPolicies()?.account, [])
  const strength = passwordStrength(nextPassword)
  const checks = useMemo(
    () => ({
      length: nextPassword.length >= (policy?.passwordMinLength ?? 8),
      upper: /[A-Z]/.test(nextPassword),
      number: /\d/.test(nextPassword),
      symbol: /[^A-Za-z0-9]/.test(nextPassword),
    }),
    [nextPassword, policy],
  )

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }
    if (nextPassword !== confirmPassword) {
      setError('The new passwords do not match.')
      return
    }
    const problem = validatePassword(nextPassword, policy)
    if (problem) {
      setError(problem)
      return
    }
    setPending(true)
    try {
      await authService.changePassword({ currentPassword, nextPassword, confirmPassword })
      refresh()
      /* Return the user to whatever the guard interrupted, otherwise their home. */
      const from = location.state?.from
      const backTo = from && from.startsWith(`/${session?.role}/`) ? from : ROLE_HOME[session?.role] || '/login'
      navigate(backTo, { replace: true })
    } catch (caught) {
      setError(caught?.message || 'The password could not be changed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="sky-canvas flex min-h-screen flex-col">
      <div className="shell flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <Wordmark />
        </Link>
        <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await logout(); navigate('/login') }}>
          Sign out
        </button>
      </div>

      <main className="shell flex flex-1 items-center justify-center pb-16">
        <div className="w-full max-w-[460px] rounded-[24px] border border-white/80 bg-white/92 p-6 shadow-[var(--shadow-md)] backdrop-blur sm:p-8">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sky-100)] text-link">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <h1 className="mt-3 font-serif text-[26px] leading-tight tracking-[-0.02em] text-ink">
            {forced ? 'Set a new password to continue' : 'Change your password'}
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            {forced
              ? 'Your account was issued a temporary credential. Institute policy requires a new password before you can enter the workspace.'
              : 'Choose a password you have not used before. This is a front-end demonstration store.'}
          </p>

          <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
            <div>
              <label className="field-label" htmlFor="current">
                Current password
              </label>
              <input
                id="current"
                type="password"
                autoComplete="current-password"
                className="field-input"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="next">
                New password
              </label>
              <input
                id="next"
                type="password"
                autoComplete="new-password"
                className="field-input"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
              />
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((index) => (
                  <span
                    key={index}
                    className={`h-1 flex-1 rounded-full ${index < strength ? 'bg-[var(--ink)]' : 'bg-[var(--line)]'}`}
                  />
                ))}
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-1">
                {RULE_LABELS.map((rule) => (
                  <li
                    key={rule.key}
                    className={`flex items-center gap-1 text-[10.5px] ${checks[rule.key] ? 'text-[#375f34]' : 'text-soft'}`}
                  >
                    <Check className={`h-3 w-3 ${checks[rule.key] ? 'opacity-100' : 'opacity-30'}`} aria-hidden="true" />
                    {rule.label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className="field-label" htmlFor="confirm">
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                className="field-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <FormError>{error}</FormError>

            <Button type="submit" variant="primary" fullWidth loading={pending} iconRight={ArrowRight}>
              Update password and continue
            </Button>
          </form>

          <p className="mt-4 text-[10.5px] leading-relaxed text-soft">
            Passwords in this build are stored as a non-cryptographic demo hash in localStorage. Production authentication
            must be server-side — see the backend integration notes.
          </p>
        </div>
      </main>
    </div>
  )
}
