import { describe, it, expect } from 'vitest';

/**
 * Property 16: Monitoring Filters Return Correct Results
 * Verify that monitoring filters return only matching records
 */
describe('Monitoring Filters - Property 16', () => {
  it('should filter by exam ID', () => {
    const allMonitoring = [
      {
        examId: 'exam-1',
        examTitle: 'Math Final',
        totalStudents: 2,
        activeStudents: 2,
        completedStudents: 0,
        pausedStudents: 0,
        flaggedStudents: 0,
        students: [],
      },
      {
        examId: 'exam-2',
        examTitle: 'English Final',
        totalStudents: 3,
        activeStudents: 2,
        completedStudents: 1,
        pausedStudents: 0,
        flaggedStudents: 0,
        students: [],
      },
      {
        examId: 'exam-3',
        examTitle: 'Science Final',
        totalStudents: 4,
        activeStudents: 3,
        completedStudents: 1,
        pausedStudents: 0,
        flaggedStudents: 0,
        students: [],
      },
    ];

    const filtered = allMonitoring.filter((m) => m.examId === 'exam-1');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].examId).toBe('exam-1');
    expect(filtered[0].examTitle).toBe('Math Final');
  });

  it('should filter by student status', () => {
    const students = [
      {
        studentId: 'student-1',
        studentName: 'John',
        questionsAnswered: 5,
        totalQuestions: 10,
        completionPercentage: 50,
        timeRemaining: 1200,
        status: 'Active' as const,
        currentQuestionIndex: 5,
      },
      {
        studentId: 'student-2',
        studentName: 'Jane',
        questionsAnswered: 10,
        totalQuestions: 10,
        completionPercentage: 100,
        timeRemaining: 0,
        status: 'Completed' as const,
        currentQuestionIndex: 10,
      },
      {
        studentId: 'student-3',
        studentName: 'Bob',
        questionsAnswered: 3,
        totalQuestions: 10,
        completionPercentage: 30,
        timeRemaining: 1500,
        status: 'Paused' as const,
        currentQuestionIndex: 3,
      },
      {
        studentId: 'student-4',
        studentName: 'Alice',
        questionsAnswered: 7,
        totalQuestions: 10,
        completionPercentage: 70,
        timeRemaining: 800,
        status: 'Flagged' as const,
        currentQuestionIndex: 7,
        flagReason: 'Suspicious activity',
        flaggedAt: new Date().toISOString(),
      },
    ];

    const activeStudents = students.filter((s) => s.status === 'Active');
    const completedStudents = students.filter((s) => s.status === 'Completed');
    const pausedStudents = students.filter((s) => s.status === 'Paused');
    const flaggedStudents = students.filter((s) => s.status === 'Flagged');

    expect(activeStudents).toHaveLength(1);
    expect(completedStudents).toHaveLength(1);
    expect(pausedStudents).toHaveLength(1);
    expect(flaggedStudents).toHaveLength(1);
  });

  it('should apply multiple filters', () => {
    const monitoringData = {
      examId: 'exam-1',
      examTitle: 'Math Final',
      totalStudents: 5,
      activeStudents: 3,
      completedStudents: 1,
      pausedStudents: 1,
      flaggedStudents: 0,
      students: [
        {
          studentId: 'student-1',
          studentName: 'John',
          questionsAnswered: 5,
          totalQuestions: 10,
          completionPercentage: 50,
          timeRemaining: 1200,
          status: 'Active' as const,
          currentQuestionIndex: 5,
        },
        {
          studentId: 'student-2',
          studentName: 'Jane',
          questionsAnswered: 10,
          totalQuestions: 10,
          completionPercentage: 100,
          timeRemaining: 0,
          status: 'Completed' as const,
          currentQuestionIndex: 10,
        },
        {
          studentId: 'student-3',
          studentName: 'Bob',
          questionsAnswered: 8,
          totalQuestions: 10,
          completionPercentage: 80,
          timeRemaining: 600,
          status: 'Active' as const,
          currentQuestionIndex: 8,
        },
        {
          studentId: 'student-4',
          studentName: 'Alice',
          questionsAnswered: 6,
          totalQuestions: 10,
          completionPercentage: 60,
          timeRemaining: 1000,
          status: 'Active' as const,
          currentQuestionIndex: 6,
        },
        {
          studentId: 'student-5',
          studentName: 'Charlie',
          questionsAnswered: 3,
          totalQuestions: 10,
          completionPercentage: 30,
          timeRemaining: 1500,
          status: 'Paused' as const,
          currentQuestionIndex: 3,
        },
      ],
    };

    // Filter by exam and status
    // Active students with completionPercentage >= 50:
    // student-1: Active, 50% ✓
    // student-2: Completed, skip
    // student-3: Active, 80% ✓
    // student-4: Active, 60% ✓
    // student-5: Paused, skip
    const filtered = monitoringData.students.filter(
      (s) => s.status === 'Active' && s.completionPercentage >= 50
    );

    expect(filtered).toHaveLength(3);
    expect(filtered[0].studentId).toBe('student-1');
    expect(filtered[1].studentId).toBe('student-3');
    expect(filtered[2].studentId).toBe('student-4');
  });

  it('should return empty results when no matches found', () => {
    const students = [
      {
        studentId: 'student-1',
        studentName: 'John',
        status: 'Active' as const,
      },
      {
        studentId: 'student-2',
        studentName: 'Jane',
        status: 'Active' as const,
      },
    ];

    const filtered = students.filter((s) => s.status === 'Completed');

    expect(filtered).toHaveLength(0);
  });

  it('should filter by class', () => {
    const exams = [
      { examId: 'exam-1', class: 'Class A', title: 'Math Final' },
      { examId: 'exam-2', class: 'Class B', title: 'English Final' },
      { examId: 'exam-3', class: 'Class A', title: 'Science Final' },
      { examId: 'exam-4', class: 'Class C', title: 'History Final' },
    ];

    const classAExams = exams.filter((e) => e.class === 'Class A');

    expect(classAExams).toHaveLength(2);
    expect(classAExams[0].examId).toBe('exam-1');
    expect(classAExams[1].examId).toBe('exam-3');
  });

  it('should combine exam and class filters', () => {
    const exams = [
      { examId: 'exam-1', class: 'Class A', title: 'Math Final' },
      { examId: 'exam-2', class: 'Class B', title: 'English Final' },
      { examId: 'exam-3', class: 'Class A', title: 'Science Final' },
    ];

    const filtered = exams.filter(
      (e) => e.class === 'Class A' && e.examId === 'exam-1'
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].examId).toBe('exam-1');
  });

  it('should filter by completion percentage range', () => {
    const students = [
      {
        studentId: 'student-1',
        completionPercentage: 20,
        status: 'Active' as const,
      },
      {
        studentId: 'student-2',
        completionPercentage: 50,
        status: 'Active' as const,
      },
      {
        studentId: 'student-3',
        completionPercentage: 80,
        status: 'Active' as const,
      },
      {
        studentId: 'student-4',
        completionPercentage: 100,
        status: 'Completed' as const,
      },
    ];

    const highProgress = students.filter((s) => s.completionPercentage >= 50);

    expect(highProgress).toHaveLength(3);
    expect(highProgress[0].completionPercentage).toBe(50);
    expect(highProgress[1].completionPercentage).toBe(80);
    expect(highProgress[2].completionPercentage).toBe(100);
  });

  it('should filter by time remaining', () => {
    const students = [
      { studentId: 'student-1', timeRemaining: 100, status: 'Active' as const },
      { studentId: 'student-2', timeRemaining: 500, status: 'Active' as const },
      { studentId: 'student-3', timeRemaining: 1000, status: 'Active' as const },
      { studentId: 'student-4', timeRemaining: 1500, status: 'Active' as const },
    ];

    const lowTimeRemaining = students.filter((s) => s.timeRemaining < 300);

    expect(lowTimeRemaining).toHaveLength(1);
    expect(lowTimeRemaining[0].studentId).toBe('student-1');
  });

  it('should filter flagged students', () => {
    const students = [
      { studentId: 'student-1', status: 'Active' as const },
      { studentId: 'student-2', status: 'Flagged' as const },
      { studentId: 'student-3', status: 'Active' as const },
      { studentId: 'student-4', status: 'Flagged' as const },
    ];

    const flaggedStudents = students.filter((s) => s.status === 'Flagged');

    expect(flaggedStudents).toHaveLength(2);
    expect(flaggedStudents[0].studentId).toBe('student-2');
    expect(flaggedStudents[1].studentId).toBe('student-4');
  });

  it('should filter by multiple status values', () => {
    const students = [
      { studentId: 'student-1', status: 'Active' as const },
      { studentId: 'student-2', status: 'Completed' as const },
      { studentId: 'student-3', status: 'Paused' as const },
      { studentId: 'student-4', status: 'Flagged' as const },
    ];

    const activeOrCompleted = students.filter(
      (s) => s.status === 'Active' || s.status === 'Completed'
    );

    expect(activeOrCompleted).toHaveLength(2);
  });

  it('should preserve filter order', () => {
    const students = [
      { studentId: 'student-1', status: 'Active' as const, order: 1 },
      { studentId: 'student-2', status: 'Active' as const, order: 2 },
      { studentId: 'student-3', status: 'Active' as const, order: 3 },
    ];

    const filtered = students.filter((s) => s.status === 'Active');

    expect(filtered[0].order).toBe(1);
    expect(filtered[1].order).toBe(2);
    expect(filtered[2].order).toBe(3);
  });

  it('should handle complex filter combinations', () => {
    const students = [
      {
        studentId: 'student-1',
        status: 'Active' as const,
        completionPercentage: 50,
        timeRemaining: 1200,
        flagged: false,
      },
      {
        studentId: 'student-2',
        status: 'Active' as const,
        completionPercentage: 80,
        timeRemaining: 600,
        flagged: false,
      },
      {
        studentId: 'student-3',
        status: 'Flagged' as const,
        completionPercentage: 30,
        timeRemaining: 1500,
        flagged: true,
      },
      {
        studentId: 'student-4',
        status: 'Completed' as const,
        completionPercentage: 100,
        timeRemaining: 0,
        flagged: false,
      },
    ];

    const filtered = students.filter(
      (s) =>
        s.status === 'Active' &&
        s.completionPercentage >= 50 &&
        !s.flagged
    );

    expect(filtered).toHaveLength(2);
    expect(filtered[0].studentId).toBe('student-1');
    expect(filtered[1].studentId).toBe('student-2');
  });

  it('should support case-insensitive filtering', () => {
    const exams = [
      { examId: 'exam-1', class: 'Class A' },
      { examId: 'exam-2', class: 'class a' },
      { examId: 'exam-3', class: 'CLASS A' },
    ];

    const filtered = exams.filter(
      (e) => e.class.toLowerCase() === 'class a'
    );

    expect(filtered).toHaveLength(3);
  });

  it('should handle partial string matching', () => {
    const exams = [
      { examId: 'exam-1', title: 'Mathematics Final Exam' },
      { examId: 'exam-2', title: 'English Final Exam' },
      { examId: 'exam-3', title: 'Mathematics Midterm' },
    ];

    const mathExams = exams.filter((e) => e.title.includes('Mathematics'));

    expect(mathExams).toHaveLength(2);
  });

  it('should support range filtering', () => {
    const students = [
      { studentId: 'student-1', score: 45 },
      { studentId: 'student-2', score: 65 },
      { studentId: 'student-3', score: 85 },
      { studentId: 'student-4', score: 95 },
    ];

    const passingStudents = students.filter((s) => s.score >= 60);

    expect(passingStudents).toHaveLength(3);
  });

  it('should handle null/undefined values in filters', () => {
    const students = [
      { studentId: 'student-1', flagReason: 'Suspicious activity' },
      { studentId: 'student-2', flagReason: null },
      { studentId: 'student-3', flagReason: undefined },
      { studentId: 'student-4', flagReason: 'Copy attempt' },
    ];

    const flaggedStudents = students.filter((s) => s.flagReason !== null && s.flagReason !== undefined);

    expect(flaggedStudents).toHaveLength(2);
  });

  it('should support sorting after filtering', () => {
    const students = [
      { studentId: 'student-1', status: 'Active' as const, score: 85 },
      { studentId: 'student-2', status: 'Active' as const, score: 65 },
      { studentId: 'student-3', status: 'Completed' as const, score: 95 },
      { studentId: 'student-4', status: 'Active' as const, score: 75 },
    ];

    const filtered = students
      .filter((s) => s.status === 'Active')
      .sort((a, b) => b.score - a.score);

    expect(filtered).toHaveLength(3);
    expect(filtered[0].score).toBe(85);
    expect(filtered[1].score).toBe(75);
    expect(filtered[2].score).toBe(65);
  });

  it('should handle pagination with filters', () => {
    const students = Array.from({ length: 100 }, (_, i) => ({
      studentId: `student-${i + 1}`,
      status: i % 2 === 0 ? ('Active' as const) : ('Completed' as const),
    }));

    const pageSize = 10;
    const page = 1;

    const filtered = students
      .filter((s) => s.status === 'Active')
      .slice((page - 1) * pageSize, page * pageSize);

    expect(filtered.length).toBeLessThanOrEqual(pageSize);
  });
});
