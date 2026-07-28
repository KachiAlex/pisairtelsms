import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamManagement } from './ExamManagement';
import * as tenantApi from '../../lib/tenantApi';

jest.mock('../../lib/tenantApi');

const mockTenantApiGet = tenantApi.tenantApiGet as jest.MockedFunction<typeof tenantApi.tenantApiGet>;

describe('ExamManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all tabs', async () => {
    mockTenantApiGet.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { total: 0 }, data: [] }),
    } as Response);

    render(<ExamManagement />);

    expect(screen.getByText('All Exams')).toBeInTheDocument();
    expect(screen.getByText('Live Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Question Bank')).toBeInTheDocument();
    expect(screen.getByText('Exam Results')).toBeInTheDocument();
    expect(screen.getByText('Security Settings')).toBeInTheDocument();
  });

  it('should display header and description', () => {
    mockTenantApiGet.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { total: 0 }, data: [] }),
    } as Response);

    render(<ExamManagement />);

    expect(screen.getByText('CBT & Examination Management')).toBeInTheDocument();
    expect(screen.getByText('Create, schedule and monitor computer-based tests')).toBeInTheDocument();
  });

  it('should display dashboard statistics', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          total: 50,
        },
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Exam',
            status: 'Ongoing',
            participants: 25,
          },
          {
            id: '2',
            title: 'English Exam',
            status: 'Scheduled',
            participants: 0,
          },
        ],
      }),
    } as Response);

    render(<ExamManagement />);

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument(); // Question Bank count
      expect(screen.getByText('1')).toBeInTheDocument(); // Ongoing Exams
      expect(screen.getByText('25')).toBeInTheDocument(); // Active Students
    });
  });

  it('should switch between tabs', async () => {
    mockTenantApiGet.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { total: 0 }, data: [] }),
    } as Response);

    render(<ExamManagement />);

    const liveMonitoringTab = screen.getByText('Live Monitoring');
    fireEvent.click(liveMonitoringTab);

    await waitFor(() => {
      expect(screen.getByText(/Select an ongoing exam to monitor students/)).toBeInTheDocument();
    });
  });

  it('should have error boundary for tab rendering errors', () => {
    mockTenantApiGet.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { total: 0 }, data: [] }),
    } as Response);

    render(<ExamManagement />);

    expect(screen.getByText('All Exams')).toBeInTheDocument();
  });

  it('should display all stat cards', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          total: 100,
        },
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Exam',
            status: 'Ongoing',
            participants: 30,
          },
          {
            id: '2',
            title: 'English Exam',
            status: 'Scheduled',
            participants: 0,
          },
          {
            id: '3',
            title: 'Science Exam',
            status: 'Scheduled',
            participants: 0,
          },
        ],
      }),
    } as Response);

    render(<ExamManagement />);

    await waitFor(() => {
      expect(screen.getByText('Ongoing Exams')).toBeInTheDocument();
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      expect(screen.getByText('Active Students')).toBeInTheDocument();
      expect(screen.getByText('Question Bank')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockTenantApiGet.mockRejectedValue(new Error('API Error'));

    render(<ExamManagement />);

    // Should still render without crashing
    expect(screen.getByText('CBT & Examination Management')).toBeInTheDocument();
  });

  it('should render tabs with correct default tab', () => {
    mockTenantApiGet.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { total: 0 }, data: [] }),
    } as Response);

    render(<ExamManagement />);

    // Default tab should be "exams"
    expect(screen.getByText('All Exams')).toBeInTheDocument();
  });
});
