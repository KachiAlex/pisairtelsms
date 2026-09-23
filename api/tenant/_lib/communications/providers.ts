export interface SendResult {
  success: boolean
  providerMessageId?: string
  error?: string
}

export interface MessagePayload {
  to: string
  subject: string
  body: string
  html?: string
  recipientName: string
  communicationId: string
  channel: 'email' | 'sms' | 'push' | 'in-app'
  tenantId?: string
  recipientType?: 'student' | 'parent' | 'staff'
}

export interface MessageProvider {
  name: string
  send(payload: MessagePayload): Promise<SendResult>
}

export class InAppProvider implements MessageProvider {
  name = 'in-app'

  async send(payload: MessagePayload): Promise<SendResult> {
    try {
      const { sql } = await import('../../../_lib/sql.js')
      const tenantId = payload.tenantId || 'default-tenant'
      const id = `inapp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      if (payload.recipientType === 'staff') {
        await sql`
          INSERT INTO staff_messages (id, staff_id, tenant_id, sender_name, subject, body, sender_role, is_read, created_at)
          VALUES (${id}, ${payload.to}, ${tenantId}, 'Admin', ${payload.subject}, ${payload.body}, 'admin', false, NOW())
        `
      } else if (payload.recipientType === 'student') {
        await sql`ALTER TABLE student_messages ADD COLUMN IF NOT EXISTS tenant_id TEXT`.catch(() => {})
        await sql`ALTER TABLE student_messages ADD COLUMN IF NOT EXISTS body TEXT`.catch(() => {})
        await sql`
          INSERT INTO student_messages (id, student_id, tenant_id, sender_name, subject, body, is_read, created_at)
          VALUES (${id}, ${payload.to}, ${tenantId}, 'School Admin', ${payload.subject}, ${payload.body}, false, NOW())
        `
      } else if (payload.recipientType === 'parent') {
        await sql`
          INSERT INTO parent_notifications (id, parent_id, type, title, message, is_read, created_at)
          VALUES (${id}, ${payload.to}, 'announcement', ${payload.subject}, ${payload.body}, false, NOW())
        `
      }

      return { success: true, providerMessageId: id }
    } catch (err: any) {
      return { success: false, error: err?.message || 'In-app delivery failed' }
    }
  }
}

export class EmailProvider implements MessageProvider {
  name = 'email'

  async send(payload: MessagePayload): Promise<SendResult> {
    try {
      const webhookUrl = process.env.EMAIL_PROVIDER_WEBHOOK
      if (!webhookUrl) {
        console.warn(`[EmailProvider] No EMAIL_PROVIDER_WEBHOOK configured. Simulating send to ${payload.to}`)
        return { success: true, providerMessageId: `email_${Date.now()}` }
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.to,
          subject: payload.subject,
          body: payload.body,
          html: payload.html,
          communication_id: payload.communicationId,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error')
        return { success: false, error: `HTTP ${res.status}: ${text}` }
      }

      const data = await res.json().catch(() => ({ id: `email_${Date.now()}` }))
      return { success: true, providerMessageId: data.id || `email_${Date.now()}` }
    } catch (err: any) {
      return { success: false, error: err.message || 'Email send failed' }
    }
  }
}

export class SmsProvider implements MessageProvider {
  name = 'sms'

  async send(payload: MessagePayload): Promise<SendResult> {
    try {
      const webhookUrl = process.env.SMS_PROVIDER_WEBHOOK
      if (!webhookUrl) {
        console.warn(`[SmsProvider] No SMS_PROVIDER_WEBHOOK configured. Simulating send to ${payload.to}`)
        return { success: true, providerMessageId: `sms_${Date.now()}` }
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.to,
          message: payload.body,
          communication_id: payload.communicationId,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error')
        return { success: false, error: `HTTP ${res.status}: ${text}` }
      }

      const data = await res.json().catch(() => ({ id: `sms_${Date.now()}` }))
      return { success: true, providerMessageId: data.id || `sms_${Date.now()}` }
    } catch (err: any) {
      return { success: false, error: err.message || 'SMS send failed' }
    }
  }
}

export class PushProvider implements MessageProvider {
  name = 'push'

  async send(payload: MessagePayload): Promise<SendResult> {
    try {
      const webhookUrl = process.env.PUSH_PROVIDER_WEBHOOK
      if (!webhookUrl) {
        console.warn(`[PushProvider] No PUSH_PROVIDER_WEBHOOK configured. Simulating send to ${payload.to}`)
        return { success: true, providerMessageId: `push_${Date.now()}` }
      }

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.to,
          title: payload.subject,
          body: payload.body,
          communication_id: payload.communicationId,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error')
        return { success: false, error: `HTTP ${res.status}: ${text}` }
      }

      const data = await res.json().catch(() => ({ id: `push_${Date.now()}` }))
      return { success: true, providerMessageId: data.id || `push_${Date.now()}` }
    } catch (err: any) {
      return { success: false, error: err.message || 'Push send failed' }
    }
  }
}

export function getProvider(channel: 'email' | 'sms' | 'push' | 'in-app'): MessageProvider {
  switch (channel) {
    case 'email':
      return new EmailProvider()
    case 'sms':
      return new SmsProvider()
    case 'push':
      return new PushProvider()
    case 'in-app':
    default:
      return new InAppProvider()
  }
}
