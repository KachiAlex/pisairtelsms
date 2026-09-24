import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProvider, InAppProvider, EmailProvider, SmsProvider, PushProvider } from './providers.js'

describe('Message providers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.EMAIL_PROVIDER_WEBHOOK
    delete process.env.SMS_PROVIDER_WEBHOOK
    delete process.env.PUSH_PROVIDER_WEBHOOK
  })

  it('InAppProvider always reports success', async () => {
    const provider = new InAppProvider()
    const result = await provider.send({
      to: 'user-1',
      subject: 'Hello',
      body: 'Test body',
      recipientName: 'User',
      communicationId: 'comm_1',
      channel: 'in-app',
    })
    expect(result.success).toBe(true)
    expect(result.providerMessageId).toBeDefined()
  })

  it('EmailProvider fails honestly when no provider is configured', async () => {
    delete process.env.BREVO_SMTP_USER
    delete process.env.BREVO_SMTP_KEY
    const provider = new EmailProvider()
    const result = await provider.send({
      to: 'test@example.com',
      subject: 'Hello',
      body: 'Test body',
      recipientName: 'Test User',
      communicationId: 'comm_1',
      channel: 'email',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not configured')
  })

  it('SmsProvider fails honestly when webhook is not configured', async () => {
    const provider = new SmsProvider()
    const result = await provider.send({
      to: '+1234567890',
      subject: 'Hello',
      body: 'Test body',
      recipientName: 'Test User',
      communicationId: 'comm_1',
      channel: 'sms',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not configured')
  })

  it('PushProvider fails honestly when webhook is not configured', async () => {
    const provider = new PushProvider()
    const result = await provider.send({
      to: 'device-token',
      subject: 'Hello',
      body: 'Test body',
      recipientName: 'Test User',
      communicationId: 'comm_1',
      channel: 'push',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('not configured')
  })

  it('getProvider returns the correct provider for each channel', () => {
    expect(getProvider('in-app')).toBeInstanceOf(InAppProvider)
    expect(getProvider('email')).toBeInstanceOf(EmailProvider)
    expect(getProvider('sms')).toBeInstanceOf(SmsProvider)
    expect(getProvider('push')).toBeInstanceOf(PushProvider)
  })
})
