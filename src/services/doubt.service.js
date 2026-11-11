/* Doubt service + the demo AI assistant provider. The AI is a deterministic,
   contextual mock — it is clearly labelled as a demonstration and it never
   claims to be a live model. */

import { request, assert, nowIso, createId, sortBy } from './api.js'
import { insert, loadStore, readAll, updateRecord, writeSingleton } from '../data/mock/mock-storage.js'
import {
  findUser,
  findBatch,
  findSubject,
  addAuditEvent,
  notify,
  publicUser,
} from './repository.js'
import { TOPIC_BY_ID, subjectName } from '../data/mock/subjects.mock.js'
import { QUESTION_BY_ID } from '../data/mock/questions.mock.js'

function decorateDoubt(doubt) {
  if (!doubt) return null
  const student = findUser(doubt.studentId)
  const faculty = findUser(doubt.facultyId)
  const batch = student ? loadStore().students.find((profile) => profile.id === student.id) : null
  return {
    ...doubt,
    student: publicUser(student),
    faculty: publicUser(faculty),
    subject: findSubject(doubt.subjectId),
    topicName: TOPIC_BY_ID[doubt.topicId]?.name || 'General',
    batch: batch ? findBatch(batch.batchId) : null,
    replies: (doubt.replies || []).map((reply) => ({
      ...reply,
      authorName: findUser(reply.authorId)?.name || (reply.authorRole === 'faculty' ? 'Faculty' : 'Student'),
      at: reply.createdAt,
    })),
    replyCount: doubt.replies.length,
    lastActivityAt: doubt.replies.length ? doubt.replies[doubt.replies.length - 1].createdAt : doubt.createdAt,
  }
}

