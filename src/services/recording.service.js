/* Recording service. Publishing, visibility, downloads and moderation all flow
   through here so faculty, students and admin see one record. */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord } from '../data/mock/mock-storage.js'
import { findBatch, findSubject, findUser, addAuditEvent, notifyMany, notify, publicUser } from './repository.js'

const DEMO_ASSET = '/media/video/recording-rotational-dynamics.mp4'
const DEMO_POSTER = '/media/slides/slide-01.png'

export function decorateRecording(recording) {
  if (!recording) return null
  const batch = recording.batchId ? findBatch(recording.batchId) : null
  const subject = findSubject(recording.subjectId)
  const faculty = findUser(recording.facultyId)
  return {
    ...recording,
    batch,
    subject,
    faculty: publicUser(faculty),
  }
}

/** Called by the class service when a live session ends. */
export function startRecordingForSession(classId, actor) {
  const store = loadStore()
  const klass = store.classes.find((item) => item.id === classId)
  const id = createId('rec')
  const recording = {
    id,
    classId,
    sessionId: klass?.sessionId ?? null,
    title: klass?.title ? `${klass.title} — session recording` : 'Session recording',
    description: klass?.description || 'Automatically captured from the live session.',
    batchId: klass?.batchId ?? null,
    subjectId: klass?.subjectId ?? 'sub_phy',
    facultyId: klass?.facultyId ?? actor?.id,
    videoUrl: null,
    posterUrl: DEMO_POSTER,
    durationSeconds: 0,
    createdAt: nowIso(),
    publishedAt: null,
    status: 'processing',
    allowDownload: false,
    downloadSizeLabel: null,
    views: 0,
    kind: 'video',
    moderationState: 'clear',
    processingNote: 'Processing started when the session ended. Publishing requires faculty confirmation.',
  }
  insert('recordings', recording)
  return recording
}

