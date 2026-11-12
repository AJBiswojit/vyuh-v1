import { Link } from 'react-router-dom'
import { Logo, Wordmark, ArrowUpRight } from '../Icons'
import { FOOTER_COLUMNS, FOOTER_LEGAL } from '../../data/site/navigation'
import { INSTITUTE_IDENTITY, CONTACT_FIELDS, mapSearchUrl } from '../../data/site/institute'

const CURRENT_YEAR = new Date().getFullYear()

/* ------------------------------------------------------------------
   The single public footer, shared by all seven pages.

   Structure: identity block with the institute description and contact record,
   four link columns, then a legal strip. Nothing here is a placeholder anchor —
   every target is a real route or a real mailto/tel/map link.
------------------------------------------------------------------- */

export default function PublicFooter({ variant = 'cream' }) {
  return (
    <footer className={variant === 'cream' ? 'wash-cream' : 'bg-white'}>
      <div className="shell pb-8 pt-12 sm:pb-9 sm:pt-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2.6fr)] lg:gap-14">
          {/* identity */}
          <div>
            <Link to="/" className="flex items-center gap-3">
              <Logo className="h-10 w-10" />
              <Wordmark />
              <span className="sr-only">Vyuh home</span>
            </Link>
            <p className="mt-4 max-w-[330px] text-[13.5px] leading-[1.7] text-charcoal/70">
              {INSTITUTE_IDENTITY.name} is an academic institute for JEE, NEET UG and Foundation
              preparation — teaching concepts first and examining students the way the real paper
              does.
            </p>

            <dl className="mt-6 grid gap-3 text-[13px]">
              <div className="flex gap-2.5">
                <dt className="sr-only">Campus address</dt>
                <dd className="max-w-[300px] leading-[1.6] text-charcoal/70">
                  {CONTACT_FIELDS.address.value}
                  <span className="mt-1 block text-[11.5px] text-charcoal/50">
                    Address pending public confirmation
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <dt className="sr-only">Telephone</dt>
                <dd>
                  <a
                    href={`tel:${CONTACT_FIELDS.phone.value.replace(/[^\d+]/g, '')}`}
                    className="text-charcoal/75 underline-offset-4 transition hover:text-charcoal hover:underline"
                  >
                    {CONTACT_FIELDS.phone.value}
                  </a>
                </dd>
                <dt className="sr-only">Email</dt>
                <dd>
                  <a
                    href={`mailto:${CONTACT_FIELDS.admissionsEmail.value}`}
                    className="text-charcoal/75 underline-offset-4 transition hover:text-charcoal hover:underline"
                  >
                    {CONTACT_FIELDS.admissionsEmail.value}
                  </a>
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-[13px] font-medium text-white transition duration-500 ease-calm hover:-translate-y-[1px] hover:bg-charcoal/90"
              >
                Log in to your workspace
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href={mapSearchUrl()}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/15 px-4 py-2.5 text-[12.5px] text-charcoal/80 transition hover:border-charcoal/35 hover:text-charcoal"
              >
                Open in Maps
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* link columns */}
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="text-[10px] font-medium uppercase tracking-[0.16em] text-charcoal/50">
                  {column.title}
                </h2>
                <ul className="mt-3.5 grid gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-[13px] leading-[1.5] text-charcoal/75 transition duration-300 ease-calm hover:text-charcoal"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-11 flex flex-col gap-4 border-t border-charcoal/12 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] leading-[1.6] text-charcoal/55">
            © {CURRENT_YEAR} {INSTITUTE_IDENTITY.name}. Academic year{' '}
            {INSTITUTE_IDENTITY.academicYear}. This site is a frontend demonstration — forms store
            data in your browser only.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {FOOTER_LEGAL.map((link) => (
              <li key={link.label}>
                <Link
                  to={link.to}
                  className="text-[11.5px] text-charcoal/60 underline-offset-4 transition hover:text-charcoal hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
