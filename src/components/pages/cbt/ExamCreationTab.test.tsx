import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamCreationTab } from './ExamCreationTab';
import * as tenantApi from '../../../lib/tenantApi';

jest.mock('../../../lib/tenantApi');

const mockTenantApiGet = tenantApi.tenantApiGet as jest.MockedFunction<typeof tenantApi.tenantApiGet>;
const mockTenantApiPost = tenantApi.tenantApiPost as jest.MockedFunction<typeof tenantApi.tenantApiPost>;

describe('ExamCreationTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display exams from the database', async () => {
    const mockExams = [
      {
        id: '1',
        title: 'Math Final',
        subject: 'Mathematics',
        class: 'JSS 3',
        duration: 60,
        passMark: 50,
        totalMarks: 100,
        status: 'Draft' as const,
        questions: [],
        createdAt: '2024-01-01',
      },
    ];

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockExams }),
    } as Response);

    render(<ExamCreationTab />);

    await waitFor(() => {
      expect(screen.getByText('Math Final')).toBeInTheDocument();
    });
  });

  it('should display loading state while fetching exams', () => {
    mockTenantApiGet.mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ExamCreationTab />);

    expect(screen.getByText('Loading exams...')).toBeInTheDocument();
  });

  it('should display empty state when no exams exist', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<ExamCreationTab />);

    await waitFor(() => {
      expect(screen.getByText(/No exams yet/)).toBeInTheDocument();
    });
  });

  it('should open create exam dialog when clicking Create Exam button', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<ExamCreationTab />);

    const createButton = await screen.findByText('Create Exam');
    fireEvent.click(createButton);

    expect(screen.getByText('Create Exam')).toBeInTheDocument();
  });

  it('should validate required fields before saving', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<ExamCreationTab />);

    const createButton = await screen.findByText('Create Exam');
    fireEvent.click(createButton);

    const saveButton = screen.getByText('Save as Draft');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('should validate duration is within acceptable range', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<ExamCreationTab />);

    const createButton = await screen.findByText('Create Exam');
    fireEvent.click(createButton);

    const durationInput = screen.getByPlaceholderText('60');
    await userEvent.clear(durationInput);
    await userEvent.type(durationInput, '10');

    const saveButton = screen.getByText('Save as Draft');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Duration must be 15–480 minutes/)).toBeInTheDocument();
    });
  });
});
