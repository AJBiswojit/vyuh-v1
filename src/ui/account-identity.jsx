import { ROLE_LABELS } from '../lib/navigation.js'

/* ------------------------------------------------------------------
   Account identity — the one place role colour is decided.

   Every account identity surface in Vyuh (profile/account pages, the student
   dashboard profile card, user tables and role chips) renders through these
   components, so a person sees the same colours for the same role on every
   screen, at every breakpoint. The workspace header, sidebar footer and
   mobile drawer no longer carry a personal identity block; they link to the
   account page and expose a sign-out action instead.

   Colour assignments stay inside the existing design system: each role gets
   one of the palette families, always as a pale fill (sky 100, cream 200) or
   the deepest brand blue (sky 900), paired with the darker text step of the
   same family so contrast clears WCAG AA at these small sizes:

     Student          sky    #e3f2fb fill · #245268 text   7.4:1
     Faculty          cream  #f5f0df fill · #6b5c33 text   5.8:1
     Institute admin  sky 900 #1b4057 fill · #ffffff text  10.95:1

   Avatar discs reuse the same family one step deeper (sky 200 / cream 300 /
   sky 900), so name, avatar and role chip read as one unit instead of three
   unrelated colours, and no identity surface depends on the seeded tone.

   These are deliberately not the seeded `avatarTone` values: those are
   shuffled per user for variety, which is exactly why role labels used to
   look random. `avatarTone` remains in the mock data but is not read by
   identity surfaces; identity is decided by role.
------------------------------------------------------------------- */

export const ROLE_TINT = {
  student: {
    key: 'student',
    fill: 'bg-[var(--sky-100)]',
    text: 'text-[#245268]',
    border: 'border-[var(--sky-300)]',
    ring: 'ring-[var(--sky-300)]',
    avatar: 'bg-[var(--sky-200)] text-[#245268]',
    dot: 'bg-[var(--sky-600)]',
    label: ROLE_LABELS.student,
  },
  faculty: {
    key: 'faculty',
    fill: 'bg-[var(--cream-200)]',
    text: 'text-[#6b5c33]',
    border: 'border-[var(--cream-300)]',
    ring: 'ring-[var(--cream-300)]',
    avatar: 'bg-[var(--cream-300)] text-[#6b5c33]',
    dot: 'bg-[var(--cream-500)]',
    label: ROLE_LABELS.faculty,
  },
  admin: {
    key: 'admin',
    fill: 'bg-[var(--sky-900)]',
    text: 'text-white',
    border: 'border-[var(--sky-900)]',
    ring: 'ring-[var(--sky-900)]',
    avatar: 'bg-[var(--sky-900)] text-white',
    dot: 'bg-[var(--sky-500)]',
    label: ROLE_LABELS.admin,
  },
}

/** Falls back to the neutral surface instead of throwing on an unknown role. */
export function roleTint(role) {
  return ROLE_TINT[role] || {
    key: 'unknown',
    fill: 'bg-[var(--surface-sunken)]',
    text: 'text-ink-70',
    border: 'border-[var(--line)]',
    ring: 'ring-[var(--line)]',
    avatar: 'bg-[var(--surface-sunken)] text-ink-70',
    dot: 'bg-[var(--line-strong)]',
    label: 'Account',
  }
}

export function initialsOf(name) {
  return String(name || 'Vyuh Academy')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

const AVATAR_SIZE = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-[12px]',
  lg: 'h-12 w-12 text-[15px]',
  xl: 'h-16 w-16 text-[20px]',
}

/**
 * Initials avatar. `tone="role"` tints it from the workspace role (identity);
 * passing an explicit seeded tone keeps the decorative behaviour used inside
 * data tables, so nothing else in the product changes.
 */
export function AccountAvatar({ name, role, tone = 'role', size = 'md', className = '', title }) {
  const tint = tone === 'role' ? roleTint(role) : null
  const toneClass = tint
    ? tint.avatar
    : tone === 'cream'
      ? 'bg-[var(--cream-200)] text-[#6b5c33]'
      : tone === 'charcoal'
        ? 'bg-[var(--sky-900)] text-white'
        : 'bg-[var(--sky-300)] text-[#245268]'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-medium ${toneClass} ${AVATAR_SIZE[size] || AVATAR_SIZE.md} ${className}`}
      aria-hidden={title ? undefined : 'true'}
      title={title}
      data-identity-avatar={tone === 'role' ? tint.key : tone}
    >
      {initialsOf(name)}
    </span>
  )
}

/**
 * The role label. Pale fill, darker text of the same family, pill shape and
 * tight padding so it sits neatly under a name or inside a header.
 */
export function RoleTag({ role, size = 'sm', className = '', label }) {
  const tint = roleTint(role)
  const sizing = size === 'xs' ? 'px-1.5 py-[1px] text-[9px]' : size === 'md' ? 'px-2.5 py-[3px] text-[11.5px]' : 'px-2 py-[2px] text-[10px]'
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border font-medium uppercase tracking-[0.08em] ${tint.fill} ${tint.text} ${tint.border} ${sizing} ${className}`}
      title={label || tint.label}
      data-role-tag={tint.key}
    >
      {label || tint.label}
    </span>
  )
}

/**
 * Role chip with a leading status dot, for tabular user lists where the chip
 * has to hold its own next to a name and a status pill.
 */
export function RoleBadge({ role, label, className = '' }) {
  const tint = roleTint(role)
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-[2px] text-[10px] font-medium uppercase tracking-[0.08em] ${tint.fill} ${tint.text} ${tint.border} ${className}`}
      title={label || tint.label}
      data-role-tag={tint.key}
      data-role-badge="true"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tint.dot}`} aria-hidden="true" />
      {label || tint.label}
    </span>
  )
}

/* The former `AccountIdentity` (avatar + name + role + identifier) was removed
   together with the header profile block and the sidebar identity footer. The
   remaining surfaces use `AccountAvatar` / `RoleTag` / `RoleBadge` directly. */
