import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware.js'
import { ensureStaffTables } from '../_lib/staff.js'

/**
 * QR Code Attendance API
 *
 * GET  /api/tenant/staff-attendance/qr?date=YYYY-MM-DD
 *   → Admin generates a QR token for the day (time-limited, 5 min expiry)
 *   → Returns { token, qrData, expiresAt }
 *
 * POST /api/tenant/staff-attendance/qr  { action: 'generate' }
 *   → Generate a new QR session token
 *
 * POST /api/tenant/staff-attendance/qr  { action: 'scan', token, staffId }
 *   → Staff scans QR code to mark attendance (check-in or check-out)
 *   → Returns { success, action: 'check-in'|'check-out', time, status }
 */

interface QrSession {
  id: string
  token: string
  tenant_id: string
  date: string
  generated_by: string
  created_at: string
  expires_at: string
  used: boolean
}

function generateToken(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  const random2 = Math.random().toString(36).substring(2, 15)
  return `qr_${timestamp}_${random}${random2}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'
  const userRole = decoded.role || 'staff'
  const userId = decoded.staffId || decoded.userId || decoded.sub

  await ensureStaffTables()

  // Ensure QR sessions table exists
  await sql`
    CREATE TABLE IF NOT EXISTS staff_attendance_qr_sessions (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      date DATE NOT NULL,
      generated_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false
    )
  `.catch(() => {})

  if (req.method === 'GET') {
    try {
      const { date } = req.query
      const targetDate = (date as string) || new Date().toISOString().split('T')[0]

      // Check for an active QR session
      const result = await sql`
        SELECT id, token, date::text, generated_by, created_at::text, expires_at::text, used
        FROM staff_attendance_qr_sessions
        WHERE tenant_id = ${tenantId}
          AND date = ${targetDate}
          AND expires_at > NOW()
          AND used = false
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (result.rows[0]) {
        const session = result.rows[0] as any
        return res.status(200).json({
          success: true,
          token: session.token,
          qrData: JSON.stringify({
            t: session.token,
            d: session.date,
            e: session.expires_at,
          }),
          date: session.date,
          expiresAt: session.expires_at,
          createdAt: session.created_at,
        })
      }

      return res.status(200).json({
        success: true,
        token: null,
        qrData: null,
        message: 'No active QR session. Generate one to start.',
      })
    } catch (error) {
      console.error('QR session fetch error:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch QR session' })
    }
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { action } = body || {}

    // ── Generate QR Session ──────────────────────────────────────────────
    if (action === 'generate') {
      // Only admins can generate QR codes
      if (userRole !== 'tenant_admin' && userRole !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Only administrators can generate QR codes' })
      }

      try {
        const today = new Date().toISOString().split('T')[0]
        const token = generateToken()
        const id = `qrs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

        await sql`
          INSERT INTO staff_attendance_qr_sessions (id, token, tenant_id, date, generated_by, expires_at, used)
          VALUES (${id}, ${token}, ${tenantId}, ${today}, ${userId}, ${expiresAt.toISOString()}, false)
        `

        return res.status(200).json({
          success: true,
          token,
          qrData: JSON.stringify({
            t: token,
            d: today,
            e: expiresAt.toISOString(),
          }),
          date: today,
          expiresAt: expiresAt.toISOString(),
          message: 'QR code generated. Valid for 5 minutes.',
        })
      } catch (error) {
        console.error('QR generation error:', error)
        return res.status(500).json({ success: false, error: 'Failed to generate QR code' })
      }
    }

    // ── Scan QR Code (staff self check-in/out) ──────────────────────────
    if (action === 'scan') {
      const { token } = body

      if (!token) {
        return res.status(400).json({ success: false, error: 'QR token is required' })
      }

      try {
        // Validate the QR session
        const sessionResult = await sql`
          SELECT id, token, date::text, expires_at, used
          FROM staff_attendance_qr_sessions
          WHERE token = ${token}
            AND tenant_id = ${tenantId}
            AND expires_at > NOW()
            AND used = false
          LIMIT 1
        `

        if (!sessionResult.rows[0]) {
          // Check if it exists but expired
          const expiredCheck = await sql`
            SELECT expires_at FROM staff_attendance_qr_sessions
            WHERE token = ${token} AND tenant_id = ${tenantId}
            LIMIT 1
          `
          if (expiredCheck.rows[0]) {
            return res.status(403).json({ success: false, error: 'QR code has expired. Please ask admin to generate a new one.' })
          }
          return res.status(403).json({ success: false, error: 'Invalid QR code' })
        }

        const session = sessionResult.rows[0] as any
        const today = session.date
        const now = new Date()
        const time = now.toTimeString().split(' ')[0]

        // Get staff record
        const staffResult = await sql`
          SELECT id, name FROM staff WHERE id = ${userId} OR staff_id = ${userId} LIMIT 1
        `
        const staffName = staffResult.rows[0]?.name || 'Unknown'
        const staffId = staffResult.rows[0]?.id || userId

        // Check if already checked in today
        const existingResult = await sql`
          SELECT id, check_in, check_out, status
          FROM staff_attendance
          WHERE staff_id = ${staffId} AND date = ${today}
          LIMIT 1
        `

        const existing = existingResult.rows[0] as any

        if (!existing || !existing.check_in) {
          // ── Check In ──
          const checkInStatus: 'present' | 'late' = time > '08:00:00' ? 'late' : 'present'
          const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

          await sql`
            INSERT INTO staff_attendance (id, staff_id, staff_name, tenant_id, date, check_in, status, notes, geo_verified)
            VALUES (${id}, ${staffId}, ${staffName}, ${tenantId}, ${today}, ${time}, ${checkInStatus}, 'QR code check-in', false)
            ON CONFLICT (staff_id, date) DO UPDATE SET
              check_in = EXCLUDED.check_in,
              status = EXCLUDED.status,
              notes = EXCLUDED.notes
          `

          return res.status(200).json({
            success: true,
            action: 'check-in',
            time,
            status: checkInStatus,
            staffName,
            message: `Checked in at ${time}${checkInStatus === 'late' ? ' (Late)' : ''}`,
          })
        } else if (existing.check_in && !existing.check_out) {
          // ── Check Out ──
          await sql`
            UPDATE staff_attendance
            SET check_out = ${time}
            WHERE staff_id = ${staffId} AND date = ${today}
          `

          return res.status(200).json({
            success: true,
            action: 'check-out',
            time,
            staffName,
            message: `Checked out at ${time}`,
          })
        } else {
          return res.status(200).json({
            success: true,
            action: 'already-marked',
            checkIn: existing.check_in,
            checkOut: existing.check_out,
            status: existing.status,
            staffName,
            message: 'You have already checked in and out today.',
          })
        }
      } catch (error) {
        console.error('QR scan error:', error)
        return res.status(500).json({ success: false, error: 'Failed to process QR scan' })
      }
    }

    // ── Admin Bulk Manual Mark ──────────────────────────────────────────
    if (action === 'bulk-mark') {
      if (userRole !== 'tenant_admin' && userRole !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'Only administrators can bulk mark attendance' })
      }

      const { records, date } = body as {
        records: Array<{ staffId: string; status: 'present' | 'absent' | 'late' | 'half_day'; checkIn?: string; checkOut?: string; notes?: string }>
        date: string
      }

      if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, error: 'records array is required' })
      }

      const targetDate = date || new Date().toISOString().split('T')[0]
      let successCount = 0
      let failCount = 0

      for (const record of records) {
        try {
          const staffResult = await sql`SELECT name FROM staff WHERE id = ${record.staffId} LIMIT 1`
          const staffName = staffResult.rows[0]?.name || 'Unknown'
          const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

          await sql`
            INSERT INTO staff_attendance (id, staff_id, staff_name, tenant_id, date, check_in, check_out, status, notes, geo_verified)
            VALUES (${id}, ${record.staffId}, ${staffName}, ${tenantId}, ${targetDate},
                    ${record.checkIn || null}, ${record.checkOut || null}, ${record.status},
                    ${record.notes || 'Admin manual mark'}, true)
            ON CONFLICT (staff_id, date) DO UPDATE SET
              status = EXCLUDED.status,
              check_in = COALESCE(EXCLUDED.check_in, staff_attendance.check_in),
              check_out = COALESCE(EXCLUDED.check_out, staff_attendance.check_out),
              notes = EXCLUDED.notes
          `
          successCount++
        } catch (err) {
          console.error(`Failed to mark attendance for staff ${record.staffId}:`, err)
          failCount++
        }
      }

      return res.status(200).json({
        success: true,
        marked: successCount,
        failed: failCount,
        message: `Marked ${successCount} staff${failCount > 0 ? `, ${failCount} failed` : ''}`,
      })
    }

    return res.status(400).json({ success: false, error: 'Invalid action. Use: generate, scan, or bulk-mark' })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
