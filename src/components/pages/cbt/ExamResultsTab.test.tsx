import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamResultsTab } from './ExamResultsTab';
import * as tenantApi from '../../../lib/tenantApi';

jest.mock('../../../lib/tenantApi');

const mockTenantApiGet = tenantApi.tenantApiGet as jest.MockedFunction<typeof tenantApi.tenantApiGet>;

describe('ExamResultsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display completed exams in selector', async () => {
    const mockExams = [
      {
        id: '1',
        title: 'Math Final',
        subject: 'Mathematics',
        class: 'JSS 3',
      },
    ];

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockExams }),
    } as Response);

    render(<ExamResultsTab />);

    await waitFor(() => {
      expect(screen.getByText('Math Final (Mathematics · JSS 3)')).toBeInTheDocument();
    });
  });

  it('should display results summary when exam is selected', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          examId: '1',
          examTitle: 'Math Final',
          totalStudents: 30,
          completedStudents: 28,
          averageScore: 72.5,
          passRate: 85,
          highestScore: 98,
          lowestScore: 35,
          completionRate: 93,
          results: [
            {
              id: 'r1',
              studentId: 'std1',
              studentName: 'John Doe',
              score: 85,
              totalMarks: 100,
              percentage: 85,
              status: 'Passed' as const,
              timeSpent: 2400,
              submittedAt: '2024-01-01T10:30:00Z',
            },
          ],
        },
      }),
    } as Response);

    render(<ExamResultsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('72.5%')).toBeInTheDocument(); // Average score
      expect(screen.getByText('85%')).toBeInTheDocument(); // Pass rate
    });
  });

  it('should display analytics metrics', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          examId: '1',
          examTitle: 'Math Final',
          totalStudents: 30,
          completedStudents: 28,
          averageScore: 72.5,
          passRate: 85,
          highestScore: 98,
          lowestScore: 35,
          completionRate: 93,
          results: [],
        },
      }),
    } as Response);

    render(<ExamResultsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('72.5%')).toBeInTheDocument(); // Avg Score
      expect(screen.getByText('85%')).toBeInTheDocument(); // Pass Rate
      expect(screen.getByText('98')).toBeInTheDocument(); // Highest
      expect(screen.getByText('35')).toBeInTheDocument(); // Lowest
      expect(screen.getByText('93%')).toBeInTheDocument(); // Completion
    });
  });

  it('should display results list with student details', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          examId: '1',
          examTitle: 'Math Final',
          totalStudents: 2,
          completedStudents: 2,
          averageScore: 75,
          passRate: 100,
          highestScore: 90,
          lowestScore: 60,
          completionRate: 100,
          results: [
            {
              id: 'r1',
              studentId: 'std1',
              studentName: 'John Doe',
              score: 90,
              totalMarks: 100,
              percentage: 90,
              status: 'Passed' as const,
              timeSpent: 2400,
              submittedAt: '2024-01-01T10:30:00Z',
            },
            {
              id: 'r2',
              studentId: 'std2',
              studentName: 'Jane Smith',
              score: 60,
              totalMarks: 100,
              percentage: 60,
              status: 'Passed' as const,
              timeSpent: 3000,
              submittedAt: '2024-01-01T10:45:00Z',
            },
          ],
        },
      }),
    } as Response);

    render(<ExamResultsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should filter results by status', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          examId: '1',
          examTitle: 'Math Final',
          totalStudents: 2,
          completedStudents: 2,
          averageScore: 75,
          passRate: 50,
          highestScore: 90,
          lowestScore: 40,
          completionRate: 100,
          results: [
            {
              id: 'r1',
              studentId: 'std1',
              studentName: 'John Doe',
              score: 90,
              totalMarks: 100,
              percentage: 90,
              status: 'Passed' as const,
              timeSpent: 2400,
              submittedAt: '2024-01-01T10:30:00Z',
            },
            {
              id: 'r2',
              studentId: 'std2',
              studentName: 'Jane Smith',
              score: 40,
              totalMarks: 100,
              percentage: 40,
              status: 'Failed' as const,
              timeSpent: 3000,
              submittedAt: '2024-01-01T10:45:00Z',
            },
          ],
        },
      }),
    } as Response);

    render(<ExamResultsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const failedFilter = screen.getByText('Failed');
    fireEvent.click(failedFilter);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should export results to CSV', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          examId: '1',
          examTitle: 'Math Final',
          totalStudents: 1,
          completedStudents: 1,
          averageScore: 85,
          passRate: 100,
          highestScore: 85,
          lowestScore: 85,
          completionRate: 100,
          results: [],
        },
      }),
    } as Response);

    render(<ExamResultsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    const csvButton = screen.getByText('CSV');
    window.open = jest.fn();
    fireEvent.click(csvButton);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('/api/tenant/cbt/results/export'),
      '_blank'
    );
  });

  it('should display empty state when no completed exams', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<ExamResultsTab />);

    await waitFor(() => {
      expect(screen.getByText(/No completed exams yet/)).toBeInTheDocument();
    });
  });
});