export const doubtService = {
  async listStudentDoubts(studentId) {
    return request(() => {
      const doubts = readAll('doubts').filter((doubt) => doubt.studentId === studentId)
      const conversations = readAll('aiConversations').filter((chat) => chat.studentId === studentId)
      return {
        doubts: sortBy(doubts, (doubt) => doubt.updatedAt, 'desc').map(decorateDoubt),
        conversations,
        stats: {
          open: doubts.filter((doubt) => doubt.status === 'open').length,
          answered: doubts.filter((doubt) => doubt.status === 'answered').length,
          resolved: doubts.filter((doubt) => doubt.status === 'resolved').length,
          awaitingReply: doubts.filter((doubt) => doubt.replies.length === 0).length,
        },
      }
    }, { latency: 220 })
  },

  async listFacultyDoubts(facultyId, { status } = {}) {
    return request(() => {
      let doubts = readAll('doubts').filter((doubt) => doubt.facultyId === facultyId)
      if (status && status !== 'all') doubts = doubts.filter((doubt) => doubt.status === status)
      const decorated = sortBy(doubts, (doubt) => doubt.createdAt, 'desc').map(decorateDoubt)
      return {
        doubts: decorated,
        stats: {
          total: decorated.length,
          open: decorated.filter((doubt) => doubt.status === 'open').length,
          answered: decorated.filter((doubt) => doubt.status === 'answered').length,
          resolved: decorated.filter((doubt) => doubt.status === 'resolved').length,
          highPriority: decorated.filter((doubt) => doubt.priority === 'high' && doubt.status === 'open').length,
        },
      }
    }, { latency: 220 })
  },

  async getDoubt(doubtId) {
    return request(() => {
      const doubt = readAll('doubts').find((item) => item.id === doubtId)
      assert(doubt, 'That doubt does not exist.', { code: 'not-found', status: 404 })
      return decorateDoubt(doubt)
    }, { latency: 160 })
  },

  async createDoubt(payload, actor) {
    return request(() => {
      const store = loadStore()
      const { subjectId, topicId, title, body, priority = 'normal', facultyId, attachments = [] } = payload
      assert(String(title || '').trim().length >= 8, 'Give the doubt a clear title (at least 8 characters).', {
        code: 'validation',
      })
      assert(String(body || '').trim().length >= 20, 'Describe the doubt in at least 20 characters so faculty can help.', {
        code: 'validation',
      })
      assert(subjectId, 'Choose the subject.', { code: 'validation' })

      const profile = store.students.find((item) => item.id === actor?.id)
      const batch = profile ? store.batches.find((item) => item.id === profile.batchId) : null
      const resolvedFacultyId =
        facultyId || batch?.facultyIds?.find((id) => store.users.find((user) => user.id === id)?.subjectIds?.includes(subjectId)) || batch?.facultyIds?.[0]
      assert(resolvedFacultyId, 'No faculty member is assigned to your batch for this subject yet.', {
        code: 'validation',
      })

      const id = createId('doubt')
      const doubt = {
        id,
        studentId: actor?.id,
        facultyId: resolvedFacultyId,
        subjectId,
        topicId: topicId || null,
        title: String(title).trim(),
        body: String(body).trim(),
        priority,
        status: 'open',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        attachments,
        source: 'ask-faculty',
        replies: [],
      }
      insert('doubts', doubt)
      notify({
        userId: resolvedFacultyId,
        type: 'doubt-new',
        title: `New doubt from ${findUser(actor?.id)?.name || 'a student'}`,
        body: doubt.title,
        link: `/faculty/doubts/${id}`,
        entityId: id,
      })
      addAuditEvent({
        actor,
        action: 'doubt.created',
        actionLabel: 'Doubt submitted',
        entityType: 'doubt',
        entityId: id,
        entityLabel: doubt.title,
        previousValue: null,
        newValue: 'open',
        reason: 'Student asked faculty',
      })
      return decorateDoubt(doubt)
    }, { latency: 300 })
  },

  async replyToDoubt(doubtId, body, actor, { resolve = false, attachmentName = null } = {}) {
    return request(() => {
      const store = loadStore()
      const doubt = store.doubts.find((item) => item.id === doubtId)
      assert(doubt, 'That doubt does not exist.', { code: 'not-found', status: 404 })
      assert(String(body || '').trim().length >= 10, 'Write a reply of at least 10 characters.', { code: 'validation' })

      const reply = {
        id: createId('reply'),
        authorId: actor?.id,
        authorRole: actor?.role || 'faculty',
        body: String(body).trim(),
        createdAt: nowIso(),
        attachmentName,
      }
      const nextStatus = resolve
        ? 'resolved'
        : actor?.role === 'faculty'
          ? 'answered'
          : doubt.status === 'resolved'
            ? 'resolved'
            : doubt.status === 'open'
              ? 'open'
              : 'answered'
      updateRecord('doubts', doubtId, {
        replies: [...doubt.replies, reply],
        status: nextStatus,
        updatedAt: nowIso(),
      })

      const recipientId = actor?.role === 'faculty' ? doubt.studentId : doubt.facultyId
      notify({
        userId: recipientId,
        type: 'doubt-reply',
        title:
          actor?.role === 'faculty'
            ? `${findUser(actor.id)?.name || 'Faculty'} replied to your doubt`
            : `${findUser(actor?.id)?.name || 'Student'} added a reply`,
        body: doubt.title,
        link: actor?.role === 'faculty' ? `/student/doubts/${doubtId}` : `/faculty/doubts/${doubtId}`,
        entityId: doubtId,
      })
      addAuditEvent({
        actor,
        action: resolve ? 'doubt.resolved' : 'doubt.replied',
        actionLabel: resolve ? 'Doubt resolved' : 'Doubt replied',
        entityType: 'doubt',
        entityId: doubtId,
        entityLabel: doubt.title,
        previousValue: doubt.status,
        newValue: nextStatus,
        reason: 'Faculty response',
      })
      return decorateDoubt(loadStore().doubts.find((item) => item.id === doubtId))
    }, { latency: 320 })
  },

  async setStatus(doubtId, status, actor, reason) {
    return request(() => {
      const doubt = readAll('doubts').find((item) => item.id === doubtId)
      assert(doubt, 'That doubt does not exist.', { code: 'not-found', status: 404 })
      updateRecord('doubts', doubtId, { status, updatedAt: nowIso() })
      addAuditEvent({
        actor,
        action: 'doubt.status-changed',
        actionLabel: `Doubt marked ${status}`,
        entityType: 'doubt',
        entityId: doubtId,
        entityLabel: doubt.title,
        previousValue: doubt.status,
        newValue: status,
        reason: reason || 'Status changed',
      })
      return decorateDoubt(loadStore().doubts.find((item) => item.id === doubtId))
    })
  },

  async getFacultyDirectoryForStudent(studentId) {
    return request(() => {
      const store = loadStore()
      const profile = store.students.find((item) => item.id === studentId)
      const batch = profile ? store.batches.find((item) => item.id === profile.batchId) : null
      return (batch?.facultyIds || []).map((facultyId) => {
        const user = store.users.find((item) => item.id === facultyId)
        const facultyProfile = store.faculty.find((item) => item.id === facultyId)
        const openDoubts = store.doubts.filter(
          (doubt) => doubt.facultyId === facultyId && doubt.status === 'open',
        ).length
        return {
          ...publicUser(user),
          designation: facultyProfile?.designation,
          officeHours: facultyProfile?.officeHours,
          availability: facultyProfile?.availability,
          subjects: (user?.subjectIds || []).map((id) => subjectName(id)),
          openDoubts,
        }
      })
    }, { latency: 180 })
  },

  /* ----------------------------- AI demo ------------------------------ */

  async listConversations(studentId) {
    return request(() => {
      const store = loadStore()
      return sortBy(
        store.aiConversations.filter((conversation) => conversation.studentId === studentId),
        (conversation) => conversation.updatedAt,
        'desc',
      )
    }, { latency: 140 })
  },

  async getConversation(conversationId) {
    return request(() => {
      const conversation = readAll('aiConversations').find((item) => item.id === conversationId)
      assert(conversation, 'That conversation does not exist.', { code: 'not-found', status: 404 })
      return conversation
    }, { latency: 120 })
  },

  async createConversation(studentId, title = 'New doubt session') {
    return request(() => {
      const conversation = {
        id: createId('aichat'),
        studentId,
        title,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        messages: [],
      }
      insert('aiConversations', conversation)
      return conversation
    }, { latency: 100 })
  },

  async clearConversation(conversationId) {
    return request(() => updateClear(conversationId), { latency: 120 })
  },

  async sendAssistantMessage(conversationId, text) {
    return request(
      () => {
        const store = loadStore()
        const conversation = store.aiConversations.find((item) => item.id === conversationId)
        assert(conversation, 'That conversation does not exist.', { code: 'not-found', status: 404 })
        assert(String(text || '').trim().length > 2, 'Type a question for the assistant.', { code: 'validation' })

        const studentMessage = {
          id: createId('aimsg'),
          role: 'student',
          text: String(text).trim(),
          at: nowIso(),
        }
        const reply = generateAssistantReply(String(text).trim(), conversation)
        const assistantMessage = {
          id: createId('aimsg'),
          role: 'assistant',
          text: reply.text,
          at: nowIso(),
          topicId: reply.topicId,
          suggested: reply.suggested,
          sourceLabel: reply.sourceLabel || 'Demo AI · contextual mock response',
        }
        const title =
          conversation.messages.length === 0
            ? String(text).trim().slice(0, 60)
            : conversation.title
        const next = {
          ...conversation,
          title,
          updatedAt: nowIso(),
          messages: [...conversation.messages, studentMessage, assistantMessage],
        }
        writeSingleton(
          'aiConversations',
          store.aiConversations.map((item) => (item.id === conversationId ? next : item)),
        )
        return { conversation: next, studentMessage, assistantMessage }
      },
      { latency: 700 },
    )
  },
}

