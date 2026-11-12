# Vyuh workspace data dictionary — fees, support AI, attendance and performance

Date: 12 November 2026 · Branch: `arena/e5700049-vyuh-v1`

This dictionary describes the **frontend demonstration store** used by the four
workspace enhancements. It is a data contract for the mock services and page
components, not a backend schema. All records are local to the browser and are
not secure: `src/data/mock/mock-storage.js` is the only module that touches
`localStorage`.

---

## 1. Store envelope

| Field | Value / meaning |
| --- | --- |
| `STORAGE_KEY` | `vyuh:mock:v1` — unchanged. |
| `SCHEMA_VERSION` | `5`. A persisted store with a lower version is reseeded. |
| `seededAt` | Timestamp recorded by the seed mechanism. |
| `institute` | Institute identity used on receipts and reports. |
| Collections | `users`, `students`, `faculty`, `batches`, `subjects`, `questions`, `exams`, `attempts`, `classes`, `attendance`, `recordings`, `doubts`, `notifications`, `approvals`, `integrity`, `supportTickets`, `supportAiConversations`, `fees`, `payments`, `feeRequests`, `audit`, `aiConversations`, `settings`. |
| New in v5 | `supportAiConversations`, `fees`, `payments`, `feeRequests`. |

`buildSeed()` in `src/data/mock/seed.js` is the single assembly point. The
relative demo teaching week is rebased through
`rebaseDemoTimeline(store, seedNow)`; fee deadlines, initial payment dates,
support-AI conversation dates and seeded fee-request dates are also generated
relative to `seedNow`. Authored notification, audit, policy and core support
ticket dates remain the existing demonstration dates.

---

## 2. Fee and payment records

### `fees[]` — approved charge records

| Field | Meaning |
| --- | --- |
| `id`, `code` | Stable fee ID and human-readable `FEE-…` code. |
| `studentId`, `instituteId`, `courseId`, `batchId` | Relationships to existing records. |
| `category` | `tuition`, `exam`, `registration` or `other`. |
| `title`, `description` | What the charge covers. |
| `amount`, `currency` | The one authored charge amount. Currency is `INR`. |
| `dueDate` | Current approved deadline. An approved extension updates this field. |
| `approvalStatus`, `approvedBy`, `approvedAt` | Approved-record provenance. |
| `instalmentPlan` | Optional approved schedule for an existing outstanding balance; no new charge is created. |
| `source` | `course-fee-plan` or `admin-created`. |

**Source of truth:** all course charge amounts originate from
`COURSE_FEE_PLANS` in `src/data/mock/fees.mock.js`, or from an explicit
`feeService.createFee()` / `feeService.updateFee()` Admin action. Page
components never invent an amount. Derived balances are calculated by
`src/lib/fee-calculations.js`, never stored on a fee record.

### `payments[]` — local transaction records

| Field | Meaning |
| --- | --- |
| `id`, `transactionId`, `receiptReference` | Stable record ID, transaction reference and receipt reference. A successful record has both references. |
| `feeId`, `studentId` | Relationships; the same fee ID is used by Student and Admin. |
| `amount`, `currency`, `paidAt` | Amount and timestamp. |
| `method` | `upi`, `netbanking`, `card`, `bank-transfer` or `cash` — all demo/offline labels. |
| `status` | `success`, `failed` or `pending`. Only `success` reduces a balance. |
| `source` | `seed-history`, `student-simulated` or `admin-offline`. |
| `gatewayLabel` | Explicitly says no real gateway was contacted. |
| `note` | Local explanation, e.g. "Simulated failure requested in the demo; no funds moved." |

**No financial credentials:** no UPI ID, bank account, card number, PIN, CVV or
password is collected. `paymentService.simulatePayment()` creates a local
success/failure record only; `recordOfflinePayment()` is an Admin office record.
`src/lib/receipt.js` generates a self-contained print-friendly HTML receipt via
Blob/object URL. It is a demonstration document, not a gateway document.

### `feeRequests[]` — shared Student/Admin request thread

| Field | Meaning |
| --- | --- |
| `id`, `code` | Stable request ID and `REQ-…` reference. |
| `studentId`, `feeId` | Requester and optional fee record. General queries may have `feeId: null`. |
| `type` | `query`, `correction`, `extension` or `instalment`. |
| `subject`, `description` | Student's request. |
| `proposedDueDate` | Required for extension; optional first date for instalments. |
| `requestedInstalments` | 2–4, for instalment requests. |
| `status` | `pending`, `approved`, `rejected` or `resolved`. |
| `decisionNote`, `reviewedBy`, `reviewedAt` | Admin decision. |
| `replies[]` | Shared thread. Each reply has `authorId`, `authorRole`, `body`, `createdAt` and `kind` (`reply` or `decision`). |

Admin review may apply an approved extension, a corrected amount that is not
lower than the amount already paid, or an instalment schedule for the existing
outstanding balance. The request ID is shared across both workspaces.

### Derived fee fields

`decorateFee()` adds `paidAmount`, `outstandingAmount`, `paymentStatus`,
`overdue`, `paymentReference`, `receiptReference`, `failedPayments`,
`studentName`, `batchName`, `courseName`, `categoryLabel` and currency labels.
`summariseFees()` adds totals, collection rate, counts, next due fee and latest
payment. `buildFeeReports()` adds category, batch and successful-payment-month
views. `REPORT_DEFINITIONS` includes `report_fee_dues`; Admin Reports and the
new Admin Payments page use the same service report data.

Status vocabulary: `paid`, `part-paid`, `pending`, `overdue`, `success`,
`failed`, `approved`, `rejected`, `resolved`. Exact labels are centralised in
`src/ui/workspace-kit.jsx` and `src/data/mock/fees.mock.js`.

