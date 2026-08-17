import {
  Communication,
  CommunicationChannel,
  CommunicationRecipient,
  getCommunicationById,
  getDeliveryStats,
  updateCommunicationStatus,
  updateRecipientStatus,
} from './schema.js'
import { getProvider } from './providers.js'
import { fetchStudents } from '../students.js'
import { fetchParents } from '../parents.js'
import { fetchStaff } from '../staff.js'

async function resolveAudience(
  tenantId: string,
  audience: 'all' | 'students' | 'staff' | 'parents' | string[]
): Promise<Array<{ id: string; type: 'student' | 'parent' | 'staff'; name: string; email?: string; phone?: string }>> {
  let recipients: any[] = []

  if (Array.isArray(audience)) {
    const [students, parents, staff] = await Promise.all([
      fetchStudents(tenantId),
      fetchParents(tenantId),
      fetchStaff(undefined, undefined, tenantId),
    ])
    const selected = new Set(audience)
    recipients = [...students, ...parents, ...staff].filter((r: any) => selected.has(r.id))
  } else if (audience === 'all' || audience === 'students') {
    const rows = await fetchStudents(tenantId)
    recipients = [...recipients, ...rows]
  }
  if ((audience === 'all' || audience === 'parents') && !Array.isArray(audience)) {
    const rows = await fetchParents(tenantId)
    recipients = [...recipients, ...rows]
  }
  if ((audience === 'all' || audience === 'staff') && !Array.isArray(audience)) {
    const rows = await fetchStaff(undefined, undefined, tenantId)
    recipients = [...recipients, ...rows]
  }

  return recipients.map((r: any) => ({
    id: r.id,
    type: r.type || (r.student_id ? 'student' : r.parent_id ? 'parent' : 'staff'),
    name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || r.phone || 'Unknown',
    email: r.guardianEmail ?? r.email ?? undefined,
    phone: r.phone,
  }))
}

function addressForChannel(r: any, channel: CommunicationChannel): string | null {
  switch (channel) {
    case 'email':
      return r.email || null
    case 'sms':
      return r.phone || null
    case 'push':
    case 'in-app':
    default:
      return r.id
  }
}

export async function enqueueCommunication(
  tenantId: string,
  communication: Communication
): Promise<void> {
  const { createRecipients } = await import('./schema.js')
  const recipientList = await resolveAudience(tenantId, communication.audience)
  const rows = recipientList.flatMap((r) =>
    communication.channels
      .map((channel) => {
        const address = addressForChannel(r, channel)
        if (!address) return null
        return {
          recipientId: r.id,
          recipientType: r.type,
          recipientName: r.name,
          channel,
          address,
        }
      })
      .filter(Boolean) as any
  )
  await createRecipients(tenantId, communication.id, rows)
}

export async function processQueue(
  tenantId: string,
  communicationId: string,
  batchSize = 50
): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  const communication = await getCommunicationById(tenantId, communicationId)
  if (!communication) {
    throw new Error('Communication not found')
  }

  const { getRecipientsByCommunication } = await import('./schema.js')
  const pending = await getRecipientsByCommunication(tenantId, communicationId, 'pending')
  const toProcess = pending.slice(0, batchSize)

  let sent = 0
  let failed = 0

  for (const recipient of toProcess) {
    const provider = getProvider(recipient.channel)
    const result = await provider.send({
      to: recipient.address,
      subject: communication.title,
      body: communication.body,
      html: `<p>${communication.body.replace(/\n/g, '<br/>')}</p>`,
      recipientName: recipient.recipientName,
      communicationId: communication.id,
      channel: recipient.channel,
    })

    if (result.success) {
      sent++
      await updateRecipientStatus(recipient.id, {
        status: 'sent',
        providerMessageId: result.providerMessageId,
        attempts: recipient.attempts + 1,
        sentAt: new Date().toISOString(),
        errorMessage: null,
      })
    } else {
      failed++
      const attempts = recipient.attempts + 1
      const status = attempts >= 3 ? 'failed' : 'pending'
      await updateRecipientStatus(recipient.id, {
        status,
        attempts,
        errorMessage: result.error,
      })
    }
  }

  const stats = await getDeliveryStats(tenantId, communicationId)
  const total = stats.pending + stats.queued + stats.sent + stats.delivered + stats.read + stats.failed + stats.bounced
  const newStatus: any = total === 0
    ? 'sent'
    : stats.pending + stats.queued === 0
      ? stats.failed === 0
        ? 'sent'
        : 'partial'
      : 'sending'

  await updateCommunicationStatus(tenantId, communicationId, newStatus, {
    sentAt: new Date().toISOString(),
  })

  return { processed: toProcess.length, sent, failed }
}
