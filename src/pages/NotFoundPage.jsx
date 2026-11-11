import { Link } from 'react-router-dom'
import { Logo, Wordmark } from '../components/Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { ROLE_HOME } from '../lib/navigation.js'

export default function NotFoundPage() {
  const { isAuthenticated, session } = useAuth()
  return (
    <div className="sky-canvas flex min-h-screen flex-col">
      <div className="shell flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <Wordmark />
        </Link>
      </div>
      <main className="shell flex flex-1 items-center justify-center pb-16">
        <div className="w-full max-w-[460px] rounded-[24px] border border-white/80 bg-white/92 p-7 text-center shadow-[var(--shadow-md)]">
          <p className="label-xs">404</p>
          <h1 className="mt-2 font-serif text-[28px] leading-tight tracking-[-0.02em] text-ink">Page not found</h1>
          <p className="mx-auto mt-2 max-w-[340px] text-[12.5px] leading-relaxed text-muted">
            The page you are looking for does not exist in Vyuh. It may have moved, or the address may be mistyped.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link to={isAuthenticated ? ROLE_HOME[session.role] : '/login'} className="btn btn-primary btn-sm">
              {isAuthenticated ? 'Open my workspace' : 'Sign in'}
            </Link>
            <Link to="/" className="btn btn-secondary btn-sm">
              Public site
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
