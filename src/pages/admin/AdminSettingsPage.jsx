import { useState } from 'react'
import { Building2, Database, Info, Save, ServerCog } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { adminService } from '../../services/admin.service.js'
import { relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, Checkbox, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

const CHANNELS = [
  { id: 'in-app', label: 'In-app only' },
  { id: 'email', label: 'Email digest' },
  { id: 'both', label: 'In-app and email' },
]

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [instituteForm, setInstituteForm] = useState(null)
  const [settingsForm, setSettingsForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [savingInstitute, setSavingInstitute] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [resetting, setResetting] = useState(false)

  const { data, error, loading, refresh } = useAsync(() => adminService.getSettings(), [])

  if (loading) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Settings" />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Settings" />
        <ErrorState error={error} onRetry={refresh} title="Settings could not be loaded" />
      </div>
    )
  }

  const institute = instituteForm || data.institute
  const settings = settingsForm || data.settings
  const setInstitute = (patch) => setInstituteForm({ ...institute, ...patch })
  const setSetting = (patch) => setSettingsForm({ ...settings, ...patch })

  const saveInstitute = async (event) => {
    event.preventDefault()
    setFormError(null)
    const { valid, errors: validationErrors } = validateForm(
      { name: institute.name, email: institute.email, website: institute.website },
      {
        name: [rules.required('Institute name'), rules.minLength(3, 'Institute name')],
        email: [rules.required('Contact email'), rules.email()],
      },
    )
    setErrors(validationErrors)
    if (!valid) return
    setSavingInstitute(true)
    try {
      await adminService.updateInstitute(
        {
          name: institute.name.trim(),
          shortName: institute.shortName.trim(),
          tagline: institute.tagline,
          address: institute.address,
          city: institute.city,
          state: institute.state,
          country: institute.country,
          phone: institute.phone,
          email: institute.email.trim().toLowerCase(),
          website: institute.website,
        },
        { id: user.id, role: 'admin', name: user.name },
      )
      toast.success('Institute profile saved', 'The change is recorded in the audit log.')
      setInstituteForm(null)
      refresh()
    } catch (caught) {
      setFormError(caught?.message || 'The institute profile could not be saved.')
    } finally {
      setSavingInstitute(false)
    }
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    setSavingSettings(true)
    try {
      await adminService.updateSettings(
        {
          instituteProfileVisible: settings.instituteProfileVisible,
          defaultNotificationChannel: settings.defaultNotificationChannel,
          maintenanceBanner: settings.maintenanceBanner ? settings.maintenanceBanner.trim() : null,
        },
        { id: user.id, role: 'admin', name: user.name },
      )
      toast.success('Workspace settings saved')
      setSettingsForm(null)
      refresh()
    } catch (caught) {
      toast.error('Settings not saved', caught?.message)
    } finally {
      setSavingSettings(false)
    }
  }

  const resetDemoData = async () => {
    const ok = await confirm({
      title: 'Reset the demonstration dataset?',
      description:
        'Every local change — created users, examinations, approvals, attendance corrections, tickets — is discarded and the seed dataset restored. You will be signed out of the current session state.',
      confirmLabel: 'Reset demo data',
      tone: 'danger',
    })
    if (!ok) return
    setResetting(true)
    try {
      await adminService.resetDemoData({ id: user.id, role: 'admin', name: user.name })
      toast.success('Demo data reset', 'Reload the page to work from the seed dataset.')
      refresh()
    } catch (caught) {
      toast.error('Reset failed', caught?.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Settings"
        description="Institute identity, workspace preferences and the demonstration dataset. Academic rules live under Policies."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <form onSubmit={saveInstitute} className="surface p-4 sm:p-5" noValidate>
          <h2 className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Institute profile
          </h2>
          <p className="mt-0.5 text-[11.5px] text-muted">Shown on the sign-in screen, transcripts and exported reports.</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Institute name"
              value={institute.name}
              onChange={(event) => setInstitute({ name: event.target.value })}
              error={errors.name}
              required
            />
            <TextInput label="Short name" value={institute.shortName} onChange={(event) => setInstitute({ shortName: event.target.value })} />
            <div className="sm:col-span-2">
              <TextInput label="Tagline" value={institute.tagline} onChange={(event) => setInstitute({ tagline: event.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <TextArea label="Address" value={institute.address} onChange={(event) => setInstitute({ address: event.target.value })} rows={2} />
            </div>
            <TextInput label="City" value={institute.city} onChange={(event) => setInstitute({ city: event.target.value })} />
            <TextInput label="State" value={institute.state} onChange={(event) => setInstitute({ state: event.target.value })} />
            <TextInput label="Phone" value={institute.phone} onChange={(event) => setInstitute({ phone: event.target.value })} />
            <TextInput
              label="Contact email"
              type="email"
              value={institute.email}
              onChange={(event) => setInstitute({ email: event.target.value })}
              error={errors.email}
              required
            />
            <TextInput label="Website" value={institute.website} onChange={(event) => setInstitute({ website: event.target.value })} />
            <TextInput label="Academic year" value={institute.academicYear} readOnly disabled hint="Managed with the term calendar." />
          </div>

          <div className="mt-3">
            <FormError>{formError}</FormError>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
            <p className="text-[10px] text-soft">
              Established {institute.established} · {institute.code} · {institute.timezone}
            </p>
            <Button size="sm" variant="primary" type="submit" icon={Save} loading={savingInstitute}>
              Save profile
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <form onSubmit={saveSettings} className="surface p-4">
            <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <ServerCog className="h-3.5 w-3.5" aria-hidden="true" /> Workspace preferences
            </h2>
            <div className="mt-3 space-y-3">
              <Checkbox
                label="Show the institute profile publicly"
                checked={Boolean(settings.instituteProfileVisible)}
                onChange={(event) => setSetting({ instituteProfileVisible: event.target.checked })}
                description="Names and contact details appear in the workspace footer."
              />
              <Select
                label="Default notification channel"
                value={settings.defaultNotificationChannel}
                onChange={(event) => setSetting({ defaultNotificationChannel: event.target.value })}
              >
                {CHANNELS.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.label}
                  </option>
                ))}
              </Select>
              <TextArea
                label="Maintenance banner"
                value={settings.maintenanceBanner || ''}
                onChange={(event) => setSetting({ maintenanceBanner: event.target.value })}
                rows={2}
                placeholder="Leave empty to hide the banner."
                hint="Shown across every workspace when set."
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
              <p className="text-[10px] text-soft">
                Policy review {settings.lastPolicyReviewAt ? relativeTime(settings.lastPolicyReviewAt) : 'not recorded'}
              </p>
              <Button size="sm" variant="primary" type="submit" loading={savingSettings}>
                Save preferences
              </Button>
            </div>
          </form>

          <section className="surface-flat p-4">
            <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <Database className="h-3.5 w-3.5" aria-hidden="true" /> Demonstration dataset
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              This workspace runs entirely in your browser against a seeded dataset. Resetting restores the seed and clears
              every local change made since.
            </p>
            <dl className="mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Mode</dt>
                <dd>
                  <StatusBadge tone="sky">Demo</StatusBadge>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Schema</dt>
                <dd className="font-mono text-ink">v3</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Storage</dt>
                <dd className="text-ink">Browser localStorage</dd>
              </div>
            </dl>
            <Button className="mt-3" size="sm" variant="danger" fullWidth loading={resetting} onClick={resetDemoData}>
              Reset demo data
            </Button>
            <p className="mt-1.5 text-[10px] leading-relaxed text-soft">
              Resetting is audited. There is no production data in this build, so nothing outside this browser is affected.
            </p>
          </section>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          Attendance thresholds, examination defaults and password rules are policies, not settings — change them on the
          Policies page so each edit is validated and audited individually.
        </p>
      </div>
    </div>
  )
}