---

## 3. Support records

### `supportTickets[]` — one shared Student/Faculty/Admin ticket space

| Field | Meaning |
| --- | --- |
| `id`, `code` | Stable ticket ID and `TKT-…` reference. |
| `userId`, `role` | Requester and role (`student` or `faculty`). |
| `category`, `subject`, `description`, `priority` | Request details. |
| `status` | `open`, `in-progress`, `waiting-for-student`, `resolved`, `closed`. |
| `attachments[]` | Metadata only: `name`, `type`, `size`, `note`, `addedAt`. No file content is uploaded. |
| `replies[]`, `statusEvents[]` | Shared replies and auditable status changes. |
| `assignedTo`, `source`, `context` | Admin owner; `direct` or `ai-escalation`; optional escalated conversation transcript. |

`supportService.decorate()` builds a single `activity[]` timeline from the
created event, replies, reopens and status events. Admin replies/change status
create in-app notifications for the requester; student/faculty replies and
reopens notify Admin. `reopenTicket()` is available only for `resolved` or
`closed` tickets and requires a reason.

### `supportAiConversations[]` — deterministic mock response conversations

| Field | Meaning |
| --- | --- |
| `id`, `userId`, `role`, `channel` | Conversation identity. `channel` is `ai-auto-support`. |
| `title`, `createdAt`, `updatedAt` | Display metadata. |
| `messages[]` | Student/faculty question, assistant mock answer, or system escalation note. |
| `escalatedTicketId` | The real `supportTickets` ID created by escalation. |
| `lastTopic`, `lastCategory` | Intent metadata from the last response. |

Assistant messages carry
`sourceLabel: "Mock response service · deterministic templates, not a live AI model"`.
`MockSupportResponseProvider` in `src/services/support-ai.service.js` matches
keywords and renders local templates from `buildSupportContext()` (Student) or
`buildFacultySupportContext()` (Faculty). There is no hosted language model, API
key or external AI provider. Escalation creates a real Admin Support ticket with
a transcript and the same conversation/ticket ID link.

---

## 4. Attendance day view

Existing `classes[]` and `attendance[]` records remain the source. A second
eligible ended session (`class_010`, with `att_022`–`att_024`) demonstrates two
classes on one day. `src/lib/attendance-calculations.js` now adds:

| Derived field / view | Meaning |
| --- | --- |
| `dateKey`, `dateLabel` | Institute-local day key and display label. |
| `firstIn`, `lastOut`, `firstInLabel`, `lastOutLabel` | Check-in/check-out signals from existing join/leave events. |
| `lateArrivalMinutes`, `earlyDepartureMinutes` | Difference from session start/end after grace. |
| `checkoutNote` | Missing check-in/out or in-progress session note. |
| `isEligible`, `isPending` | Only a session with a recorded actual end can produce a percentage. |
| `dayView.days[]` | Eligible sessions grouped by date, with class count, attended/eligible/missed minutes, percentage and late/early/threshold counts. |
| `dayView.dayByKey` | Date-picker lookup. |
| `dayView.nonEligibleByDate` | Scheduled/live sessions shown separately; no fabricated percentage. |
| `dayView.monthly` | Monthly duration-based percentages and warning counts. |
| `dayView.timingWarnings` | Late arrival, early departure and below-threshold reasons. |

Attendance percentage is always eligible attended minutes divided by eligible
class minutes. Reconnects are merged; intervals are clipped to the eligible
window and never double-count. The page never grades a live or scheduled class.

---

## 5. Performance hierarchy

`performanceService.getStudentPerformance()` composes existing graded attempts,
saved responses and participation records without combining them into a fake
composite academic score.

| Block | Derived from | Examples |
| --- | --- | --- |
| `overview` | `analysisService.getStudentPerformance()` | attempts, average score/accuracy/pace, answer distribution, latest-vs-previous comparison, subject momentum, topic strength groups, recommendations. |
| `academic` | Graded attempts, `evaluateAttempt()`, question marks and responses | chronological points, subject trend, topic trend, subject averages. |
| `participation` | Attendance, classes and doubts | attendance %, attended/missed hours, class counts, doubt response rate. |
| Exam-analysis tab | `analysisService.getDetailedAnalysis(attemptId)` | Level A summary, Level B subject/section breakdown, Level C topic strengths/weaknesses, time insight, recommendations and question-level link. |

`notes.academicNote` and `notes.participationNote` are explicit: academic
figures come from marks/responses; participation is shown separately and is not
combined into an academic score.

---

## 6. Notifications and audit events

`src/lib/notification-visual.js` classifies `fees`, `support-status` and
`fee-request` events. New notification types include `fee-payment`,
`fee-created`, `fee-updated`, `fee-request`, `fee-request-update`,
`support-update` and `support-status`. Links target
`/student/payment-dues`, `/admin/payments?tab=requests&request=…`,
`/admin/payments?payment=…`, `/admin/support?ticket=…`, `/student/support` or
`/faculty/support`.

New audit actions include `payment.simulated`, `payment.offline-recorded`,
`fee.created`, `fee.updated`, `fee-request.created`, `fee-request.replied`,
`fee-request.reviewed`, `support.created`, `support.replied`,
`support.status-changed`, `support.reopened` and `support.ai-escalated`.

---

## 7. Limitations

- Browser `localStorage` is not secure and can be edited from devtools.
- Services are demo-local; the route guard is the authorisation enforcement point.
- No real payment gateway, external AI model or file-upload service is contacted.
- JSDOM audits verify DOM, service state, CSS coverage and console cleanliness,
  not pixels or real mobile viewport layout.
- Schema v5 reseeds existing `vyuh:mock:v1` stores with an older version; local
  demo edits are intentionally replaced on version mismatch.
