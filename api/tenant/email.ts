import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireRole } from '../_lib/auth-middleware.js'
import { sendEmail, sendBulkEmails, verifyEmailConnection, isEmailConfigured } from '../_lib/email.js'
import { emailTemplates, EmailTemplateKey } from '../_lib/email-templates.js'

/**
 * Email API
 *
 * GET  /api/tenant/email?action=status
 *   → Check email service configuration status
 *
 * GET  /api/tenant/email?action=verify
 *   → Verify SMTP connection
 *
 * POST /api/tenant/email  { action: 'send', to, template, data }
 *   → Send a single email using a template
 *
 * POST /api/tenant/email  { action: 'send-custom', to, subject, html }
 *   → Send a single email with custom HTML
 *
 * POST /api/tenant/email  { action: 'send-bulk', recipients: [{to, template, data}] }
 *   → Send bulk emails using templates
 *
 * POST /api/tenant/email  { action: 'send-bulk-custom', emails: [{to, subject, html}] }
 *   → Send bulk custom emails
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['tenant_admin', 'super_admin', 'staff'])
  if (!decoded) return

  if (req.method === 'GET') {
    const { action } = req.query

    if (action === 'status') {
      return res.status(200).json({
        success: true,
        configured: isEmailConfigured(),
        fromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@pisairtelsms.com',
        fromName: process.env.BREVO_FROM_NAME || 'Pisairtel SMS',
      })
    }

    if (action === 'verify') {
      const ok = await verifyEmailConnection()
      return res.status(200).json({
        success: ok,
        message: ok ? 'SMTP connection verified' : 'SMTP connection failed',
      })
    }

    return res.status(400).json({ error: 'Invalid action. Use: status or verify' })
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { action } = body || {}

    // ── Send single email with template ──────────────────────────────────
    if (action === 'send') {
      const { to, template, data, subject: customSubject } = body

      if (!to || !template) {
        return res.status(400).json({ error: 'to and template are required' })
      }

      const templateFn = emailTemplates[template as EmailTemplateKey]
      if (!templateFn) {
        return res.status(400).json({
          error: `Invalid template. Available: ${Object.keys(emailTemplates).join(', ')}`,
        })
      }

      const { html, subject } = templateFn(data || {})
      const result = await sendEmail({
        to,
        subject: customSubject || subject,
        html,
      })

      return res.status(result.success ? 200 : 500).json(result)
    }

    // ── Send custom email ────────────────────────────────────────────────
    if (action === 'send-custom') {
      const { to, subject, html, cc, bcc } = body

      if (!to || !subject || !html) {
        return res.status(400).json({ error: 'to, subject, and html are required' })
      }

      const result = await sendEmail({ to, subject, html, cc, bcc })
      return res.status(result.success ? 200 : 500).json(result)
    }

    // ── Send bulk emails with templates ──────────────────────────────────
    if (action === 'send-bulk') {
      const { recipients } = body

      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'recipients array is required' })
      }

      const emails = recipients.map((r: any) => {
        const templateFn = emailTemplates[r.template as EmailTemplateKey]
        if (!templateFn) throw new Error(`Invalid template: ${r.template}`)
        const { html, subject } = templateFn(r.data || {})
        return {
          to: r.to,
          subject: r.subject || subject,
          html,
        }
      }).filter((e: any) => e.to)

      const result = await sendBulkEmails(emails)
      return res.status(200).json({ success: true, ...result })
    }

    // ── Send bulk custom emails ──────────────────────────────────────────
    if (action === 'send-bulk-custom') {
      const { emails } = body

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'emails array is required' })
      }

      const result = await sendBulkEmails(emails)
      return res.status(200).json({ success: true, ...result })
    }

    return res.status(400).json({
      error: 'Invalid action. Use: send, send-custom, send-bulk, or send-bulk-custom',
    })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
