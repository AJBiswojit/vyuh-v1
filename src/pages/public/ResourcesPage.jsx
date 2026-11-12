import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Info, Search, X, RotateCcw } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import PageHero from '../../components/public/PageHero'
import ResourceCard from '../../components/public/ResourceCard'
import CTASection from '../../components/public/CTASection'
import StatusBadge from '../../components/public/StatusBadge'
import useReveal from '../../hooks/useReveal'
import {
  RESOURCES,
  RESOURCE_CATEGORIES,
  EXAM_FILTERS,
  resourceCounts,
} from '../../data/site/resources'
import { CTA_LINKS } from '../../data/site/navigation'

/* ------------------------------------------------------------------
   RESOURCES — the Knowledge Hub.

   Filters are held in the URL (?q=&category=&exam=) so a filtered view is
   linkable, survives a refresh and works with the browser back button — the
   brief asks for direct URL access on every route.

   Search covers title, summary, source, subject and category label. Category is a
   single select (six categories); examination is a single select too, because
   multi-select without a visible count confuses more than it helps on a card grid.
------------------------------------------------------------------- */

const EXAM_LABEL = Object.fromEntries(EXAM_FILTERS.map((exam) => [exam.id, exam.label]))
const CATEGORY_LABEL = Object.fromEntries(RESOURCE_CATEGORIES.map((category) => [category.id, category.label]))

function examLabelsFor(resource) {
  if (!resource.exams || resource.exams.includes('all')) return []
  return resource.exams.map((id) => EXAM_LABEL[id]).filter(Boolean)
}

