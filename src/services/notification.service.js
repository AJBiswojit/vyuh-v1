/* Notification inbox service. */

import { request, assert, nowIso, createId } from './api.js'
import { loadStore, readAll, updateRecord, writeSingleton, insert } from '../data/mock/mock-storage.js'

export const notificationService = {
  async listForUser(userId) {
    return request(() => {
      const notifications = readAll('notifications')
        .filter((notification) => notification.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return {
        items: notifications,
        unreadCount: notifications.filter((notification) => !notification.read).length,
      }
    }, { latency: 140 })
  },

  async markRead(notificationId) {
    return request(() => updateRecord('notifications', notificationId, { read: true }), { latency: 60 })
  },

  async markAllRead(userId) {
    return request(() => {
      const store = loadStore()
      writeSingleton(
        'notifications',
        store.notifications.map((notification) =>
          notification.userId === userId ? { ...notification, read: true } : notification,
        ),
      )
      return { ok: true }
    }, { latency: 120 })
  },

  async broadcast({ title, body, audience, link = null }, actor) {
    return request(() => {
      assert(String(title || '').trim().length >= 5, 'Give the announcement a title.', { code: 'validation' })
      assert(String(body || '').trim().length >= 10, 'Write at least a short announcement body.', { code: 'validation' })
      const store = loadStore()
      let recipients = []
      if (audience === 'all') recipients = store.users.map((user) => user.id)
      else if (audience === 'students') recipients = store.users.filter((user) => user.role === 'student').map((user) => user.id)
      else if (audience === 'faculty') recipients = store.users.filter((user) => user.role === 'faculty').map((user) => user.id)
      else if (audience?.startsWith('batch:')) {
        const batchId = audience.split(':')[1]
        const batch = store.batches.find((item) => item.id === batchId)
        recipients = batch?.studentIds || []
      }
      assert(recipients.length > 0, 'Choose an audience with at least one recipient.', { code: 'validation' })

      recipients.forEach((userId) => {
        insert('notifications', {
          id: createId('notif'),
          userId,
          type: 'announcement',
          title: String(title).trim(),
          body: String(body).trim(),
          createdAt: nowIso(),
          read: false,
          link,
          entityId: null,
          from: actor?.name || 'Institute administration',
        })
      })
      return { ok: true, recipientCount: recipients.length }
    }, { latency: 320 })
  },
}
