import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import {
  ensureStaffTables,
  fetchTenantSettings,
  validateGeofence,
  isWithinTimeWindow,
  type Attendance,
} from './_lib/staff.js'
import { requireRole } from '../_lib/auth-middleware.js'

interface StaffWithAttendance {
  staffId: string
  staffName: string
  department: string
  role: string
  status: string
  attendance: Attendance | null
  anomalies: string[]
}

interface AdminOverrideBody {
  staffId: string
  date: string
  status: 'present' | 'absent' | 'late' | 'half_day'
  checkIn?: string
  checkOut?: string
  notes?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const tenantId = decoded.tenantId || 'default-tenant'

  await ensureStaffTables()

  if (req.method === 'GET') {
    try {
      const { date, staffId } = req.query
      const targetDate = (date as string) || new Date().toISOString().split('T')[0]

      // Fetch tenant settings for geofence config
      const settings = await fetchTenantSettings()

      // Fetch all active staff for this tenant
      const staffResult = await sql`
        SELECT id, staff_id, name, department, role, status
        FROM staff
        WHERE tenant_id = ${tenantId}
          AND status = 'active'
        ORDER BY name ASC
      `

      // Fetch attendance records for the target date
      const attendanceResult = await sql`
        SELECT id, staff_id, staff_name, date::text, check_in, check_out,
               status, notes, latitude, longitude, geo_verified, created_at
        FROM staff_attendance
        WHERE date = ${targetDate}
        ORDER BY staff_name ASC
      `

      // Build a map of staff_id -> attendance record
      const attendanceMap = new Map<string, any>()
      for (const row of attendanceResult.rows) {
        attendanceMap.set(row.staff_id, row)
      }

      // Build response with anomaly detection
      const records: StaffWithAttendance[] = staffResult.rows.map((staff: any) => {
        const att = attendanceMap.get(staff.id) || attendanceMap.get(staff.staff_id) || null
        const anomalies: string[] = []

        if (att) {
          // Check geofence anomaly
          if (settings.enforceGeofence &&
              settings.schoolLatitude != null &&
              settings.schoolLongitude != null &&
              att.latitude != null &&
              att.longitude != null) {
            const geoResult = validateGeofence(
              att.latitude,
              att.longitude,
              settings.schoolLatitude,
              settings.schoolLongitude,
              settings.geofenceRadius || 200
            )
            if (!geoResult.withinFence) {
              anomalies.push(`Outside geofence (${Math.round(geoResult.distance)}m from school)`)
            }
          } else if (settings.enforceGeofence && !att.geo_verified) {
            anomalies.push('Location not verified')
          }

          // Check time window anomaly
          if (settings.enforceTimeWindow &&
              settings.checkInWindowStart &&
              settings.checkInWindowEnd &&
              att.check_in) {
            if (!isWithinTimeWindow(att.check_in, settings.checkInWindowStart, settings.checkInWindowEnd)) {
              anomalies.push(`Late check-in (${att.check_in} outside ${settings.checkInWindowStart}-${settings.checkInWindowEnd})`)
            }
          }

          // Check missing checkout
          if (att.check_in && !att.check_out) {
            const checkInHour = parseInt(att.check_in.split(':')[0], 10)
            const currentHour = new Date().getHours()
            if (currentHour >= 16 && checkInHour < 12) {
              anomalies.push('Missing check-out')
            }
          }
        } else {
          // No attendance record for today
          const today = new Date().toISOString().split('T')[0]
          if (targetDate === today) {
            const currentHour = new Date().getHours()
            if (currentHour >= 10) {
              anomalies.push('No check-in recorded')
            }
          }
        }

        return {
          staffId: staff.id,
          staffName: staff.name,
          department: staff.department,
          role: staff.role,
          status: staff.status,
          attendance: att ? {
            id: att.id,
            staffId: att.staff_id,
            staffName: att.staff_name,
            date: att.date,
            checkIn: att.check_in || undefined,
            checkOut: att.check_out || undefined,
            status: att.status,
            notes: att.notes || undefined,
            latitude: att.latitude,
            longitude: att.longitude,
            geoVerified: att.geo_verified,
            anomalyFlags: anomalies,
            createdAt: att.created_at?.toISOString?.() || String(att.created_at),
          } : null,
          anomalies,
        }
      })

      // Summary stats
      const total = records.length
      const present = records.filter(r => r.attendance?.status === 'present').length
      const late = records.filter(r => r.attendance?.status === 'late').length
      const absent = records.filter(r => !r.attendance || r.attendance.status === 'absent').length
      const withAnomalies = records.filter(r => r.anomalies.length > 0).length
      const geoVerified = records.filter(r => r.attendance?.geoVerified).length

      return res.status(200).json({
        success: true,
        data: {
          date: targetDate,
          records,
          summary: {
            total,
            present,
            late,
            absent,
            withAnomalies,
            geoVerified,
          },
          geofenceEnabled: settings.enforceGeofence || false,
          timeWindowEnabled: settings.enforceTimeWindow || false,
        },
      })
    } catch (error) {
      console.error('Error fetching staff attendance:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch staff attendance',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  if (req.method === 'POST') {
    // Admin override - manually set attendance status
    try {
      const body = req.body as AdminOverrideBody
      const { staffId, date, status, checkIn, checkOut, notes } = body

      if (!staffId || !date || !status) {
        return res.status(400).json({
          success: false,
          error: 'staffId, date, and status are required',
        })
      }

      // Get staff name
      const staffResult = await sql`
        SELECT name FROM staff WHERE id = ${staffId} LIMIT 1
      `
      const staffName = staffResult.rows[0]?.name || 'Unknown'

      const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const result = await sql`
        INSERT INTO staff_attendance (id, staff_id, staff_name, date, check_in, check_out, status, notes, geo_verified)
        VALUES (${id}, ${staffId}, ${staffName}, ${date},
                ${checkIn || null}, ${checkOut || null}, ${status}, ${notes || 'Admin override'}, true)
        ON CONFLICT (staff_id, date) DO UPDATE SET
          status = EXCLUDED.status,
          check_in = COALESCE(EXCLUDED.check_in, staff_attendance.check_in),
          check_out = COALESCE(EXCLUDED.check_out, staff_attendance.check_out),
          notes = EXCLUDED.notes,
          geo_verified = true
        RETURNING *
      `

      return res.status(200).json({
        success: true,
        data: result.rows[0],
        message: `Attendance overridden for ${staffName}`,
      })
    } catch (error) {
      console.error('Error overriding attendance:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to override attendance',
        details: error instanceof Error ? error.message : undefined,
      })
    }
  }

  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
