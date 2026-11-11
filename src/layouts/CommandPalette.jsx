import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search } from 'lucide-react'
import { NAV_ITEMS } from '../lib/navigation.js'
import { useAuth } from '../context/AuthContext.jsx'

/* Command-style search (⌘K / Ctrl+K). Navigates the current role's workspace
   and includes a few frequent actions. */
export default function CommandPalette({ open, onClose }) {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)

  const actions = useMemo(() => {
    const base = (NAV_ITEMS[role] || []).map((item) => ({
      id: item.to,
      label: item.label,
      group: 'Workspace',
      to: item.to,
    }))
    const extra = {
      student: [
        { id: 'a1', label: 'Ask the AI doubt assistant', group: 'Actions', to: '/student/doubts?tab=ai' },
        { id: 'a2', label: 'Ask a faculty member', group: 'Actions', to: '/student/doubts?tab=faculty' },
        { id: 'a3', label: 'Create a support ticket', group: 'Actions', to: '/student/support' },
      ],
      faculty: [
        { id: 'a1', label: 'Create a question', group: 'Actions', to: '/faculty/question-bank/create' },
        { id: 'a2', label: 'Create an examination', group: 'Actions', to: '/faculty/exams/create' },
        { id: 'a3', label: 'Schedule a live class', group: 'Actions', to: '/faculty/classes/create' },
      ],
      admin: [
        { id: 'a1', label: 'Create a student account', group: 'Actions', to: '/admin/users/create?role=student' },
        { id: 'a2', label: 'Create a faculty account', group: 'Actions', to: '/admin/users/create?role=faculty' },
        { id: 'a3', label: 'Review pending approvals', group: 'Actions', to: '/admin/approvals' },
      ],
    }[role] || []
    return [...base, ...extra]
  }, [role])

  const filtered = useMemo(() => {
    if (!query.trim()) return actions
    const needle = query.toLowerCase()
    return actions.filter((action) => action.label.toLowerCase().includes(needle) || action.group.toLowerCase().includes(needle))
  }, [actions, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setCursor(0)
      return
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 40)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setCursor((value) => Math.min(value + 1, filtered.length - 1))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setCursor((value) => Math.max(value - 1, 0))
      }
      if (event.key === 'Enter' && filtered[cursor]) {
        event.preventDefault()
        navigate(filtered[cursor].to)
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, cursor, navigate, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[94] flex items-start justify-center bg-[rgba(20,22,24,0.4)] px-4 pt-[12vh] backdrop-blur-[2px]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command search"
        className="w-full max-w-[520px] overflow-hidden rounded-[16px] border border-[var(--line)] bg-white shadow-[var(--shadow-lg)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
          <Search className="h-4 w-4 text-soft" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCursor(0)
            }}
            placeholder="Jump to a section or action…"
            className="w-full border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-soft"
            aria-label="Command search input"
          />
          <kbd className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-soft">esc</kbd>
        </div>
        <div className="thin-scroll max-h-[320px] overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-[12.5px] text-soft">No matches in this workspace.</p>
          ) : (
            filtered.map((action, index) => (
              <button
                key={action.id}
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => {
                  navigate(action.to)
                  onClose()
                }}
                className={`flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-[12.5px] transition ${
                  index === cursor ? 'bg-[var(--sky-50)] text-ink' : 'text-ink-70'
                }`}
              >
                <span className="min-w-0 truncate">{action.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-soft">{action.group}</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
