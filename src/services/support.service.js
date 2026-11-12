/* Support tickets for students, faculty and the Admin Support desk.
   Both channels share one supportTickets collection and one ID space. */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord } from '../data/mock/mock-storage.js'
import { findUser, addAuditEvent, notify, notifyMany, publicUser } from './repository.js'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_STATUSES,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUS_LABELS,
} from '../data/mock/support.mock.js'

function normaliseAttachments(input) {
  if (!Array.isArray(input)) return []
  return input
    .slice(0, 5)
    .map((file) => ({
      name: String(file?.name || '').slice(0, 140),
      type: String(file?.type || 'application/octet-stream').slice(0, 120),
      size: Math.max(0, Number(file?.size) || 0),
      note: String(file?.note || 'Attachment metadata only — no file upload in the demo.'),
      addedAt: nowIso(),
    }))
    .filter((file) => file.name)
}

function adminIds(store) {
  return store.users.filter((user) => user.role === 'admin').map((user) => user.id)
}

function nextTicketCode(tickets) {
  const highest = tickets.reduce((max, ticket) => {
    const match = String(ticket.code || '').match(/^TKT-(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 1000)
  return `TKT-${highest + 1}`
}

function ticketLink(ticket) {
  return ticket.role === 'faculty' ? '/faculty/support' : '/student/support'
}

function decorate(ticket) {
  const store = loadStore()
  const user = store.users.find((item) => item.id === ticket.userId)
  const replies = (ticket.replies || []).map((reply) => ({
    id: reply.id,
    authorId: reply.authorId,
    authorRole: reply.authorRole,
    authorName: store.users.find((item) => item.id === reply.authorId)?.name ||
      (reply.authorRole === 'admin' ? 'Admin Support' : 'Support desk'),
    message: reply.body,
    body: reply.body,
    kind: reply.kind || 'reply',
    at: reply.createdAt,
    createdAt: reply.createdAt,
  }))
  const createdEvent = {
    id: `${ticket.id}_created`,
    kind: 'created',
    at: ticket.createdAt,
    authorName: user?.name || 'Requester',
    authorRole: ticket.role,
    message: ticket.description,
    status: 'open',
  }
  const replyEvents = replies.map((reply) => ({
    id: reply.id,
    kind: reply.kind === 'reopened' ? 'reopened' : 'reply',
    at: reply.at,
    authorName: reply.authorName,
    authorRole: reply.authorRole,
    message: reply.message,
  }))
  const statusEvents = (ticket.statusEvents || []).map((event) => ({
    id: event.id,
    kind: 'status',
    at: event.at,
    authorName: event.actorName || store.users.find((item) => item.id === event.actorId)?.name || 'Support desk',
    authorRole: 'admin',
    message: `Status changed from ${SUPPORT_STATUS_LABELS[event.from] || event.from} to ${SUPPORT_STATUS_LABELS[event.to] || event.to}${event.reason ? ` · ${event.reason}` : ''}`,
    status: event.to,
    from: event.from,
  }))
  const activity = [createdEvent, ...replyEvents, ...statusEvents].sort((a, b) => new Date(a.at) - new Date(b.at))
  return {
    ...ticket,
    user: publicUser(user),
    userName: user?.name || ticket.userId,
    userEmail: publicUser(user)?.email || '—',
    statusLabel: SUPPORT_STATUS_LABELS[ticket.status] || ticket.status,
    source: ticket.source || 'direct',
    context: ticket.context || null,
    attachments: ticket.attachments || [],
    message: ticket.description,
    categoryLabel: ticket.category,
    replies,
    activity,
    replyCount: replies.length,
    lastReplyAt: replies.length ? replies[replies.length - 1].at : null,
  }
}

export const supportService = {
  async listForUser(userId) {
    return request(() => {
      const tickets = sortBy(
        readAll('supportTickets').filter((ticket) => ticket.userId === userId),
        (ticket) => ticket.updatedAt,
        'desc',
      ).map(decorate)
      return {
        tickets,
        stats: {
          open: tickets.filter((ticket) => ticket.status === 'open').length,
          inProgress: tickets.filter((ticket) => ticket.status === 'in-progress').length,
          waitingForStudent: tickets.filter((ticket) => ticket.status === 'waiting-for-student').length,
          resolved: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
          pending: tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
          total: tickets.length,
        },
      }
    }, { latency: 200 })
  },

  async listAll({ status, role, search } = {}) {
    return request(() => {
      let tickets = readAll('supportTickets')
      if (status && status !== 'all') tickets = tickets.filter((ticket) => ticket.status === status)
      if (role && role !== 'all') tickets = tickets.filter((ticket) => ticket.role === role)
      if (search) {
        const needle = String(search).toLowerCase()
        tickets = tickets.filter(
          (ticket) =>
            ticket.subject.toLowerCase().includes(needle) ||
            ticket.code.toLowerCase().includes(needle) ||
            ticket.description.toLowerCase().includes(needle) ||
            String(findUser(ticket.userId)?.name || '').toLowerCase().includes(needle),
        )
      }
      const decorated = sortBy(tickets, (ticket) => ticket.updatedAt, 'desc').map(decorate)
      return {
        tickets: decorated,
        stats: {
          open: decorated.filter((ticket) => ticket.status === 'open').length,
          inProgress: decorated.filter((ticket) => ticket.status === 'in-progress').length,
          waitingForStudent: decorated.filter((ticket) => ticket.status === 'waiting-for-student').length,
          resolved: decorated.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
          total: decorated.length,
        },
      }
    }, { latency: 220 })
  },

  async createTicket(payload, actor) {
    return request(() => {
      const store = loadStore()
      assert(SUPPORT_CATEGORIES.includes(payload.category), 'Choose a support category.', { code: 'validation' })
      assert(String(payload.subject || '').trim().length >= 8, 'Give the ticket a clear subject (at least 8 characters).', {
        code: 'validation',
      })
      assert(String(payload.description || '').trim().length >= 25, 'Describe the issue in at least 25 characters so we can help.', {
        code: 'validation',
      })
      assert(SUPPORT_PRIORITIES.includes(payload.priority || 'normal'), 'Choose a valid priority.', { code: 'validation' })
      const id = createId('ticket')
      const ticket = {
        id,
        code: nextTicketCode(store.supportTickets),
        userId: actor?.id,
        role: actor?.role || 'student',
        category: payload.category,
        subject: String(payload.subject).trim(),
        description: String(payload.description).trim(),
        priority: payload.priority || 'normal',
        status: 'open',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        attachments: normaliseAttachments(payload.attachments),
        replies: [],
        statusEvents: [],
        assignedTo: null,
        source: payload.source || 'direct',
        context: payload.context || null,
      }
      insert('supportTickets', ticket)
      notifyMany(adminIds(store), {
        type: 'support-update',
        title: `New support ticket ${ticket.code}`,
        body: ticket.subject,
        link: `/admin/support?ticket=${ticket.id}`,
        entityId: ticket.id,
      })
      addAuditEvent({
        actor,
        action: 'support.created',
        actionLabel: 'Support ticket created',
        entityType: 'ticket',
        entityId: id,
        entityLabel: ticket.subject,
        previousValue: null,
        newValue: 'open',
        reason: ticket.source === 'ai-escalation' ? 'Escalated from AI Auto Support mock conversation' : 'Support ticket raised',
      })
      return decorate(ticket)
    }, { latency: 300 })
  },

  async reply(ticketId, body, actor, { status, resolve = false } = {}) {
    return request(() => {
      const store = loadStore()
      const ticket = store.supportTickets.find((item) => item.id === ticketId)
      assert(ticket, 'That ticket does not exist.', { code: 'not-found', status: 404 })
      assert(String(body || '').trim().length >= 5, 'Write a short reply.', { code: 'validation' })
      if (status) assert(SUPPORT_STATUSES.includes(status), 'Choose a valid ticket status.', { code: 'validation' })
      const reply = {
        id: createId('support_reply'),
        authorId: actor?.id,
        authorRole: actor?.role,
        body: String(body).trim(),
        createdAt: nowIso(),
        kind: 'reply',
      }
      const nextStatus = status || (resolve ? 'resolved' : actor?.role === 'admin' ? 'in-progress' : ticket.status)
      const statusChanged = nextStatus !== ticket.status
      updateRecord('supportTickets', ticketId, {
        replies: [...ticket.replies, reply],
        status: nextStatus,
        updatedAt: nowIso(),
        assignedTo: actor?.role === 'admin' ? actor.id : ticket.assignedTo,
        statusEvents: statusChanged
          ? [
              ...(ticket.statusEvents || []),
              {
                id: createId('support_status'),
                from: ticket.status,
                to: nextStatus,
                at: nowIso(),
                actorId: actor?.id || null,
                actorName: findUser(actor?.id)?.name || 'Support desk',
                reason: status ? 'Updated with response' : 'Response recorded',
              },
            ]
          : ticket.statusEvents || [],
      })
      if (actor?.role === 'admin') {
        notify({
          userId: ticket.userId,
          type: 'support-update',
          title: `Ticket ${ticket.code} — ${SUPPORT_STATUS_LABELS[nextStatus] || nextStatus}`,
          body: `Admin responded: ${reply.body.slice(0, 90)}`,
          link: ticketLink(ticket),
          entityId: ticketId,
        })
      } else {
        notifyMany(adminIds(store), {
          type: 'support-update',
          title: `Ticket ${ticket.code} reply received`,
          body: `${findUser(actor?.id)?.name || 'Requester'} replied: ${reply.body.slice(0, 80)}`,
          link: `/admin/support?ticket=${ticketId}`,
          entityId: ticketId,
        })
      }
      addAuditEvent({
        actor,
        action: 'support.replied',
        actionLabel: 'Support ticket updated',
        entityType: 'ticket',
        entityId: ticketId,
        entityLabel: ticket.subject,
        previousValue: ticket.status,
        newValue: nextStatus,
        reason: 'Support response',
      })
      return decorate(loadStore().supportTickets.find((item) => item.id === ticketId))
    }, { latency: 280 })
  },

  async setStatus(ticketId, status, actor, reason) {
    return request(() => {
      assert(actor?.role === 'admin', 'Only Admin Support can change a ticket status.', { code: 'forbidden', status: 403 })
      assert(SUPPORT_STATUSES.includes(status), 'Choose a valid ticket status.', { code: 'validation' })
      const ticket = readAll('supportTickets').find((item) => item.id === ticketId)
      assert(ticket, 'That ticket does not exist.', { code: 'not-found', status: 404 })
      const event = {
        id: createId('support_status'),
        from: ticket.status,
        to: status,
        at: nowIso(),
        actorId: actor.id,
        actorName: findUser(actor.id)?.name || 'Admin Support',
        reason: reason || 'Status changed from the support desk',
      }
      updateRecord('supportTickets', ticketId, {
        status,
        updatedAt: event.at,
        assignedTo: actor.id,
        statusEvents: [...(ticket.statusEvents || []), event],
      })
      notify({
        userId: ticket.userId,
        type: 'support-status',
        title: `Ticket ${ticket.code} is ${SUPPORT_STATUS_LABELS[status] || status}`,
        body: reason || `The support desk changed the status to ${SUPPORT_STATUS_LABELS[status] || status}.`,
        link: ticketLink(ticket),
        entityId: ticketId,
      })
      addAuditEvent({
        actor,
        action: 'support.status-changed',
        actionLabel: 'Support ticket status changed',
        entityType: 'ticket',
        entityId: ticketId,
        entityLabel: ticket.subject,
        previousValue: ticket.status,
        newValue: status,
        reason: reason || 'Status changed from the support desk',
      })
      return decorate(loadStore().supportTickets.find((item) => item.id === ticketId))
    })
  },

  /** A student may reopen a resolved/closed ticket and continue the thread. */
  async reopenTicket(ticketId, reason, actor) {
    return request(() => {
      const ticket = readAll('supportTickets').find((item) => item.id === ticketId)
      assert(ticket, 'That ticket does not exist.', { code: 'not-found', status: 404 })
      assert(actor?.id === ticket.userId, 'Only the person who raised the ticket can reopen it.', { code: 'forbidden', status: 403 })
      assert(['resolved', 'closed'].includes(ticket.status), 'Only a resolved or closed ticket can be reopened.', { code: 'validation' })
      assert(String(reason || '').trim().length >= 10, 'Explain why the ticket needs reopening (at least 10 characters).', { code: 'validation' })
      const at = nowIso()
      const reply = {
        id: createId('support_reply'),
        authorId: actor.id,
        authorRole: actor.role || ticket.role,
        body: String(reason).trim(),
        createdAt: at,
        kind: 'reopened',
      }
      updateRecord('supportTickets', ticketId, {
        status: 'open',
        updatedAt: at,
        replies: [...(ticket.replies || []), reply],
        statusEvents: [
          ...(ticket.statusEvents || []),
          {
            id: createId('support_status'),
            from: ticket.status,
            to: 'open',
            at,
            actorId: actor.id,
            actorName: findUser(actor.id)?.name || 'Requester',
            reason: 'Reopened by the requester',
          },
        ],
      })
      notifyMany(adminIds(loadStore()), {
        type: 'support-update',
        title: `Ticket ${ticket.code} reopened`,
        body: String(reason).trim().slice(0, 90),
        link: `/admin/support?ticket=${ticketId}`,
        entityId: ticketId,
      })
      addAuditEvent({
        actor,
        action: 'support.reopened',
        actionLabel: 'Support ticket reopened',
        entityType: 'ticket',
        entityId: ticketId,
        entityLabel: ticket.subject,
        previousValue: ticket.status,
        newValue: 'open',
        reason: String(reason).trim(),
      })
      return decorate(loadStore().supportTickets.find((item) => item.id === ticketId))
    }, { latency: 260 })
  },
}
