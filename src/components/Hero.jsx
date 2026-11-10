import { Link } from 'react-router-dom'
import {
  GraduationCap,
  MicIcon,
  VideoIcon,
  PhoneIcon,
  SmileIcon,
  SettingsIcon,
} from './Icons'

const PARTICIPANTS = [
  { initials: 'AM', tone: 'bg-[#CBDDE8]' },
  { initials: 'RS', tone: 'bg-[#E4DCC6]' },
  { initials: 'VD', tone: 'bg-[#D9CFC0]' },
]

export default function Hero({ onOpenVideo }) {
  return (
    <section id="top" className="relative overflow-hidden pb-2">
      <div className="shell relative z-10 pb-10 pt-9 sm:pt-11 lg:pb-12 lg:pt-16">
        <div className="reveal mx-auto max-w-[1180px] text-center">
          <h1 className="text-[33px] leading-[1.13] tracking-[-0.033em] sm:text-[50px] sm:leading-[1.1] lg:text-[58px] lg:leading-[1.1] xl:text-[76px] xl:leading-[1.07]">
            With a <span className="serif-word">strong</span> focus on
            <br className="hidden sm:block" /> student success through{' '}
            <span className="serif-word">Vyuh</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[680px] text-[16px] leading-[1.62] text-charcoal/85 sm:text-[19px] lg:mt-7 lg:text-[20px]">
            A focused learning platform that helps students prepare, practice, and perform better in
            their competitive and academic exams.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-[1300px] lg:mt-14">
          <div className="grid items-center gap-7 lg:grid-cols-[minmax(0,0.64fr)_minmax(0,2.15fr)_minmax(0,0.6fr)] lg:gap-1">
            {/* left floating testimonial */}
            <div className="reveal float-soft order-2 hidden lg:order-1 lg:block">
              <div className="mx-auto flex w-full max-w-[286px] flex-col items-start">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/85 bg-[#BEDDF0]/75 text-charcoal shadow-[0_10px_24px_-18px_rgba(36,39,41,0.45)]">
                  <GraduationCap className="h-[21px] w-[21px]" />
                </span>
                <p className="mt-7 text-[13px] font-medium uppercase leading-[1.5] tracking-[0.035em] text-charcoal/85">
                  “A focused platform for serious learners to achieve their goals.”
                </p>
                <p className="mt-2.5 text-[13px] text-charcoal/60 underline decoration-charcoal/25 underline-offset-4">
                  Vyuh Team
                </p>
                <Link
                  to="/about"
                  className="mt-4 rounded-full bg-white px-5 py-2 text-[13px] font-medium text-charcoal shadow-[0_8px_20px_-16px_rgba(36,39,41,0.55)] transition duration-500 ease-calm hover:-translate-y-[2px]"
                >
                  Explore More
                </Link>
              </div>
            </div>

            {/* video-call frame */}
            <div className="reveal order-1 lg:order-2">
              <div className="relative mx-auto aspect-[1.64/1] w-full max-w-[800px] overflow-hidden rounded-[26px] border border-white/75 bg-gradient-to-b from-[#E9F3FB] via-[#DEEEF9] to-[#CFE7F5] shadow-[0_28px_64px_-44px_rgba(36,39,41,0.5)]">
                <div className="absolute left-4 top-4 z-20 flex items-center sm:left-5 sm:top-[18px]">
                  {PARTICIPANTS.map((person, index) => (
                    <span
                      key={person.initials}
                      className={`-ml-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white text-[7px] font-medium text-charcoal/70 first:ml-0 sm:h-6 sm:w-6 sm:text-[8px] ${person.tone}`}
                      style={{ zIndex: 3 - index }}
                    >
                      {person.initials}
                    </span>
                  ))}
                </div>

                <div className="absolute right-4 top-[18px] z-20 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-[3px] text-[9.5px] font-medium text-charcoal/80 sm:right-5">
                  <span className="h-1.5 w-1.5 rounded-full bg-charcoal" />
                  24:12
                </div>

                <img
                  src="/assets/hero-educator.webp"
                  alt="Vyuh educator teaching on a live video call"
                  width="715"
                  height="716"
                  loading="eager"
                  fetchPriority="high"
                  className="absolute bottom-0 left-1/2 h-full w-auto -translate-x-1/2 object-contain object-bottom"
                />

                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 sm:gap-2.5">
                  <ControlButton label="Mute microphone">
                    <MicIcon />
                  </ControlButton>
                  <ControlButton label="Turn camera off">
                    <VideoIcon />
                  </ControlButton>
                  <button
                    type="button"
                    onClick={onOpenVideo}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-white shadow-[0_10px_22px_-14px_rgba(36,39,41,0.85)] transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-charcoal/90 sm:h-[42px] sm:w-[42px]"
                  >
                    <PhoneIcon className="h-[17px] w-[17px]" />
                    <span className="sr-only">Watch the platform introduction</span>
                  </button>
                  <ControlButton label="Reactions">
                    <SmileIcon />
                  </ControlButton>
                  <ControlButton label="Call settings">
                    <SettingsIcon />
                  </ControlButton>
                </div>
              </div>
            </div>

            {/* right floating statistic */}
            <div className="reveal float-soft-slow order-3 hidden lg:block">
              <div className="mx-auto flex w-full max-w-[242px] flex-col items-center text-center">
                <div className="flex items-center">
                  {['bg-[#D5C9B2]', 'bg-[#C9D9E3]'].map((tone, index) => (
                    <span
                      key={tone}
                      className={`h-9 w-9 rounded-full border-2 border-white ${tone} ${index ? '-ml-3' : ''}`}
                    />
                  ))}
                </div>
                <p className="serif-word mt-3.5 text-[52px] leading-none">25K</p>
                <p className="mt-2 text-[10.5px] font-medium uppercase tracking-[0.24em] text-charcoal/70">
                  Active Learners
                </p>
                <p className="mt-9 max-w-[170px] text-[14px] leading-[1.5] text-charcoal/65">
                  Chosen by aspirants who aim higher
                </p>
              </div>
            </div>
          </div>

          {/* compact equivalents for small screens */}
          <div className="mt-9 grid grid-cols-2 gap-4 max-[380px]:grid-cols-1 lg:hidden">
            <div className="reveal rounded-2xl border border-white/70 bg-white/35 p-4 backdrop-blur-[3px]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-[#BEDDF0]/80">
                <GraduationCap className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 text-[12px] font-medium uppercase leading-[1.5] tracking-[0.03em] text-charcoal/85">
                “A focused platform for serious learners to achieve their goals.”
              </p>
              <p className="mt-2 text-[11px] text-charcoal/60 underline decoration-charcoal/25 underline-offset-4">
                Vyuh Team
              </p>
            </div>
            <div className="reveal flex flex-col items-center justify-center rounded-2xl border border-white/70 bg-white/35 p-4 text-center backdrop-blur-[3px]">
              <p className="serif-word text-[34px] leading-none">25K</p>
              <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-charcoal/70">
                Active Learners
              </p>
              <p className="mt-3 text-[12.5px] leading-[1.5] text-charcoal/65">
                Chosen by aspirants who aim higher
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ControlButton({ children, label }) {
  return (
    <button
      type="button"
      className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/85 text-charcoal/75 transition duration-500 ease-calm hover:-translate-y-[2px] hover:bg-white hover:text-charcoal sm:h-[38px] sm:w-[38px]"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  )
}
