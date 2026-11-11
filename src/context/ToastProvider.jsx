import { useCallback, useMemo, useRef, useState } from 'react'
import { ConfirmContext, ToastContext, ToastViewport, ConfirmDialog } from '../ui/feedback.jsx'

let counter = 0

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmRequest, setConfirmRequest] = useState(null)
  const resolver = useRef(null)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message) => {
      counter += 1
      const id = `toast_${counter}`
      const toast = {
        id,
        tone: message.tone || 'info',
        title: message.title,
        description: message.description,
        duration: message.duration ?? (message.tone === 'error' ? 6000 : 4200),
      }
      setToasts((current) => [...current.slice(-3), toast])
      if (toast.duration > 0) {
        setTimeout(() => dismiss(id), toast.duration)
      }
      return id
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      push,
      success: (title, description) => push({ tone: 'success', title, description }),
      error: (title, description) => push({ tone: 'error', title, description }),
      info: (title, description) => push({ tone: 'info', title, description }),
      dismiss,
    }),
    [push, dismiss],
  )

  const confirm = useCallback((options) => {
    setConfirmRequest(options)
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const resolveConfirm = useCallback((value) => {
    setConfirmRequest(null)
    resolver.current?.(value)
    resolver.current = null
  }, [])

  return (
    <ToastContext.Provider value={api}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <ToastViewport toasts={toasts} onDismiss={dismiss} />
        <ConfirmDialog request={confirmRequest} onResolve={resolveConfirm} />
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}
