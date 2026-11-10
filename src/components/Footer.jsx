import { Link } from 'react-router-dom'
import { Logo, Wordmark } from './Icons'
import { FOOTER_LINKS } from '../content'

export default function Footer() {
  return (
    <footer className="wash-cream">
      <div className="shell">
        <div className="flex flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:py-8">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <Wordmark />
            <span className="sr-only">Vyuh home</span>
          </Link>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-[13.5px] text-charcoal/75 transition duration-300 ease-calm hover:text-charcoal"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
