import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MailCheck } from 'lucide-react'
import { Logo, Wordmark } from '../../components/Icons.jsx'
import { authService } from '../../services/auth.service.js'
import { FormError, TextArea, TextInput } from '../../ui/fields.jsx'
import Button from '../../ui/Button.jsx'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [pending, setPending] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    if (!email.trim()) {
      setError('Enter the institute email on your account.')
      return
    }
    setPending(true)
    try {
      const result = await authService.requestPasswordReset({ email, reason })
      setMessage(result.message)
    } catch (caught) {
      setError(caught?.message || 'The request could not be sent. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="sky-canvas flex min-h-screen flex-col">
      <div className="shell flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <Wordmark />
        </Link>
        <Link to="/login" className="btn btn-secondary btn-sm">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>

      <main className="shell flex flex-1 items-center justify-center pb-16">
        <div className="w-full max-w-[480px] rounded-[24px] border border-white/80 bg-white/90 p-6 shadow-[var(--shadow-md)] backdrop-blur sm:p-8">
          <p className="label-xs">Account recovery</p>
          <h1 className="mt-2 font-serif text-[28px] leading-tight tracking-[-0.02em] text-ink">Forgot your password?</h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Vyuh does not use self-service password reset. Your request goes to the institute administrator, who issues a
            temporary credential. You will be required to choose a new password at your next sign-in.
          </p>

          {message ? (
            <div className="mt-5 rounded-[14px] border border-[#cfe0c9] bg-[#eef5ec] p-4">
              <div className="flex items-start gap-2.5">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#375f34]" aria-hidden="true" />
                <div>
                  <p className="text-[12.5px] font-medium text-[#2f532c]">Request recorded</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#2f532c]/85">{message}</p>
                </div>
              </div>
              <Link to="/login" className="btn btn-secondary btn-sm mt-4">
                Return to sign in
              </Link>
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
              <TextInput
                label="Institute email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@vyuhacademy.edu.in"
                required
              />
              <TextArea
                label="Anything the administrator should know? (optional)"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="For example: locked out after a device change."
              />
              <FormError>{error}</FormError>
              <Button type="submit" variant="primary" fullWidth loading={pending} iconRight={ArrowRight}>
                Request administrator reset
              </Button>
            </form>
          )}

          <p className="mt-5 border-t border-[var(--line)] pt-4 text-[10.5px] leading-relaxed text-soft">
            This is a frontend demonstration. No email is actually sent — the request creates a support ticket and a
            notification for the administrator inside the mock store.
          </p>
        </div>
      </main>
    </div>
  )
}