function updateClear(conversationId) {
  const store = loadStore()
  const conversation = store.aiConversations.find((item) => item.id === conversationId)
  assert(conversation, 'That conversation does not exist.', { code: 'not-found', status: 404 })
  writeSingleton(
    'aiConversations',
    store.aiConversations.map((item) =>
      item.id === conversationId ? { ...item, messages: [], updatedAt: nowIso() } : item,
    ),
  )
  return { ok: true }
}

/* ------------------- contextual mock AI response engine ------------------- */

const TOPIC_KEYWORDS = [
  { topicId: 'top_phy_rotation', words: ['rotation', 'moment of inertia', 'rolling', 'angular', 'torque', 'hoop', 'disc'] },
  { topicId: 'top_phy_work', words: ['work', 'energy', 'power', 'incline', 'friction'] },
  { topicId: 'top_phy_kinematics', words: ['kinematics', 'velocity', 'acceleration', 'projectile', 'height', 'graph'] },
  { topicId: 'top_phy_laws', words: ['newton', 'force', 'third law', 'reaction'] },
  { topicId: 'top_phy_current', words: ['current', 'resistance', 'circuit', 'terminal voltage', 'emf'] },
  { topicId: 'top_phy_optics', words: ['mirror', 'refraction', 'lens', 'focal', 'refractive'] },
  { topicId: 'top_chem_equilibrium', words: ['equilibrium', 'kp', 'kc', 'le chatelier', 'ph'] },
  { topicId: 'top_chem_mole', words: ['mole', 'molar', 'stoichiometry', 'avogadro'] },
  { topicId: 'top_chem_bonding', words: ['hybridisation', 'hybridization', 'bonding', 'geometry', 'linear'] },
  { topicId: 'top_chem_organic', words: ['organic', 'markovnikov', 'alkene', 'mechanism', 'sn1', 'sn2'] },
  { topicId: 'top_chem_electro', words: ['electrolysis', 'faraday', 'electrochem'] },
  { topicId: 'top_math_quadratic', words: ['quadratic', 'roots', 'discriminant'] },
  { topicId: 'top_math_trig', words: ['trigonometry', 'sin', 'cos', 'maximum value'] },
  { topicId: 'top_math_calculus', words: ['derivative', 'calculus', 'integration', 'minimum', 'maximum'] },
  { topicId: 'top_math_vectors', words: ['vector', 'dot product', 'cross product', 'angle between'] },
  { topicId: 'top_math_probability', words: ['probability', 'combination', 'permutation', 'dice'] },
  { topicId: 'top_bio_cell', words: ['cell', 'organelle', 'mitochondria', 'ribosome'] },
  { topicId: 'top_bio_genetics', words: ['genetics', 'pedigree', 'chromosome', 'heterozygous', 'dominant'] },
  { topicId: 'top_bio_human', words: ['heart', 'blood', 'pulmonary', 'physiology', 'circulation'] },
  { topicId: 'top_bio_ecology', words: ['ecology', 'trophic', 'energy transfer', 'lindeman'] },
]

