import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { ensureStaffTables, validateGeofence, isWithinTimeWindow } from '../tenant/_lib/staff.js';
import { fetchTenantSettings } from '../tenant/_lib/tenant-settings.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: 'present' | 'absent' | 'late' | 'half_day';
  source: 'biometric' | 'manual' | 'web';
  notes: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geoVerified?: boolean;
}

interface AttendanceSummary {
  month: string;
  year: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  total: number;
}

interface MyAttendanceResponse {
  records: StaffAttendanceRecord[];
  summary: AttendanceSummary;
  today: {
    checkedIn: boolean;
    checkedOut: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
  };
}

async function getStaffName(staffId: string): Promise<string> {
  try {
    const res = await sql`SELECT name FROM staff WHERE id = ${staffId} OR staff_id = ${staffId} LIMIT 1`;
    if (res.rows[0]?.name) return res.rows[0].name;
  } catch {
    // ignore
  }
  try {
    const res = await sql`SELECT name FROM users WHERE id = ${staffId} LIMIT 1`;
    if (res.rows[0]?.name) return res.rows[0].name;
  } catch {
    // ignore
  }
  return 'Unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = await requireRole(req, res, ['staff']);
  if (!decoded) return;
  const staffId = decoded.staffId || decoded.userId || decoded.sub;
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }

  await ensureStaffTables();

  if (req.method === 'GET') {
    try {
      const { month, year } = req.query;
      const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
      const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

      const result = await sql`
        SELECT id::text, staff_id, date::text, check_in, check_out, status, notes,
               latitude, longitude, geo_verified
        FROM staff_attendance
        WHERE staff_id = ${staffId}
          AND EXTRACT(MONTH FROM date) = ${targetMonth}
          AND EXTRACT(YEAR FROM date) = ${targetYear}
        ORDER BY date DESC
      `;

      const records: StaffAttendanceRecord[] = result.rows.map(r => ({
        id: r.id,
        staffId: r.staff_id,
        date: r.date,
        checkIn: r.check_in ?? null,
        checkOut: r.check_out ?? null,
        status: r.status as StaffAttendanceRecord['status'],
        source: 'web' as const,
        notes: r.notes ?? null,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        geoVerified: r.geo_verified ?? false,
      }));

      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const halfDay = records.filter(r => r.status === 'half_day').length;

      const today = new Date().toISOString().split('T')[0];
      const todayRecord = records.find(r => r.date === today);

      const response: MyAttendanceResponse = {
        records,
        summary: {
          month: new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' }),
          year: targetYear,
          present,
          absent,
          late,
          halfDay,
          total: records.length,
        },
        today: {
          checkedIn: !!todayRecord?.checkIn,
          checkedOut: !!todayRecord?.checkOut,
          checkInTime: todayRecord?.checkIn || null,
          checkOutTime: todayRecord?.checkOut || null,
        },
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching staff attendance:', error);
      return res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
  } else if (req.method === 'POST') {
    try {
      const { action, latitude, longitude } = req.body || {};
      const now = new Date();
      const time = now.toTimeString().split(' ')[0];
      const today = now.toISOString().split('T')[0];

      if (action === 'check-in') {
        const staffName = await getStaffName(staffId);

        // Fetch tenant settings for geofence + time window validation
        const settings = await fetchTenantSettings();
        let geoVerified = false;
        let checkInStatus: 'present' | 'late' = 'present';
        const warnings: string[] = [];

        // Geofence validation
        if (settings.enforceGeofence &&
            settings.schoolLatitude != null &&
            settings.schoolLongitude != null) {
          if (latitude == null || longitude == null) {
            return res.status(403).json({
              success: false,
              error: 'Location is required for check-in. Please enable location services and try again.',
            });
          }
          const geoResult = validateGeofence(
            latitude,
            longitude,
            settings.schoolLatitude,
            settings.schoolLongitude,
            settings.geofenceRadius || 200
          );
          if (!geoResult.withinFence) {
            return res.status(403).json({
              success: false,
              error: `You are ${Math.round(geoResult.distance)}m from school. Check-in is only allowed within ${settings.geofenceRadius || 200}m of the school premises.`,
            });
          }
          geoVerified = true;
        } else if (latitude != null && longitude != null &&
                   settings.schoolLatitude != null && settings.schoolLongitude != null) {
          // Geofence not enforced but location provided — verify anyway for audit
          const geoResult = validateGeofence(
            latitude,
            longitude,
            settings.schoolLatitude,
            settings.schoolLongitude,
            settings.geofenceRadius || 200
          );
          geoVerified = geoResult.withinFence;
          if (!geoResult.withinFence) {
            warnings.push(`Checked in ${Math.round(geoResult.distance)}m from school`);
          }
        }

        // Time window validation
        if (settings.enforceTimeWindow &&
            settings.checkInWindowStart &&
            settings.checkInWindowEnd) {
          if (!isWithinTimeWindow(time, settings.checkInWindowStart, settings.checkInWindowEnd)) {
            return res.status(403).json({
              success: false,
              error: `Check-in is only allowed between ${settings.checkInWindowStart} and ${settings.checkInWindowEnd}. Current time: ${time}`,
            });
          }
        } else if (settings.checkInWindowEnd && time > settings.checkInWindowEnd) {
          // Not enforced but flag as late
          checkInStatus = 'late';
          warnings.push(`Checked in after window (${time} > ${settings.checkInWindowEnd})`);
        }

        const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notes = warnings.length > 0 ? warnings.join('; ') : null;
        await sql`
          INSERT INTO staff_attendance (id, staff_id, staff_name, date, check_in, status, latitude, longitude, geo_verified, notes)
          VALUES (${id}, ${staffId}, ${staffName}, ${today}, ${time}, ${checkInStatus},
                  ${latitude ?? null}, ${longitude ?? null}, ${geoVerified}, ${notes})
          ON CONFLICT (staff_id, date) DO UPDATE SET
            check_in = EXCLUDED.check_in,
            status = EXCLUDED.status,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            geo_verified = EXCLUDED.geo_verified,
            notes = EXCLUDED.notes
        `;
        return res.status(200).json({
          success: true,
          checkInTime: time,
          status: checkInStatus,
          geoVerified,
          warnings: warnings.length > 0 ? warnings : undefined,
          message: warnings.length > 0
            ? `Checked in with warnings: ${warnings.join(', ')}`
            : 'Checked in successfully',
        });
      }

      if (action === 'check-out') {
        // Validate checkout time window if enforced
        const settings = await fetchTenantSettings();
        if (settings.enforceTimeWindow &&
            settings.checkOutWindowStart &&
            settings.checkOutWindowEnd) {
          if (!isWithinTimeWindow(time, settings.checkOutWindowStart, settings.checkOutWindowEnd)) {
            return res.status(403).json({
              success: false,
              error: `Check-out is only allowed between ${settings.checkOutWindowStart} and ${settings.checkOutWindowEnd}. Current time: ${time}`,
            });
          }
        }
        await sql`
          UPDATE staff_attendance
          SET check_out = ${time}
          WHERE staff_id = ${staffId} AND date = ${today}
        `;
        return res.status(200).json({
          success: true,
          checkOutTime: time,
          message: 'Checked out successfully',
        });
      }

      return res.status(400).json({ error: 'Invalid action. Use check-in or check-out' });
    } catch (error) {
      console.error('Error recording attendance:', error);
      return res.status(500).json({ error: 'Failed to record attendance' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
