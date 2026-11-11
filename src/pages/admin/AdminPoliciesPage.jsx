import { useMemo, useState } from 'react'
import { Info, RotateCcw, Save, Settings2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { adminService } from '../../services/admin.service.js'
import { relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock } from '../../ui/states.jsx'
import { PageHeader, StatusBadge } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'

const GROUP_LABEL = {
  attendance: 'Attendance',
  examination: 'Examinations',
  recording: 'Recordings',
  account: 'Accounts and security',
  notifications: 'Notifications',
  display: 'Display',
}

const GROUP_NOTE = {
  attendance:
    'Duration-based attendance uses these values at the moment a session ends. Changing the threshold re-grades every record immediately.',
  examination:
    'Examination defaults apply to newly created papers. Publications may require administrator approval depending on the policy below.',
  recording: 'Recording visibility and downloads are enforced by the recording service, not by the interface.',
  account: 'Password policy is applied by the mock authentication service when a password is set or reset.',
  notifications: 'Reminder windows are used by the notification service when events are scheduled.',
  display: 'Display preferences are small, presentation-only settings for the workspace.',
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled'
  if (typeof value === 'number') return String(value)
  return String(value)
}

function labelForKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase())
    .replace(/\bUrl\b/g, 'URL')
    .trim()
}

export default function AdminPoliciesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [edits, setEdits] = useState({})
  const [busyPath, setBusyPath] = useState(null)

  const { data, error, loading, refresh } = useAsync(async () => {
    const [policies, rows] = await Promise.all([adminService.getPolicies(), adminService.listPolicyRows()])
    return { policies, rows }
  }, [])

  const groups = useMemo(() => {
    if (!data) return []
    return Object.entries(data.policies).map(([group, values]) => ({
      group,
      label: GROUP_LABEL[group] || labelForKey(group),
      note: GROUP_NOTE[group],
      rows: Object.entries(values).map(([key, value]) => ({ path: `${group}.${key}`, key, value })),
    }))
  }, [data])

  const save = async (row) => {
    const next = edits[row.path]
    if (next === undefined) return
    const value = typeof row.value === 'boolean' ? next : Number.isNaN(Number(next)) ? next : Number(next)
    if (String(value) === String(row.value)) {
      setEdits((current) => {
        const copy = { ...current }
        delete copy[row.path]
        return copy
      })
      return
    }
    const ok = await confirm({
      title: 'Change this policy?',
      description: `${labelForKey(row.key)} will change from ${formatValue(row.value)} to ${formatValue(value)}. Existing records are re-evaluated where the policy is read at calculation time.`,
      confirmLabel: 'Apply change',
      details: [{ label: 'Path', value: row.path }],
    })
    if (!ok) return
    setBusyPath(row.path)
    try {
      await adminService.updatePolicy(row.path, value, { id: user.id, role: 'admin', name: user.name })
      setEdits((current) => {
        const copy = { ...current }
        delete copy[row.path]
        return copy
      })
      toast.success('Policy updated', `${labelForKey(row.key)} is now ${formatValue(value)}.`)
      refresh()
    } catch (caught) {
      toast.error('Policy not changed', caught?.message)
    } finally {
      setBusyPath(null)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Policies" />
        <LoadingBlock rows={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Policies" />
        <ErrorState error={error} onRetry={refresh} title="Policies could not be loaded" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Policies"
        description="Attendance, examination, recording and account rules. Every change is validated and audited with the old and new value."
        actions={
          <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => refresh()}>
            Reload
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-[12px] border border-[var(--line)] bg-white p-3">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          Policies are read at calculation time. Raising the attendance threshold re-grades every existing record; turning
          off negative marking only affects papers created afterwards. Percentages must stay within 0–100.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.group} className="surface-flat p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-[13.5px] font-medium text-ink">{group.label}</h2>
                {group.note ? <p className="mt-0.5 text-[10.5px] leading-snug text-muted">{group.note}</p> : null}
              </div>
              <Settings2 className="h-3.5 w-3.5 shrink-0 text-soft" aria-hidden="true" />
            </div>

            <div className="mt-2.5 divide-y divide-[var(--line)]">
              {group.rows.map((row) => {
                const draft = edits[row.path]
                const dirty = draft !== undefined && String(draft) !== String(row.value)
                return (
                  <div key={row.path} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium text-ink">{labelForKey(row.key)}</p>
                      <p className="font-mono text-[9.5px] text-soft">{row.path}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {typeof row.value === 'boolean' ? (
                        <select
                          value={draft === undefined ? String(row.value) : String(draft)}
                          onChange={(event) =>
                            setEdits((current) => ({ ...current, [row.path]: event.target.value === 'true' }))
                          }
                          className="field-select w-auto py-1 text-[11px]"
                          aria-label={labelForKey(row.key)}
                        >
                          <option value="true">Enabled</option>
                          <option value="false">Disabled</option>
                        </select>
                      ) : typeof row.value === 'number' ? (
                        <input
                          type="number"
                          value={draft === undefined ? row.value : draft}
                          onChange={(event) => setEdits((current) => ({ ...current, [row.path]: event.target.value }))}
                          className="field-input w-[92px] py-1 text-[11px] tabular"
                          aria-label={labelForKey(row.key)}
                        />
                      ) : (
                        <input
                          value={draft === undefined ? row.value : draft}
                          onChange={(event) => setEdits((current) => ({ ...current, [row.path]: event.target.value }))}
                          className="field-input w-[130px] py-1 text-[11px]"
                          aria-label={labelForKey(row.key)}
                        />
                      )}
                      <Button
                        size="xs"
                        variant={dirty ? 'primary' : 'ghost'}
                        icon={Save}
                        disabled={!dirty}
                        loading={busyPath === row.path}
                        onClick={() => save(row)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="surface-flat mt-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-medium text-ink">Policy values in force</h2>
          <StatusBadge tone="neutral">{data.rows.length} settings</StatusBadge>
        </div>
        <p className="mt-1 text-[10.5px] text-muted">
          These flattened values are the same ones the services read. Nothing is cached in the interface, so a reload shows
          the effective state.
        </p>
        <div className="table-scroll mt-2">
          <table className="data-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Setting</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.path}>
                  <td className="text-[11px] text-muted">{GROUP_LABEL[row.group] || row.group}</td>
                  <td className="text-[11px] text-ink">{labelForKey(row.key)}</td>
                  <td className="font-mono text-[11px] text-ink">{formatValue(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-3 text-[10px] text-soft">
        {edits && Object.keys(edits).length
          ? `${Object.keys(edits).length} unsaved edit${Object.keys(edits).length === 1 ? '' : 's'} — save each row individually so the audit entry records the exact change.`
          : 'No unsaved edits.'}{' '}
        Last policy review was {relativeTime(data.policies?.lastPolicyReviewAt) || 'not recorded'}.
      </p>
    </div>
  )
}