const TOPIC_GUIDANCE = {
  top_phy_rotation:
    'For rotational motion, always identify the axis first. Moment of inertia is defined about a specific axis: a rod about its centre is ML²/12, about its end ML²/3. For rolling bodies energy splits between ½Mv² and ½Iω², and with v = ωR the acceleration down an incline becomes a = g sinθ / (1 + I/MR²).',
  top_phy_work:
    'Use the work–energy theorem: net work equals the change in kinetic energy. Resolve forces along the direction of displacement before multiplying. On an incline, gravity contributes mg sinθ and friction contributes −μmg cosθ along the surface.',
  top_phy_kinematics:
    'For uniform acceleration, three relations cover almost everything: v = u + at, s = ut + ½at², and v² = u² + 2as. When the motion is described by a graph, the area under a velocity–time graph is displacement and the slope is acceleration.',
  top_phy_laws:
    'Newton’s second law applies to the net force on one body: ΣF = ma. Newton’s third law pairs act on different bodies, so they never cancel within a single free-body diagram.',
  top_phy_current:
    'For a battery with internal resistance r, the current is I = E/(R + r) and the terminal voltage is E − Ir. In parallel, conductances add: 1/R = Σ1/Rᵢ.',
  top_phy_optics:
    'For mirrors and thin lenses, apply the Cartesian sign convention consistently: distances measured against the incident light are negative. Mirror focal length is f = R/2 and the lens/mirror equation is 1/v − 1/u = 1/f.',
  top_chem_equilibrium:
    'Kp and Kc are linked by Kp = Kc(RT)^Δn where Δn counts gaseous moles only. Le Chatelier shifts depend on pressure, temperature and concentration — but the equilibrium constant itself changes only with temperature.',
  top_chem_mole: 'Moles link mass, particles and volume: n = m/M and one mole contains 6.022 × 10²³ particles. Always convert to moles before using stoichiometric ratios.',
  top_chem_bonding:
    'Count electron domains around the central atom to get hybridisation: 2 → sp (linear), 3 → sp² (trigonal planar), 4 → sp³ (tetrahedral). Lone pairs compress bond angles.',
  top_chem_organic:
    'For addition to alkenes, the stability of the intermediate decides the product: Markovnikov addition puts H on the carbon with more hydrogens; peroxide conditions switch to a radical mechanism and give the anti-Markovnikov product (HBr only).',
  top_chem_electro: 'Faraday’s laws: mass deposited is proportional to charge Q = It, with one mole of electrons per Faraday (96500 C).',
  top_math_quadratic:
    'For ax² + bx + c = 0, check the discriminant D = b² − 4ac: D > 0 gives two real roots, D = 0 gives equal roots, D < 0 gives complex roots. Sum of roots is −b/a and product is c/a.',
  top_math_trig:
    'For a sin x + b cos x the maximum value is √(a² + b²) and the minimum is −√(a² + b²). Remember sin 30° = ½, cos 60° = ½ and sin²x + cos²x = 1.',
  top_math_calculus:
    'Differentiate with the power rule first, then set the derivative to zero to locate stationary points. The second derivative tells you whether the point is a minimum (positive) or a maximum (negative).',
  top_math_vectors:
    'Dot product measures alignment: a·b = |a||b|cos θ, so a zero dot product means perpendicular vectors. To find the angle, compute the dot product and divide by the product of magnitudes.',
  top_math_probability:
    'Decide whether order matters before counting: permutations when it does, combinations when it does not. For dice problems, list the favourable outcomes against the full 36-outcome sample space.',
  top_bio_cell:
    'Match each organelle to its function: mitochondria for ATP, ribosomes for protein synthesis, lysosomes for degradation, chloroplasts for photosynthesis.',
  top_bio_genetics:
    'In a monohybrid cross of two heterozygotes the genotypic ratio is 1:2:1 and the phenotypic ratio is 3:1 when one allele is fully dominant. Gametes carry half the somatic chromosome number.',
  top_bio_human:
    'Vessels are classified by direction, not oxygen content: arteries carry blood away from the heart. The pulmonary artery is the exception carrying deoxygenated blood to the lungs.',
  top_bio_ecology:
    'Energy transfer between trophic levels is roughly 10% (Lindeman). Energy is lost mainly as heat, so food chains rarely exceed four or five levels.',
}

