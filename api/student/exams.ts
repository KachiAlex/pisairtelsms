import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Exam {
  id: string;
  subject: string;
  paper: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  venue: string;
  type: 'midterm' | 'terminal' | 'mock' | 'promotion';
  status: 'upcoming' | 'ongoing' | 'completed';
  instructions: string;
  materialsAllowed: string[];
}

interface ExamScheduleResponse {
  exams: Exam[];
  summary: {
    total: number;
    upcoming: number;
    completed: number;
    ongoing: number;
  };
  academicSession: string;
  term: string;
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

const mockExams: Exam[] = [
  {
    id: 'exam-1',
    subject: 'Mathematics',
    paper: 'Paper 1 - Objective',
    date: '2024-11-15',
    startTime: '09:00',
    endTime: '11:00',
    duration: '2 hours',
    venue: 'Main Hall A',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'No calculators allowed. All working must be shown.',
    materialsAllowed: ['Pen', 'Pencil', 'Ruler', 'Eraser'],
  },
  {
    id: 'exam-2',
    subject: 'Mathematics',
    paper: 'Paper 2 - Essay',
    date: '2024-11-18',
    startTime: '09:00',
    endTime: '12:00',
    duration: '3 hours',
    venue: 'Main Hall A',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Answer 5 questions. All questions carry equal marks.',
    materialsAllowed: ['Pen', 'Pencil', 'Ruler', 'Eraser', 'Scientific Calculator'],
  },
  {
    id: 'exam-3',
    subject: 'English Language',
    paper: 'Paper 1 - Comprehension & Summary',
    date: '2024-11-20',
    startTime: '08:30',
    endTime: '10:30',
    duration: '2 hours',
    venue: 'Main Hall B',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Read all instructions carefully before starting.',
    materialsAllowed: ['Pen', 'Pencil'],
  },
  {
    id: 'exam-4',
    subject: 'English Language',
    paper: 'Paper 2 - Essay & Grammar',
    date: '2024-11-22',
    startTime: '08:30',
    endTime: '11:00',
    duration: '2.5 hours',
    venue: 'Main Hall B',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Answer 3 questions. One from each section.',
    materialsAllowed: ['Pen', 'Pencil'],
  },
  {
    id: 'exam-5',
    subject: 'Biology',
    paper: 'Theory & Practical',
    date: '2024-11-25',
    startTime: '10:00',
    endTime: '12:00',
    duration: '2 hours',
    venue: 'Science Lab 1',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Answer Section A (compulsory) and any two from Section B.',
    materialsAllowed: ['Pen', 'Pencil', 'Ruler', 'Eraser'],
  },
  {
    id: 'exam-6',
    subject: 'Chemistry',
    paper: 'Paper 1 - Objective',
    date: '2024-11-27',
    startTime: '09:00',
    endTime: '10:30',
    duration: '1.5 hours',
    venue: 'Main Hall A',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Answer ALL questions.',
    materialsAllowed: ['Pen', 'Pencil', 'Scientific Calculator'],
  },
  {
    id: 'exam-7',
    subject: 'Physics',
    paper: 'Paper 2 - Theory',
    date: '2024-11-29',
    startTime: '09:00',
    endTime: '11:00',
    duration: '2 hours',
    venue: 'Main Hall B',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Answer 5 questions. Question 1 is compulsory.',
    materialsAllowed: ['Pen', 'Pencil', 'Ruler', 'Protractor', 'Scientific Calculator'],
  },
  {
    id: 'exam-8',
    subject: 'History',
    paper: 'Nigeria & World History',
    date: '2024-12-02',
    startTime: '10:00',
    endTime: '12:00',
    duration: '2 hours',
    venue: 'Block C Room 12',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Answer 4 questions. Section A is compulsory.',
    materialsAllowed: ['Pen', 'Pencil'],
  },
  {
    id: 'exam-9',
    subject: 'Computer Science',
    paper: 'Theory & Practical',
    date: '2024-12-04',
    startTime: '09:00',
    endTime: '11:30',
    duration: '2.5 hours',
    venue: 'ICT Lab',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Practical section will be completed on the computer.',
    materialsAllowed: ['Pen', 'Pencil'],
  },
  {
    id: 'exam-10',
    subject: 'Agricultural Science',
    paper: 'Theory',
    date: '2024-12-06',
    startTime: '10:00',
    endTime: '12:00',
    duration: '2 hours',
    venue: 'Block C Room 10',
    type: 'terminal',
    status: 'upcoming',
    instructions: 'Answer 5 questions. All questions carry equal marks.',
    materialsAllowed: ['Pen', 'Pencil', 'Ruler'],
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const studentId = extractStudentIdFromToken(req);
  if (!studentId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  if (req.method === 'GET') {
    try {
      const { type, status } = req.query;
      let exams = [...mockExams];

      // Update status based on current date
      const now = new Date();
      exams = exams.map(exam => {
        const examDate = new Date(`${exam.date}T${exam.startTime}`);
        const examEnd = new Date(`${exam.date}T${exam.endTime}`);

        let examStatus: Exam['status'];
        if (now < examDate) {
          examStatus = 'upcoming';
        } else if (now >= examDate && now <= examEnd) {
          examStatus = 'ongoing';
        } else {
          examStatus = 'completed';
        }

        return { ...exam, status: examStatus };
      });

      if (type) {
        exams = exams.filter(e => e.type === type);
      }
      if (status) {
        exams = exams.filter(e => e.status === status);
      }

      // Sort by date
      exams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const summary = {
        total: exams.length,
        upcoming: exams.filter(e => e.status === 'upcoming').length,
        completed: exams.filter(e => e.status === 'completed').length,
        ongoing: exams.filter(e => e.status === 'ongoing').length,
      };

      const response: ExamScheduleResponse = {
        exams,
        summary,
        academicSession: '2024/2025',
        term: 'First Term',
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching exam schedule:', error);
      return res.status(500).json({ error: 'Failed to fetch exam schedule' });
    }
  } else {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
