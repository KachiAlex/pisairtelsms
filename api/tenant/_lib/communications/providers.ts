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
}

export interface MessageProvider {
  name: string
  send(payload: MessagePayload): Promise<SendResult>
}

export class InAppProvider implements MessageProvider {
  name = 'in-app'

  async send(_payload: MessagePayload): Promise<SendResult> {
    return { success: true, providerMessageId: `inapp_${Date.now()}` }
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
