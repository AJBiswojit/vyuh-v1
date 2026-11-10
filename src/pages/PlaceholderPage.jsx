import { Link, useNavigate } from 'react-router-dom'
import { Logo, Wordmark, ArrowRight } from '../components/Icons'

/* Real destination for the marketing navigation links so no control on the
   landing page is a dead end. The landing page itself stays untouched. */
export default function PlaceholderPage({ title, description, actionLabel = 'Back to home' }) {
  const navigate = useNavigate()

  return (
    <div className="sky-canvas flex min-h-screen flex-col">
      <div className="shell flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <Wordmark />
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/80 px-5 py-2 text-[13px] font-medium"
        >
          Home
        </Link>
      </div>

      <main className="shell flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-[520px] rounded-[26px] border border-white/70 bg-white/85 p-8 text-center backdrop-blur sm:p-10">
          <h1 className="font-serif text-[30px] leading-tight sm:text-[34px]">{title}</h1>
          <p className="mx-auto mt-4 max-w-[380px] text-[13.5px] leading-[1.7] text-charcoal/70">
            {description}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => navigate('/')} className="ghost-btn">
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a href="mailto:hello@vyuh.in" className="ghost-btn">
              hello@vyuh.in
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
