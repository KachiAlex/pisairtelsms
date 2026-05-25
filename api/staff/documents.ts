import type { VercelRequest, VercelResponse } from '@vercel/node';

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

function extractStaffIdFromToken(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) {
    return xUserId.trim();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.staffId || payload.userId || payload.sub || null;
    }
  } catch {
    // not a JWT
  }

  return token || null;
}

const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    title: 'Staff Handbook 2024/2025',
    description: 'Complete guide for all staff members including policies, procedures, and expectations.',
    category: 'handbook',
    fileName: 'staff_handbook_2024_2025.pdf',
    fileSize: '2.4 MB',
    fileType: 'application/pdf',
    uploadedBy: 'Human Resources',
    uploadedAt: '2024-09-01T10:00:00Z',
    updatedAt: '2024-09-15T14:30:00Z',
    downloadUrl: '/documents/staff_handbook_2024_2025.pdf',
    isRestricted: false,
    academicYear: '2024/2025',
  },
  {
    id: 'doc-2',
    title: 'Academic Calendar 2024/2025',
    description: 'Important dates including term start/end, exams, holidays, and events.',
    category: 'calendar',
    fileName: 'academic_calendar_2024_2025.pdf',
    fileSize: '856 KB',
    fileType: 'application/pdf',
    uploadedBy: 'Academic Office',
    uploadedAt: '2024-08-15T09:00:00Z',
    updatedAt: '2024-08-15T09:00:00Z',
    downloadUrl: '/documents/academic_calendar_2024_2025.pdf',
    isRestricted: false,
    academicYear: '2024/2025',
  },
  {
    id: 'doc-3',
    title: 'Leave Request Form',
    description: 'Standard form for requesting annual leave, sick leave, or other absences.',
    category: 'form',
    fileName: 'leave_request_form.pdf',
    fileSize: '125 KB',
    fileType: 'application/pdf',
    uploadedBy: 'Human Resources',
    uploadedAt: '2024-07-20T11:00:00Z',
    updatedAt: '2024-07-20T11:00:00Z',
    downloadUrl: '/documents/leave_request_form.pdf',
    isRestricted: false,
  },
  {
    id: 'doc-4',
    title: 'Code of Conduct Policy',
    description: 'Professional standards and behavioral expectations for all staff members.',
    category: 'policy',
    fileName: 'code_of_conduct_policy.pdf',
    fileSize: '1.1 MB',
    fileType: 'application/pdf',
    uploadedBy: 'Administration',
    uploadedAt: '2024-06-01T08:00:00Z',
    updatedAt: '2024-09-01T10:00:00Z',
    downloadUrl: '/documents/code_of_conduct_policy.pdf',
    isRestricted: false,
  },
  {
    id: 'doc-5',
    title: 'Examination Guidelines',
    description: 'Procedures for conducting internal and external examinations.',
    category: 'academic',
    fileName: 'examination_guidelines_2024.pdf',
    fileSize: '1.8 MB',
    fileType: 'application/pdf',
    uploadedBy: 'Exam Officer',
    uploadedAt: '2024-09-10T14:00:00Z',
    updatedAt: '2024-09-10T14:00:00Z',
    downloadUrl: '/documents/examination_guidelines_2024.pdf',
    isRestricted: false,
    academicYear: '2024/2025',
  },
  {
    id: 'doc-6',
    title: 'Health and Safety Policy',
    description: 'Safety procedures, emergency contacts, and incident reporting guidelines.',
    category: 'policy',
    fileName: 'health_safety_policy.pdf',
    fileSize: '945 KB',
    fileType: 'application/pdf',
    uploadedBy: 'Administration',
    uploadedAt: '2024-05-15T09:30:00Z',
    updatedAt: '2024-08-20T11:00:00Z',
    downloadUrl: '/documents/health_safety_policy.pdf',
    isRestricted: false,
  },
  {
    id: 'doc-7',
    title: 'Department Budget Template',
    description: 'Excel template for submitting department budget requests.',
    category: 'form',
    fileName: 'budget_template.xlsx',
    fileSize: '45 KB',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedBy: 'Finance Office',
    uploadedAt: '2024-08-01T10:00:00Z',
    updatedAt: '2024-08-01T10:00:00Z',
    downloadUrl: '/documents/budget_template.xlsx',
    isRestricted: true,
    department: 'Finance',
  },
  {
    id: 'doc-8',
    title: 'Curriculum Guide - Mathematics',
    description: 'Detailed curriculum and lesson planning guide for Mathematics department.',
    category: 'academic',
    fileName: 'math_curriculum_guide.pdf',
    fileSize: '3.2 MB',
    fileType: 'application/pdf',
    uploadedBy: 'Head of Mathematics',
    uploadedAt: '2024-09-05T13:00:00Z',
    updatedAt: '2024-09-05T13:00:00Z',
    downloadUrl: '/documents/math_curriculum_guide.pdf',
    isRestricted: false,
    department: 'Mathematics',
    academicYear: '2024/2025',
  },
  {
    id: 'doc-9',
    title: 'IT Acceptable Use Policy',
    description: 'Guidelines for computer, internet, and network usage.',
    category: 'policy',
    fileName: 'it_usage_policy.pdf',
    fileSize: '520 KB',
    fileType: 'application/pdf',
    uploadedBy: 'IT Department',
    uploadedAt: '2024-07-10T11:00:00Z',
    updatedAt: '2024-08-15T09:00:00Z',
    downloadUrl: '/documents/it_usage_policy.pdf',
    isRestricted: false,
    department: 'IT',
  },
  {
    id: 'doc-10',
    title: 'Parent-Teacher Meeting Schedule',
    description: 'Dates and times for upcoming PTA meetings by class.',
    category: 'calendar',
    fileName: 'pta_meeting_schedule.pdf',
    fileSize: '380 KB',
    fileType: 'application/pdf',
    uploadedBy: 'Academic Office',
    uploadedAt: '2024-10-01T10:00:00Z',
    updatedAt: '2024-10-01T10:00:00Z',
    downloadUrl: '/documents/pta_meeting_schedule.pdf',
    isRestricted: false,
    academicYear: '2024/2025',
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const staffId = extractStaffIdFromToken(req);
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { category, search } = req.query;

      let documents = [...mockDocuments];

      // Filter by category
      if (category && category !== 'all') {
        documents = documents.filter(d => d.category === category);
      }

      // Filter by search term
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        documents = documents.filter(d =>
          d.title.toLowerCase().includes(searchTerm) ||
          d.description.toLowerCase().includes(searchTerm) ||
          d.fileName.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by upload date (newest first)
      documents.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      const categories = ['all', 'policy', 'academic', 'calendar', 'form', 'handbook', 'other'];

      const response: DocumentsListResponse = {
        documents,
        categories,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
