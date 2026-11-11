import { useMemo, useState } from 'react'
import { Download, FileBarChart, Filter, Printer, RefreshCw } from 'lucide-react'
import useAsync from '../../lib/useAsync.js'
import { adminService } from '../../services/admin.service.js'
import { batchService } from '../../services/batch.service.js'
import { examService } from '../../services/exam.service.js'
import { REPORT_DEFINITIONS } from '../../data/mock/reports.mock.js'
import { SUBJECTS } from '../../data/mock/subjects.mock.js'
import { ErrorState, LoadingBlock, EmptyState } from '../../ui/states.jsx'
import { PageHeader } from '../../ui/workspace-kit.jsx'
import Button from '../../ui/Button.jsx'
import { useToast } from '../../ui/feedback.jsx'

export default function AdminReportsPage() {
  const toast = useToast()
  const [reportId, setReportId] = useState(REPORT_DEFINITIONS[0].id)
  const [filters, setFilters] = useState({ batchId: 'all', subjectId: 'all', examId: 'all' })
  const [query, setQuery] = useState('')

  const definition = useMemo(
    () => REPORT_DEFINITIONS.find((report) => report.id === reportId) || REPORT_DEFINITIONS[0],
    [reportId],
  )

  const { data, error, loading, refresh } = useAsync(
    () => adminService.getReportData(reportId, filters),
    [reportId, filters.batchId, filters.subjectId, filters.examId],
  )

  const batches = useAsync(() => batchService.listBatches(), [])
  const exams = useAsync(() => examService.listExams(), [])


  const rows = useMemo(() => {
    const source = data?.rows || []
    const needle = query.trim().toLowerCase()
    if (!needle) return source
    return source.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(needle)))
  }, [data, query])

  const downloadCsv = () => {
    if (!data?.columns?.length) return
    const header = data.columns.map((column) => column.label)
    const body = rows.map((row) => data.columns.map((column) => row[column.key] ?? ''))
    const escape = (cell) => `"${String(cell).replace(/"/g, '""')}"`
    const csv = [header, ...body].map((line) => line.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${reportId}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
    toast.success('Report exported', `${rows.length} rows written to ${reportId}.csv`)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Institute admin"
        title="Reports"
        description="Every report is generated from stored records with the filters you choose. Export writes exactly what you see."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => refresh()}>
              Run again
            </Button>
            <Button size="sm" variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            <Button size="sm" variant="primary" icon={Download} onClick={downloadCsv} disabled={!rows.length}>
              Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="surface-flat h-fit p-2">
          <p className="px-2 py-1 label-xs">Available reports</p>
          <ul className="space-y-0.5">
            {REPORT_DEFINITIONS.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setReportId(report.id)
                  }}
                  className={`w-full rounded-[8px] px-2.5 py-1.5 text-left text-[11.5px] transition ${
                    reportId === report.id ? 'bg-[var(--ink)] text-white' : 'text-ink-70 hover:bg-[var(--surface-sunken)]'
                  }`}
                >
                  {report.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-3">
          <section className="surface-flat p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                  <FileBarChart className="h-3.5 w-3.5" aria-hidden="true" /> {definition.name}
                </h2>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{definition.description}</p>
                <p className="mt-1 text-[10px] text-soft">
                  Metrics: {definition.metrics.join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-soft" aria-hidden="true" />
                {definition.filters.includes('batchId') ? (
                  <select
                    value={filters.batchId}
                    onChange={(event) => setFilters((current) => ({ ...current, batchId: event.target.value }))}
                    className="field-select w-auto"
                    aria-label="Filter by batch"
                  >
                    <option value="all">All batches</option>
                    {(batches.data || []).map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                {definition.filters.includes('subjectId') ? (
                  <select
                    value={filters.subjectId}
                    onChange={(event) => setFilters((current) => ({ ...current, subjectId: event.target.value }))}
                    className="field-select w-auto"
                    aria-label="Filter by subject"
                  >
                    <option value="all">All subjects</option>
                    {SUBJECTS.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                {definition.filters.includes('examId') ? (
                  <select
                    value={filters.examId}
                    onChange={(event) => setFilters((current) => ({ ...current, examId: event.target.value }))}
                    className="field-select w-auto"
                    aria-label="Filter by examination"
                  >
                    <option value="all">All examinations</option>
                    {(exams.data || []).map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>
          </section>

          <section className="surface-flat overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
              <p className="text-[11.5px] font-medium text-ink">
                {rows.length} row{rows.length === 1 ? '' : 's'}
              </p>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field-input w-[200px]"
                placeholder="Filter rows…"
                aria-label="Filter report rows"
              />
            </div>

            {loading ? (
              <div className="p-4">
                <LoadingBlock rows={5} />
              </div>
            ) : error ? (
              <div className="p-4">
                <ErrorState error={error} onRetry={refresh} title="This report could not be generated" />
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                compact
                icon={FileBarChart}
                title="No rows for these filters"
                description="Widen the filters, or pick another report."
              />
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      {data.columns.map((column) => (
                        <th key={column.key} className={column.align === 'right' ? 'align-right' : ''}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.id || row.studentId || row.facultyId || row.batchId || index}>
                        {data.columns.map((column) => (
                          <td key={column.key} className={column.align === 'right' ? 'align-right tabular' : ''}>
                            {typeof row[column.key] === 'number' ? Number(row[column.key]).toLocaleString('en-IN') : String(row[column.key] ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-[10px] leading-relaxed text-soft">
            Reports read live records, so a report generated twice within the same second is identical. Values are never
            stored as a snapshot; if a correction is approved later, the next run reflects it.
          </p>
        </div>
      </div>
    </div>
  )
}
