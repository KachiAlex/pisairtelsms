import { extractParentInfoFromJWT, verifyParentChildRelationship } from '../../src/lib/parentAuth'

// Mock data for development
const mockGrades = [
  { id: '1', subject: 'Mathematics', score: 85, date: '2024-01-15' },
  { id: '2', subject: 'English', score: 92, date: '2024-01-15' },
  { id: '3', subject: 'Science', score: 78, date: '2024-01-14' },
  { id: '4', subject: 'History', score: 88, date: '2024-01-14' },
  { id: '5', subject: 'Geography', score: 81, date: '2024-01-13' },
]

const mockAnnouncements = [
  { id: '1', title: 'School Reopens', date: '2024-01-20', preview: 'School will reopen on January 20th' },
  { id: '2', title: 'Sports Day', date: '2024-02-10', preview: 'Annual sports day scheduled for February 10th' },
  { id: '3', title: 'Exam Schedule', date: '2024-02-01', preview: 'First term exams begin on February 1st' },
  { id: '4', title: 'Holiday Notice', date: '2024-01-25', preview: 'School closed for public holiday' },
  { id: '5', title: 'Parent Meeting', date: '2024-02-05', preview: 'Parent-teacher meeting on February 5th' },
]

const mockEvents = [
  { id: '1', date: '2024-02-01', title: 'Exams Begin', description: 'First term examinations start' },
  { id: '2', date: '2024-02-10', title: 'Sports Day', description: 'Annual inter-house sports competition' },
  { id: '3', date: '2024-02-14', title: 'Valentine Day', description: 'School celebration' },
]

const mockAlerts = [
  { id: '1', type: 'attendance', message: 'Attendance below 75%', severity: 'warning', date: '2024-01-18' },
  { id: '2', type: 'academic', message: 'New grades posted', severity: 'info', date: '2024-01-18' },
]

export async function getDashboardData(parentId: string, childId: string) {
  // Verify parent-child relationship
  const isValid = await verifyParentChildRelationship(parentId, childId)
  if (!isValid) {
    throw new Error('Invalid parent-child relationship')
  }

  return {
    parent: {
      id: parentId,
      name: 'John Doe',
      email: 'john@example.com',
    },
    child: {
      id: childId,
      name: 'Jane Doe',
      admissionNumber: 'ADM001',
      class: 'JSS1',
      arm: 'A',
    },
    metrics: {
      attendancePercent: 92,
      gpa: 3.8,
      outstandingFees: 50000,
      nextExamDate: '2024-02-01',
    },
    recentGrades: mockGrades,
    recentAnnouncements: mockAnnouncements,
    upcomingEvents: mockEvents,
    alerts: mockAlerts,
  }
}
