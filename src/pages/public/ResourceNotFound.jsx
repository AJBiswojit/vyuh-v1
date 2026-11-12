import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import { RESOURCES } from '../../data/site/resources'

/* ------------------------------------------------------------------
   A resource id that does not exist must not fall through to the workspace 404
   (which shows workspace navigation). It stays inside the public shell.
------------------------------------------------------------------- */

export default function ResourceNotFound() {
  return (
    <PublicLayout metaKey="resources">
      <section className="hero-sky-page">
        <div className="shell py-16 sm:py-20">
          <div className="mx-auto max-w-[560px] rounded-[26px] border border-white/70 bg-white/85 p-8 text-center backdrop-blur sm:p-10">
            <p className="eyebrow justify-center">
              <span className="eyebrow-dot" />
              Knowledge hub
            </p>
            <h1 className="mt-3 font-serif text-[28px] leading-tight tracking-[-0.02em] sm:text-[32px]">
              That resource does not exist
            </h1>
            <p className="mx-auto mt-3 max-w-[400px] text-[13.5px] leading-[1.7] text-charcoal/70">
              The link may be mistyped, or the resource may have been renamed. Everything currently
              published is listed in the Knowledge Hub.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <Link
                to="/resources"
                className="inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-charcoal/90"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to the Knowledge Hub
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center rounded-full border border-charcoal/20 bg-white/70 px-5 py-2.5 text-[13px] font-medium text-charcoal transition hover:border-charcoal/40"
              >
                Contact the institute
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-8 max-w-[560px]">
            <p className="text-center text-[11px] uppercase tracking-[0.14em] text-charcoal/40">
              {RESOURCES.length} published resources
            </p>
            <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
              {RESOURCES.slice(0, 6).map((resource) => (
                <li key={resource.id}>
                  <Link
                    to={`/resources/${resource.id}`}
                    className="inline-flex rounded-full border border-charcoal/15 bg-white/70 px-3 py-1.5 text-[11.5px] text-charcoal/65 transition hover:border-charcoal/35 hover:text-charcoal"
                  >
                    {resource.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
