import { sql } from '../../_lib/sql.js';

/**
 * Resolve the classroom that targets the requested class audience.
 * A specific arm binds class_arm_id; a whole level binds class_level.
 * Creates the shell if none exists so assignments/materials have a canonical home.
 */
export async function resolveClassroom(
  tenantId: string,
  staffId: string,
  subjectName: string,
  className: string,
  arm: string | undefined,
): Promise<{ classroomId: string; studentCount: number } | { error: string; status: number }> {
  const subjectRes = await sql`
    SELECT id::text FROM subjects
    WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${subjectName}) AND deleted_at IS NULL
    LIMIT 1
  `.catch(() => ({ rows: [] as any[] }));
  const subjectId = subjectRes.rows[0]?.id || null;

  let classArmId: string | null = null;
  let classLevel: string | null = null;

  if (arm) {
    const classRes = await sql`
      SELECT id::text FROM classes
      WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${className})
        AND LOWER(COALESCE(arm, '')) = LOWER(${arm}) AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!classRes.rows[0]) {
      return { error: `Class "${className} ${arm}" not found`, status: 404 };
    }
    classArmId = classRes.rows[0].id;
  } else {
    const levelRes = await sql`
      SELECT 1 FROM classes
      WHERE tenant_id = ${tenantId} AND LOWER(name) = LOWER(${className}) AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!levelRes.rows[0]) {
      return { error: `Class "${className}" not found`, status: 404 };
    }
    classLevel = className;
  }

  // Reuse the teacher's classroom for this audience+subject, else create it.
  const existing = await sql`
    SELECT id::text FROM virtual_classrooms
    WHERE tenant_id = ${tenantId} AND teacher_id = ${staffId}
      AND COALESCE(subject_id::text, '') = COALESCE(${subjectId}, '')
      AND COALESCE(class_arm_id::text, '') = COALESCE(${classArmId}, '')
      AND COALESCE(class_level, '') = COALESCE(${classLevel}, '')
      AND status != 'archived'
    LIMIT 1
  `;

  let classroomId: string;
  if (existing.rows[0]) {
    classroomId = existing.rows[0].id;
  } else {
    const name = `${subjectName} — ${className}${arm ? ` ${arm}` : ''}`;
    const ins = await sql`
      INSERT INTO virtual_classrooms (tenant_id, subject_id, class_arm_id, class_level, teacher_id, name, status)
      VALUES (${tenantId}, ${subjectId}, ${classArmId}, ${classLevel}, ${staffId}, ${name}, 'active')
      RETURNING id::text
    `;
    classroomId = ins.rows[0].id;
  }

  // Count students this classroom reaches.
  const countRes = arm
    ? await sql`
        SELECT COUNT(*) AS n FROM students
        WHERE tenant_id = ${tenantId} AND LOWER(class) = LOWER(${className})
          AND LOWER(COALESCE(arm, '')) = LOWER(${arm})
          AND deleted_at IS NULL AND LOWER(status) = 'active'
      `
    : await sql`
        SELECT COUNT(*) AS n FROM students
        WHERE tenant_id = ${tenantId} AND LOWER(class) = LOWER(${className})
          AND deleted_at IS NULL AND LOWER(status) = 'active'
      `;

  return { classroomId, studentCount: parseInt(countRes.rows[0]?.n || '0') };
}
