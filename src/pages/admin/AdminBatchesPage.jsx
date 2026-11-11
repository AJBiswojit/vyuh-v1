import { useMemo, useState } from 'react'
import {
  Archive,
  Building2,
  ChevronDown,
  ChevronUp,
  Layers,
  Pencil,
  Plus,
  Search,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import useAsync from '../../lib/useAsync.js'
import { batchService } from '../../services/batch.service.js'
import { userService } from '../../services/user.service.js'
import { SUBJECTS } from '../../data/mock/subjects.mock.js'
import { formatDate } from '../../lib/time.js'
import { ErrorState, LoadingBlock, EmptyState, Modal, Drawer } from '../../ui/states.jsx'
import { PageHeader, ProgressBar, StatusBadge, statusLabel, statusTone } from '../../ui/workspace-kit.jsx'
import { TextInput, TextArea, Select, CheckboxGroup, FormError } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'
import { useConfirm, useToast } from '../../ui/feedback.jsx'
import { validateForm, rules } from '../../lib/validation.js'

const PROGRAMS = ['JEE', 'NEET', 'Foundation', 'Olympiad']

const EMPTY_FORM = {
  name: '',
  code: '',
  program: 'JEE',
  section: 'Alpha',
  capacity: 30,
  startDate: '',
  endDate: '',
  attendanceThreshold: 75,
  subjectIds: [],
  facultyIds: [],
  description: '',
}

export default function AdminBatchesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [statusFilter, setStatusFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [rosterFor, setRosterFor] = useState(null)
  const [rosterSelection, setRosterSelection] = useState([])

  const { data, error, loading, refresh } = useAsync(async () => {
    const [batches, facultyUsers, studentUsers] = await Promise.all([
      batchService.listBatches(),
      userService.getAllUsers({ role: 'faculty' }),
      userService.getAllUsers({ role: 'student' }),
    ])
    return { batches, facultyUsers, studentUsers }
  }, [])

  const allFaculty = data?.facultyUsers || []
  const allStudents = data?.studentUsers || []

  const visible = useMemo(() => {
    if (!data) return []
    let rows = data.batches
    if (statusFilter !== 'all') rows = rows.filter((batch) => batch.status === statusFilter)
    const needle = search.trim().toLowerCase()
    if (needle) {
      rows = rows.filter(
        (batch) => batch.name.toLowerCase().includes(needle) || batch.code.toLowerCase().includes(needle),
      )
    }
    return rows
  }, [data, statusFilter, search])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, startDate: new Date().toISOString().slice(0, 10) })
    setErrors({})
    setFormError(null)
    setEditorOpen(true)
  }

  const openEdit = (batch) => {
    setEditing(batch)
    setForm({
      name: batch.name,
      code: batch.code,
      program: batch.program,
      section: batch.section,
      capacity: batch.capacity,
      startDate: batch.startDate,
      endDate: batch.endDate,
      attendanceThreshold: batch.attendanceThreshold,
      subjectIds: batch.subjectIds,
      facultyIds: batch.facultyIds,
      description: batch.description || '',
    })
    setErrors({})
    setFormError(null)
    setEditorOpen(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError(null)
    const { valid, errors: validationErrors } = validateForm(form, {
      name: [rules.required('Batch name'), rules.minLength(3, 'Batch name')],
      code: [rules.required('Batch code'), rules.minLength(3, 'Batch code')],
      capacity: [rules.positiveNumber('Capacity')],
      startDate: [rules.required('Start date')],
      endDate: [rules.required('End date'), rules.dateAfter('startDate', 'The end date must be after the start date.')],
    })
    setErrors(validationErrors)
    if (!valid) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        attendanceThreshold: Number(form.attendanceThreshold),
      }
      if (editing) {
        await batchService.updateBatch(editing.id, { ...payload, reason: 'Batch updated from the admin console' }, {
          id: user.id,
          role: 'admin',
          name: user.name,
        })
        toast.success('Batch updated', form.name)
      } else {
        await batchService.createBatch(payload, { id: user.id, role: 'admin', name: user.name })
        toast.success('Batch created', `${form.name} is active and ready for enrolment.`)
      }
      setEditorOpen(false)
      refresh()
    } catch (caught) {
      setFormError(caught?.message || 'The batch could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const archive = async (batch) => {
    const ok = await confirm({
      title: `Archive ${batch.name}?`,
      description:
        'The cohort stops appearing in active lists but keeps its history for reports. Students keep their records.',
      confirmLabel: 'Archive batch',
      tone: 'danger',
      details: [
        { label: 'Students', value: String(batch.studentIds.length) },
        { label: 'Faculty', value: String(batch.facultyIds.length) },
      ],
    })
    if (!ok) return
    try {
      await batchService.archiveBatch(batch.id, { id: user.id, role: 'admin', name: user.name })
      toast.info('Batch archived', batch.name)
      refresh()
    } catch (caught) {
      toast.error('Could not archive', caught?.message)
    }
  }

  const openRoster = (batch) => {
    setRosterFor(batch)
    setRosterSelection(batch.studentIds)
  }

  const saveRoster = async () => {
    if (rosterSelection.length === 0) {
      toast.error('A batch needs at least one student')
      return
    }
    try {
      await batchService.assignStudents(rosterFor.id, rosterSelection, { id: user.id, role: 'admin', name: user.name })
      toast.success('Roster updated', `${rosterSelection.length} students assigned to ${rosterFor.name}.`)
      setRosterFor(null)
      refresh()
    } catch (caught) {
      toast.error('Could not update the roster', caught?.message)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Batches" />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader eyebrow="Institute admin" title="Batches" />
        <ErrorState error={error} onRetry={refresh} title="Batches could not be loaded" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Batches"
        description="Batches connect students, faculty, examinations and classes. Capacity, thresholds and rosters are managed here."
        actions={
          <Button size="sm" variant="primary" icon={Plus} onClick={openCreate}>
            New batch
          </Button>
        }
      />

      <div className="surface-flat mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-soft" aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field-input pl-8"
            placeholder="Search batch name or code…"
            aria-label="Search batches"
          />
        </div>
        <div className="tab-row border-0">
          {[
            { id: 'active', label: 'Active' },
            { id: 'archived', label: 'Archived' },
            { id: 'all', label: 'All' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === item.id}
              className="tab"
              onClick={() => setStatusFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="surface-flat">
          <EmptyState
            icon={Layers}
            title="No batch in this view"
            description="Create a batch to group students for classes, examinations and reporting."
            action={
              <Button size="sm" variant="primary" icon={Plus} onClick={openCreate}>
                New batch
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((batch) => {
            const open = expanded === batch.id
            return (
              <article key={batch.id} className="surface-flat overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(batch.status)} dot>
                        {statusLabel(batch.status)}
                      </StatusBadge>
                      <span className="badge badge-outline">{batch.program}</span>
                      <span className="badge badge-outline">{batch.code}</span>
                    </div>
                    <h3 className="mt-1.5 text-[13.5px] font-medium text-ink">
                      {batch.name} · {batch.section}
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted clamp-2">{batch.description}</p>
                    <div className="mt-2 max-w-[320px]">
                      <ProgressBar
                        value={batch.utilisation}
                        height={5}
                        tone={batch.utilisation >= 90 ? 'warn' : 'sky'}
                        label={`${batch.studentCount} of ${batch.capacity} seats`}
                      />
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-soft">
                      <span>{batch.studentCount} students</span>
                      <span>{batch.facultyCount} faculty</span>
                      <span>{batch.subjects?.map((subject) => subject.name).join(', ')}</span>
                      <span>
                        {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
                      </span>
                      <span>{batch.attendanceThreshold}% attendance</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Button
                      size="xs"
                      variant="secondary"
                      icon={open ? ChevronUp : ChevronDown}
                      onClick={() => setExpanded(open ? null : batch.id)}
                    >
                      {open ? 'Hide' : 'Details'}
                    </Button>
                    <Button size="xs" variant="ghost" icon={UserPlus} onClick={() => openRoster(batch)}>
                      Roster
                    </Button>
                    <Button size="xs" variant="ghost" icon={Pencil} onClick={() => openEdit(batch)}>
                      Edit
                    </Button>
                    {batch.status === 'active' ? (
                      <Button size="xs" variant="ghost" icon={Archive} onClick={() => archive(batch)}>
                        Archive
                      </Button>
                    ) : null}
                  </div>
                </div>

                {open ? (
                  <div className="border-t border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="label-xs">Faculty</p>
                        <ul className="mt-1 space-y-0.5">
                          {(batch.faculty || []).length ? (
                            batch.faculty.map((faculty) => (
                              <li key={faculty.id} className="text-[11.5px] text-ink">
                                {faculty.name}
                                <span className="ml-1 text-[10px] text-soft">{faculty.title}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-[11px] text-soft">No faculty assigned</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="label-xs">Students</p>
                        <ul className="mt-1 max-h-[130px] space-y-0.5 overflow-y-auto thin-scroll pr-1">
                          {(batch.students || []).length ? (
                            batch.students.map((student) => (
                              <li key={student.id} className="text-[11.5px] text-ink">
                                {student.name}
                              </li>
                            ))
                          ) : (
                            <li className="text-[11px] text-soft">No students enrolled</li>
                          )}
                        </ul>
                      </div>
                    </div>
                    {batch.schedule?.length ? (
                      <div className="mt-3">
                        <p className="label-xs">Weekly schedule</p>
                        <ul className="mt-1 space-y-0.5">
                          {batch.schedule.map((day) => (
                            <li key={day.day} className="text-[11px] text-muted">
                              <span className="font-medium text-ink">{day.day}:</span> {day.slots.join(' · ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Create a batch'}
        description="Capacity, threshold and subjects drive attendance and examination targeting."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" form="batch-form" loading={saving}>
              {editing ? 'Save batch' : 'Create batch'}
            </Button>
          </div>
        }
      >
        <form id="batch-form" onSubmit={submit} className="space-y-3.5" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput
              label="Batch name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              error={errors.name}
              placeholder="e.g. JEE Advanced 2027"
              required
            />
            <TextInput
              label="Batch code"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              error={errors.code}
              placeholder="JEE-A27"
              required
            />
            <Select label="Programme" value={form.program} onChange={(event) => setForm((current) => ({ ...current, program: event.target.value }))}>
              {PROGRAMS.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </Select>
            <TextInput
              label="Section"
              value={form.section}
              onChange={(event) => setForm((current) => ({ ...current, section: event.target.value }))}
            />
            <TextInput
              label="Capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
              error={errors.capacity}
              required
            />
            <TextInput
              label="Attendance threshold (%)"
              type="number"
              min="0"
              max="100"
              value={form.attendanceThreshold}
              onChange={(event) => setForm((current) => ({ ...current, attendanceThreshold: event.target.value }))}
            />
            <TextInput
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              error={errors.startDate}
              required
            />
            <TextInput
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              error={errors.endDate}
              required
            />
          </div>

          <TextArea
            label="Description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={2}
          />

          <div>
            <p className="label-xs mb-1.5">Subjects</p>
            <CheckboxGroup
              options={SUBJECTS.map((subject) => ({ value: subject.id, label: subject.name }))}
              value={form.subjectIds}
              onChange={(subjectIds) => setForm((current) => ({ ...current, subjectIds }))}
            />
          </div>

          <div>
            <p className="label-xs mb-1.5">Faculty</p>
            <CheckboxGroup
              options={allFaculty.map((faculty) => ({ value: faculty.id, label: faculty.name, description: faculty.title }))}
              value={form.facultyIds}
              onChange={(facultyIds) => setForm((current) => ({ ...current, facultyIds }))}
              emptyLabel="No faculty account exists yet"
            />
          </div>

          <FormError>{formError}</FormError>
        </form>
      </Modal>

      <Drawer
        open={Boolean(rosterFor)}
        onClose={() => setRosterFor(null)}
        title={rosterFor ? `Roster — ${rosterFor.name}` : 'Roster'}
        description="Assign students to this batch. Enrolment changes are audited."
        width="max-w-[520px]"
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setRosterFor(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={saveRoster}>
              Save roster
            </Button>
          </div>
        }
      >
        {rosterFor ? (
          <div className="space-y-3">
            <div className="rounded-[10px] bg-[var(--surface-sunken)] p-3">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-ink">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> {rosterSelection.length} of {rosterFor.capacity} seats selected
              </p>
              <ProgressBar value={(rosterSelection.length / rosterFor.capacity) * 100} height={5} className="mt-1.5" tone="sky" />
            </div>
            <CheckboxGroup
              columns={1}
              options={allStudents.map((student) => ({
                value: student.id,
                label: student.name,
                description: student.email,
              }))}
              value={rosterSelection}
              onChange={setRosterSelection}
              emptyLabel="No student account exists yet"
            />
            <p className="text-[10px] leading-relaxed text-soft">
              Removing a student from the batch does not delete their attempts or attendance; those records stay attached to
              the batch they were created in.
            </p>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
