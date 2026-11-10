/* Inline, single-stroke SVG icon set — matching the restrained line style
   used across the reference (no filled glyphs, no emoji). */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function Logo({ className = 'h-10 w-10' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#FFFFFF" />
      <circle cx="20" cy="20" r="14.6" fill="none" stroke="#242729" strokeWidth="1.7" />
      <circle cx="15.1" cy="17.4" r="1.5" fill="#242729" />
      <circle cx="24.9" cy="17.4" r="1.5" fill="#242729" />
      <path
        d="M14.6 23.4a6.1 6.1 0 0 0 10.8 0"
        fill="none"
        stroke="#242729"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className = '' }) {
  return (
    <span className={`font-sans text-[23px] font-medium tracking-[-0.03em] text-charcoal sm:text-[25px] ${className}`}>
      Vyuh
    </span>
  );
}

export function ArrowUpRight({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base} strokeWidth={1.7}>
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </svg>
  );
}

export function ArrowRight({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base} strokeWidth={1.7}>
      <path d="M4 12h15" />
      <path d="M13.5 6.5 20 12l-6.5 5.5" />
    </svg>
  );
}

export function ChevronLeft({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base} strokeWidth={1.7}>
      <path d="M14.5 6 8.5 12l6 6" />
    </svg>
  );
}

export function ChevronRight({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base} strokeWidth={1.7}>
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  );
}

export function GraduationCap({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M2.5 8.5 12 4.5l9.5 4-9.5 4-9.5-4Z" />
      <path d="M6.5 10.4V15c0 1.6 2.5 2.8 5.5 2.8s5.5-1.2 5.5-2.8v-4.6" />
      <path d="M20.6 9.4v4.4" />
    </svg>
  );
}

export function PlayTriangle({ className = 'h-3 w-3' }) {
  return (
    <svg className={className} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 1.6 10 6 3 10.4Z" fill="currentColor" />
    </svg>
  );
}

/* -------- video-call controls -------- */
export function MicIcon({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <rect x="9" y="3" width="6" height="10" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v4" />
    </svg>
  );
}

export function VideoIcon({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <rect x="2.5" y="6" width="13" height="12" rx="3" />
      <path d="M15.5 11.2 21.5 8v8l-6-3.2Z" />
    </svg>
  );
}

export function PhoneIcon({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base} strokeWidth={1.8}>
      <path d="M6.4 3.5h2.9l1.5 3.6-2 1.4a10.6 10.6 0 0 0 5.2 5.2l1.4-2 3.6 1.5v2.9a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.4 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  );
}

export function SmileIcon({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 14a3.6 3.6 0 0 0 6 0" />
      <path d="M9.2 9.8h.01M14.8 9.8h.01" strokeWidth={2.2} />
    </svg>
  );
}

export function SettingsIcon({ className = 'h-[18px] w-[18px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4M12 18.8v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </svg>
  );
}

/* -------- capability icons -------- */
export function ConceptIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M8.5 8.5 6 11l2.5 2.5" />
      <path d="M15.5 8.5 18 11l-2.5 2.5" />
      <path d="M13.2 6.5 10.8 15.5" />
    </svg>
  );
}

export function DoubtIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M20.5 12.2c0 3.9-3.8 7-8.5 7a9.9 9.9 0 0 1-2.6-.35L4.5 20.5l1.2-3.5A6.6 6.6 0 0 1 3.5 12.2c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z" />
      <path d="M9.9 10.6a2.1 2.1 0 1 1 3.2 1.9c-.7.4-1.1 1-1.1 1.8" />
      <path d="M12 16.6h.01" strokeWidth={2.1} />
    </svg>
  );
}

export function TestSeriesIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M6.5 3.5h8L18.5 7v10.5a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
      <path d="M14.2 3.7V7.4h3.9" />
      <path d="M8.6 13.6l2 1.9 3.8-3.9" />
    </svg>
  );
}

export function AnalyticsIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M5 19.5v-5M10 19.5V9M15 19.5v-8M20 19.5V6" />
    </svg>
  );
}

export function MaterialsIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M20.5 4.6 12 9.2 3.5 4.6 12 2l8.5 2.6Z" />
      <path d="M3.5 9.9 12 14.5l8.5-4.6" />
      <path d="M3.5 15.2 12 19.8l8.5-4.6" />
    </svg>
  );
}

export function MenuIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base} strokeWidth={1.7}>
      <path d="M4 7.5h16M4 12h16M4 16.5h16" />
    </svg>
  );
}

export function CloseIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...base} strokeWidth={1.7}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
