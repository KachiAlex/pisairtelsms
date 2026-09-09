import { sql } from '@vercel/postgres';

export interface PromotionRecord {
  id: string;
  studentId: string;
  studentName: string;
  fromClass: string;
  toClass: string;
  action: 'promote' | 'repeat' | 'demote' | 'hold';
  academicSession: string;
  term: string;
  averageScore?: number;
  attendance?: number;
  teacherRecommendation?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'completed';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionRule {
  id: string;
  name: string;
  conditions: {
    minAverage?: number;
    minAttendance?: number;
    maxAbsences?: number;
  };
  action: 'promote' | 'review' | 'repeat';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionPayload {
  studentId: string;
  studentName: string;
  fromClass: string;
  toClass: string;
  action: 'promote' | 'repeat' | 'demote' | 'hold';
  academicSession: string;
  term: string;
  averageScore?: number;
  attendance?: number;
  teacherRecommendation?: string;
  reason?: string;
}

const defaultPromotionRules: PromotionRule[] = [
  {
    id: 'rule_1',
    name: 'Auto-promote high performers',
    conditions: { minAverage: 80, minAttendance: 85 },
    action: 'promote',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_2',
    name: 'Review borderline students',
    conditions: { minAverage: 50, maxAbsences: 20 },
    action: 'review',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule_3',
    name: 'Repeat low performers',
    conditions: { minAverage: 0 },
    action: 'repeat',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function ensurePromotionTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS promotion_records (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT,
        from_class TEXT,
        to_class TEXT,
        action TEXT,
        academic_session TEXT,
        term TEXT,
        average_score NUMERIC,
        attendance NUMERIC,
        teacher_recommendation TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        approved_by TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS promotion_rules (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        name TEXT NOT NULL,
        conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
        action TEXT NOT NULL DEFAULT 'promote',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `

    // Insert default rules if they don't exist
    for (const rule of defaultPromotionRules) {
      await sql`
        INSERT INTO promotion_rules (id, tenant_id, name, conditions, action, is_active, created_at, updated_at)
        VALUES (${rule.id}, 'default-tenant', ${rule.name}, ${JSON.stringify(rule.conditions)}::jsonb, ${rule.action}, ${rule.isActive}, ${rule.createdAt}, ${rule.updatedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    console.log('Promotion tables ensured.');
  } catch (error) {
    console.error('Error ensuring promotion tables:', error);
  }
}

export async function fetchPromotionRecords(tenantId: string, academicSession?: string, term?: string, fromClass?: string): Promise<PromotionRecord[]> {
  try {
    await ensurePromotionTables();

    if (academicSession && term && fromClass) {
      const r = await sql`SELECT id, student_id as "studentId", student_name as "studentName", from_class as "fromClass", to_class as "toClass", action, academic_session as "academicSession", term, average_score as "averageScore", attendance, teacher_recommendation as "teacherRecommendation", reason, status, approved_by as "approvedBy", approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt" FROM promotion_records WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession} AND term = ${term} AND from_class = ${fromClass} ORDER BY created_at DESC`;
      return r.rows as unknown as PromotionRecord[];
    } else if (academicSession && term) {
      const r = await sql`SELECT id, student_id as "studentId", student_name as "studentName", from_class as "fromClass", to_class as "toClass", action, academic_session as "academicSession", term, average_score as "averageScore", attendance, teacher_recommendation as "teacherRecommendation", reason, status, approved_by as "approvedBy", approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt" FROM promotion_records WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession} AND term = ${term} ORDER BY created_at DESC`;
      return r.rows as unknown as PromotionRecord[];
    } else if (academicSession) {
      const r = await sql`SELECT id, student_id as "studentId", student_name as "studentName", from_class as "fromClass", to_class as "toClass", action, academic_session as "academicSession", term, average_score as "averageScore", attendance, teacher_recommendation as "teacherRecommendation", reason, status, approved_by as "approvedBy", approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt" FROM promotion_records WHERE tenant_id = ${tenantId} AND academic_session = ${academicSession} ORDER BY created_at DESC`;
      return r.rows as unknown as PromotionRecord[];
    } else {
      const r = await sql`SELECT id, student_id as "studentId", student_name as "studentName", from_class as "fromClass", to_class as "toClass", action, academic_session as "academicSession", term, average_score as "averageScore", attendance, teacher_recommendation as "teacherRecommendation", reason, status, approved_by as "approvedBy", approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt" FROM promotion_records WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`;
      return r.rows as unknown as PromotionRecord[];
    }
  } catch (error) {
    console.error('Error fetching promotion records:', error);
    return [];
  }
}

export async function createPromotionRecord(tenantId: string, record: PromotionPayload): Promise<PromotionRecord> {
  try {
    await ensurePromotionTables();

    const id = `promotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await sql<PromotionRecord>`
      INSERT INTO promotion_records (
        id, tenant_id, student_id, student_name, from_class, to_class, action,
        academic_session, term, average_score, attendance,
        teacher_recommendation, reason
      )
      VALUES (
        ${id}, ${tenantId}, ${record.studentId}, ${record.studentName}, ${record.fromClass},
        ${record.toClass}, ${record.action}, ${record.academicSession}, ${record.term},
        ${record.averageScore}, ${record.attendance}, ${record.teacherRecommendation}, ${record.reason}
      )
      RETURNING
        id,
        student_id as "studentId",
        student_name as "studentName",
        from_class as "fromClass",
        to_class as "toClass",
        action,
        academic_session as "academicSession",
        term,
        average_score as "averageScore",
        attendance,
        teacher_recommendation as "teacherRecommendation",
        reason,
        status,
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Error creating promotion record:', error);
    throw new Error('Failed to create promotion record');
  }
}

export async function createBulkPromotionRecords(tenantId: string, records: PromotionPayload[]): Promise<PromotionRecord[]> {
  try {
    const createdRecords: PromotionRecord[] = [];

    for (const record of records) {
      const createdRecord = await createPromotionRecord(tenantId, record);
      createdRecords.push(createdRecord);
    }

    return createdRecords;
  } catch (error) {
    console.error('Error creating bulk promotion records:', error);
    throw new Error('Failed to create bulk promotion records');
  }
}

export async function updatePromotionRecord(tenantId: string, id: string, updates: Partial<PromotionPayload & { status: string; approvedBy?: string }>): Promise<PromotionRecord | null> {
  try {
    await ensurePromotionTables();
    const approvedBy = updates.status === 'approved' && updates.approvedBy ? updates.approvedBy : null;
    const result = await sql<PromotionRecord>`
      UPDATE promotion_records SET
        action = COALESCE(${updates.action ?? null}, action),
        to_class = COALESCE(${updates.toClass ?? null}, to_class),
        reason = COALESCE(${updates.reason ?? null}, reason),
        status = COALESCE(${updates.status ?? null}, status),
        approved_by = COALESCE(${approvedBy}, approved_by),
        approved_at = CASE WHEN ${updates.status === 'approved'} THEN NOW() ELSE approved_at END,
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING
        id,
        student_id as "studentId",
        student_name as "studentName",
        from_class as "fromClass",
        to_class as "toClass",
        action,
        academic_session as "academicSession",
        term,
        average_score as "averageScore",
        attendance,
        teacher_recommendation as "teacherRecommendation",
        reason,
        status,
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error updating promotion record:', error);
    throw new Error('Failed to update promotion record');
  }
}

export async function fetchPromotionRules(tenantId: string): Promise<PromotionRule[]> {
  try {
    await ensurePromotionTables();

    const result = await sql<PromotionRule>`
      SELECT
        id,
        name,
        conditions,
        action,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM promotion_rules
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at ASC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error fetching promotion rules:', error);
    return [];
  }
}

export async function updatePromotionRule(tenantId: string, id: string, updates: Partial<PromotionRule>): Promise<PromotionRule | null> {
  try {
    await ensurePromotionTables();
    const conditions = updates.conditions !== undefined ? JSON.stringify(updates.conditions) : null;
    const result = await sql<PromotionRule>`
      UPDATE promotion_rules SET
        name = COALESCE(${updates.name ?? null}, name),
        conditions = COALESCE(${conditions}::jsonb, conditions),
        action = COALESCE(${updates.action ?? null}, action),
        is_active = COALESCE(${updates.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING
        id,
        name,
        conditions,
        action,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error updating promotion rule:', error);
    throw new Error('Failed to update promotion rule');
  }
}
