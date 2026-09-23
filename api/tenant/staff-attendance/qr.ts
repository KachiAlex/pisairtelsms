import type { ApiRequest, ApiResponse } from '../../_lib/http-types.js'
import { sql } from '../../_lib/sql.js'
import { randomUUID } from 'crypto'
import { requireRole } from '../../_lib/auth-middleware.js'
import { ensureStaffTables, isWithinTimeWindow } from '../_lib/staff.js'
import { fetchTenantSettings } from '../_lib/tenant-settings.js'

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
  return `qr_${randomUUID().replace(/-/g, '')}`
}

/**
 * QR payload is a deep link into the staff portal so ANY camera app can
 * scan it (native camera → opens the link → in-app consumer submits the
 * scan if already logged in). The in-app scanner also understands this
 * URL form and the legacy {t, d} JSON form.
 */
function qrPayload(req: ApiRequest, token: string): string {
  const proto = ((req.headers?.['x-forwarded-proto'] as string) || 'https').split(',')[0].trim()
  const host = ((req.headers?.['x-forwarded-host'] as string) || (req.headers?.host as string) || '').split(',')[0].trim()
  if (!host) return JSON.stringify({ t: token })
  return `${proto}://${host}/staff/my-attendance?scan=${token}`
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
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
      const { date, mode } = req.query

      // ── Kiosk mode: a fresh short-lived token per call. The kiosk screen
      // polls every ~25s so the displayed code rotates continuously — a
      // photographed code dies before it can be shared. Admin-only: staff
      // must not be able to mint their own tokens (that would defeat the
      // physical-presence guarantee entirely).
      if (mode === 'kiosk') {
        if (userRole !== 'tenant_admin') {
          return res.status(403).json({ success: false, error: 'Only administrators can run the attendance kiosk' })
        }
        const today = new Date().toISOString().split('T')[0]
        const token = generateToken()
        const id = `qrs_${Date.now()}_${randomUUID().slice(0, 8)}`
        const expiresAt = new Date(Date.now() + 45_000)

        await sql`
          INSERT INTO staff_attendance_qr_sessions (id, token, tenant_id, date, generated_by, expires_at, used)
          VALUES (${id}, ${token}, ${tenantId}, ${today}, ${userId}, ${expiresAt.toISOString()}, false)
        `
        // Opportunistic cleanup of expired kiosk tokens
        await sql`DELETE FROM staff_attendance_qr_sessions WHERE tenant_id = ${tenantId} AND expires_at < NOW() - INTERVAL '1 hour'`.catch(() => {})

        return res.status(200).json({
          success: true,
          token,
          qrData: qrPayload(req, token),
          date: today,
          expiresAt: expiresAt.toISOString(),
        })
      }

      // The raw token must never be exposed to staff — otherwise they could
      // fetch it and POST a scan without ever seeing the physical code.
      if (userRole !== 'tenant_admin') {
        return res.status(403).json({ success: false, error: 'Only administrators can view attendance QR codes' })
      }

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
          qrData: qrPayload(req, session.token),
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
      if (userRole !== 'tenant_admin') {
        return res.status(403).json({ success: false, error: 'Only administrators can generate QR codes' })
      }

      try {
        const today = new Date().toISOString().split('T')[0]
        const token = generateToken()
        const id = `qrs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        // validity: 'day' → printable fallback code valid until end of day
        // (weaker: a photo works all day). Default stays 5 minutes.
        const isDay = body.validity === 'day'
        const expiresAt = isDay
          ? new Date(`${today}T23:59:59`)
          : new Date(Date.now() + 5 * 60 * 1000)

        await sql`
          INSERT INTO staff_attendance_qr_sessions (id, token, tenant_id, date, generated_by, expires_at, used)
          VALUES (${id}, ${token}, ${tenantId}, ${today}, ${userId}, ${expiresAt.toISOString()}, false)
        `

        return res.status(200).json({
          success: true,
          token,
          qrData: qrPayload(req, token),
          date: today,
          expiresAt: expiresAt.toISOString(),
          message: isDay ? 'Printable code generated. Valid until end of today.' : 'QR code generated. Valid for 5 minutes.',
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

        // Get staff record (tenant-scoped)
        const staffResult = await sql`
          SELECT id, name FROM staff WHERE (id = ${userId} OR staff_id = ${userId}) AND tenant_id = ${tenantId} LIMIT 1
        `
        const staffName = staffResult.rows[0]?.name || 'Unknown'
        const staffId = staffResult.rows[0]?.id || userId

        // Check if already checked in today — staff_id is globally unique and
        // the (staff_id, date) constraint ignores tenant, so query without the
        // tenant filter to also see legacy rows written under 'default-tenant'.
        const existingResult = await sql`
          SELECT id, check_in, check_out, status
          FROM staff_attendance
          WHERE staff_id = ${staffId} AND date = ${today}
          LIMIT 1
        `

        const existing = existingResult.rows[0] as any

        if (!existing || !existing.check_in) {
          // ── Check In ──
          // Honor the tenant's check-in window settings (same rules as the
          // manual check-in path) instead of a hardcoded 08:00.
          const settings = await fetchTenantSettings(tenantId)
          if (settings.enforceTimeWindow &&
              settings.checkInWindowStart &&
              settings.checkInWindowEnd &&
              !isWithinTimeWindow(time, settings.checkInWindowStart, settings.checkInWindowEnd)) {
            return res.status(403).json({
              success: false,
              error: `Check-in is only allowed between ${settings.checkInWindowStart} and ${settings.checkInWindowEnd}. Current time: ${time}`,
            })
          }
          const checkInStatus: 'present' | 'late' =
            time > (settings.checkInWindowEnd || '08:00:00') ? 'late' : 'present'
          const id = `att_${Date.now()}_${randomUUID().slice(0, 8)}`

          await sql`
            INSERT INTO staff_attendance (id, staff_id, staff_name, tenant_id, date, check_in, status, notes, geo_verified)
            VALUES (${id}, ${staffId}, ${staffName}, ${tenantId}, ${today}, ${time}, ${checkInStatus}, 'QR code check-in', true)
            ON CONFLICT (staff_id, date) DO UPDATE SET
              check_in = EXCLUDED.check_in,
              status = EXCLUDED.status,
              notes = EXCLUDED.notes,
              geo_verified = true,
              tenant_id = EXCLUDED.tenant_id
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
            SET check_out = ${time}, tenant_id = ${tenantId}
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
      if (userRole !== 'tenant_admin') {
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
          const staffResult = await sql`SELECT name FROM staff WHERE id = ${record.staffId} AND tenant_id = ${tenantId} LIMIT 1`
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
              notes = EXCLUDED.notes,
              tenant_id = EXCLUDED.tenant_id
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
