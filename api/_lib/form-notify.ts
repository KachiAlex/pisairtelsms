import { sendEmail, isEmailConfigured } from './email.js'

const PLATFORM_NOTIFY_EMAIL = process.env.PLATFORM_NOTIFY_EMAIL || 'admin@pisairtel.com'

function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

/**
 * Emails a public-form submission to the platform admin inbox.
 * Fire-and-forget: failures are logged, never thrown — a form submit must not
 * fail because the mail relay is down or unconfigured.
 */
export function notifyPlatformAdmin(opts: {
  kind: string
  fields: [string, unknown][]
  replyTo?: string
}): void {
  if (!isEmailConfigured()) return

  const rows = opts.fields
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) =>
      `<tr><td style="color:#6b7280;font-size:13px;padding:5px 12px 5px 0;vertical-align:top;white-space:nowrap;">${esc(k)}</td>` +
      `<td style="color:#1f2937;font-size:13px;padding:5px 0;">${esc(v)}</td></tr>`
    )
    .join('')

  sendEmail({
    to: PLATFORM_NOTIFY_EMAIL,
    replyTo: opts.replyTo,
    subject: `[Pisairtel Schools] ${opts.kind}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;">
        <h2 style="color:#1f2937;font-size:17px;margin-bottom:14px;">${esc(opts.kind)}</h2>
        <table style="border-collapse:collapse;">${rows}</table>
        <p style="color:#9ca3af;font-size:12px;margin-top:18px;">
          Submitted ${esc(new Date().toISOString())} via pisairtelsms.com
        </p>
      </div>`,
  }).catch((err) => console.error('Platform form notification failed:', err))
}