export default function ResourcesPage() {
  const revealRef = useReveal('resources')
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  const category = searchParams.get('category') || 'all'
  const exam = searchParams.get('exam') || 'all'
  const urlQuery = searchParams.get('q') || ''

  /* The URL is the source of truth (back button, a footer link, Reset). If it
     changes to something the input no longer reflects, adopt it during render —
     React's documented alternative to a syncing effect, and it avoids a frame
     where the box and the results disagree. */
  const [adoptedQuery, setAdoptedQuery] = useState(urlQuery)
  if (adoptedQuery !== urlQuery) {
    setAdoptedQuery(urlQuery)
    if (urlQuery !== query.trim()) setQuery(urlQuery)
  }

  const counts = useMemo(() => resourceCounts(), [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return RESOURCES.filter((resource) => {
      if (category !== 'all' && resource.category !== category) return false
      if (exam !== 'all' && !(resource.exams || []).includes(exam) && !(resource.exams || []).includes('all')) {
        return false
      }
      if (!needle) return true
      const haystack = [
        resource.title,
        resource.summary,
        resource.source,
        resource.format,
        CATEGORY_LABEL[resource.category] || '',
        ...(resource.subjects || []),
        ...examLabelsFor(resource),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [query, category, exam])

  /* Debounce the URL write so typing does not push a history entry per
     keystroke. Only `q` is touched here; category and exam keep whatever the
     URL currently holds, which is what makes the filter handlers safe too. */
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === urlQuery) return undefined
    const timer = window.setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (trimmed) next.set('q', trimmed)
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, 320)
    return () => window.clearTimeout(timer)
  }, [query, urlQuery, setSearchParams])

  /* Updater form: React Router hands us the params *at the moment of the
     transition*, so a filter change can never be built from a stale snapshot
     and wipe the search term (or vice versa). */
  const setFilter = (key, value) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === 'all') next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const reset = () => {
    setQuery('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const activeFilterCount = (query.trim() ? 1 : 0) + (category !== 'all' ? 1 : 0) + (exam !== 'all' ? 1 : 0)

  return (
    <PublicLayout metaKey="resources">
      <div ref={revealRef}>
        <PageHero
          eyebrow="Knowledge hub"
          title={
            <>
              Resources for <span className="serif-word">serious</span> preparation
            </>
          }
          lede="Study materials, previous year questions, preparation guides, examination updates and academic articles from the Vyuh teaching team. Every card states exactly what it is — a real file you can open, an article you can read here, or a resource still being prepared."
          compact
        />

        {/* --------------------------- honest summary ---------------------- */}
        <section className="bg-white">
          <div className="shell py-8 sm:py-9">
            <div className="reveal flex flex-col gap-4 rounded-[22px] border border-charcoal/10 bg-cream/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2.5 text-[12.5px] leading-[1.65] text-charcoal/70">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-charcoal/45" aria-hidden="true" />
                <span>
                  <span className="font-medium text-charcoal">{counts.total} resources</span> —{' '}
                  {counts.media} open a real file from this repository, {counts.article} are readable
                  here, and {counts.pending} are marked in preparation. Nothing on this page links to
                  a document that does not exist.
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge tone="good">{counts.media} files</StatusBadge>
                <StatusBadge tone="sky">{counts.article} articles</StatusBadge>
                <StatusBadge tone="outline">{counts.pending} pending</StatusBadge>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------ filters -------------------------- */}
        <section className="sticky top-[74px] z-20 border-y border-charcoal/10 bg-white/95 backdrop-blur-[10px]">
          <div className="shell py-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-[360px]">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35"
                  aria-hidden="true"
                />
                <label htmlFor="resource-search" className="sr-only">
                  Search resources
                </label>
                <input
                  id="resource-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search titles, subjects and topics…"
                  className="public-field !py-2.5 !pl-10 !pr-9 !text-[13px]"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Clear search</span>
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div>
                  <label htmlFor="resource-category" className="sr-only">
                    Filter by category
                  </label>
                  <select
                    id="resource-category"
                    value={category}
                    onChange={(event) => setFilter('category', event.target.value)}
                    className="public-select !w-auto !py-2 !text-[12.5px]"
                  >
                    <option value="all">All categories</option>
                    {RESOURCE_CATEGORIES.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="resource-exam" className="sr-only">
                    Filter by examination
                  </label>
                  <select
                    id="resource-exam"
                    value={exam}
                    onChange={(event) => setFilter('exam', event.target.value)}
                    className="public-select !w-auto !py-2 !text-[12.5px]"
                  >
                    <option value="all">All examinations</option>
                    {EXAM_FILTERS.filter((entry) => entry.id !== 'all').map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </div>
                {activeFilterCount ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/20 px-3 py-2 text-[12px] text-charcoal/70 transition hover:border-charcoal/40 hover:text-charcoal"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset ({activeFilterCount})
                  </button>
                ) : null}
              </div>
            </div>

            {/* category chips — the same filter, one tap away on mobile.
                The scroller is clipped by a wrapper so its content width can
                never extend the document (it did at <=430px). */}
            <div className="mt-3 overflow-hidden">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setFilter('category', 'all')}
                  aria-pressed={category === 'all'}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
                    category === 'all'
                      ? 'border-charcoal bg-charcoal text-white'
                      : 'border-charcoal/15 text-charcoal/65 hover:border-charcoal/30'
                  }`}
                >
                  All
                </button>
                {RESOURCE_CATEGORIES.map((entry) => {
                  const active = category === entry.id
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setFilter('category', entry.id)}
                      aria-pressed={active}
                      title={entry.description}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] transition ${
                        active
                          ? 'border-charcoal bg-charcoal text-white'
                          : 'border-charcoal/15 text-charcoal/65 hover:border-charcoal/30'
                      }`}
                    >
                      {entry.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------- results ------------------------- */}
        <section className="bg-white" aria-live="polite" aria-busy="false">
          <div className="shell py-9 sm:py-11">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-medium tracking-[-0.01em]">
                {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
                {category !== 'all' ? <span className="text-charcoal/50"> · {CATEGORY_LABEL[category]}</span> : null}
                {exam !== 'all' ? <span className="text-charcoal/50"> · {EXAM_LABEL[exam]}</span> : null}
              </h2>
              {query ? (
                <p className="text-[11.5px] text-charcoal/50">
                  Matching “{query.trim()}” — searching titles, subjects, sources and categories.
                </p>
              ) : null}
            </div>

            {filtered.length ? (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((resource) => (
                  <li key={resource.id} className="reveal">
                    <ResourceCard resource={resource} examLabels={examLabelsFor(resource)} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 rounded-[22px] border border-dashed border-charcoal/20 bg-cream/20 px-6 py-14 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-charcoal/12 bg-white">
                  <Search className="h-5 w-5 text-charcoal/35" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-serif text-[22px] leading-tight tracking-[-0.015em]">
                  Nothing matches these filters yet
                </h3>
                <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-[1.7] text-charcoal/65">
                  The Knowledge Hub is being filled in categories. Try a wider search, or reset the
                  filters to see everything that is currently published.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-charcoal/90"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset filters
                  </button>
                  <Link
                    to="/contact?topic=website"
                    className="text-[12.5px] text-charcoal/65 underline-offset-4 hover:text-charcoal hover:underline"
                  >
                    Request a resource
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------- categories -------------------------- */}
        <section className="wash-cream border-t border-charcoal/8">
          <div className="shell py-12 sm:py-14 lg:py-16">
            <h2 className="text-[22px] leading-[1.25] tracking-[-0.022em] sm:text-[26px]">
              Six <span className="serif-word">categories</span>
            </h2>
            <p className="mt-2.5 max-w-[600px] text-[13.5px] leading-[1.7] text-charcoal/68">
              Each category has its own filter above. Categories still being filled show what is
              coming rather than a broken link.
            </p>

            <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {RESOURCE_CATEGORIES.map((entry) => {
                const inCategory = RESOURCES.filter((resource) => resource.category === entry.id)
                const ready = inCategory.filter((resource) => resource.kind !== 'pending').length
                return (
                  <li key={entry.id} className="reveal">
                    <button
                      type="button"
                      onClick={() => {
                        setFilter('category', entry.id)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="public-card public-card-lift flex h-full w-full flex-col p-5 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[14.5px] font-medium leading-[1.35]">{entry.label}</h3>
                        <span className="shrink-0 rounded-full border border-charcoal/12 px-2 py-0.5 text-[10.5px] text-charcoal/50">
                          {inCategory.length}
                        </span>
                      </div>
                      <p className="mt-2 text-[12.5px] leading-[1.65] text-charcoal/65">{entry.description}</p>
                      <p className="mt-auto pt-3 text-[11px] text-charcoal/45">
                        {ready ? `${ready} available now` : 'In preparation'}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <CTASection
          eyebrow="Missing something?"
          title={
            <>
              Ask the <span className="serif-word">academic</span> team
            </>
          }
          lede="If a resource you need is not here, the admissions and academic office can tell you whether it exists and when it will be published. Enrolled students also receive class materials through their workspace."
          actions={[
            { to: CTA_LINKS.contact.to, label: 'Contact the institute' },
            { to: CTA_LINKS.learning.to, label: CTA_LINKS.learning.label, variant: 'secondary' },
          ]}
        />
      </div>
    </PublicLayout>
  )
}
