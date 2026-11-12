import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../Icons'

/* ------------------------------------------------------------------
   CTASection — the closing band shared by every public page.

   Two surfaces:
     'sky'    the atmospheric band, used to close editorial pages
     'cream'  a warmer, quieter close for pages that end on white
     'dark'   a charcoal band, reserved for the admissions close

   Every action is a route or a real tel/mailto link; no CTA on the public site
   is decorative.
------------------------------------------------------------------- */

const SURFACES = {
  sky: 'bg-[#EDF6FB]',
  cream: 'bg-cream/70',
  dark: 'bg-charcoal text-white',
}

export default function CTASection({
  eyebrow,
  title,
  lede,
  actions = [],
  surface = 'sky',
  note = null,
  align = 'center',
  children,
}) {
  const dark = surface === 'dark'
  const centred = align === 'center'

  return (
    <section className={`${SURFACES[surface]} border-t ${dark ? 'border-white/10' : 'border-charcoal/10'}`}>
      <div className="shell py-12 sm:py-14 lg:py-16">
        <div className={`${centred ? 'mx-auto max-w-[720px] text-center' : 'max-w-[720px]'}`}>
          {eyebrow ? (
            <p className={`eyebrow ${centred ? 'justify-center' : ''} ${dark ? 'text-white/60' : ''}`}>
              <span className={`eyebrow-dot ${dark ? 'border-white/45' : ''}`} />
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={`${eyebrow ? 'mt-3.5' : ''} text-[26px] leading-[1.18] tracking-[-0.03em] sm:text-[33px] lg:text-[38px] ${
              dark ? 'text-white' : ''
            }`}
          >
            {title}
          </h2>
          {lede ? (
            <p
              className={`mt-4 text-[14.5px] leading-[1.7] sm:text-[15.5px] ${
                dark ? 'text-white/70' : 'text-charcoal/72'
              } ${centred ? 'mx-auto max-w-[560px]' : 'max-w-[560px]'}`}
            >
              {lede}
            </p>
          ) : null}

          {actions.length ? (
            <div className={`mt-7 flex flex-wrap items-center gap-3 ${centred ? 'justify-center' : ''}`}>
              {actions.map((action) => {
                const base =
                  'inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13.5px] font-medium transition duration-500 ease-calm hover:-translate-y-[2px]'
                const style = action.variant === 'secondary'
                  ? dark
                    ? 'border border-white/25 text-white hover:border-white/45'
                    : 'border border-charcoal/20 bg-white/60 text-charcoal hover:border-charcoal/40 hover:bg-white'
                  : dark
                    ? 'bg-white text-charcoal hover:bg-white/90'
                    : 'bg-charcoal text-white hover:bg-charcoal/90'
                const content = (
                  <>
                    {action.label}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </>
                )
                return action.to.startsWith('/') ? (
                  <Link key={action.label} to={action.to} className={`${base} ${style}`}>
                    {content}
                  </Link>
                ) : (
                  <a key={action.label} href={action.to} className={`${base} ${style}`}>
                    {content}
                  </a>
                )
              })}
            </div>
          ) : null}

          {note ? (
            <p className={`mt-5 text-[11.5px] leading-[1.6] ${dark ? 'text-white/50' : 'text-charcoal/50'}`}>
              {note}
            </p>
          ) : null}

          {children}
        </div>
      </div>
    </section>
  )
}
