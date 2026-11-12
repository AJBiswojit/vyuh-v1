import { Link } from 'react-router-dom'
import { ArrowRight } from '../Icons'

/* ------------------------------------------------------------------
   PageHero — the editorial opening band for an inner page.

   Layout follows the home hero's language (centred editorial headline, mixed
   serif emphasis, restrained lede) but is shorter and left-aligned on desktop
   where the page carries a supporting panel beside it.

   Props
     eyebrow     small uppercase kicker
     title       string | node — use <em className="serif-word"> inside for the
                 mixed serif/sans treatment the brand relies on
     lede        supporting paragraph
     actions     [{ to, label, variant }] | null
     aside       node rendered beside the headline on lg+ (optional)
     breadcrumb  label for the parent section (optional)
     compact     reduce vertical padding (used when a page continues straight
                 into content, e.g. Resources)
------------------------------------------------------------------- */

const ACTION_STYLES = {
  primary:
    'inline-flex items-center gap-2 rounded-full bg-charcoal px-6 py-3 text-[13.5px] font-medium text-white transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-charcoal/90',
  secondary:
    'inline-flex items-center gap-2 rounded-full border border-charcoal/25 bg-white/70 px-6 py-3 text-[13.5px] font-medium text-charcoal transition duration-500 ease-calm hover:-translate-y-[2px] hover:border-charcoal/45 hover:bg-white',
}

export default function PageHero({
  eyebrow,
  title,
  lede,
  actions = [],
  aside = null,
  compact = false,
  align = 'left',
  children,
}) {
  const centred = align === 'center'

  return (
    <section className="hero-sky-page relative overflow-hidden">
      <div
        className={`shell relative z-10 ${compact ? 'pb-9 pt-9 sm:pb-10 sm:pt-11' : 'pb-12 pt-10 sm:pb-14 sm:pt-14 lg:pb-16 lg:pt-16'}`}
      >
        <div className={aside ? 'grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-14' : ''}>
          <div className={`reveal ${centred ? 'mx-auto max-w-[760px] text-center' : 'max-w-[760px]'}`}>
            {eyebrow ? (
              <p className={`eyebrow ${centred ? 'justify-center' : ''}`}>
                <span className="eyebrow-dot" />
                {eyebrow}
              </p>
            ) : null}

            <h1 className="mt-3.5 text-balance text-[32px] leading-[1.1] tracking-[-0.032em] sm:text-[44px] sm:leading-[1.06] lg:text-[52px] lg:leading-[1.04] xl:text-[58px]">
              {title}
            </h1>

            {lede ? (
              <p className="mt-5 max-w-[620px] text-[15.5px] leading-[1.68] text-charcoal/80 sm:text-[17px] lg:mt-6 lg:text-[17.5px]">
                {lede}
              </p>
            ) : null}

            {actions.length ? (
              <div className={`mt-7 flex flex-wrap items-center gap-3 ${centred ? 'justify-center' : ''}`}>
                {actions.map((action) =>
                  action.to.startsWith('/') ? (
                    <Link key={action.label} to={action.to} className={ACTION_STYLES[action.variant || 'primary']}>
                      {action.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <a key={action.label} href={action.to} className={ACTION_STYLES[action.variant || 'primary']}>
                      {action.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  ),
                )}
              </div>
            ) : null}

            {children}
          </div>

          {aside ? <div className="reveal">{aside}</div> : null}
        </div>
      </div>
    </section>
  )
}
