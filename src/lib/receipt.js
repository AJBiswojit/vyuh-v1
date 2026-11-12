/* ------------------------------------------------------------------\n   Demonstration receipt generation. Vyuh already uses Blob-based CSV export\n   in Admin Reports; this reuses that browser capability for a self-contained\n   HTML receipt. It is not a payment-gateway document and contains no banking
   or card credentials.\n------------------------------------------------------------------- */

import { formatCurrency } from './fee-calculations.js'
import { formatDateTime } from './time.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildReceiptLines(data) {
  const { payment, fee, student, institute } = data
  return [
    { label: 'Receipt reference', value: payment.receiptReference || '—' },
    { label: 'Transaction ID', value: payment.transactionId },
    { label: 'Payment date', value: formatDateTime(payment.paidAt) },
    { label: 'Student', value: `${student?.name || payment.studentId} · ${student?.enrollmentId || '—'}` },
    { label: 'Fee record', value: `${fee?.code || payment.feeId} · ${fee?.title || 'Fee record'}` },
    { label: 'Category', value: fee?.categoryLabel || '—' },
    { label: 'Method', value: payment.methodLabel || payment.method },
    { label: 'Amount', value: formatCurrency(payment.amount, payment.currency) },
    { label: 'Status', value: payment.statusLabel || payment.status },
    { label: 'Institute', value: institute?.name || 'Vyuh Academy' },
  ]
}

export function buildReceiptHtml(data) {
  const { institute, payment } = data
  const rows = buildReceiptLines(data)
    .map(
      (row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`,
    )
    .join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(payment.receiptReference || payment.transactionId)} — Vyuh demonstration receipt</title>
<style>
  :root { --sky:#AED9F0; --cream:#F5F0DF; --ink:#242729; --white:#FFFFFF; }
  * { box-sizing:border-box; } body { margin:0; padding:32px; background:var(--cream); color:var(--ink); font-family:system-ui,-apple-system,Segoe UI,sans-serif; }
  main { max-width:720px; margin:auto; background:var(--white); border:1px solid rgba(36,39,41,.14); border-top:8px solid var(--sky); border-radius:18px; padding:32px; }
  .eyebrow { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:#23536e; }
  h1 { font-size:26px; margin:8px 0 4px; } p { color:rgba(36,39,41,.7); line-height:1.5; }
  table { width:100%; border-collapse:collapse; margin-top:24px; } th,td { text-align:left; padding:10px 8px; border-bottom:1px solid rgba(36,39,41,.1); font-size:13px; vertical-align:top; }
  th { width:34%; color:rgba(36,39,41,.6); font-weight:500; } td { font-weight:600; }
  .note { margin-top:24px; padding:12px 14px; border:1px solid rgba(36,39,41,.12); background:#F4FAFD; border-radius:10px; font-size:12px; }
  @media print { body { background:white; padding:0; } main { border:0; border-top:8px solid var(--sky); border-radius:0; } }
</style></head><body><main>
  <p class="eyebrow">Vyuh Academy · demonstration receipt</p>
  <h1>${escapeHtml(institute?.name || 'Vyuh Academy')}</h1>
  <p>${escapeHtml(institute?.address || '')}</p>
  <table>${rows}</table>
  <p class="note">This is a local demonstration record for ${escapeHtml(payment.transactionId)}. No real payment gateway was contacted and no banking or card credentials were collected. Use Print / Save as PDF from this file if a portable copy is needed.</p>
</main></body></html>`
}

export function downloadReceipt(data) {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return false
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false
  const html = buildReceiptHtml(data)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = `${data.payment.receiptReference || data.payment.transactionId || 'vyuh-receipt'}.html`
  document.body.appendChild(link)
  link.click()
  link.remove()
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(href)
  return true
}
