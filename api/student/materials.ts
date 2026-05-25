import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CourseMaterial {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacher: string;
  type: 'document' | 'video' | 'audio' | 'link' | 'image';
  fileName: string;
  fileSize: string;
  fileType: string;
  url: string;
  uploadDate: string;
  academicSession: string;
  term: string;
  classLevel: string;
  tags: string[];
  isRequired: boolean;
  viewCount: number;
}

interface MaterialsListResponse {
  materials: CourseMaterial[];
  subjects: string[];
  types: string[];
}

function extractStudentIdFromToken(req: VercelRequest): string | null {
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
      return payload.studentId || payload.userId || payload.sub || null;
    }
  } catch {
    // not a JWT
  }

  return token || null;
}

const mockMaterials: CourseMaterial[] = [
  {
    id: 'mat-1',
    title: 'Mathematics Textbook - Chapter 1-5',
    description: 'Complete textbook covering algebra, geometry, and trigonometry for Senior Secondary 1.',
    subject: 'Mathematics',
    teacher: 'Mr. Okafor',
    type: 'document',
    fileName: 'math_textbook_ch1-5.pdf',
    fileSize: '12.5 MB',
    fileType: 'application/pdf',
    url: '/materials/math_textbook_ch1-5.pdf',
    uploadDate: '2024-09-05T10:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS1',
    tags: ['textbook', 'mathematics', 'required'],
    isRequired: true,
    viewCount: 145,
  },
  {
    id: 'mat-2',
    title: 'English Language Past Questions',
    description: 'WAEC and NECO past questions with detailed solutions.',
    subject: 'English',
    teacher: 'Mrs. Adeyemi',
    type: 'document',
    fileName: 'english_past_questions_2020-2024.pdf',
    fileSize: '8.3 MB',
    fileType: 'application/pdf',
    url: '/materials/english_past_questions.pdf',
    uploadDate: '2024-09-10T14:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS3',
    tags: ['past questions', 'exam prep', 'english'],
    isRequired: false,
    viewCount: 89,
  },
  {
    id: 'mat-3',
    title: 'Biology - Cell Structure Video',
    description: 'Animated video explaining cell structure and organelles.',
    subject: 'Biology',
    teacher: 'Dr. Hassan',
    type: 'video',
    fileName: 'cell_structure_animation.mp4',
    fileSize: '245 MB',
    fileType: 'video/mp4',
    url: '/materials/cell_structure.mp4',
    uploadDate: '2024-09-12T09:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS2',
    tags: ['video', 'biology', 'cell biology'],
    isRequired: true,
    viewCount: 210,
  },
  {
    id: 'mat-4',
    title: 'Chemistry Periodic Table Reference',
    description: 'Interactive periodic table with element properties.',
    subject: 'Chemistry',
    teacher: 'Mrs. Obi',
    type: 'link',
    fileName: 'periodic_table_interactive.html',
    fileSize: '—',
    fileType: 'text/html',
    url: 'https://www.periodic-table.com',
    uploadDate: '2024-09-08T11:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS2',
    tags: ['reference', 'chemistry', 'periodic table'],
    isRequired: false,
    viewCount: 67,
  },
  {
    id: 'mat-5',
    title: 'Physics Formula Sheet',
    description: 'Comprehensive formula sheet for mechanics, electricity, and waves.',
    subject: 'Physics',
    teacher: 'Mr. Ibrahim',
    type: 'document',
    fileName: 'physics_formula_sheet.pdf',
    fileSize: '1.2 MB',
    fileType: 'application/pdf',
    url: '/materials/physics_formula_sheet.pdf',
    uploadDate: '2024-09-15T08:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS2',
    tags: ['reference', 'physics', 'formulas'],
    isRequired: true,
    viewCount: 178,
  },
  {
    id: 'mat-6',
    title: 'History Timeline - Nigeria 1960-1999',
    description: 'Visual timeline of key events in Nigerian history.',
    subject: 'History',
    teacher: 'Mr. Chukwu',
    type: 'document',
    fileName: 'nigeria_history_timeline.pdf',
    fileSize: '4.7 MB',
    fileType: 'application/pdf',
    url: '/materials/history_timeline.pdf',
    uploadDate: '2024-09-20T10:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS1',
    tags: ['timeline', 'history', 'nigeria'],
    isRequired: false,
    viewCount: 45,
  },
  {
    id: 'mat-7',
    title: 'Literature - Things Fall Apart Analysis',
    description: 'Chapter-by-chapter analysis of Chinua Achebe\'s novel.',
    subject: 'Literature',
    teacher: 'Mrs. Adeyemi',
    type: 'document',
    fileName: 'things_fall_apart_analysis.pdf',
    fileSize: '3.1 MB',
    fileType: 'application/pdf',
    url: '/materials/things_fall_apart_analysis.pdf',
    uploadDate: '2024-09-18T14:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS3',
    tags: ['literature', 'novel analysis', 'chinua achebe'],
    isRequired: true,
    viewCount: 132,
  },
  {
    id: 'mat-8',
    title: 'Agricultural Science - Crop Production Guide',
    description: 'Practical guide to common crops and farming techniques.',
    subject: 'Agricultural Science',
    teacher: 'Mr. Mohammed',
    type: 'document',
    fileName: 'crop_production_guide.pdf',
    fileSize: '6.8 MB',
    fileType: 'application/pdf',
    url: '/materials/crop_production_guide.pdf',
    uploadDate: '2024-09-25T09:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS1',
    tags: ['agriculture', 'crops', 'farming'],
    isRequired: false,
    viewCount: 38,
  },
  {
    id: 'mat-9',
    title: 'Computer Science - Python Basics',
    description: 'Introduction to Python programming with exercises.',
    subject: 'Computer Science',
    teacher: 'Ms. Nwosu',
    type: 'document',
    fileName: 'python_basics_workbook.pdf',
    fileSize: '5.4 MB',
    fileType: 'application/pdf',
    url: '/materials/python_basics.pdf',
    uploadDate: '2024-09-22T11:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS2',
    tags: ['programming', 'python', 'computer science'],
    isRequired: true,
    viewCount: 95,
  },
  {
    id: 'mat-10',
    title: 'Geography - Map Reading Tutorial',
    description: 'Interactive tutorial on reading and interpreting topographic maps.',
    subject: 'Geography',
    teacher: 'Mr. Sule',
    type: 'video',
    fileName: 'map_reading_tutorial.mp4',
    fileSize: '156 MB',
    fileType: 'video/mp4',
    url: '/materials/map_reading_tutorial.mp4',
    uploadDate: '2024-09-28T10:00:00Z',
    academicSession: '2024/2025',
    term: 'First Term',
    classLevel: 'SS1',
    tags: ['video', 'geography', 'maps'],
    isRequired: true,
    viewCount: 78,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { subject, type, search, required } = req.query;

      let materials = [...mockMaterials];

      // Filter by subject
      if (subject) {
        materials = materials.filter(m => m.subject.toLowerCase() === (subject as string).toLowerCase());
      }

      // Filter by type
      if (type) {
        materials = materials.filter(m => m.type === type);
      }

      // Filter by required
      if (required === 'true') {
        materials = materials.filter(m => m.isRequired);
      }

      // Filter by search term
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        materials = materials.filter(m =>
          m.title.toLowerCase().includes(searchTerm) ||
          m.description.toLowerCase().includes(searchTerm) ||
          m.subject.toLowerCase().includes(searchTerm) ||
          m.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      // Sort by upload date (newest first)
      materials.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

      const subjects = [...new Set(materials.map(m => m.subject))].sort();
      const types = [...new Set(materials.map(m => m.type))].sort();

      const response: MaterialsListResponse = {
        materials,
        subjects,
        types,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching materials:', error);
      return res.status(500).json({ error: 'Failed to fetch course materials' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