function detectTopic(text) {
  const needle = text.toLowerCase()
  let best = null
  TOPIC_KEYWORDS.forEach((entry) => {
    const hit = entry.words.find((word) => needle.includes(word))
    if (hit && (!best || hit.length > best.hit.length)) best = { topicId: entry.topicId, hit }
  })
  return best?.topicId || null
}

function generateAssistantReply(text, conversation) {
  const topicId = detectTopic(text)
  const asksForFormula = /formula|equation|derive|derivation/i.test(text)
  const asksForSteps = /step|how do i|solve|explain|why/i.test(text)
  const profile = loadStore().students.find((item) => item.id === conversation.studentId)

  if (topicId) {
    const topic = TOPIC_BY_ID[topicId]
    const guidance = TOPIC_GUIDANCE[topicId]
    const relatedQuestion = Object.values(QUESTION_BY_ID).find((question) => question.topicId === topicId)
    const parts = []
    parts.push(`${topic?.name || 'This topic'} — here is the reasoning, not just the result.`)
    parts.push(guidance)
    if (relatedQuestion) {
      parts.push(
        `A bank question on the same idea: “${relatedQuestion.text}” The expected answer is ${
          Array.isArray(relatedQuestion.correctAnswer)
            ? relatedQuestion.correctAnswer.join(', ').toUpperCase()
            : relatedQuestion.correctAnswer
        }. Try it once before reading the worked solution.`,
      )
    }
    if (asksForFormula) parts.push('Write the governing relation first, then substitute — most errors come from skipping that step.')
    if (asksForSteps) parts.push('If you want, attach your attempt as an image and I can point at the exact line that breaks.')
    return {
      text: parts.join('\n\n'),
      topicId,
      sourceLabel: 'Demo AI · grounded in the Vyuh question bank',
      suggested: [
        `Give me a harder ${topic?.name?.toLowerCase()} question`,
        'Why is this step valid?',
        `Ask my faculty about ${topic?.name?.toLowerCase()}`,
      ],
    }
  }

  if (/attendance|absent|present/i.test(text)) {
    return {
      text: `Attendance in Vyuh is duration-based: it uses the minutes you were actually connected inside the eligible session window divided by the eligible session minutes. Reconnections do not double count, and the grace period is set by the institute policy. You can see the exact join and leave intervals on the Attendance page.`,
      topicId: null,
      suggested: ['Show my attendance by subject', 'What is the attendance threshold?'],
    }
  }

  if (/exam|test|paper|mock/i.test(text)) {
    return {
      text: `For examinations, two habits move the needle most: (1) attempt every question you can eliminate two options on, because a blank is always zero, and (2) spend the first 60 seconds scanning the paper and start with your strongest section. Negative marking only applies to single- and multiple-correct items; numerical answers carry none.`,
      topicId: null,
      suggested: ['How should I use the review palette?', 'Show my weakest topic last exam'],
    }
  }

  if (/plan|schedule|study|revise|revision/i.test(text)) {
    const batchName = profile?.program || 'your programme'
    return {
      text: `A workable weekly plan for ${batchName}: two 90-minute concept blocks per subject, one timed sectional test, and a 45-minute review of only the questions you got wrong. The review block matters more than a fresh practice set — it is where the marks come from. Vyuh already tracks your topic accuracy on the Performance page, so start with the two lowest-accuracy topics.`,
      topicId: null,
      suggested: ['Build the plan around my weakest topics', 'Show my performance trends'],
    }
  }

  return {
    text: `I can help with concepts, worked solutions, exam strategy and attendance rules. This is a demonstration assistant: the responses are contextual templates grounded in the Vyuh question bank, not a live language model. For a specific doubt, choose the topic in your message or send it to your faculty from Ask Faculty.`,
    topicId: null,
    suggested: [
      'Explain moment of inertia for a disc',
      'How is attendance calculated?',
      'Give me an exam strategy for a full mock',
    ],
  }
}
