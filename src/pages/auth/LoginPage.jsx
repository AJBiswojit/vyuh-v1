import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, GraduationCap, Eye, EyeOff, ShieldCheck, Sparkles, Info } from 'lucide-react'
import { Logo, Wordmark } from '../../components/Icons.jsx'
import { authService, destinationFor } from '../../services/auth.service.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'

const ROLE_CARDS = [
  {
    role: 'student',
    title: 'Student',
    body: 'Examinations, live classes, recordings and question-level analysis.',
    icon: GraduationCap,
  },
  {
    role: 'faculty',
    title: 'Faculty',
    body: 'Question bank, papers, teaching studio, item analysis and doubts.',
    icon: Sparkles,
  },
  {
    role: 'admin',
    title: 'Institute Admin',
    body: 'Accounts, batches, approvals, policies, integrity and reporting.',
    icon: ShieldCheck,
  },
]

export default function LoginPage() {
  const { login, isAuthenticated, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const [demoAccounts, setDemoAccounts] = useState([])
  /* Open by default: the credential panel is the first thing a reviewer needs,
     and a collapsed accordion reads as "the section is missing". */
  const [showDemo, setShowDemo] = useState(true)

  /* Demo credentials are shown in the deployed build as well as locally.

     Vyuh signs in against a seeded mock service layer, so these are the demo
     records from src/data/mock/users.mock.js — not real accounts — and exposing
     them is the documented behaviour of this demonstration. They are *always*
     read from the seeded store via authService.getDemoAccounts(), never
     hard-coded here.

     `VITE_SHOW_DEMO_ACCOUNTS=false` hides the panel (for a build pointed at a
     real backend); it defaults to visible so the deployed preview and local
     development behave identically. */
  const showDemoAccounts = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false'

  /* Nobody who is already signed in should be looking at a sign-in form —
     but this effect is deliberately NOT allowed to fight with submit(): while a
     sign-in is in flight the form owns navigation, otherwise both handlers
     navigated at once and the loser overwrote the deep link. */
  useEffect(() => {
    if (pending || !isAuthenticated || !session) return
    const target = destinationFor(session, location.state?.from)
    navigate(target.to, { replace: true, state: target.state })
  }, [isAuthenticated, session, pending, location.state, navigate])

  useEffect(() => {
    if (!showDemoAccounts) return
    authService.getDemoAccounts().then(setDemoAccounts).catch(() => setDemoAccounts([]))
  }, [showDemoAccounts])

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter both your institute email and password.')
      return
    }
    setPending(true)
    try {
      const result = await login({ email, password })
      /* Result carries the authoritative destination (role home or the forced
         password change) and honours a deep link when it belongs to this role. */
      const target = destinationFor(result, location.state?.from)
      setPending(false)
      navigate(target.to, { replace: true, state: target.state })
      return
    } catch (caught) {
      setError(caught?.message || 'Sign-in failed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const fillDemoAccount = (account) => {
    setEmail(account.email)
    setPassword(authService.demoPassword())
    setError(null)
    setShowDemo(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* editorial panel */}
        <div className="relative hidden overflow-hidden bg-[var(--cream-200)] lg:flex lg:flex-col lg:justify-between">
          <div className="grain absolute inset-0" aria-hidden="true" />
          <div className="relative flex items-center gap-3 px-10 pt-9">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo className="h-9 w-9" />
              <Wordmark />
            </Link>
            <span className="ml-2 rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-60">
              Academic ecosystem
            </span>
          </div>

          <div className="relative px-10 pb-6">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <p className="label-xs">Vyuh Academy · Bhubaneswar</p>
              <h1 className="mt-3 font-serif text-[clamp(34px,3.6vw,52px)] leading-[1.02] tracking-[-0.03em] text-ink">
                One academic
                <br />
                ecosystem.
                <br />
                <span className="text-ink-60">Three workspaces.</span>
              </h1>
              <p className="mt-5 max-w-[420px] text-[13px] leading-relaxed text-ink-70">
                Students, faculty and administration working on the same academic records — examinations,
                live classrooms, attendance and analysis.
              </p>
            </motion.div>

            <div className="mt-8 grid gap-2.5 sm:grid-cols-3">
              {ROLE_CARDS.map((card, index) => {
                const Icon = card.icon
                return (
                  <motion.div
                    key={card.role}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.07, duration: 0.45 }}
                    className="rounded-[16px] border border-white/70 bg-white/55 p-3.5 backdrop-blur-[2px]"
                  >
                    <Icon className="h-4 w-4 text-ink" aria-hidden="true" />
                    <p className="mt-2 text-[12.5px] font-medium text-ink">{card.title}</p>
                    <p className="mt-1 text-[11px] leading-snug text-ink-60">{card.body}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-between border-t border-[var(--line)] px-10 py-4 text-[10.5px] text-ink-60">
            <span>Frontend demonstration · mock credentials only</span>
            <Link to="/" className="hover:text-ink">
              vyuhacademy.edu.in
            </Link>
          </div>
        </div>

        {/* form panel */}
        <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
          <div className="mx-auto w-full max-w-[400px]">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <Logo className="h-9 w-9" />
                <Wordmark />
              </Link>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="font-serif text-[30px] leading-tight tracking-[-0.02em] text-ink">Sign in</h2>
              <p className="mt-1.5 text-[12.5px] text-muted">
                Use your institute-issued account. There is no public registration.
              </p>

              <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
                <div>
                  <label className="field-label" htmlFor="email">
                    Institute email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="field-input"
                    placeholder="name@vyuhacademy.edu.in"
                    aria-invalid={Boolean(error) && !email.trim() ? 'true' : undefined}
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label className="field-label" htmlFor="password">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-[11px] text-link hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="field-input pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-soft hover:text-ink"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <FormError>{error}</FormError>

                <Button type="submit" variant="primary" size="lg" fullWidth loading={pending} iconRight={ArrowRight}>
                  {pending ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              {showDemoAccounts ? (
                <div className="mt-6 rounded-[14px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-muted)] p-3.5">
                  <button
                    type="button"
                    onClick={() => setShowDemo((value) => !value)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                    aria-expanded={showDemo}
                  >
                    <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
                      <Info className="h-3.5 w-3.5" aria-hidden="true" />
                      Demo accounts
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-soft">{showDemo ? 'Hide' : 'Show'}</span>
                  </button>
                  {showDemo ? (
                    <div className="mt-2.5 space-y-1.5">
                      <p className="text-[10.5px] leading-snug text-muted">
                        These are seeded demonstration records, not real accounts, and Vyuh signs in against a local mock
                        service layer. Pick a role to fill its credentials, then sign in.
                      </p>
                      {demoAccounts.map((account) => (
                        <button
                          key={account.role}
                          type="button"
                          onClick={() => fillDemoAccount(account)}
                          className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-[var(--line)] bg-white px-2.5 py-2 text-left transition hover:border-[var(--line-strong)]"
                        >
                          <span className="min-w-0">
                            <span className="block text-[11.5px] font-medium text-ink">{account.label} · {account.name}</span>
                            <span className="block truncate text-[10px] text-soft">{account.email}</span>
                          </span>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-link">Use</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <p className="mt-6 text-[11px] leading-relaxed text-soft">
                Accounts are provisioned by the institute administrator. If your account is inactive or locked, contact the
                administration office — recovery is admin-controlled in this demonstration.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
