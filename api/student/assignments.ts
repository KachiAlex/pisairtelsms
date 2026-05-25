import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  teacher: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  submissionType: 'online' | 'offline' | 'both';
  maxScore: number;
  score?: number | null;
  feedback?: string | null;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  submittedAt?: string | null;
  submittedFiles?: Array<{
    id: string;
    name: string;
    url: string;
  }>;
  instructions: string;
  createdAt: string;
}

interface AssignmentsListResponse {
  assignments: Assignment[];
  summary: {
    total: number;
    pending: number;
    submitted: number;
    graded: number;
    overdue: number;
  };
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

function parseBody(req: VercelRequest): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

// Mock assignments data
const mockAssignments: Record<string, Assignment[]> = {};

function getMockAssignments(studentId: string): Assignment[] {
  if (!mockAssignments[studentId]) {
    const now = new Date();
    mockAssignments[studentId] = [
      {
        id: `asm-${studentId}-1`,
        title: 'Mathematics Problem Set - Algebra',
        description: 'Complete exercises 1-20 on page 45 of the textbook. Show all working steps.',
        subject: 'Mathematics',
        teacher: 'Mr. Okafor',
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        submissionType: 'online',
        maxScore: 100,
        attachments: [
          { id: 'att-1', name: 'algebra_exercises.pdf', url: '/documents/algebra.pdf', type: 'application/pdf' },
        ],
        instructions: 'Submit as PDF or clear photo of handwritten work.',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `asm-${studentId}-2`,
        title: 'English Essay: My Future Career',
        description: 'Write a 500-word essay about your desired career path and the steps to achieve it.',
        subject: 'English',
        teacher: 'Mrs. Adeyemi',
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        submissionType: 'online',
        maxScore: 50,
        attachments: [],
        instructions: 'Use proper essay format with introduction, body paragraphs, and conclusion.',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `asm-${studentId}-3`,
        title: 'Science Lab Report',
        description: 'Complete the lab report for the photosynthesis experiment conducted in class.',
        subject: 'Biology',
        teacher: 'Dr. Hassan',
        dueDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'submitted',
        submissionType: 'both',
        maxScore: 30,
        score: 28,
        feedback: 'Excellent work! Your observations were detailed and accurate.',
        attachments: [
          { id: 'att-2', name: 'lab_template.docx', url: '/documents/lab_template.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        ],
        submittedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        submittedFiles: [
          { id: 'sub-1', name: 'photosynthesis_lab_report.pdf', url: '/submissions/photo_report.pdf' },
        ],
        instructions: 'Follow the lab report template provided.',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `asm-${studentId}-4`,
        title: 'History Research Project',
        description: 'Research and present on the causes of the Nigerian Civil War.',
        subject: 'History',
        teacher: 'Mr. Chukwu',
        dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'late',
        submissionType: 'offline',
        maxScore: 100,
        attachments: [
          { id: 'att-3', name: 'research_guidelines.pdf', url: '/documents/research_guide.pdf', type: 'application/pdf' },
        ],
        instructions: 'Submit a typed 3-page report. Include at least 3 references.',
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `asm-${studentId}-5`,
        title: 'Chemistry Quiz Preparation',
        description: 'Review chapters 3-5 for the upcoming quiz on chemical reactions.',
        subject: 'Chemistry',
        teacher: 'Mrs. Obi',
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        submissionType: 'offline',
        maxScore: 50,
        attachments: [
          { id: 'att-4', name: 'study_guide.pdf', url: '/documents/chem_study.pdf', type: 'application/pdf' },
          { id: 'att-5', name: 'practice_questions.docx', url: '/documents/practice.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        ],
        instructions: 'No submission required. Come prepared for the quiz.',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: `asm-${studentId}-6`,
        title: 'Art Portfolio Submission',
        description: 'Submit your best 5 artworks from this term.',
        subject: 'Fine Arts',
        teacher: 'Ms. Nwosu',
        dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'graded',
        submissionType: 'online',
        maxScore: 100,
        score: 92,
        feedback: 'Excellent creativity and technique. Your watercolor pieces are outstanding.',
        attachments: [],
        submittedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        submittedFiles: [
          { id: 'sub-2', name: 'portfolio_artwork.zip', url: '/submissions/portfolio.zip' },
        ],
        instructions: 'Submit as a zip file containing high-resolution images.',
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }
  return mockAssignments[studentId];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { status, subject } = req.query;
      let assignments = getMockAssignments(studentId);

      // Apply filters
      if (status) {
        assignments = assignments.filter(a => a.status === status);
      }
      if (subject) {
        assignments = assignments.filter(a => a.subject.toLowerCase() === (subject as string).toLowerCase());
      }

      // Sort by due date (most urgent first)
      assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      const now = new Date().toISOString().split('T')[0];
      const summary = {
        total: assignments.length,
        pending: assignments.filter(a => a.status === 'pending').length,
        submitted: assignments.filter(a => a.status === 'submitted').length,
        graded: assignments.filter(a => a.status === 'graded').length,
        overdue: assignments.filter(a => a.dueDate < now && a.status === 'pending').length,
      };

      const response: AssignmentsListResponse = {
        assignments,
        summary,
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  } else if (req.method === 'POST') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Assignment ID is required' });
      }

      const body = await parseBody(req);
      const { action } = body || {};

      if (action === 'submit') {
        // TODO: Handle file upload and save to storage
        const assignments = getMockAssignments(studentId);
        const assignment = assignments.find(a => a.id === id);

        if (!assignment) {
          return res.status(404).json({ error: 'Assignment not found' });
        }

        if (assignment.status === 'submitted' || assignment.status === 'graded') {
          return res.status(400).json({ error: 'Assignment already submitted' });
        }

        assignment.status = 'submitted';
        assignment.submittedAt = new Date().toISOString();
        assignment.submittedFiles = body.files || [];

        return res.status(200).json({
          success: true,
          message: 'Assignment submitted successfully',
          assignment,
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    } catch (error) {
      console.error('Error submitting assignment:', error);
      return res.status(500).json({ error: 'Failed to submit assignment' });
    }
  } else {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
