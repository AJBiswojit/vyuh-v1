import { Link } from 'react-router-dom'
import { ArrowUpRight } from '../Icons'
import StatusBadge from './StatusBadge'

/* ------------------------------------------------------------------
   ProgramCard — used on Home (programme strip), Programs (full grid) and
   Admissions (available programmes).

   Two densities:
     'full'   image, number, title, target examination, subjects, summary, CTA
     'compact' text-first card used inside the admissions list
------------------------------------------------------------------- */

export default function ProgramCard({ program, variant = 'full', enquiryHref = '/admissions#enquiry' }) {
  if (variant === 'compact') {
    return (
      <article className="public-card public-card-lift flex h-full flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-[22px] leading-[1.2] tracking-[-0.015em]">{program.title}</h3>
          <StatusBadge tone="sky">Available</StatusBadge>
        </div>
        <p className="mt-2 text-[11.5px] font-medium uppercase tracking-[0.1em] text-charcoal/55">
          {program.subjects}
        </p>
        <p className="mt-3 text-[13.5px] leading-[1.65] text-charcoal/70">{program.detail}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
          <Link
            to={`${enquiryHref}?programme=${program.enquiryTopicId}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-4 py-2 text-[12.5px] font-medium text-white transition hover:bg-charcoal/90"
          >
            Enquire about {program.title.split(' (')[0]}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link to={program.to} className="text-[12.5px] text-charcoal/65 underline-offset-4 hover:text-charcoal hover:underline">
            Programme details
          </Link>
        </div>
      </article>
    )
  }

  return (
    <article className="public-card public-card-lift group flex h-full flex-col overflow-hidden">
      {program.image ? (
        <div className="relative overflow-hidden bg-gradient-to-b from-[#CFE6F5] to-[#EFEBDD]">
          <img
            src={program.image}
            alt={program.imageAlt}
            width="640"
            height="349"
            loading="lazy"
            className="h-[168px] w-full object-cover object-center transition duration-700 ease-calm group-hover:scale-[1.02] sm:h-[190px]"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-6 lg:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className="serif-word text-[13px] leading-none text-charcoal/45">{program.number}</span>
          <StatusBadge tone="sky">Confirmed offering</StatusBadge>
        </div>

        <h3 className="mt-2 font-serif text-[24px] leading-[1.2] tracking-[-0.018em] sm:text-[27px]">
          {program.title}
        </h3>
        <p className="mt-1.5 text-[12px] text-charcoal/55">
          <span className="font-medium uppercase tracking-[0.1em] text-charcoal/50">Target</span>{' '}
          <span className="text-charcoal/75">{program.targetExam}</span>
        </p>

        <p className="mt-3 text-[13.5px] leading-[1.68] text-charcoal/72">{program.summaryForCard || program.overview}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {program.subjects.map((subject) => (
            <li
              key={subject}
              className="rounded-full border border-charcoal/12 bg-cream/40 px-2.5 py-1 text-[11px] text-charcoal/70"
            >
              {subject}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 pt-6">
          <Link
            to={enquiryHref}
            className="text-[13px] font-medium text-charcoal underline decoration-charcoal/30 underline-offset-4 transition hover:decoration-charcoal"
          >
            Programme enquiry
          </Link>
          <Link
            to={`/programs#${program.id}`}
            aria-label={`Read the full ${program.title} programme details`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal text-white transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-charcoal/85"
          >
            <ArrowUpRight />
          </Link>
        </div>
      </div>
    </article>
  )
}
