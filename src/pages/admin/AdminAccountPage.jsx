import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, KeyRound, Mail, Phone, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { userService } from '../../services/user.service.js'
import { batchService } from '../../services/batch.service.js'
import { formatDate, relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import { TextInput, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

export default function AdminAccountPage() {
  const { user, refresh: refreshAuth } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data, error, loading, refresh } = useAsync(async () => {
    const [profile, batches] = await Promise.all([userService.getUser(user.id), batchService.listBatches()])
    return { profile, batches }
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
        { name: form.name.trim(), phone: form.phone.trim() },
        { id: user.id, role: 'admin', name: user.name },
      )
      setForm({ name: updated.name, phone: updated.phone || '' })
      refresh()
      refreshAuth?.()
      toast.success('Account updated', 'Your administrator contact details were saved.')
    } catch (caught) {
      setFormError(caught?.message || 'The account could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Account" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Account" />
        <ErrorState error={error} onRetry={refresh} title="Your account could not be loaded" />
      </div>
    )
  }

  const profile = data.profile
  const batches = data.batches || []
  const activeBatches = batches.filter((batch) => batch.status === 'active')
  const totalStudents = activeBatches.reduce((sum, batch) => sum + (batch.studentIds?.length || 0), 0)
  const initials = (profile.name || 'V').split(' ').map((part) => part[0]).slice(0, 2).join('')

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Account"
        description="Your administrator identity, contact details and security settings."
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="surface-flat p-4 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ink)] text-[20px] font-semibold text-white">
              {initials}
            </span>
            <h2 className="mt-2.5 text-[15px] font-medium text-ink">{profile.name}</h2>
            <p className="text-[11.5px] text-muted">{profile.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <StatusBadge tone="sky">Institute Admin</StatusBadge>
              <StatusBadge tone={profile.status === 'active' ? 'good' : 'warn'} dot>
                {profile.status === 'active' ? 'Active' : String(profile.status || '').toUpperCase()}
              </StatusBadge>
            </div>
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
                <dt className="text-muted">Active batches</dt>
                <dd className="text-right font-medium text-ink">{activeBatches.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Students</dt>
                <dd className="text-right font-medium text-ink">{totalStudents}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-flat p-4">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Security
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Administrator accounts cannot be deactivated or deleted from the Users screen. Password changes are handled by
              the mock authentication service.
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
              Privileged actions you take are recorded in the audit log with your name. Nothing leaves this browser.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <form onSubmit={submit} className="surface p-4 sm:p-5" noValidate>
            <h2 className="text-[13.5px] font-medium text-ink">Contact details</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">Used on approval decisions and institute correspondence.</p>
            <div className="mt-3 grid gap-3.5 sm:grid-cols-2">
              <TextInput
                label="Full name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                error={errors.name}
                icon={User}
                required
              />
              <TextInput
                label="Institute email"
                type="email"
                value={profile.email || ''}
                readOnly
                disabled
                icon={Mail}
                hint="Administrator emails are managed outside this screen."
              />
              <TextInput
                label="Phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                error={errors.phone}
                icon={Phone}
                placeholder="+91 98765 43210"
                required
              />
              <TextInput label="Role" value="Institute Admin" readOnly disabled hint="Single administrator per institute in this build." />
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

          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Batches under administration</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">Active cohorts in the current academic year.</p>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {activeBatches.length === 0 ? (
                <li className="text-[11.5px] text-soft">No active batch exists.</li>
              ) : (
                activeBatches.map((batch) => (
                  <li
                    key={batch.id}
                    className="flex items-center justify-between gap-2 rounded-[8px] border border-[var(--line)] px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-medium text-ink">{batch.name}</p>
                      <p className="text-[10px] text-soft">
                        {batch.section} · {batch.studentIds?.length || 0} students
                      </p>
                    </div>
                    <Link to="/admin/batches" className="shrink-0 text-[10px] font-medium text-link">
                      Open
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="surface-flat p-4">
            <h2 className="text-[13px] font-medium text-ink">Administrator responsibilities</h2>
            <ul className="mt-1.5 space-y-1 text-[11px] leading-snug text-muted">
              <li>• Approvals for examination publication and attendance corrections.</li>
              <li>• Policy changes, which re-grade existing attendance records immediately.</li>
              <li>• Integrity reviews, where a reconnection is an observation rather than misconduct.</li>
              <li>• User provisioning, deactivation and credential recovery.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
