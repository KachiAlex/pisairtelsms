import { queryAll, queryOne } from '../cbt/_lib/db.js';

// DTO for API responses — camelCase
export interface ApplicationDTO {
  id: string
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classApplying: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  academicSession: string | null
  source: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationPayload {
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classApplying: string
  academicSession?: string
  source?: string
}

function rowToDTO(row: any): ApplicationDTO {
  return {
    id: row.id,
    studentName: row.student_name || '',
    parentName: row.parent_name || '',
    contactPhone: row.contact_phone || '',
    contactEmail: row.contact_email || '',
    classApplying: row.class_interested || row.class_applying || '',
    status: (row.status || 'pending') as ApplicationDTO['status'],
    academicSession: row.academic_session || null,
    source: row.source || null,
    createdAt: row.created_at?.toISOString?.() || String(row.created_at || ''),
    updatedAt: row.updated_at?.toISOString?.() || String(row.updated_at || row.created_at || ''),
  };
}

export async function fetchApplications(
  tenantId: string,
  status?: string,
  academicSession?: string
): Promise<ApplicationDTO[]> {
  try {
    const conditions: string[] = [`tenant_id = $1`];
    const values: any[] = [tenantId];

    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    if (academicSession) {
      values.push(academicSession);
      conditions.push(`academic_session = $${values.length}`);
    }

    const sql = `SELECT * FROM leads WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`;
    const rows = await queryAll<any>(sql, values);
    return rows.map(rowToDTO);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
}

export async function createApplication(payload: ApplicationPayload & { tenantId?: string | null }): Promise<ApplicationDTO> {
  try {
    const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const row = await queryOne<any>(
      `INSERT INTO leads (id, student_name, parent_name, contact_phone, contact_email, class_interested, source, status, academic_session, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
       RETURNING *`,
      [
        id,
        payload.studentName,
        payload.parentName,
        payload.contactPhone,
        payload.contactEmail,
        payload.classApplying,
        payload.source || 'Online Form',
        payload.academicSession || null,
        payload.tenantId || null,
      ]
    );
    if (!row) throw new Error('Failed to create application');
    return rowToDTO(row);
  } catch (error) {
    console.error('Error creating application:', error);
    throw new Error('Failed to create application');
  }
}

export async function updateApplicationStatus(
  id: string,
  tenantId: string,
  status: ApplicationDTO['status']
): Promise<ApplicationDTO | null> {
  try {
    const row = await queryOne<any>(
      `UPDATE leads SET status = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [status, id, tenantId]
    );
    if (!row) return null;
    return rowToDTO(row);
  } catch (error) {
    console.error('Error updating application status:', error);
    throw new Error('Failed to update application status');
  }
}