export const recordingService = {
  async listRecordings({ batchId, subjectId, facultyId, status, forStudentId, search } = {}) {
    return request(() => {
      const store = loadStore()
      let recordings = readAll('recordings')
      if (batchId && batchId !== 'all') recordings = recordings.filter((item) => item.batchId === batchId)
      if (subjectId && subjectId !== 'all') recordings = recordings.filter((item) => item.subjectId === subjectId)
      if (facultyId) recordings = recordings.filter((item) => item.facultyId === facultyId)
      if (status && status !== 'all') recordings = recordings.filter((item) => item.status === status)
      if (search) {
        const needle = String(search).toLowerCase()
        recordings = recordings.filter(
          (item) => item.title.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle),
        )
      }
      if (forStudentId) {
        const profile = store.students.find((item) => item.id === forStudentId)
        const batchId2 = profile?.batchId
        recordings = recordings.filter(
          (item) => item.status === 'published' && item.batchId === batchId2 && item.moderationState !== 'removed',
        )
      }
      return sortBy(recordings, (item) => item.createdAt, 'desc').map(decorateRecording)
    }, { latency: 240 })
  },

  async getRecording(recordingId, viewer) {
    return request(() => {
      const store = loadStore()
      const recording = store.recordings.find((item) => item.id === recordingId)
      assert(recording, 'That recording does not exist.', { code: 'not-found', status: 404 })
      if (viewer?.role === 'student') {
        const profile = store.students.find((item) => item.id === viewer.id)
        assert(
          recording.status === 'published' && profile?.batchId === recording.batchId,
          'This recording is not published for your batch.',
          { code: 'forbidden', status: 403 },
        )
      }
      return decorateRecording(recording)
    }, { latency: 160 })
  },

  async uploadRecording(payload, actor) {
    return request(() => {
      const store = loadStore()
      const { title, description, batchId, subjectId, classId, videoUrl, allowDownload = false } = payload
      assert(String(title || '').trim().length >= 5, 'Give the recording a clear title.', { code: 'validation' })
      assert(batchId, 'Choose which batch can see this recording.', { code: 'validation' })
      assert(subjectId, 'Choose the subject.', { code: 'validation' })
      const klass = classId ? store.classes.find((item) => item.id === classId) : null
      const assetUrl = videoUrl || (klass?.recordingId ? store.recordings.find((r) => r.id === klass.recordingId)?.videoUrl : null) || DEMO_ASSET
      assert(assetUrl, 'An uploaded file is required. Use the demo media file if you are testing the workflow.', {
        code: 'validation',
      })

      const id = createId('rec')
      const recording = {
        id,
        classId: classId || null,
        sessionId: klass?.sessionId ?? null,
        title: String(title).trim(),
        description: description || '',
        batchId,
        subjectId,
        facultyId: actor?.id || 'fac_001',
        videoUrl: assetUrl,
        posterUrl: DEMO_POSTER,
        durationSeconds: payload.durationSeconds ?? 17,
        createdAt: nowIso(),
        publishedAt: null,
        status: 'draft',
        allowDownload: Boolean(allowDownload),
        downloadSizeLabel: allowDownload ? '252 KB' : null,
        views: 0,
        kind: 'video',
        moderationState: 'clear',
      }
      insert('recordings', recording)
      addAuditEvent({
        actor,
        action: 'recording.uploaded',
        actionLabel: 'Recording uploaded',
        entityType: 'recording',
        entityId: id,
        entityLabel: recording.title,
        previousValue: null,
        newValue: 'draft',
        reason: 'Faculty upload',
      })
      return decorateRecording(recording)
    }, { latency: 420 })
  },

  async publishRecording(recordingId, actor) {
    return request(() => {
      const store = loadStore()
      const recording = store.recordings.find((item) => item.id === recordingId)
      assert(recording, 'That recording does not exist.', { code: 'not-found', status: 404 })
      assert(recording.status !== 'published', 'This recording is already published.', { code: 'conflict', status: 409 })
      assert(recording.videoUrl, 'A recording needs media before it can be published.', { code: 'validation' })
      assert(recording.moderationState !== 'removed', 'This recording was removed by moderation and cannot be published.', {
        code: 'policy',
        status: 403,
      })

      updateRecord('recordings', recordingId, { status: 'published', publishedAt: nowIso() })
      if (recording.classId) {
        updateRecord('classes', recording.classId, { status: 'recording-published' })
      }
      const batch = store.batches.find((item) => item.id === recording.batchId)
      notifyMany(batch?.studentIds || [], {
        type: 'recording-published',
        title: `New recording: ${recording.title}`,
        body: `Published by ${findUser(recording.facultyId)?.name || 'faculty'} for your batch.`,
        link: `/student/recordings/${recording.id}`,
        entityId: recording.id,
      })
      addAuditEvent({
        actor,
        action: 'recording.published',
        actionLabel: 'Recording published',
        entityType: 'recording',
        entityId: recordingId,
        entityLabel: recording.title,
        previousValue: recording.status,
        newValue: 'published',
        reason: 'Faculty published the recording',
      })
      return decorateRecording(loadStore().recordings.find((item) => item.id === recordingId))
    })
  },

  async unpublishRecording(recordingId, reason, actor) {
    return request(() => {
      const recording = readAll('recordings').find((item) => item.id === recordingId)
      assert(recording, 'That recording does not exist.', { code: 'not-found', status: 404 })
      updateRecord('recordings', recordingId, { status: 'unpublished', unpublishedReason: reason })
      addAuditEvent({
        actor,
        action: 'recording.unpublished',
        actionLabel: 'Recording unpublished',
        entityType: 'recording',
        entityId: recordingId,
        entityLabel: recording.title,
        previousValue: 'published',
        newValue: 'unpublished',
        reason: reason || 'Unpublished by the owner',
      })
      return decorateRecording(loadStore().recordings.find((item) => item.id === recordingId))
    })
  },

  async setDownloadPermission(recordingId, allowDownload, actor) {
    return request(() => {
      const recording = readAll('recordings').find((item) => item.id === recordingId)
      assert(recording, 'That recording does not exist.', { code: 'not-found', status: 404 })
      updateRecord('recordings', recordingId, {
        allowDownload,
        downloadSizeLabel: allowDownload ? recording.downloadSizeLabel || '252 KB' : null,
      })
      addAuditEvent({
        actor,
        action: 'recording.download-policy',
        actionLabel: allowDownload ? 'Downloads enabled' : 'Downloads disabled',
        entityType: 'recording',
        entityId: recordingId,
        entityLabel: recording.title,
        previousValue: recording.allowDownload ? 'allowed' : 'blocked',
        newValue: allowDownload ? 'allowed' : 'blocked',
        reason: 'Visibility policy change',
      })
      return decorateRecording(loadStore().recordings.find((item) => item.id === recordingId))
    })
  },

  async deleteRecording(recordingId, actor) {
    return request(() => {
      const store = loadStore()
      const recording = store.recordings.find((item) => item.id === recordingId)
      assert(recording, 'That recording does not exist.', { code: 'not-found', status: 404 })
      updateRecord('recordings', recordingId, { status: 'removed', removedAt: nowIso() })
      if (recording.classId) {
        updateRecord('classes', recording.classId, { recordingId: null })
      }
      addAuditEvent({
        actor,
        action: 'recording.removed',
        actionLabel: 'Recording removed',
        entityType: 'recording',
        entityId: recordingId,
        entityLabel: recording.title,
        previousValue: recording.status,
        newValue: 'removed',
        reason: 'Removed with explicit confirmation',
      })
      return { ok: true }
    })
  },

  async registerView(recordingId) {
    return request(() => {
      const recording = readAll('recordings').find((item) => item.id === recordingId)
      if (!recording) return { ok: false }
      updateRecord('recordings', recordingId, { views: (recording.views || 0) + 1 })
      return { ok: true }
    }, { latency: 40 })
  },

  /** Download is a real browser download of the local demo media file. */
  async prepareDownload(recordingId, viewer) {
    return request(() => {
      const recording = readAll('recordings').find((item) => item.id === recordingId)
      assert(recording, 'That recording does not exist.', { code: 'not-found', status: 404 })
      assert(recording.allowDownload, 'Downloads are disabled for this recording by the institute policy.', {
        code: 'forbidden',
        status: 403,
      })
      assert(recording.videoUrl, 'This recording has no media file to download.', { code: 'conflict', status: 409 })
      if (viewer?.role === 'student') {
        const store = loadStore()
        const profile = store.students.find((item) => item.id === viewer.id)
        assert(profile?.batchId === recording.batchId, 'This recording is not available for your batch.', {
          code: 'forbidden',
          status: 403,
        })
      }
      const extension = recording.kind === 'audio' ? 'mp4' : 'mp4'
      return { url: recording.videoUrl, filename: `${recording.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${extension}` }
    }, { latency: 200 })
  },

  async getModerationQueue() {
    return request(() => {
      const recordings = readAll('recordings').filter(
        (item) => item.moderationState === 'flagged' || item.status === 'removed',
      )
      return recordings.map(decorateRecording)
    }, { latency: 180 })
  },

  async moderateRecording(recordingId, decision, note, actor) {
    return request(() => {
      const recording = readAll('recordings').find((item) => item.id === recordingId)
      assert(recording, 'That recording does not exist.', { code: 'not-found', status: 404 })
      assert(['clear', 'removed'].includes(decision), 'Choose a valid moderation decision.', { code: 'validation' })
      updateRecord('recordings', recordingId, {
        moderationState: decision,
        moderationNote: note,
        moderatedBy: actor?.id || null,
        moderatedAt: nowIso(),
        ...(decision === 'removed' ? { status: 'removed' } : {}),
      })
      addAuditEvent({
        actor,
        action: 'recording.moderated',
        actionLabel: decision === 'clear' ? 'Recording cleared by moderation' : 'Recording removed by moderation',
        entityType: 'recording',
        entityId: recordingId,
        entityLabel: recording.title,
        previousValue: recording.moderationState,
        newValue: decision,
        reason: note || 'Moderation decision',
      })
      notify({
        userId: recording.facultyId,
        type: 'moderation',
        title: decision === 'clear' ? 'Recording cleared' : 'Recording removed',
        body: `${recording.title}: ${note || 'decision recorded'}`,
        link: '/faculty/recordings',
        entityId: recordingId,
      })
      return decorateRecording(loadStore().recordings.find((item) => item.id === recordingId))
    })
  },
}

