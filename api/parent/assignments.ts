import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Assignment {
  id: string; subject: string; title: string; description: string;
  dueDate: string; status: 'pending' | 'submitted' | 'graded' | 'overdue';
  type: 'homework' | 'project' | 'essay' | 'quiz' | 'reading';
  teacherName: string; submittedAt?: string; score?: number; maxScore: number; feedback?: string;
}

interface AssignmentsResponse {
  assignments: Assignment[];
  summary: { total: number; pending: number; submitted: number; graded: number; overdue: number };
  childName: string;
}

function extractParentId(req: VercelRequest): string | null {
  const xUserId = req.headers['x-user-id'];
  if (xUserId && typeof xUserId === 'string' && xUserId.trim()) return xUserId.trim();
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.parentId || payload.userId || payload.sub || null;
    }
  } catch { /* not JWT */ }
  return token || null;
}

const mockAssignments: Assignment[] = [
  { id: 'a1', subject: 'Mathematics', title: 'Quadratic Equations Problem Set', description: 'Solve 20 quadratic equations using the formula method. Show all working steps.', dueDate: '2024-11-20', status: 'pending', type: 'homework', teacherName: 'Mr. Okafor', maxScore: 100 },
  { id: 'a2', subject: 'English Language', title: 'Essay: The Role of Education', description: 'Write a 500-word essay on the importance of education in modern society.', dueDate: '2024-11-18', status: 'submitted', type: 'essay', teacherName: 'Mrs. Adeyemi', submittedAt: '2024-11-17', maxScore: 100 },
  { id: 'a3', subject: 'Biology', title: 'Cell Structure Diagram Project', description: 'Draw and label a diagram of an animal cell. Include at least 10 organelles with their functions.', dueDate: '2024-11-10', status: 'graded', type: 'project', teacherName: 'Dr. Hassan', submittedAt: '2024-11-09', score: 85, maxScore: 100, feedback: 'Excellent diagram! Include more detail on mitochondria next time.' },
  { id: 'a4', subject: 'Chemistry', title: 'Periodic Table Quiz', description: 'Online quiz covering elements 1-36. Focus on group properties and trends.', dueDate: '2024-11-05', status: 'graded', type: 'quiz', teacherName: 'Mrs. Obi', submittedAt: '2024-11-05', score: 72, maxScore: 100, feedback: 'Good understanding. Review halogen group properties.' },
  { id: 'a5', subject: 'Physics', title: "Newton's Laws of Motion", description: 'Complete exercises 1-15 from Chapter 4. State and explain each law with real-life examples.', dueDate: '2024-11-15', status: 'overdue', type: 'homework', teacherName: 'Mr. Ibrahim', maxScore: 100 },
  { id: 'a6', subject: 'Computer Science', title: 'Python Programming Assignment', description: 'Write a Python program that calculates compound interest. Include user input validation.', dueDate: '2024-11-22', status: 'pending', type: 'homework', teacherName: 'Ms. Nwosu', maxScore: 100 },
  { id: 'a7', subject: 'History', title: 'Nigerian Civil War Research', description: 'Research the causes of the Nigerian Civil War (1967-1970). Submit a 3-page report.', dueDate: '2024-11-25', status: 'pending', type: 'project', teacherName: 'Mr. Chukwu', maxScore: 100 },
  { id: 'a8', subject: 'Fine Arts', title: 'Landscape Watercolor Painting', description: 'Create a watercolor painting of a Nigerian landscape. Use at least 5 colors.', dueDate: '2024-11-12', status: 'submitted', type: 'project', teacherName: 'Ms. Nwosu', submittedAt: '2024-11-11', maxScore: 100 },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const parentId = extractParentId(req);
  if (!parentId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    try {
      const { childId, status, type } = req.query;
      if (!childId) return res.status(400).json({ error: 'childId is required' });

      let assignments = [...mockAssignments];
      const now = new Date();
      assignments = assignments.map(a => {
        if (a.status === 'pending' && new Date(a.dueDate) < now) {
          return { ...a, status: 'overdue' as Assignment['status'] };
        }
        return a;
      });

      if (status) assignments = assignments.filter(a => a.status === status);
      if (type) assignments = assignments.filter(a => a.type === type);
      assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      const summary = {
        total: assignments.length,
        pending: assignments.filter(a => a.status === 'pending').length,
        submitted: assignments.filter(a => a.status === 'submitted').length,
        graded: assignments.filter(a => a.status === 'graded').length,
        overdue: assignments.filter(a => a.status === 'overdue').length,
      };

      return res.status(200).json({ assignments, summary, childName: 'Chidi Okonkwo' } as AssignmentsResponse);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch assignments' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
