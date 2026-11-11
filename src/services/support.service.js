/* Support tickets for students, faculty and the admin support desk. */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord } from '../data/mock/mock-storage.js'
import { findUser, addAuditEvent, notify, publicUser } from './repository.js'
import { SUPPORT_CATEGORIES } from '../data/mock/support.mock.js'

function decorate(ticket) {
  const store = loadStore()
  const user = store.users.find((item) => item.id === ticket.userId)
  const replies = ticket.replies.map((reply) => ({
    id: reply.id,
    authorId: reply.authorId,
    authorRole: reply.authorRole,
    authorName: store.users.find((item) => item.id === reply.authorId)?.name || 'Support desk',
    message: reply.body,
    body: reply.body,
    at: reply.createdAt,
    createdAt: reply.createdAt,
  }))
  return {
    ...ticket,
    user: publicUser(user),
    // Readable aliases so every workspace renders one consistent shape.
    message: ticket.description,
    categoryLabel: ticket.category,
    replies,
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
          resolved: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
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
            ticket.description.toLowerCase().includes(needle),
        )
      }
      return sortBy(tickets, (ticket) => ticket.updatedAt, 'desc').map(decorate)
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
      const id = createId('ticket')
      const ticket = {
        id,
        code: `TKT-${1100 + store.supportTickets.length}`,
        userId: actor?.id,
        role: actor?.role || 'student',
        category: payload.category,
        subject: String(payload.subject).trim(),
        description: String(payload.description).trim(),
        priority: payload.priority || 'normal',
        status: 'open',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        attachments: payload.attachments || [],
        replies: [],
        assignedTo: null,
      }
      insert('supportTickets', ticket)
      store.users
        .filter((user) => user.role === 'admin')
        .forEach((admin) =>
          notify({
            userId: admin.id,
            type: 'support-update',
            title: `New support ticket ${ticket.code}`,
            body: ticket.subject,
            link: `/admin/moderation?tab=support&ticket=${ticket.id}`,
            entityId: ticket.id,
          }),
        )
      return decorate(ticket)
    }, { latency: 300 })
  },

  async reply(ticketId, body, actor, { status, resolve = false } = {}) {
    return request(() => {
      const store = loadStore()
      const ticket = store.supportTickets.find((item) => item.id === ticketId)
      assert(ticket, 'That ticket does not exist.', { code: 'not-found', status: 404 })
      assert(String(body || '').trim().length >= 5, 'Write a short reply.', { code: 'validation' })
      const reply = {
        id: createId('support_reply'),
        authorId: actor?.id,
        authorRole: actor?.role,
        body: String(body).trim(),
        createdAt: nowIso(),
      }
      const nextStatus = status || (resolve ? 'resolved' : actor?.role === 'admin' ? 'in-progress' : ticket.status)
      updateRecord('supportTickets', ticketId, {
        replies: [...ticket.replies, reply],
        status: nextStatus,
        updatedAt: nowIso(),
        assignedTo: actor?.role === 'admin' ? actor.id : ticket.assignedTo,
      })
      const recipientId = actor?.role === 'admin' ? ticket.userId : 'admin_001'
      notify({
        userId: recipientId,
        type: 'support-update',
        title: `Ticket ${ticket.code} updated`,
        body: `${findUser(actor?.id)?.name || 'Support'} replied: ${reply.body.slice(0, 80)}`,
        link: ticket.role === 'student' ? '/student/support' : '/faculty/support',
        entityId: ticketId,
      })
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
      const ticket = readAll('supportTickets').find((item) => item.id === ticketId)
      assert(ticket, 'That ticket does not exist.', { code: 'not-found', status: 404 })
      updateRecord('supportTickets', ticketId, { status, updatedAt: nowIso() })
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
}
