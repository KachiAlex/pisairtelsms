import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveMonitoringTab } from './LiveMonitoringTab';
import * as tenantApi from '../../../lib/tenantApi';

vi.mock('../../../lib/tenantApi');

const mockTenantApiGet = tenantApi.tenantApiGet as ReturnType<typeof vi.fn>;
const mockTenantApiPut = tenantApi.tenantApiPut as ReturnType<typeof vi.fn>;

describe('LiveMonitoringTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display ongoing exams in selector', async () => {
    const mockExams = [
      {
        id: '1',
        title: 'Math Exam',
        subject: 'Mathematics',
        class: 'JSS 3',
      },
    ];

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockExams }),
    } as Response);
    // Auto-selection triggers a monitoring fetch; provide a benign response
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { examId: '1', examTitle: 'Math Exam', totalStudents: 0, activeStudents: 0, completedStudents: 0, averageProgress: 0, students: [] } }),
    } as Response);

    render(<LiveMonitoringTab />);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Math Exam \(Mathematics \u00b7 JSS 3\)/ })).toBeInTheDocument();
    });
  });

  it('should display monitoring data when exam is selected', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Exam',
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
          examTitle: 'Math Exam',
          totalStudents: 30,
          activeStudents: 25,
          completedStudents: 5,
          averageProgress: 75,
          students: [
            {
              id: 's1',
              studentId: 'std1',
              studentName: 'John Doe',
              questionsAnswered: 15,
              totalQuestions: 20,
              currentQuestion: 15,
              status: 'Active' as const,
              timeRemaining: 1200,
              completionPercentage: 75,
              lastActivityTime: '2024-01-01T10:00:00Z',
            },
          ],
        },
      }),
    } as Response);

    render(<LiveMonitoringTab />);

    const examSelect = await screen.findByLabelText(/Select Ongoing Exam/i);
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should display student progress statistics', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Exam',
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
          examTitle: 'Math Exam',
          totalStudents: 30,
          activeStudents: 25,
          completedStudents: 5,
          averageProgress: 75,
          students: [],
        },
      }),
    } as Response);

    render(<LiveMonitoringTab />);

    const examSelect = await screen.findByLabelText(/Select Ongoing Exam/i);
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('30')).toBeInTheDocument(); // Total
      expect(screen.getByText('25')).toBeInTheDocument(); // Active
      expect(screen.getByText('5')).toBeInTheDocument(); // Completed
    });
  });

  it('should filter students by status', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Exam',
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
          examTitle: 'Math Exam',
          totalStudents: 2,
          activeStudents: 1,
          completedStudents: 1,
          averageProgress: 75,
          students: [
            {
              id: 's1',
              studentId: 'std1',
              studentName: 'John Doe',
              questionsAnswered: 15,
              totalQuestions: 20,
              currentQuestion: 15,
              status: 'Active' as const,
              timeRemaining: 1200,
              completionPercentage: 75,
              lastActivityTime: '2024-01-01T10:00:00Z',
            },
            {
              id: 's2',
              studentId: 'std2',
              studentName: 'Jane Smith',
              questionsAnswered: 20,
              totalQuestions: 20,
              currentQuestion: 20,
              status: 'Completed' as const,
              timeRemaining: 0,
              completionPercentage: 100,
              lastActivityTime: '2024-01-01T10:30:00Z',
            },
          ],
        },
      }),
    } as Response);

    render(<LiveMonitoringTab />);

    const examSelect = await screen.findByLabelText(/Select Ongoing Exam/i);
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    const completedFilters = screen.getAllByText('Completed');
    const completedFilterBtn = completedFilters.find((el) => el.tagName === 'BUTTON') || completedFilters[completedFilters.length - 1];
    fireEvent.click(completedFilterBtn);

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should open flag dialog when clicking flag button', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Exam',
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
          examTitle: 'Math Exam',
          totalStudents: 1,
          activeStudents: 1,
          completedStudents: 0,
          averageProgress: 75,
          students: [
            {
              id: 's1',
              studentId: 'std1',
              studentName: 'John Doe',
              questionsAnswered: 15,
              totalQuestions: 20,
              currentQuestion: 15,
              status: 'Active' as const,
              timeRemaining: 1200,
              completionPercentage: 75,
              lastActivityTime: '2024-01-01T10:00:00Z',
            },
          ],
        },
      }),
    } as Response);

    render(<LiveMonitoringTab />);

    const examSelect = await screen.findByLabelText(/Select Ongoing Exam/i);
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const flagButton = screen.getByText('Flag');
    fireEvent.click(flagButton);

    // Prefer dialog title role to avoid matching the action button with the same text
    expect(screen.getByRole('heading', { name: 'Flag Student' })).toBeInTheDocument();
  });

  it('should flag a student with reason', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Exam',
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
          examTitle: 'Math Exam',
          totalStudents: 1,
          activeStudents: 1,
          completedStudents: 0,
          averageProgress: 75,
          students: [
            {
              id: 's1',
              studentId: 'std1',
              studentName: 'John Doe',
              questionsAnswered: 15,
              totalQuestions: 20,
              currentQuestion: 15,
              status: 'Active' as const,
              timeRemaining: 1200,
              completionPercentage: 75,
              lastActivityTime: '2024-01-01T10:00:00Z',
            },
          ],
        },
      }),
    } as Response);

    mockTenantApiPut.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<LiveMonitoringTab />);

    const examSelect = await screen.findByLabelText(/Select Ongoing Exam/i);
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const flagButton = screen.getByText('Flag');
    fireEvent.click(flagButton);

    const reasonInput = screen.getByPlaceholderText('Describe the suspicious activity...');
    await userEvent.type(reasonInput, 'Tab switching detected');

    const flagStudentButton = screen.getByRole('button', { name: 'Flag Student' });
    fireEvent.click(flagStudentButton);

    await waitFor(() => {
      expect(mockTenantApiPut).toHaveBeenCalledWith(
        expect.stringContaining('action=flag'),
        { reason: 'Tab switching detected' }
      );
    });
  });
});
