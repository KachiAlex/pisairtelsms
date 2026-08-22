import nodemailer from 'nodemailer'

/**
 * Brevo Email Service
 * Sends transactional emails via Brevo SMTP relay
 */

interface BrevoConfig {
  host: string
  port: number
  user: string
  pass: string
  fromEmail: string
  fromName: string
}

function getConfig(): BrevoConfig {
  return {
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT || '587'),
    user: process.env.BREVO_SMTP_USER || '',
    pass: process.env.BREVO_SMTP_KEY || '',
    fromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@pisairtelsms.com',
    fromName: process.env.BREVO_FROM_NAME || 'Pisairtel SMS',
  }
}

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  const config = getConfig()
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
  return transporter
}

export interface EmailParams {
  to: string
  subject: string
  html: string
  text?: string
  cc?: string
  bcc?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  const config = getConfig()

  if (!config.user || !config.pass) {
    console.error('Brevo SMTP credentials not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const transport = getTransporter()
    const info = await transport.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      replyTo: params.replyTo,
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]*>/g, ''),
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    }
  }
}

export async function sendBulkEmails(
  emails: EmailParams[],
  batchSize: number = 50
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map((email) => sendEmail(email))
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++
      } else {
        failed++
        if (result.status === 'fulfilled') {
          errors.push(result.value.error || 'Unknown error')
        } else {
          errors.push(String(result.reason))
        }
      }
    }
  }

  return { sent, failed, errors }
}

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transport = getTransporter()
    await transport.verify()
    return true
  } catch {
    return false
  }
}

export function isEmailConfigured(): boolean {
  const config = getConfig()
  return !!(config.user && config.pass)
}
