import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { ensureStaffTables } from '../tenant/_lib/staff.js';
import { requireRole } from '../_lib/auth-middleware.js';

interface Document {
  id: string;
  title: string;
  description: string;
  category: 'policy' | 'academic' | 'calendar' | 'form' | 'handbook' | 'other';
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  downloadUrl: string;
  isRestricted: boolean;
  department?: string;
  academicYear?: string;
}

interface DocumentsListResponse {
  documents: Document[];
  categories: string[];
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
      const { category, search } = req.query;

      const result = await sql`
        SELECT id::text, title, description, category, file_name, file_size, file_type, uploaded_by, uploaded_at::text, updated_at::text, download_url, is_restricted, department, academic_year
        FROM staff_documents
      `;

      let documents = result.rows.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
        category: (r.category || 'other') as Document['category'],
        fileName: r.file_name || '',
        fileSize: r.file_size || '',
        fileType: r.file_type || '',
        uploadedBy: r.uploaded_by || '',
        uploadedAt: r.uploaded_at,
        updatedAt: r.updated_at,
        downloadUrl: r.download_url || '',
        isRestricted: !!r.is_restricted,
        department: r.department || undefined,
        academicYear: r.academic_year || undefined,
      }));

      if (category && category !== 'all') {
        documents = documents.filter(d => d.category === category);
      }

      if (search) {
        const searchTerm = (search as string).toLowerCase();
        documents = documents.filter(d =>
          d.title.toLowerCase().includes(searchTerm) ||
          d.description.toLowerCase().includes(searchTerm) ||
          d.fileName.toLowerCase().includes(searchTerm)
        );
      }

      documents.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      const categories = ['all', 'policy', 'academic', 'calendar', 'form', 'handbook', 'other'];

      return res.status(200).json({ documents, categories });
    } catch (error) {
      console.error('Error fetching documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
