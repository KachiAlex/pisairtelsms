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
    // Create promotion_records table
    await sql`
      CREATE TABLE IF NOT EXISTS promotion_records (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        from_class TEXT NOT NULL,
        to_class TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('promote', 'repeat', 'demote', 'hold')),
        academic_session TEXT NOT NULL,
        term TEXT NOT NULL,
        average_score DECIMAL(5,2),
        attendance DECIMAL(5,2),
        teacher_recommendation TEXT,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
        approved_by TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create promotion_rules table
    await sql`
      CREATE TABLE IF NOT EXISTS promotion_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        conditions JSONB NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('promote', 'review', 'repeat')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Insert default rules if they don't exist
    for (const rule of defaultPromotionRules) {
      await sql`
        INSERT INTO promotion_rules (id, name, conditions, action, is_active, created_at, updated_at)
        VALUES (${rule.id}, ${rule.name}, ${JSON.stringify(rule.conditions)}, ${rule.action}, ${rule.isActive}, ${rule.createdAt}, ${rule.updatedAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }

    console.log('Promotion tables ensured.');
  } catch (error) {
    console.error('Error ensuring promotion tables:', error);
  }
}

export async function fetchPromotionRecords(academicSession?: string, term?: string, fromClass?: string): Promise<PromotionRecord[]> {
  try {
    await ensurePromotionTables();

    let query = sql<PromotionRecord>`
      SELECT
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
      FROM promotion_records
    `;

    const conditions = [];
    const values = [];

    if (academicSession) {
      conditions.push(`academic_session = $${conditions.length + 1}`);
      values.push(academicSession);
    }
    if (term) {
      conditions.push(`term = $${conditions.length + 1}`);
      values.push(term);
    }
    if (fromClass) {
      conditions.push(`from_class = $${conditions.length + 1}`);
      values.push(fromClass);
    }

    if (conditions.length > 0) {
      query = sql<PromotionRecord>`${query} WHERE ${sql.raw(conditions.join(' AND '))}`;
      query.values = values;
    }

    query = sql<PromotionRecord>`${query} ORDER BY created_at DESC`;

    const result = await query;
    return result.rows;
  } catch (error) {
    console.error('Error fetching promotion records:', error);
    return [];
  }
}

export async function createPromotionRecord(record: PromotionPayload): Promise<PromotionRecord> {
  try {
    await ensurePromotionTables();

    const id = `promotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await sql<PromotionRecord>`
      INSERT INTO promotion_records (
        id, student_id, student_name, from_class, to_class, action,
        academic_session, term, average_score, attendance,
        teacher_recommendation, reason
      )
      VALUES (
        ${id}, ${record.studentId}, ${record.studentName}, ${record.fromClass},
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

export async function createBulkPromotionRecords(records: PromotionPayload[]): Promise<PromotionRecord[]> {
  try {
    const createdRecords: PromotionRecord[] = [];

    for (const record of records) {
      const createdRecord = await createPromotionRecord(record);
      createdRecords.push(createdRecord);
    }

    return createdRecords;
  } catch (error) {
    console.error('Error creating bulk promotion records:', error);
    throw new Error('Failed to create bulk promotion records');
  }
}

export async function updatePromotionRecord(id: string, updates: Partial<PromotionPayload & { status: string; approvedBy?: string }>): Promise<PromotionRecord | null> {
  try {
    await ensurePromotionTables();

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    // Handle different types of updates
    if (updates.action !== undefined) {
      updateFields.push(`action = $${paramIndex++}`);
      values.push(updates.action);
    }
    if (updates.toClass !== undefined) {
      updateFields.push(`to_class = $${paramIndex++}`);
      values.push(updates.toClass);
    }
    if (updates.reason !== undefined) {
      updateFields.push(`reason = $${paramIndex++}`);
      values.push(updates.reason);
    }
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
      if (updates.status === 'approved' && updates.approvedBy) {
        updateFields.push(`approved_by = $${paramIndex++}, approved_at = NOW()`);
        values.push(updates.approvedBy);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id); // Add ID at the end

    const result = await sql<PromotionRecord>`
      UPDATE promotion_records
      SET ${sql.raw(updateFields.join(', '))}, updated_at = NOW()
      WHERE id = $${paramIndex}
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

export async function fetchPromotionRules(): Promise<PromotionRule[]> {
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
      ORDER BY created_at ASC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error fetching promotion rules:', error);
    return [];
  }
}

export async function updatePromotionRule(id: string, updates: Partial<PromotionRule>): Promise<PromotionRule | null> {
  try {
    await ensurePromotionTables();

    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.conditions !== undefined) {
      updateFields.push(`conditions = $${paramIndex++}`);
      values.push(JSON.stringify(updates.conditions));
    }
    if (updates.action !== undefined) {
      updateFields.push(`action = $${paramIndex++}`);
      values.push(updates.action);
    }
    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id); // Add ID at the end

    const result = await sql<PromotionRule>`
      UPDATE promotion_rules
      SET ${sql.raw(updateFields.join(', '))}, updated_at = NOW()
      WHERE id = $${paramIndex}
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
