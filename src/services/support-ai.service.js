/* ------------------------------------------------------------------\n   AI Auto Support — clearly identified MOCK RESPONSE SERVICE.\n   There is no hosted language model, API key or external AI provider. Replies\n   are deterministic templates routed by keyword intent and grounded in the\n   student's existing mock records (attempts, attendance, fees, tickets).\n------------------------------------------------------------------- */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord } from '../data/mock/mock-storage.js'
import { findUser, addAuditEvent } from './repository.js'
import { buildSupportContext, buildFacultySupportContext } from '../lib/support-context.js'
import { formatMinutes } from '../lib/time.js'
import {
  SUPPORT_AI_SUGGESTED_QUESTIONS,
  SUPPORT_AI_FACULTY_SUGGESTED_QUESTIONS,
  SUPPORT_AI_INTENTS,
  SUPPORT_CATEGORIES,
} from '../data/mock/support.mock.js'
import { supportService } from './support.service.js'

export const MockSupportResponseProvider = {
  id: 'vyuh-mock-support-response-v1',
  name: 'Mock response service',
  description: 'Deterministic local templates grounded in Vyuh mock records. No live AI model or external provider is connected.',
  sourceLabel: 'Mock response service · deterministic templates, not a live AI model',
  matchIntent,
  generate(text, context) {
    const intent = matchIntent(text)
    const isFaculty = context?.role === 'faculty'
    return {
      intentId: intent?.id || 'general',
      category: intent?.category || 'Application',
      body: isFaculty
        ? renderFacultyTemplate(intent, String(text || ''), context)
        : renderTemplate(intent, String(text || ''), context),
      suggested: intent?.followUps || (isFaculty ? [
        'How do I publish an examination?',
        'Where do student doubts appear?',
        'How do I contact Admin Support?',
      ] : [
        'How is attendance calculated?',
        'What fees are outstanding?',
        'How do I contact Admin Support?',
      ]),
      sourceLabel: MockSupportResponseProvider.sourceLabel,
      generatedAt: nowIso(),
    }
  },
}

function matchIntent(text) {
  const lower = String(text || '').toLowerCase()
  let best = null
  let bestScore = 0
  SUPPORT_AI_INTENTS.forEach((intent) => {
    const score = intent.keywords.reduce((total, keyword) => total + (lower.includes(keyword) ? 1 : 0), 0)
    if (score > bestScore) {
      best = intent
      bestScore = score
    }
  })
  return best
}

