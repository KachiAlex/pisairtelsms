import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SecuritySettingsTab } from './SecuritySettingsTab';
import * as tenantApi from '../../../lib/tenantApi';

jest.mock('../../../lib/tenantApi');

const mockTenantApiGet = tenantApi.tenantApiGet as jest.MockedFunction<typeof tenantApi.tenantApiGet>;
const mockTenantApiPost = tenantApi.tenantApiPost as jest.MockedFunction<typeof tenantApi.tenantApiPost>;

describe('SecuritySettingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display exams in selector', async () => {
    const mockExams = [
      {
        id: '1',
        title: 'Math Final',
        subject: 'Mathematics',
        class: 'JSS 3',
        status: 'Scheduled',
      },
    ];

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockExams }),
    } as Response);

    render(<SecuritySettingsTab />);

    await waitFor(() => {
      expect(screen.getByText('Math Final (Mathematics · JSS 3)')).toBeInTheDocument();
    });
  });

  it('should load security settings when exam is selected', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
            status: 'Scheduled',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'sec1',
          examId: '1',
          proctoringEnabled: true,
          cameraRequired: false,
          copyPasteDisabled: true,
          rightClickDisabled: false,
          questionRandomization: true,
          optionRandomization: false,
          ipWhitelist: '',
          examPassword: '',
        },
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<SecuritySettingsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Proctoring & Restrictions')).toBeInTheDocument();
    });
  });

  it('should toggle security settings', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
            status: 'Scheduled',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'sec1',
          examId: '1',
          proctoringEnabled: false,
          cameraRequired: false,
          copyPasteDisabled: false,
          rightClickDisabled: false,
          questionRandomization: false,
          optionRandomization: false,
          ipWhitelist: '',
          examPassword: '',
        },
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<SecuritySettingsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Enable Proctoring')).toBeInTheDocument();
    });

    const proctoringToggle = screen.getByRole('switch', { name: 'enableProctoring' });
    fireEvent.click(proctoringToggle);

    expect(proctoringToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('should validate IP whitelist format', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
            status: 'Scheduled',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'sec1',
          examId: '1',
          proctoringEnabled: false,
          cameraRequired: false,
          copyPasteDisabled: false,
          rightClickDisabled: false,
          questionRandomization: false,
          optionRandomization: false,
          ipWhitelist: '',
          examPassword: '',
        },
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<SecuritySettingsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. 192.168.1.0/24, 10.0.0.0/8')).toBeInTheDocument();
    });

    const ipInput = screen.getByPlaceholderText('e.g. 192.168.1.0/24, 10.0.0.0/8');
    await userEvent.type(ipInput, 'invalid-ip');

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid CIDR notation/)).toBeInTheDocument();
    });
  });

  it('should save security settings', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
            status: 'Scheduled',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'sec1',
          examId: '1',
          proctoringEnabled: false,
          cameraRequired: false,
          copyPasteDisabled: false,
          rightClickDisabled: false,
          questionRandomization: false,
          optionRandomization: false,
          ipWhitelist: '',
          examPassword: '',
        },
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    mockTenantApiPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'sec1',
          examId: '1',
          proctoringEnabled: true,
          cameraRequired: false,
          copyPasteDisabled: true,
          rightClickDisabled: false,
          questionRandomization: true,
          optionRandomization: false,
          ipWhitelist: '192.168.1.0/24',
          examPassword: '',
        },
      }),
    } as Response);

    render(<SecuritySettingsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Enable Proctoring')).toBeInTheDocument();
    });

    const proctoringToggle = screen.getByRole('switch', { name: 'enableProctoring' });
    fireEvent.click(proctoringToggle);

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockTenantApiPost).toHaveBeenCalledWith(
        expect.stringContaining('/api/tenant/cbt/security/1'),
        expect.objectContaining({
          proctoringEnabled: true,
        })
      );
    });
  });

  it('should display proctoring logs', async () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '1',
            title: 'Math Final',
            subject: 'Mathematics',
            class: 'JSS 3',
            status: 'Scheduled',
          },
        ],
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'sec1',
          examId: '1',
          proctoringEnabled: true,
          cameraRequired: false,
          copyPasteDisabled: true,
          rightClickDisabled: false,
          questionRandomization: true,
          optionRandomization: false,
          ipWhitelist: '',
          examPassword: '',
        },
      }),
    } as Response);

    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'log1',
            studentId: 'std1',
            studentName: 'John Doe',
            eventType: 'tab_switch',
            createdAt: '2024-01-01T10:00:00Z',
            eventDetails: {},
          },
        ],
      }),
    } as Response);

    render(<SecuritySettingsTab />);

    const examSelect = await screen.findByDisplayValue('Math Final (Mathematics · JSS 3)');
    fireEvent.change(examSelect, { target: { value: '1' } });

    await waitFor(() => {
      expect(screen.getByText('Proctoring Logs')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('should display empty state when no exam selected', () => {
    mockTenantApiGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<SecuritySettingsTab />);

    expect(screen.getByText(/Select an exam to configure security settings/)).toBeInTheDocument();
  });
});
