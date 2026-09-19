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
    throw new Error('Failed to fetch student documents');
  }
}

export async function createStudentDocument(
  tenantId: string,
  data: {
    studentName: string; studentId?: string; cohort?: string; category?: string;
    docName: string; owner?: string; status?: string; requirement?: string;
    fileType?: string; fileDataBase64?: string; fileSize?: number; mimeType?: string; notes?: string;
  }
): Promise<StudentDocumentDTO> {
  const row = await queryOne<any>(
    `INSERT INTO student_documents
       (tenant_id, student_id, student_name, cohort, category, doc_name, owner, status, requirement,
        file_type, file_data, file_size, mime_type, notes, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, decode($11, 'base64'), $12, $13, $14, NOW())
     RETURNING *`,
    [
      tenantId,
      data.studentId || null,
      data.studentName,
      data.cohort || '',
      data.category || 'Academic',
      data.docName,
      data.owner || '',
      data.status || 'Pending review',
      data.requirement || '',
      data.fileType || '',
      data.fileDataBase64 || '',
      data.fileSize ?? null,
      data.mimeType || null,
      data.notes || null,
    ]
  );
  if (!row) throw new Error('Failed to create student document');
  return rowToDTO(row);
}

/**
 * Fetch a document's stored file bytes for download (tenant-scoped).
 */
export async function fetchStudentDocumentFile(
  id: string,
  tenantId: string
): Promise<{ docName: string; mimeType: string; data: Buffer } | null> {
  const row = await queryOne<any>(
    `SELECT doc_name, mime_type, file_data FROM student_documents WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (!row || !row.file_data) return null;
  return { docName: row.doc_name, mimeType: row.mime_type || 'application/octet-stream', data: row.file_data };
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

/**
 * Soft-delete a student document record (tenant-scoped).
 * Returns true if a row was affected, false if the document was not found.
 */
export async function deleteStudentDocument(
  id: string,
  tenantId: string
): Promise<boolean> {
  const row = await queryOne<any>(
    `DELETE FROM student_documents WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [id, tenantId]
  );
  return !!row;
}