function renderTemplate(intent, text, context) {
  const firstName = String(context.studentName || 'there').split(' ')[0]
  const attendance = context.attendance || {}
  const academic = context.academic || {}
  const fees = context.fees || {}
  const support = context.support || {}
  const classes = context.classes || {}
  const id = intent?.id || 'general'

  const responses = {
    attendance: `${firstName}, attendance is eligible attended minutes divided by eligible class minutes, not a class count. Your saved records currently show ${attendance.percentage}% (${formatMinutes(attendance.attendedMinutes)} of ${formatMinutes(attendance.eligibleMinutes)} eligible) across ${attendance.sessions} recorded sessions; the threshold is ${attendance.threshold}%. Open Attendance and choose a date to see each class's check-in, check-out, late arrival and early departure. Reconnections are merged so a gap is never double-counted.`,
    fees: `Your Payment & Dues records show ${fees.totalFeesLabel} billed, ${fees.totalPaidLabel} paid and ${fees.totalOutstandingLabel} outstanding. ${fees.nextDueLabel ? `The next upcoming deadline is ${fees.nextDueLabel} for ${fees.nextDueFee}.` : 'There is no upcoming fee deadline.'} ${fees.overdueCount ? `${fees.overdueCount} fee record(s) are overdue.` : 'No fee record is overdue.'} Pay Now is a simulated local demo: no real gateway or banking/card credentials are used. Successful payments create a transaction ID and a downloadable demonstration receipt.`,
    performance: `${academic.attempts ? `Across ${academic.attempts} graded attempt(s), your average score is ${academic.averageScore}% and average accuracy is ${academic.averageAccuracy}%.` : 'You have no graded attempts yet, so there are no derived performance metrics.'} ${academic.latestTitle ? `The latest paper is “${academic.latestTitle}” (${academic.latestScore}% score, ${academic.latestAccuracy}% accuracy).` : ''} Open Performance for the cross-exam summary, switch to Examination analysis for one paper, and follow the question-level analysis link for individual responses.`,
    support: `You have ${support.pendingTickets} pending Admin Support ticket(s) out of ${support.totalTickets} total. ${support.latestTicketCode ? `The most recent is ${support.latestTicketCode}, currently ${support.latestTicketStatus}.` : ''} Use the Admin Support tab to raise a ticket with a category, subject, description and optional attachment metadata; the Admin Workspace replies in the same thread. Resolved or closed tickets can be reopened with a reason. In-app notifications are created when an admin responds or changes a status.`,
    classes: `${classes.upcoming ? `You have ${classes.upcoming} scheduled class(es); the next is “${classes.nextClassTitle}” on ${classes.nextClassLabel}.` : 'There is no scheduled class in your current batch.'} Use Live Classes to join a started session and Recordings for published sessions. A live or scheduled class has no eligible attendance percentage until the actual session end has been recorded.`,
    account: `For sign-in, password or profile changes, use Profile / Account in your workspace. If a reset or account change is not working, raise an Admin Support ticket under Account. Include what you clicked and what you expected; do not share a password in the ticket. This assistant is a local mock response service and cannot change account credentials.`,
    general: `I can help with academic and application questions about attendance, examination analysis, course fees, payments, receipts, live classes, and Admin Support tickets. This is a deterministic mock response service, not a live AI model. I did not find a specific intent in “${String(text).slice(0, 90)}” — try a suggested question, or escalate to Admin Support for a human response.`,
  }
  return responses[id] || responses.general
}

function renderFacultyTemplate(intent, text, context) {
  const firstName = String(context.facultyName || 'there').split(' ')[0]
  const classes = context.classes || {}
  const exams = context.exams || {}
  const doubts = context.doubts || {}
  const recordings = context.recordings || {}
  const support = context.support || {}
  const id = intent?.id || 'general'
  const responses = {
    performance: `${firstName}, your teaching records show ${exams.total} examination(s): ${exams.drafts} draft, ${exams.pendingApproval} pending approval and ${exams.published} published. Submit a draft for approval from the examination workspace; published papers are locked so students see a stable paper. Duplicate a published examination before editing questions.`,
    exams: `${firstName}, your teaching records show ${exams.total} examination(s): ${exams.drafts} draft, ${exams.pendingApproval} pending approval and ${exams.published} published. Use the examination workspace to submit a draft for approval. Use the question bank to review items before they enter a paper.`,
    attendance: `For your sessions, attendance is eligible attended minutes divided by eligible class minutes. Join and leave events are paired and merged, so a reconnect does not double-count. You have ${classes.total} class record(s) across ${classes.batchCount} batch(es), with ${classes.upcoming} scheduled. Corrections go through the attendance request flow and require administrator approval, not a direct edit.`,
    classes: `${classes.upcoming ? `You have ${classes.upcoming} scheduled class(es); the next is “${classes.nextTitle}” on ${classes.nextLabel}.` : 'There is no upcoming scheduled class in your records.'} Ending a session creates the recording workflow. ${recordings.pending} recording(s) still need processing or review. Use Live Classes to start or end a session, and Recordings to publish a ready file.`,
    recordings: `${recordings.pending ? `${recordings.pending} recording(s) are awaiting processing or review in your classes.` : 'No recording is awaiting processing in your class records.'} End the session first, wait for the mock processing record, then publish. If playback is distorted or an upload failed, raise an Admin Support ticket with the session ID and optional attachment metadata.`,
    doubts: `You have ${doubts.open} open student doubt(s), ${doubts.answered} answered/resolved and ${doubts.total} total. Open Doubts to choose one, read the attached context and add a faculty response. A student sees the response in the same thread; verify any mathematical or conceptual explanation before posting.`,
    support: `You have ${support.pendingTickets} pending Admin Support ticket(s) of ${support.totalTickets} total. ${support.latestTicketCode ? `The latest is ${support.latestTicketCode}, currently ${support.latestTicketStatus}.` : ''} Use the Admin Support tab to raise a ticket, reply in the same thread and reopen a resolved or closed ticket with a reason. In-app notifications are created when Admin responds.`,
    fees: `${firstName}, fee records, dues and payments are managed by Admin Workspace and shown to students in Payment & Dues. Faculty Support does not change amounts. For a fee-related operational issue, raise an Admin Support ticket under Fees & Payments; do not include banking or card details.`,
    account: `For sign-in, password or profile changes, use Faculty Account. If a reset is not working, raise an Admin Support ticket under Account and include what you clicked and what you expected. Do not share a password in the ticket. This is a deterministic mock response service, not a live AI model.`,
    general: `I can help with teaching operations: examination approval and locked papers, attendance rules, live classes, recordings, student doubts, and Admin Support tickets. This is a deterministic mock response service, not a live AI model. I did not find a specific intent in “${String(text).slice(0, 90)}” — try a suggested question or escalate to Admin Support.`,
  }
  // The keyword router uses 'performance' for exam/result words and 'classes'
  // for class/recording words; tune the recording answer when it is explicit.
  if (String(text).toLowerCase().includes('recording')) return responses.recordings
  if (String(text).toLowerCase().includes('doubt')) return responses.doubts
  if (['exam', 'question', 'publish', 'approval'].some((word) => String(text).toLowerCase().includes(word))) {
    return responses.performance
  }
  return responses[id] || responses.general
}

