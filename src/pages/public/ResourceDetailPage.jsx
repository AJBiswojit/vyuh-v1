import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Download, ExternalLink, Info, Clock } from 'lucide-react'
import PublicLayout from '../../components/public/PublicLayout'
import CTASection from '../../components/public/CTASection'
import StatusBadge from '../../components/public/StatusBadge'
import useReveal from '../../hooks/useReveal'
import NotPublished from './ResourceNotFound'
import {
  findResource,
  RESOURCES,
  RESOURCE_CATEGORIES,
  RESOURCE_KIND_LABELS,
  EXAM_FILTERS,
} from '../../data/site/resources'

/* ------------------------------------------------------------------
   RESOURCE DETAIL — /resources/:id

   Renders one record according to `kind`:
     article  → the written content, section by section
     media    → the real file in public/media, opened or downloaded, plus the
                deck gallery when the record carries one
     pending  → an explicit "not published" panel with a request route
   Unknown ids render a proper not-found state inside the public shell.
------------------------------------------------------------------- */

const CATEGORY_LABEL = Object.fromEntries(RESOURCE_CATEGORIES.map((category) => [category.id, category.label]))
const EXAM_LABEL = Object.fromEntries(EXAM_FILTERS.map((exam) => [exam.id, exam.label]))

function renderBlock(block, index) {
  if (block.type === 'h2') {
    return (
      <h2 key={index} className="mt-8 font-serif text-[22px] leading-[1.25] tracking-[-0.015em] first:mt-0 sm:text-[25px]">
        {block.text}
      </h2>
    )
  }
  if (block.type === 'h3') {
    return (
      <h3 key={index} className="mt-6 font-serif text-[18px] leading-[1.3] tracking-[-0.01em]">
        {block.text}
      </h3>
    )
  }
  if (block.type === 'p') {
    return (
      <p key={index} className="text-[15px] leading-[1.8] text-charcoal/80 sm:text-[15.5px]">
        {block.text}
      </p>
    )
  }
  if (block.type === 'list') {
    return (
      <ul key={index} className="grid gap-2.5">
        {block.items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[14.5px] leading-[1.75] text-charcoal/78">
            <span className="mt-[10px] h-1 w-1 shrink-0 rounded-full bg-charcoal/40" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    )
  }
  if (block.type === 'table') {
    return (
      <div key={index} className="overflow-x-auto rounded-xl border border-charcoal/10">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="bg-cream/45">
              {block.head.map((cell) => (
                <th key={cell} scope="col" className="px-3.5 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-charcoal/55">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join('|')} className="border-t border-charcoal/8">
                {row.map((cell) => (
                  <td key={cell} className="px-3.5 py-2.5 text-charcoal/75">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return null
}

export default function ResourceDetailPage() {
  const { resourceId } = useParams()
  const resource = findResource(resourceId)
  const revealRef = useReveal(resourceId)

  if (!resource) {
    return <NotPublished />
  }

  const related = RESOURCES.filter(
    (entry) => entry.id !== resource.id && (entry.category === resource.category || entry.kind === resource.kind),
  ).slice(0, 3)

  const examLabels = (resource.exams || [])
    .filter((id) => id !== 'all')
    .map((id) => EXAM_LABEL[id])
    .filter(Boolean)

  return (
    <PublicLayout metaKey="resources">
      <div ref={revealRef}>
        <div className="border-b border-charcoal/8 bg-[#F7FAFC]">
          <div className="shell py-7 sm:py-8">
            <Link
              to="/resources"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-charcoal/60 transition hover:text-charcoal"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Knowledge Hub
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge tone={resource.kind === 'pending' ? 'outline' : resource.kind === 'media' ? 'good' : 'sky'}>
                {RESOURCE_KIND_LABELS[resource.kind]}
              </StatusBadge>
              <span className="text-[11px] uppercase tracking-[0.12em] text-charcoal/45">
                {CATEGORY_LABEL[resource.category]}
              </span>
              <span className="text-charcoal/20" aria-hidden="true">
                ·
              </span>
              <span className="text-[11px] text-charcoal/50">{resource.format}</span>
            </div>

            <h1 className="mt-3 max-w-[820px] font-serif text-[28px] leading-[1.15] tracking-[-0.028em] sm:text-[38px] lg:text-[44px]">
              {resource.title}
            </h1>
            <p className="mt-3 max-w-[680px] text-[14.5px] leading-[1.7] text-charcoal/72">{resource.summary}</p>

            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[11.5px] text-charcoal/55">
              <div className="flex gap-1.5">
                <dt className="text-charcoal/40">Source</dt>
                <dd>{resource.source}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-charcoal/40">Updated</dt>
                <dd>
                  {new Date(resource.updatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              {examLabels.length ? (
                <div className="flex gap-1.5">
                  <dt className="text-charcoal/40">For</dt>
                  <dd>{examLabels.join(' · ')}</dd>
                </div>
              ) : null}
              {resource.subjects?.length ? (
                <div className="flex gap-1.5">
                  <dt className="text-charcoal/40">Subject</dt>
                  <dd>{resource.subjects.join(' · ')}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        <div className="bg-white">
          <div className="shell py-10 sm:py-12 lg:py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,282px)] lg:gap-14">
              <article className="min-w-0">
                {/* article */}
                {resource.kind === 'article' ? (
                  <div className="max-w-[720px] grid gap-4">
                    {resource.content.map((block, index) =>
                      block.type === 'h2' ? (
                        <div key={index} className="mt-4 border-t border-charcoal/10 pt-5 first:mt-0 first:border-0 first:pt-0">
                          {renderBlock(block, index)}
                        </div>
                      ) : (
                        renderBlock(block, index)
                      ),
                    )}
                    <div className="mt-6 rounded-2xl border border-charcoal/10 bg-cream/30 px-4 py-3.5">
                      <p className="flex items-start gap-2 text-[11.5px] leading-[1.65] text-charcoal/60">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Written by the Vyuh academic team for this Knowledge Hub. It explains method,
                        not institute outcomes — no result statistic is claimed.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* real media */}
                {resource.kind === 'media' ? (
                  <div>
                    {resource.asset?.endsWith('.mp4') ? (
                      <div className="overflow-hidden rounded-[18px] border border-charcoal/10 bg-charcoal">
                        <video
                          className="block w-full"
                          controls
                          preload="metadata"
                          poster={resource.poster}
                          aria-label={resource.title}
                        >
                          <source src={resource.asset} type="video/mp4" />
                          Your browser cannot play this video. The file is available at{' '}
                          <a href={resource.asset}>{resource.asset}</a>.
                        </video>
                      </div>
                    ) : null}

                    {resource.gallery ? (
                      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                        {resource.gallery.map((slide) => (
                          <li key={slide.src} className="overflow-hidden rounded-[16px] border border-charcoal/10">
                            <img
                              src={slide.src}
                              alt={slide.caption}
                              width="960"
                              height="540"
                              loading="lazy"
                              className="block w-full"
                            />
                            <p className="border-t border-charcoal/8 px-3 py-2 text-[11px] text-charcoal/55">
                              {slide.caption}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <a
                        href={resource.asset}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-charcoal/90"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open the file
                      </a>
                      <a
                        href={resource.asset}
                        download
                        className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/20 px-5 py-2.5 text-[12.5px] font-medium text-charcoal/80 transition hover:border-charcoal/40 hover:text-charcoal"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </div>
                    <p className="mt-3 text-[11px] leading-[1.6] text-charcoal/50">
                      This is a real file committed to the Vyuh repository. It is a demonstration
                      asset, not a complete lesson or a downloadable course document.
                    </p>
                  </div>
                ) : null}

                {/* pending */}
                {resource.kind === 'pending' ? (
                  <div className="rounded-[22px] border border-dashed border-charcoal/25 bg-cream/25 px-6 py-10 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-charcoal/12 bg-white">
                      <Clock className="h-5 w-5 text-charcoal/35" aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 font-serif text-[22px] leading-tight tracking-[-0.015em]">
                      Not published yet
                    </h2>
                    <p className="mx-auto mt-2 max-w-[480px] text-[13px] leading-[1.7] text-charcoal/65">
                      {resource.availabilityNote}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                      <Link
                        to="/contact?topic=academic"
                        className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-5 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-charcoal/90"
                      >
                        Request this resource
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        to="/resources"
                        className="text-[12.5px] text-charcoal/65 underline-offset-4 hover:text-charcoal hover:underline"
                      >
                        Browse available resources
                      </Link>
                    </div>
                  </div>
                ) : null}
              </article>

              {/* sidebar */}
              <aside className="lg:sticky lg:top-28 lg:self-start">
                <div className="rounded-2xl border border-charcoal/10 bg-cream/25 p-5">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/45">
                    In this category
                  </p>
                  <ul className="mt-2.5 grid gap-2">
                    {RESOURCES.filter((entry) => entry.category === resource.category && entry.id !== resource.id)
                      .slice(0, 4)
                      .map((entry) => (
                        <li key={entry.id}>
                          <Link
                            to={`/resources/${entry.id}`}
                            className="text-[12.5px] leading-[1.55] text-charcoal/70 underline-offset-2 hover:text-charcoal hover:underline"
                          >
                            {entry.title}
                          </Link>
                        </li>
                      ))}
                    {RESOURCES.filter((entry) => entry.category === resource.category && entry.id !== resource.id)
                      .length === 0 ? (
                      <li className="text-[12px] text-charcoal/50">Nothing else in this category yet.</li>
                    ) : null}
                  </ul>
                </div>

                <div className="mt-4 rounded-2xl border border-charcoal/10 bg-white p-5">
                  <p className="text-[12.5px] font-medium text-charcoal">Need the full archive?</p>
                  <p className="mt-1.5 text-[11.5px] leading-[1.65] text-charcoal/60">
                    Enrolled students receive class materials and recordings through their workspace.
                    Prospective students can ask the academic office what is published.
                  </p>
                  <Link
                    to="/contact"
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-charcoal underline-offset-4 hover:underline"
                  >
                    Contact the institute
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </div>

        {related.length ? (
          <section className="wash-sky border-t border-charcoal/8">
            <div className="shell py-10 sm:py-12">
              <h2 className="text-[18px] font-medium tracking-[-0.015em]">Related resources</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {related.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      to={`/resources/${entry.id}`}
                      className="public-card public-card-lift flex h-full flex-col p-4"
                    >
                      <p className="text-[10px] uppercase tracking-[0.1em] text-charcoal/45">
                        {CATEGORY_LABEL[entry.category]}
                      </p>
                      <p className="mt-1.5 text-[13px] font-medium leading-[1.4]">{entry.title}</p>
                      <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-[1.6] text-charcoal/60">
                        {entry.summary}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <CTASection
          eyebrow="Keep going"
          title={
            <>
              Preparation is a <span className="serif-word">habit</span>, not a download
            </>
          }
          lede="The Knowledge Hub supports the teaching. The teaching — live classes, examined attempts and faculty feedback — is what moves a score."
          actions={[
            { to: '/programs', label: 'Explore programs' },
            { to: '/learning-experience', label: 'See the learning experience', variant: 'secondary' },
          ]}
        />
      </div>
    </PublicLayout>
  )
}
