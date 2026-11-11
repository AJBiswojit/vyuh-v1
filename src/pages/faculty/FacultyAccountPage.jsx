import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, KeyRound, Mail, Phone, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { userService } from '../../services/user.service.js'
import { performanceService } from '../../services/performance.service.js'
import { formatDate, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { AccountAvatar, RoleTag } from '../../ui/account-identity.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

export default function FacultyAccountPage() {
  const { user, refresh: refreshAuth } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '', officeHours: user.officeHours || '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data, error, loading, refresh } = useAsync(async () => {
    const [profile, teaching] = await Promise.all([
      userService.getFaculty(user.id),
      performanceService.getFacultyTeachingPerformance(user.id),
    ])
    return { profile, teaching }
  }, [user.id])

  const submit = async (event) => {
    event.preventDefault()
    setFormError(null)
    const { valid, errors: validationErrors } = validateForm(form, {
      name: [rules.required('Full name'), rules.minLength(3, 'Full name')],
      phone: [rules.required('Phone'), rules.phone()],
    })
    setErrors(validationErrors)
    if (!valid) return
    setSaving(true)
    try {
      const updated = await userService.updateProfile(
        user.id,
        { name: form.name.trim(), phone: form.phone.trim(), officeHours: form.officeHours.trim() },
        { id: user.id, role: 'faculty', name: user.name },
      )
      setForm({ name: updated.name, phone: updated.phone || '', officeHours: updated.officeHours || '' })
      refresh()
      refreshAuth?.()
      toast.success('Account updated', 'Your contact details and office hours were saved.')
    } catch (caught) {
      setFormError(caught?.message || 'The account could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Account" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Faculty workspace" title="Account" />
        <ErrorState error={error} onRetry={refresh} title="Your account could not be loaded" />
      </div>
    )
  }

  const profile = data.profile
  const teaching = data.teaching
  return (
    <div>
      <PageHeader eyebrow="Faculty workspace" title="Account" description="Your profile, teaching load and security settings." />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="surface-flat p-4 text-center">
            <AccountAvatar name={profile.name} role="faculty" size="xl" className="mx-auto font-semibold" />
            <h2 className="mt-2.5 text-[15px] font-medium text-ink">{profile.name}</h2>
            <p className="text-[11.5px] text-muted">{profile.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <RoleTag role="faculty" />
              <StatusBadge tone="sky">{profile.employeeId}</StatusBadge>
              <StatusBadge tone={profile.status === 'active' ? 'good' : 'warn'} dot>
                {profile.status === 'active' ? 'Active' : String(profile.status || '').toUpperCase()}
              </StatusBadge>
            </div>
            <p className="mt-2 text-[11px] text-muted">{profile.title || profile.profile?.designation}</p>
            <dl className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-left text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Joined</dt>
                <dd className="text-right font-medium text-ink">{formatDate(profile.joinedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Last sign-in</dt>
                <dd className="text-right font-medium text-ink">{profile.lastLoginAt ? relativeTime(profile.lastLoginAt) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Batches</dt>
                <dd className="text-right font-medium text-ink">{(profile.batches || []).length}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-flat p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Security
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Password changes are handled by the mock authentication service and are hashed before storage. This is a
              frontend demonstration, not production security.
            </p>
            <Link to="/change-password" className="btn btn-secondary btn-sm mt-2.5 w-full">
              <KeyRound className="h-3.5 w-3.5" /> Change password
            </Link>
          </section>

          <section className="surface-sunken p-4">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Demonstration account
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              All data is seeded in your browser. Nothing is transmitted to a server.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <form onSubmit={submit} className="surface p-4 sm:p-5" noValidate>
            <h2 className="text-[13.5px] font-medium text-ink">Contact details</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">Students see your office hours on the doubt page.</p>
            <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
              <TextInput
                label="Full name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                error={errors.name}
                icon={User}
                required
              />
              <TextInput label="Institute email" type="email" value={profile.email || ''} readOnly disabled icon={Mail} hint="Managed by the administrator." />
              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                error={errors.phone}
                icon={Phone}
                required
              />
              <TextInput
                label="Office hours"
                value={form.officeHours}
                onChange={(event) => setForm((current) => ({ ...current, officeHours: event.target.value }))}
                placeholder="Mon–Fri · 16:00–17:30"
                hint="Shown to students when they ask a doubt."
              />
            </div>

            <div className="mt-3">
              <FormError>{formError}</FormError>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
              <p className="text-[10px] text-soft">Changes save to the local demonstration store.</p>
              <Button size="sm" variant="primary" type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          </form>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Classes taken', value: teaching.classes.completed, hint: `${teaching.classes.upcoming} upcoming` },
              { label: 'Examinations', value: teaching.exams.total, hint: `${teaching.exams.published} published` },
              { label: 'Doubts answered', value: teaching.doubts.resolved, hint: `${teaching.doubts.pending} pending` },
            ].map((stat) => (
              <div key={stat.label} className="surface-flat p-4">
                <p className="label-xs">{stat.label}</p>
                <p className="stat-figure mt-1.5 text-ink">{stat.value}</p>
                <p className="mt-1 text-[10.5px] text-soft">{stat.hint}</p>
              </div>
            ))}
          </div>

          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Teaching assignments</h2>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="label-xs">Subjects</p>
                <ul className="mt-1 space-y-1">
                  {(profile.subjects || []).length ? (
                    profile.subjects.map((subject) => (
                      <li key={subject.id} className="text-[11.5px] text-ink">
                        {subject.name}
                      </li>
                    ))
                  ) : (
                    <li className="text-[11.5px] text-soft">No subjects assigned</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="label-xs">Batches</p>
                <ul className="mt-1 space-y-1">
                  {(profile.batches || []).length ? (
                    profile.batches.map((batch) => (
                      <li key={batch.id} className="text-[11.5px] text-ink">
                        {batch.name} · {batch.section}
                      </li>
                    ))
                  ) : (
                    <li className="text-[11.5px] text-soft">No batches assigned</li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Bio</h2>
            <TextArea
              label="Professional summary"
              defaultValue={profile.profile?.bio || ''}
              rows={3}
              readOnly
              hint="Editing the bio is out of scope for this phase; the administrator curates faculty profiles."
            />
          </section>
        </div>
      </div>
    </div>
  )
}
