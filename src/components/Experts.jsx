import { Link } from 'react-router-dom'
import { ArrowUpRight } from './Icons'
import { EXPERTS } from '../content'

const TONES = {
  mist: 'bg-[#D9E9F3]',
  cream: 'bg-[#EFE9D6]',
  sand: 'bg-[#E7DDCF]',
}

export default function Experts() {
  return (
    <section id="experts" className="bg-white pb-12 pt-7 sm:pb-14 lg:pb-14 lg:pt-9">
      <div className="shell">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.58fr)_minmax(0,1.42fr)] lg:gap-10">
          <div className="reveal lg:pt-2">
            <p className="eyebrow">
              <span className="eyebrow-dot" />
              Our Experts
            </p>
            <h2 className="mt-3.5 text-[28px] leading-[1.2] tracking-[-0.028em] sm:text-[34px] lg:text-[38px]">
              <span className="serif-word">Your</span> potential
              <br />
              Our focus
            </h2>
            <p className="mt-4 max-w-[268px] text-[13.5px] leading-[1.6] text-charcoal/70 sm:text-[14.5px]">
              A team of experienced educators committed to guiding you with clarity, strategy, and
              support.
            </p>
            <Link to="/about" className="ghost-btn mt-6 bg-white text-[13px]">
              Explore More
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky/60">
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          </div>

          <ul className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 sm:grid-cols-3 sm:gap-4">
            {EXPERTS.map((expert, index) => (
              <li
                key={expert.id}
                className={`reveal ${index === 2 ? 'min-[400px]:col-span-2 sm:col-span-1' : ''}`}
                style={{ transitionDelay: `${index * 60}ms` }}
              >
                <Link
                  to="/about"
                  className={`group relative flex h-full flex-col justify-end overflow-hidden rounded-[16px] ${TONES[expert.tone]} transition duration-700 ease-calm hover:-translate-y-1.5 hover:shadow-[0_22px_50px_-32px_rgba(36,39,41,0.6)]`}
                >
                  <div className={`relative w-full overflow-hidden aspect-[3/3.95]`}>
                    <img
                      src={expert.image}
                      alt={`${expert.name}, ${expert.role.toLowerCase()}`}
                      width="520"
                      height="729"
                      loading="lazy"
                      className="absolute inset-x-0 top-0 h-full w-full object-cover object-top transition duration-700 ease-calm group-hover:scale-[1.025]"
                      style={{
                        maskImage:
                          'linear-gradient(to bottom, #000 66%, rgba(0,0,0,0.35) 88%, transparent 100%)',
                        WebkitMaskImage:
                          'linear-gradient(to bottom, #000 66%, rgba(0,0,0,0.35) 88%, transparent 100%)',
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
                      <p className="font-serif whitespace-nowrap text-[15px] leading-tight text-charcoal min-[400px]:text-[13.5px] sm:text-[18px]">
                        {expert.name}
                      </p>
                      <div className="mt-1.5 flex items-end justify-between gap-1 sm:gap-1.5">
                        <p className="truncate text-[8px] font-medium uppercase tracking-[0.08em] text-charcoal/65 min-[400px]:text-[7px] sm:text-[9px] sm:tracking-[0.1em]">
                          {expert.role}
                        </p>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/85 text-charcoal transition duration-500 ease-calm group-hover:bg-white">
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
