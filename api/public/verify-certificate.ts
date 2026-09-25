import type { ApiRequest, ApiResponse } from '../_lib/http-types.js'
import { sql } from '../_lib/sql.js'

/**
 * GET /api/public/verify-certificate?code=
 * Public, unauthenticated certificate verification — lets third parties
 * (employers, other schools) confirm a certificate code is genuine.
 * Returns only what a verifier needs: validity, holder name, school, exam.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const code = (req.query.code as string | undefined)?.trim()
  if (!code) {
    return res.status(400).json({ error: 'code is required' })
  }

  try {
    const r = await sql`
      SELECT ci.certificate_code, ci.issued_at::text AS issued_at,
             ci.revoked, ci.revoked_at::text AS revoked_at, ci.revoked_reason,
             s.name AS student_name,
             COALESCE(e.subject, e.title) AS exam_title,
             t.name AS school_name
      FROM certificate_issuances ci
      JOIN tenants t ON t.id::text = ci.tenant_id
      LEFT JOIN students s ON s.id::text = ci.student_id::text AND s.tenant_id = ci.tenant_id
      LEFT JOIN exams e ON e.id::text = ci.exam_id::text AND e.tenant_id = ci.tenant_id
      WHERE ci.certificate_code = ${code}
      LIMIT 1
    `.catch(() => ({ rows: [] as any[] }))

    const cert = r.rows[0]
    if (!cert) {
      return res.status(404).json({ valid: false, error: 'Certificate not found' })
    }

    return res.status(200).json({
      valid: !cert.revoked,
      code: cert.certificate_code,
      studentName: cert.student_name || null,
      examTitle: cert.exam_title || null,
      schoolName: cert.school_name || null,
      issuedAt: cert.issued_at,
      revoked: !!cert.revoked,
      revokedAt: cert.revoked_at,
      revokedReason: cert.revoked_reason || null,
    })
  } catch (error) {
    console.error('Error verifying certificate:', error)
    return res.status(500).json({ error: 'Failed to verify certificate' })
  }
}
