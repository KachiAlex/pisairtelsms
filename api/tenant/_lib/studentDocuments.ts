import { queryAll, queryOne } from '../cbt/_lib/db.js';

export interface StudentDocumentDTO {
  id: string;
  student: string;
  cohort: string;
  category: string;
  doc: string;
  owner: string;
  status: string;
  aging: string;
  fileType: string;
  lastUpdated: string;
  requirement: string;
}

function rowToDTO(row: any): StudentDocumentDTO {
  return {
    id: row.id,
    student: row.student_name || '',
    cohort: row.cohort || '',
    category: row.category || 'Academic',
    doc: row.doc_name || '',
    owner: row.owner || '',
    status: row.status || 'Awaiting upload',
    aging: row.aging || '',
    fileType: row.file_type || '',
    lastUpdated: row.last_updated?.toISOString?.() || String(row.last_updated || ''),
    requirement: row.requirement || '',
  };
}

export async function fetchStudentDocuments(tenantId: string): Promise<StudentDocumentDTO[]> {
  try {
    const rows = await queryAll<any>(
      `SELECT * FROM student_documents WHERE tenant_id = $1 ORDER BY last_updated DESC`,
      [tenantId]
    );
    return rows.map(rowToDTO);
  } catch (error) {
    console.error('Error fetching student documents:', error);
    return [];
  }
}

export async function createStudentDocument(
  tenantId: string,
  data: { studentName: string; cohort?: string; category?: string; docName: string; owner?: string; status?: string; requirement?: string; fileType?: string }
): Promise<StudentDocumentDTO> {
  const row = await queryOne<any>(
    `INSERT INTO student_documents (tenant_id, student_name, cohort, category, doc_name, owner, status, requirement, file_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      tenantId,
      data.studentName,
      data.cohort || '',
      data.category || 'Academic',
      data.docName,
      data.owner || '',
      data.status || 'Awaiting upload',
      data.requirement || '',
      data.fileType || '',
    ]
  );
  if (!row) throw new Error('Failed to create student document');
  return rowToDTO(row);
}

export async function updateStudentDocumentStatus(
  id: string,
  tenantId: string,
  status: string
): Promise<StudentDocumentDTO | null> {
  const row = await queryOne<any>(
    `UPDATE student_documents SET status = $1, last_updated = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
    [status, id, tenantId]
  );
  return row ? rowToDTO(row) : null;
}
