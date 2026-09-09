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

const defaultPromotionRules: Omit<PromotionRule, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'rule_1',
    name: 'Auto-promote high performers',
    conditions: { minAverage: 80, minAttendance: 85 },
    action: 'promote',
    isActive: true,
  },
  {
    id: 'rule_2',
    name: 'Review borderline students',
    conditions: { minAverage: 50, maxAbsences: 20 },
    action: 'review',
    isActive: true,
  },
  {
    id: 'rule_3',
    name: 'Repeat low performers',
    conditions: { minAverage: 0 },
    action: 'repeat',
    isActive: true,
  },
];

// Fix #12: Cache ensurePromotionTables to avoid repeated calls
let tablesEnsured = false;
let ensuredTenants = new Set<string>();

export async function ensurePromotionTables(tenantId?: string): Promise<void> {
  try {
    if (!tablesEnsured) {
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

      tablesEnsured = true;
      console.log('Promotion tables ensured.');
    }

    // Fix #10: Seed default rules for the requesting tenant (not just 'default-tenant')
    if (tenantId && !ensuredTenants.has(tenantId)) {
      for (const rule of defaultPromotionRules) {
        const ruleId = tenantId === 'default-tenant' ? rule.id : `${rule.id}_${tenantId}`;
        await sql`
          INSERT INTO promotion_rules (id, tenant_id, name, conditions, action, is_active)
          VALUES (${ruleId}, ${tenantId}, ${rule.name}, ${JSON.stringify(rule.conditions)}::jsonb, ${rule.action}, ${rule.isActive})
          ON CONFLICT (id) DO NOTHING
        `;
      }
      ensuredTenants.add(tenantId);
    }
  } catch (error) {
    console.error('Error ensuring promotion tables:', error);
  }
}

const RECORD_SELECT = `id, student_id as "studentId", student_name as "studentName", from_class as "fromClass", to_class as "toClass", action, academic_session as "academicSession", term, average_score as "averageScore", attendance, teacher_recommendation as "teacherRecommendation", reason, status, approved_by as "approvedBy", approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt"`

export async function fetchPromotionRecords(tenantId: string, academicSession?: string, term?: string, fromClass?: string): Promise<PromotionRecord[]> {
  try {
    await ensurePromotionTables(tenantId);

    // Use sql.query for dynamic column selection since the shim doesn't support sql.raw()
    if (academicSession && term && fromClass) {
      const r = await sql.query(
        `SELECT ${RECORD_SELECT} FROM promotion_records WHERE tenant_id = $1 AND academic_session = $2 AND term = $3 AND from_class = $4 ORDER BY created_at DESC`,
        [tenantId, academicSession, term, fromClass]
      );
      return r.rows as unknown as PromotionRecord[];
    } else if (academicSession && term) {
      const r = await sql.query(
        `SELECT ${RECORD_SELECT} FROM promotion_records WHERE tenant_id = $1 AND academic_session = $2 AND term = $3 ORDER BY created_at DESC`,
        [tenantId, academicSession, term]
      );
      return r.rows as unknown as PromotionRecord[];
    } else if (academicSession) {
      const r = await sql.query(
        `SELECT ${RECORD_SELECT} FROM promotion_records WHERE tenant_id = $1 AND academic_session = $2 ORDER BY created_at DESC`,
        [tenantId, academicSession]
      );
      return r.rows as unknown as PromotionRecord[];
    } else {
      const r = await sql.query(
        `SELECT ${RECORD_SELECT} FROM promotion_records WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
      );
      return r.rows as unknown as PromotionRecord[];
    }
  } catch (error) {
    console.error('Error fetching promotion records:', error);
    return [];
  }
}

// Fix #6: Upsert logic — if a record already exists for the same student/session/term, update it
export async function createPromotionRecord(tenantId: string, record: PromotionPayload): Promise<PromotionRecord> {
  try {
    await ensurePromotionTables(tenantId);

    // Check if a record already exists for this student + session + term
    const existing = await sql`
      SELECT id FROM promotion_records
      WHERE tenant_id = ${tenantId} AND student_id = ${record.studentId}
        AND academic_session = ${record.academicSession} AND term = ${record.term}
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      // Update existing record instead of creating a duplicate
      const existingId = existing.rows[0].id;
      const result = await sql<PromotionRecord>`
        UPDATE promotion_records SET
          student_name = ${record.studentName},
          from_class = ${record.fromClass},
          to_class = ${record.toClass},
          action = ${record.action},
          average_score = ${record.averageScore ?? null},
          attendance = ${record.attendance ?? null},
          teacher_recommendation = ${record.teacherRecommendation ?? null},
          reason = ${record.reason ?? null},
          status = 'pending',
          approved_by = NULL,
          approved_at = NULL,
          updated_at = NOW()
        WHERE id = ${existingId} AND tenant_id = ${tenantId}
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
    }

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
        ${record.averageScore ?? null}, ${record.attendance ?? null}, ${record.teacherRecommendation ?? null}, ${record.reason ?? null}
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

// Fix #2 + #5: When status becomes 'completed', apply the promotion to the student's class
export async function updatePromotionRecord(tenantId: string, id: string, updates: Partial<PromotionPayload & { status: string; approvedBy?: string }>): Promise<PromotionRecord | null> {
  try {
    await ensurePromotionTables(tenantId);
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

    if (result.rows.length === 0) return null;

    const updatedRecord = result.rows[0];

    // Fix #2: When status becomes 'completed', update the student's class in the students table
    if (updates.status === 'completed' && updatedRecord.action !== 'hold') {
      try {
        await sql`
          UPDATE students SET class = ${updatedRecord.toClass}, updated_at = NOW()
          WHERE id = ${updatedRecord.studentId} AND tenant_id = ${tenantId}
        `;
        console.log(`[promotion] Applied class change for student ${updatedRecord.studentId}: ${updatedRecord.fromClass} -> ${updatedRecord.toClass}`);
      } catch (studentError) {
        console.error('Error updating student class after promotion:', studentError);
        // Don't fail the whole operation — the record is still updated
      }
    }

    return updatedRecord;
  } catch (error) {
    console.error('Error updating promotion record:', error);
    throw new Error('Failed to update promotion record');
  }
}

// Fix #8: Delete promotion record
export async function deletePromotionRecord(tenantId: string, id: string): Promise<boolean> {
  try {
    await ensurePromotionTables(tenantId);
    const result = await sql`
      DELETE FROM promotion_records WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting promotion record:', error);
    throw new Error('Failed to delete promotion record');
  }
}

// Fix #11: Sort rules by action priority (promote first, then review, then repeat)
export async function fetchPromotionRules(tenantId: string): Promise<PromotionRule[]> {
  try {
    await ensurePromotionTables(tenantId);

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
      ORDER BY
        CASE action
          WHEN 'promote' THEN 0
          WHEN 'review' THEN 1
          WHEN 'repeat' THEN 2
          ELSE 3
        END,
        created_at ASC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error fetching promotion rules:', error);
    return [];
  }
}

export async function updatePromotionRule(tenantId: string, id: string, updates: Partial<PromotionRule>): Promise<PromotionRule | null> {
  try {
    await ensurePromotionTables(tenantId);
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
