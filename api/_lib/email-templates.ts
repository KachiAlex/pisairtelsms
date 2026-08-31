/**
 * Email Templates
 * HTML templates for all transactional email types
 */

function baseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1e40af;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">Pisairtel SMS</h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">School Management System</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">
                This is an automated message from Pisairtel SMS. Please do not reply to this email.
              </p>
              <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;text-align:center;">
                &copy; ${new Date().getFullYear()} Pisairtel SMS. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export interface TemplateData {
  [key: string]: any
}

export const emailTemplates = {
  welcome: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#1f2937;">Welcome to Pisairtel SMS!</h2>
      <p style="color:#4b5563;line-height:1.6;">Hello <strong>${data.name || 'there'}</strong>,</p>
      <p style="color:#4b5563;line-height:1.6;">
        Your account has been created on the Pisairtel School Management System.
      </p>
      <table style="width:100%;margin:20px 0;background:#f3f4f6;border-radius:6px;padding:16px;">
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Login URL:</td><td style="color:#1f2937;font-weight:500;"><a href="${data.loginUrl || 'https://pisairtelsms.com'}" style="color:#1e40af;">${data.loginUrl || 'https://pisairtelsms.com'}</a></td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Email:</td><td style="color:#1f2937;font-weight:500;">${data.email || ''}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Role:</td><td style="color:#1f2937;font-weight:500;">${data.role || 'Staff'}</td></tr>
      </table>
      <p style="color:#4b5563;line-height:1.6;">Please use your email and the temporary password provided separately to log in. You will be prompted to change your password on first login.</p>
      <p style="color:#4b5563;line-height:1.6;">If you have any questions, please contact your school administrator.</p>`
    return { html: baseTemplate(content, 'Welcome to Pisairtel SMS'), subject: 'Welcome to Pisairtel SMS' }
  },

  staffCredentials: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#1f2937;">Your Staff Account Credentials</h2>
      <p style="color:#4b5563;line-height:1.6;">Hello <strong>${data.name || 'there'}</strong>,</p>
      <p style="color:#4b5563;line-height:1.6;">Your staff account has been created. Here are your login details:</p>
      <table style="width:100%;margin:20px 0;background:#f3f4f6;border-radius:6px;padding:16px;">
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Login URL:</td><td style="color:#1f2937;font-weight:500;"><a href="${data.loginUrl || 'https://pisairtelsms.com'}" style="color:#1e40af;">${data.loginUrl || 'https://pisairtelsms.com'}</a></td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Email:</td><td style="color:#1f2937;font-weight:500;">${data.email || ''}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Password:</td><td style="color:#1f2937;font-weight:500;font-family:monospace;">${data.password || ''}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Role:</td><td style="color:#1f2937;font-weight:500;">${data.role || 'Staff'}</td></tr>
      </table>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          <strong>Important:</strong> Please change your password after your first login for security purposes.
        </p>
      </div>
      <p style="color:#4b5563;line-height:1.6;">If you did not expect this email, please contact your administrator.</p>`
    return { html: baseTemplate(content, 'Staff Account Credentials'), subject: 'Your Pisairtel SMS Staff Account' }
  },

  attendanceAlert: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#dc2626;">Attendance Alert</h2>
      <p style="color:#4b5563;line-height:1.6;">Dear <strong>${data.guardianName || 'Guardian'}</strong>,</p>
      <p style="color:#4b5563;line-height:1.6;">
        This is to inform you that your ward, <strong>${data.studentName || 'Student'}</strong>, has been flagged for attendance concerns.
      </p>
      <table style="width:100%;margin:20px 0;background:#f3f4f6;border-radius:6px;padding:16px;">
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Student:</td><td style="color:#1f2937;font-weight:500;">${data.studentName || ''}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Attendance Rate:</td><td style="color:${data.attendanceRate < 75 ? '#dc2626' : '#1f2937'};font-weight:500;">${data.attendanceRate || 0}%</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Absences:</td><td style="color:#1f2937;font-weight:500;">${data.absenceCount || 0} days</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Late Arrivals:</td><td style="color:#1f2937;font-weight:500;">${data.lateCount || 0} days</td></tr>
      </table>
      ${data.recommendedActions ? `
      <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:6px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0 0 4px;color:#1e40af;font-weight:600;font-size:14px;">Recommended Actions:</p>
        <p style="margin:0;color:#1e3a8a;font-size:13px;">${data.recommendedActions}</p>
      </div>` : ''}
      <p style="color:#4b5563;line-height:1.6;">Please contact the school office to discuss this matter at your earliest convenience.</p>`
    return { html: baseTemplate(content, 'Attendance Alert'), subject: `Attendance Alert: ${data.studentName || 'Your Ward'}` }
  },

  paymentConfirmation: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#16a34a;">Payment Confirmation</h2>
      <p style="color:#4b5563;line-height:1.6;">Dear <strong>${data.studentName || 'Student'}</strong>,</p>
      <p style="color:#4b5563;line-height:1.6;">We have received and confirmed your payment. Here are the details:</p>
      <table style="width:100%;margin:20px 0;background:#f3f4f6;border-radius:6px;padding:16px;">
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Payment ID:</td><td style="color:#1f2937;font-weight:500;">${data.paymentId || ''}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Description:</td><td style="color:#1f2937;font-weight:500;">${data.description || 'School Fees'}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Amount:</td><td style="color:#1f2937;font-weight:500;font-size:16px;">&#8358;${(data.amount || 0).toLocaleString()}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Date:</td><td style="color:#1f2937;font-weight:500;">${data.date || new Date().toLocaleDateString()}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Method:</td><td style="color:#1f2937;font-weight:500;">${data.method || 'Manual'}</td></tr>
      </table>
      <p style="color:#4b5563;line-height:1.6;">Thank you for your payment. Please keep this email for your records.</p>`
    return { html: baseTemplate(content, 'Payment Confirmation'), subject: `Payment Confirmed: ${data.paymentId || ''}` }
  },

  paymentRejected: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#dc2626;">Payment Update</h2>
      <p style="color:#4b5563;line-height:1.6;">Dear <strong>${data.studentName || 'Student'}</strong>,</p>
      <p style="color:#4b5563;line-height:1.6;">Your payment submission could not be confirmed. Here are the details:</p>
      <table style="width:100%;margin:20px 0;background:#f3f4f6;border-radius:6px;padding:16px;">
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Payment ID:</td><td style="color:#1f2937;font-weight:500;">${data.paymentId || ''}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Amount:</td><td style="color:#1f2937;font-weight:500;">&#8358;${(data.amount || 0).toLocaleString()}</td></tr>
        <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Reason:</td><td style="color:#dc2626;font-weight:500;">${data.reason || 'Payment could not be verified'}</td></tr>
      </table>
      <p style="color:#4b5563;line-height:1.6;">Please contact the school bursary for further assistance.</p>`
    return { html: baseTemplate(content, 'Payment Update'), subject: `Payment Update: ${data.paymentId || ''}` }
  },

  bulkNotification: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#1f2937;">${data.title || 'Notification'}</h2>
      <p style="color:#4b5563;line-height:1.6;">Dear <strong>${data.recipientName || 'Recipient'}</strong>,</p>
      <div style="color:#4b5563;line-height:1.6;">${data.message || ''}</div>
      ${data.actionUrl ? `<p style="margin-top:20px;"><a href="${data.actionUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:500;">View Details</a></p>` : ''}`
    return { html: baseTemplate(content, data.title || 'Notification'), subject: data.title || 'Pisairtel SMS Notification' }
  },

  passwordReset: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#1f2937;">Password Reset Request</h2>
      <p style="color:#4b5563;line-height:1.6;">Hello <strong>${data.name || 'there'}</strong>,</p>
      <p style="color:#4b5563;line-height:1.6;">A password reset has been requested for your account.</p>
      <p style="color:#4b5563;line-height:1.6;">Your new temporary password is:</p>
      <div style="text-align:center;margin:20px 0;">
        <span style="display:inline-block;background:#1e40af;color:#fff;font-family:monospace;font-size:18px;padding:12px 24px;border-radius:6px;font-weight:600;">${data.password || ''}</span>
      </div>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          <strong>Security Notice:</strong> Please log in and change this password immediately. If you did not request this reset, please contact your administrator.
        </p>
      </div>
      <p style="color:#4b5563;line-height:1.6;"><a href="${data.loginUrl || 'https://pisairtelsms.com'}" style="color:#1e40af;">Click here to log in</a></p>`
    return { html: baseTemplate(content, 'Password Reset'), subject: 'Password Reset - Pisairtel SMS' }
  },

  staffAttendanceSummary: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#1f2937;">Daily Attendance Summary</h2>
      <p style="color:#4b5563;line-height:1.6;">Date: <strong>${data.date || new Date().toLocaleDateString()}</strong></p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr style="background:#f3f4f6;"><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Total Staff</td><td style="padding:8px 12px;text-align:right;font-weight:600;">${data.totalStaff || 0}</td></tr>
        <tr><td style="padding:8px 12px;color:#16a34a;font-size:13px;">Present</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#16a34a;">${data.present || 0}</td></tr>
        <tr><td style="padding:8px 12px;color:#ca8a04;font-size:13px;">Late</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#ca8a04;">${data.late || 0}</td></tr>
        <tr><td style="padding:8px 12px;color:#dc2626;font-size:13px;">Absent</td><td style="padding:8px 12px;text-align:right;font-weight:600;color:#dc2626;">${data.absent || 0}</td></tr>
      </table>
      ${data.notMarked ? `<p style="color:#6b7280;font-size:13px;">${data.notMarked} staff not yet marked.</p>` : ''}`
    return { html: baseTemplate(content, 'Attendance Summary'), subject: `Staff Attendance Summary - ${data.date || 'Today'}` }
  },

  custom: (data: TemplateData) => {
    const content = `
      <h2 style="margin:0 0 16px;color:#1f2937;">${data.title || 'Notification'}</h2>
      <p style="color:#4b5563;line-height:1.6;">${data.message || ''}</p>`
    return { html: baseTemplate(content, data.title || 'Notification'), subject: data.subject || data.title || 'Pisairtel SMS Notification' }
  },
}

export type EmailTemplateKey = keyof typeof emailTemplates
