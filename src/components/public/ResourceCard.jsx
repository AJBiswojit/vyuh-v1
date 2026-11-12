import { Link } from 'react-router-dom'
import { ArrowUpRight, Download, FileText, Image as ImageIcon, PlayCircle, Clock } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { RESOURCE_KIND_LABELS, RESOURCE_CATEGORIES } from '../../data/site/resources'

/* ------------------------------------------------------------------
   ResourceCard — one Knowledge Hub record.

   The action is decided by `resource.kind`, which is a data-level statement of
   what actually exists:
     media    → open the real file in public/media
     article  → read it at /resources/:id
     pending  → a disabled "in preparation" affordance, never a fake download
   The card never renders a link to a document that is not on disk.
------------------------------------------------------------------- */

const CATEGORY_LABEL = Object.fromEntries(RESOURCE_CATEGORIES.map((category) => [category.id, category.label]))

function KindIcon({ resource, className = 'h-4 w-4' }) {
  if (resource.kind === 'article') return <FileText className={className} />
  if (resource.kind === 'pending') return <Clock className={className} />
  if (resource.asset && resource.asset.endsWith('.png')) return <ImageIcon className={className} />
  return <PlayCircle className={className} />
}

export default function ResourceCard({ resource, examLabels = [] }) {
  const categoryLabel = CATEGORY_LABEL[resource.category] || resource.category
  const kindLabel = RESOURCE_KIND_LABELS[resource.kind]
  const isPending = resource.kind === 'pending'

  return (
    <article
      className={`public-card flex h-full flex-col p-5 sm:p-6 ${
        isPending ? '' : 'public-card-lift'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-charcoal/50">{categoryLabel}</p>
        <StatusBadge tone={isPending ? 'outline' : resource.kind === 'media' ? 'good' : 'sky'}>{kindLabel}</StatusBadge>
      </div>

      <h3 className="mt-2.5 font-serif text-[19px] leading-[1.25] tracking-[-0.012em] text-charcoal">
        {resource.title}
      </h3>

      <p className="mt-2 text-[12.5px] leading-[1.65] text-charcoal/68">{resource.summary}</p>

      <dl className="mt-4 grid gap-1.5 text-[11.5px] text-charcoal/60">
        <div className="flex gap-2">
          <dt className="shrink-0 text-charcoal/45">Format</dt>
          <dd>{resource.format}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-charcoal/45">Source</dt>
          <dd>{resource.source}</dd>
        </div>
        {examLabels.length ? (
          <div className="flex gap-2">
            <dt className="shrink-0 text-charcoal/45">For</dt>
            <dd>{examLabels.join(' · ')}</dd>
          </div>
        ) : null}
      </dl>

      {isPending ? (
        <div className="mt-auto pt-5">
          <p className="rounded-xl border border-dashed border-charcoal/20 bg-cream/30 px-3 py-2.5 text-[11.5px] leading-[1.55] text-charcoal/60">
            {resource.availabilityNote}
          </p>
        </div>
      ) : resource.kind === 'media' ? (
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
          <a
            href={resource.asset}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-4 py-2 text-[12px] font-medium text-white transition hover:bg-charcoal/90"
          >
            <KindIcon resource={resource} className="h-3.5 w-3.5" />
            Open file
          </a>
          <a
            href={resource.asset}
            download
            className="inline-flex items-center gap-1.5 rounded-full border border-charcoal/20 px-4 py-2 text-[12px] font-medium text-charcoal/80 transition hover:border-charcoal/40 hover:text-charcoal"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      ) : (
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <Link
            to={`/resources/${resource.id}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-charcoal"
          >
            Read
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-[11px] text-charcoal/50">
            {new Date(resource.updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      )}
    </article>
  )
}