function decorate(conversation) {
  return {
    ...conversation,
    messageCount: (conversation.messages || []).length,
    lastMessageAt: conversation.messages?.length ? conversation.messages[conversation.messages.length - 1].at : conversation.createdAt,
  }
}

export const supportAiService = {
  provider: MockSupportResponseProvider,

  async listConversations(userId) {
    return request(() => {
      const conversations = sortBy(
        readAll('supportAiConversations').filter((item) => item.userId === userId),
        (item) => item.updatedAt,
        'desc',
      ).map(decorate)
      return {
        conversations,
        suggestions: findUser(userId)?.role === 'faculty' ? SUPPORT_AI_FACULTY_SUGGESTED_QUESTIONS : SUPPORT_AI_SUGGESTED_QUESTIONS,
        provider: {
          id: MockSupportResponseProvider.id,
          name: MockSupportResponseProvider.name,
          description: MockSupportResponseProvider.description,
          sourceLabel: MockSupportResponseProvider.sourceLabel,
        },
      }
    }, { latency: 180, label: 'support-ai' })
  },

  async getConversation(conversationId) {
    return request(() => {
      const conversation = readAll('supportAiConversations').find((item) => item.id === conversationId)
      assert(conversation, 'That AI Auto Support conversation does not exist.', { code: 'not-found', status: 404 })
      return decorate(conversation)
    }, { latency: 120, label: 'support-ai' })
  },

  async createConversation(userId, title = 'New AI Auto Support conversation') {
    return request(() => {
      assert(['student', 'faculty'].includes(findUser(userId)?.role), 'AI Auto Support is available to student and faculty accounts.', { code: 'forbidden', status: 403 })
      const at = nowIso()
      const conversation = {
        id: createId('supportchat'),
        userId,
        role: findUser(userId)?.role || 'student',
        channel: 'ai-auto-support',
        title,
        createdAt: at,
        updatedAt: at,
        messages: [],
        escalatedTicketId: null,
      }
      insert('supportAiConversations', conversation)
      return decorate(conversation)
    }, { latency: 160, label: 'support-ai' })
  },

  async sendMessage(conversationId, text, actor) {
    return request(() => {
      assert(String(text || '').trim().length > 2, 'Type a question for AI Auto Support.', { code: 'validation' })
      const store = loadStore()
      const conversation = store.supportAiConversations.find((item) => item.id === conversationId)
      assert(conversation, 'That AI Auto Support conversation does not exist.', { code: 'not-found', status: 404 })
      assert(actor?.id === conversation.userId, 'You can only write in your own support conversation.', { code: 'forbidden', status: 403 })
      const question = String(text).trim()
      const context = actor?.role === 'faculty'
        ? buildFacultySupportContext(store, actor.id)
        : buildSupportContext(store, actor.id)
      const response = MockSupportResponseProvider.generate(question, context)
      const at = nowIso()
      const studentMessage = {
        id: createId('supportmsg'),
        role: actor?.role === 'faculty' ? 'faculty' : 'student',
        text: question,
        at,
      }
      const assistantMessage = {
        id: createId('supportmsg'),
        role: 'assistant',
        text: response.body,
        at: new Date(new Date(at).getTime() + 700).toISOString(),
        topic: response.intentId,
        category: response.category,
        sourceLabel: response.sourceLabel,
        suggested: response.suggested,
      }
      const messages = [...conversation.messages, studentMessage, assistantMessage]
      const next = {
        ...conversation,
        title: conversation.messages.length === 0 ? question.slice(0, 70) : conversation.title,
        messages,
        updatedAt: assistantMessage.at,
        lastTopic: response.intentId,
        lastCategory: response.category,
      }
      updateRecord('supportAiConversations', conversationId, next)
      return { conversation: decorate(next), studentMessage, assistantMessage }
    }, { latency: 420, label: 'support-ai' })
  },

  /** Escalates the existing mock conversation to a real Admin Support ticket. */
  async escalateToAdmin(conversationId, actor, { reason = 'Please review this conversation and advise.' } = {}) {
    return request(async () => {
      const store = loadStore()
      const conversation = store.supportAiConversations.find((item) => item.id === conversationId)
      assert(conversation, 'That AI Auto Support conversation does not exist.', { code: 'not-found', status: 404 })
      assert(actor?.id === conversation.userId, 'You can only escalate your own support conversation.', { code: 'forbidden', status: 403 })
      assert((conversation.messages || []).length > 0, 'Ask a question before escalating to Admin Support.', { code: 'validation' })
      const lastStudent = [...conversation.messages].reverse().find((message) => message.role === 'student')
      const lastAssistant = [...conversation.messages].reverse().find((message) => message.role === 'assistant')
      const category = SUPPORT_CATEGORIES.includes(lastAssistant?.category) ? lastAssistant.category : 'Application'
      const transcript = conversation.messages
        .slice(-6)
        .map((message) => `${message.role === 'student' ? 'Student' : message.role === 'faculty' ? 'Faculty' : message.role === 'system' ? 'System' : 'Mock response'}: ${message.text}`)
        .join('\n')
      const ticket = await supportService.createTicket(
        {
          category,
          subject: `AI Support escalation — ${String(lastStudent?.text || conversation.title).slice(0, 62)}`,
          description: `${String(reason).trim()}\n\nEscalated from AI Auto Support (deterministic mock response service, not a live AI model).\n\nConversation summary:\n${transcript}`,
          priority: 'normal',
          source: 'ai-escalation',
          context: { conversationId, transcript, lastTopic: lastAssistant?.topic || 'general' },
          attachments: [],
        },
        actor,
      )
      const at = nowIso()
      const systemMessage = {
        id: createId('supportmsg'),
        role: 'system',
        text: `Escalated to Admin Support as ${ticket.code}. Continue in the Admin Support tab.`,
        at,
        sourceLabel: 'Escalation',
      }
      updateRecord('supportAiConversations', conversationId, {
        messages: [...conversation.messages, systemMessage],
        updatedAt: at,
        escalatedTicketId: ticket.id,
      })
      addAuditEvent({
        actor,
        action: 'support.ai-escalated',
        actionLabel: 'AI Auto Support conversation escalated',
        entityType: 'ticket',
        entityId: ticket.id,
        entityLabel: ticket.subject,
        previousValue: 'Mock response conversation',
        newValue: ticket.code,
        reason: 'Student requested Admin Support review',
      })
      return { ticket, conversation: decorate(loadStore().supportAiConversations.find((item) => item.id === conversationId)) }
    }, { latency: 220, label: 'support-ai' })
  },
}
