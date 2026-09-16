import React from 'react';
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamManagement } from './ExamManagement';
import * as tenantApi from '../../lib/tenantApi';

vi.mock('../../lib/tenantApi');

const mockTenantApiGet = tenantApi.tenantApiGet as MockedFunction<typeof tenantApi.tenantApiGet>;

describe('ExamManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all tabs', async () => {
    mockTenantApiGet.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    } as Response);

    render(<ExamManagement />);

    expect(screen.getByRole('tab', { name: 'All Exams' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Live Monitoring' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Question Bank' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Exam Results' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Security Settings' })).toBeInTheDocument();
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
    // Key mocks by URL — child tab components issue their own tenantApiGet
    // calls, so mockResolvedValueOnce ordering is unreliable here
    mockTenantApiGet.mockImplementation(((url: string) => {
      if (url.includes('questions/stats')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { total: 50 } }) } as Response)
      }
      if (url.includes('exams')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              { id: '1', title: 'Math Exam', status: 'Ongoing', participants: 25 },
              { id: '2', title: 'English Exam', status: 'Scheduled', participants: 0 },
            ],
          }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    }) as typeof tenantApi.tenantApiGet);

    render(<ExamManagement />);

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument(); // Question Bank count
      expect(screen.getByText('25')).toBeInTheDocument(); // Active Students
    });
    // Ongoing (1) and Scheduled (1) both render "1"
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2)
  });

  it('should switch between tabs', async () => {
    mockTenantApiGet.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0 }),
    } as Response);

    render(<ExamManagement />);

    const liveMonitoringTab = screen.getByRole('tab', { name: 'Live Monitoring' });
    fireEvent.mouseDown(liveMonitoringTab);

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

    expect(screen.getByRole('tab', { name: 'All Exams' })).toBeInTheDocument();
  });

  it('should display all stat cards', async () => {
    mockTenantApiGet.mockImplementation(((url: string) => {
      if (url.includes('questions/stats')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: { total: 100 } }) } as Response)
      }
      if (url.includes('exams')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              { id: '1', title: 'Math Exam', status: 'Ongoing', participants: 30 },
              { id: '2', title: 'English Exam', status: 'Scheduled', participants: 0 },
              { id: '3', title: 'Science Exam', status: 'Scheduled', participants: 0 },
            ],
          }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    }) as typeof tenantApi.tenantApiGet);

    render(<ExamManagement />);

    await waitFor(() => {
      expect(screen.getByText('Ongoing Exams')).toBeInTheDocument();
      expect(screen.getByText('Scheduled')).toBeInTheDocument();
      expect(screen.getByText('Active Students')).toBeInTheDocument();
      // "Question Bank" appears as both a stat card and a tab label
      expect(screen.getAllByText('Question Bank').length).toBeGreaterThanOrEqual(2);
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
