import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  KeyRound,
  Plus,
  Search,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { userService } from '../../services/user.service.js'
import { batchService } from '../../services/batch.service.js'
import { SUBJECTS } from '../../data/mock/subjects.mock.js'
import { relativeTime } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal } from '../../ui/states.jsx'
import { PageHeader, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, Select, CheckboxGroup, FormError, FormSuccess } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

export default function AdminUsersPage() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [searchParams, setSearchParams] = useSearchParams()
  const roleFilter = searchParams.get('role') || 'all'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ role: 'student', name: '', email: '', phone: '', batchIds: [], subjectIds: [], title: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [credentials, setCredentials] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const { data, error, loading, refresh } = useAsync(
    () =>
      userService.list({
        role: roleFilter,
        status: statusFilter,
        search,
        page,
        pageSize: 12,
      }),
    [roleFilter, statusFilter, search, page],
  )

  const batches = useAsync(() => batchService.listBatches({ status: 'active' }), [])

  const rows = data?.items || []
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 }

  const changeRole = (role) => {
    setPage(1)
    setSearchParams(role === 'all' ? {} : { role })
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError(null)
    const { valid, errors: validationErrors } = validateForm(form, {
      name: [rules.required('Full name'), rules.minLength(3, 'Full name')],
      email: [rules.required('Email'), rules.email()],
      phone: [rules.required('Phone'), rules.phone()],
    })
    const next = { ...validationErrors }
    if (form.role === 'student' && form.batchIds.length === 0) next.batchIds = 'Assign at least one batch.'
    if (form.role === 'faculty' && form.subjectIds.length === 0) next.subjectIds = 'Assign at least one subject.'
    setErrors(next)
    if (!valid || Object.keys(next).length) return
    setSaving(true)
    try {
      const result = await userService.createUser(
        {
          ...form,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
        },
        { id: user.id, role: 'admin', name: user.name },
      )
      setCredentials(result.oneTimeCredentials)
      setCreateOpen(false)
      setForm({ role: 'student', name: '', email: '', phone: '', batchIds: [], subjectIds: [], title: '' })
      refresh()
      batches.refresh()
    } catch (caught) {
      setFormError(caught?.message || 'The account could not be created.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (row) => {
    const next = row.status === 'active' ? 'inactive' : 'active'
    const ok = await confirm({
      title: next === 'inactive' ? `Deactivate ${row.name}?` : `Reactivate ${row.name}?`,
      description:
        next === 'inactive'
          ? 'The account cannot sign in while inactive. Academic records are kept intact.'
          : 'The account regains access with its existing password.',
      confirmLabel: next === 'inactive' ? 'Deactivate' : 'Reactivate',
      tone: next === 'inactive' ? 'danger' : 'normal',
      details: [{ label: 'Role', value: roleLabel(row.role) }],
    })
    if (!ok) return
    setBusyId(row.id)
    try {
      await userService.setStatus(row.id, next, next === 'inactive' ? 'Deactivated by administrator' : 'Reactivated by administrator', {
        id: user.id,
        role: 'admin',
        name: user.name,
      })
      toast.success(next === 'inactive' ? 'Account deactivated' : 'Account reactivated', row.name)
      refresh()
    } catch (caught) {
      toast.error('Status not changed', caught?.message)
    } finally {
      setBusyId(null)
    }
  }

  const resetCredentials = async (row) => {
    const ok = await confirm({
      title: `Issue temporary credentials for ${row.name}?`,
      description: 'The current password stops working immediately and the user must choose a new one at the next sign-in.',
      confirmLabel: 'Issue credentials',
      details: [{ label: 'Email', value: row.email }],
    })
    if (!ok) return
    setBusyId(row.id)
    try {
      const result = await userService.resetCredentials(row.id, { id: user.id, role: 'admin', name: user.name })
      setCredentials(result.oneTimeCredentials)
      toast.success('Temporary credentials issued', 'Copy them now — they are shown once.')
    } catch (caught) {
      toast.error('Could not reset credentials', caught?.message)
    } finally {
      setBusyId(null)
    }
  }

  const removeUser = async (row) => {
    const ok = await confirm({
      title: `Delete ${row.name}?`,
      description:
        'Deleting removes the account and its profile. Prefer deactivation when you may need the record later. Historical attempts, marks and attendance rows are not recalculated.',
      confirmLabel: 'Delete account',
      tone: 'danger',
      details: [
        { label: 'Role', value: roleLabel(row.role) },
        { label: 'Email', value: row.email },
      ],
    })
    if (!ok) return
    setBusyId(row.id)
    try {
      await userService.deleteUser(row.id, { id: user.id, role: 'admin', name: user.name })
      toast.info('Account deleted', row.name)
      refresh()
    } catch (caught) {
      toast.error('Could not delete', caught?.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Users"
        description="Provision students and faculty, manage access and issue temporary credentials. Passwords are never displayed in this table."
        actions={
          <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
            Add user
          </Button>
        }
      />

      {credentials ? (
        <div className="mb-4">
          <FormSuccess>
            <div>
              <p className="font-medium">One-time credentials for {credentials.email}</p>
              <p className="mt-0.5 font-mono text-[12px]">{credentials.temporaryPassword}</p>
              <p className="mt-1 text-[10.5px]">{credentials.note}</p>
              <Button size="xs" variant="secondary" className="mt-1.5" onClick={() => setCredentials(null)}>
                I have copied these credentials
              </Button>
            </div>
          </FormSuccess>
        </div>
      ) : null}

      <div className="surface-flat mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="field-input pl-8"
            placeholder="Search name, email or ID…"
            aria-label="Search users"
          />
        </div>
        <div className="tab-row border-0">
          {[
            { id: 'all', label: 'Everyone' },
            { id: 'student', label: 'Students' },
            { id: 'faculty', label: 'Faculty' },
            { id: 'admin', label: 'Admin' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={roleFilter === item.id}
              className="tab"
              onClick={() => changeRole(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
          className="field-select w-auto"
          aria-label="Filter by status"
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <LoadingBlock rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={refresh} title="Users could not be loaded" />
      ) : rows.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={Users}
            title="No accounts match"
            description="Adjust the filters, or provision a new student or faculty account."
            action={
              <Button size="sm" variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
                Add user
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="surface-flat overflow-hidden">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Institute ID</th>
                    <th>Batches</th>
                    <th>Status</th>
                    <th>Last sign-in</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <p className="font-medium text-ink">{row.name}</p>
                        <p className="text-[10.5px] text-soft">{row.email}</p>
                      </td>
                      <td>
                        <StatusBadge tone={row.role === 'admin' ? 'sky' : row.role === 'faculty' ? 'neutral' : 'outline'}>{roleLabel(row.role)}</StatusBadge>
                      </td>
                      <td className="font-mono text-[10.5px] text-muted">{row.employeeId || row.enrollmentId || row.id}</td>
                      <td className="text-[10.5px] text-muted">
                        {(row.batchIds || []).length
                          ? `${row.batchIds.length} assigned`
                          : row.role === 'student'
                            ? 'via profile'
                            : '—'}
                      </td>
                      <td>
                        <StatusBadge tone={statusTone(row.status)} dot>
                          {statusLabel(row.status)}
                        </StatusBadge>
                        {row.mustChangePassword ? (
                          <span className="mt-0.5 block text-[9.5px] text-[#8a6d1f]">Must change password</span>
                        ) : null}
                      </td>
                      <td className="text-[10.5px] text-muted">{row.lastLoginAt ? relativeTime(row.lastLoginAt) : 'Never'}</td>
                      <td className="align-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="xs"
                            variant="ghost"
                            icon={KeyRound}
                            loading={busyId === row.id}
                            onClick={() => resetCredentials(row)}
                          >
                            Reset
                          </Button>
                          {row.role !== 'admin' ? (
                            <>
                              <Button
                                size="xs"
                                variant="ghost"
                                icon={row.status === 'active' ? UserX : UserCheck}
                                loading={busyId === row.id}
                                onClick={() => toggleStatus(row)}
                              >
                                {row.status === 'active' ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button size="xs" variant="ghost" icon={Trash2} onClick={() => removeUser(row)}>
                                Delete
                              </Button>
                            </>
                          ) : (
                            <span className="text-[10px] text-soft">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-soft">
              {meta.total} account{meta.total === 1 ? '' : 's'} · page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button size="xs" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Provision an account"
        description="A temporary password is generated and shown once. The user must change it at first sign-in."
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="create-user" loading={saving}>
              Create account
            </Button>
          </div>
        }
      >
        <form id="create-user" onSubmit={submit} className="space-y-3.5" noValidate>
          <Select label="Role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value, batchIds: [], subjectIds: [] }))}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </Select>
          <TextInput
            label="Full name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            error={errors.name}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Institute email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              error={errors.email}
              placeholder={form.role === 'student' ? 'name@student.vyuhacademy.edu.in' : 'name@vyuhacademy.edu.in'}
              required
            />
            <TextInput
              label="Phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              error={errors.phone}
              placeholder="+91 98765 43210"
              required
            />
          </div>

          {form.role === 'faculty' ? (
            <TextInput
              label="Designation"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="e.g. Senior Physics Educator"
            />
          ) : null}

          <div>
            <p className="label-xs mb-1.5">Batches</p>
            <CheckboxGroup
              options={(batches.data || []).map((batch) => ({ value: batch.id, label: `${batch.name} · ${batch.section}` }))}
              value={form.batchIds}
              onChange={(batchIds) => setForm((current) => ({ ...current, batchIds }))}
              emptyLabel="No active batch available"
            />
            {errors.batchIds ? <p className="mt-1 text-[11px] text-[#8c2f2f]">{errors.batchIds}</p> : null}
          </div>

          {form.role === 'faculty' ? (
            <div>
              <p className="label-xs mb-1.5">Subjects</p>
              <CheckboxGroup
                options={SUBJECTS.map((subject) => ({ value: subject.id, label: subject.name }))}
                value={form.subjectIds}
                onChange={(subjectIds) => setForm((current) => ({ ...current, subjectIds }))}
              />
              {errors.subjectIds ? <p className="mt-1 text-[11px] text-[#8c2f2f]">{errors.subjectIds}</p> : null}
            </div>
          ) : null}

          <div className="rounded-[10px] bg-[var(--surface-sunken)] p-3">
            <p className="text-[10.5px] leading-relaxed text-muted">
              The temporary password follows the institute policy and is shown exactly once after creation. Nothing here
              claims production-grade credential handling.
            </p>
          </div>

          <FormError>{formError}</FormError>
        </form>
      </Modal>

      <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-soft">
        <ShieldOff className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
        Stored passwords are hashed and never rendered. In this demonstration the hash lives in browser storage, so it offers
        no real security — see the integration notes for the production design.
      </p>
    </div>
  )
}

function roleLabel(role) {
  if (role === 'admin') return 'Institute Admin'
  if (role === 'faculty') return 'Faculty'
  return 'Student'
}
