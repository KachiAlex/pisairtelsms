import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionBankTab } from './QuestionBankTab';
import * as tenantApi from '../../../lib/tenantApi';

// Mock the tenantApi module
vi.mock('../../../lib/tenantApi');

const mockTenantApiGet = tenantApi.tenantApiGet as ReturnType<typeof vi.fn>;
const mockTenantApiPost = tenantApi.tenantApiPost as ReturnType<typeof vi.fn>;
const mockTenantApiPut = tenantApi.tenantApiPut as ReturnType<typeof vi.fn>;
const mockTenantApiFetch = tenantApi.tenantApiFetch as ReturnType<typeof vi.fn>;

describe('QuestionBankTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Question List Display', () => {
    it('should display questions from the database', async () => {
      const mockQuestions = [
        {
          id: '1',
          text: 'What is 2+2?',
          type: 'objective' as const,
          options: ['3', '4', '5', '6'],
          correctAnswer: 'B',
          difficulty: 'Easy' as const,
          subject: 'Mathematics',
          tags: [],
          createdAt: '2024-01-01',
        },
      ];

      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockQuestions, pagination: { pages: 1 } }),
      } as Response);

      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 1,
            byDifficulty: { Easy: 1, Medium: 0, Hard: 0 },
            byType: { objective: 1, truefalse: 0, essay: 0 },
          },
        }),
      } as Response);

      render(<QuestionBankTab />);

      await waitFor(() => {
        expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
      });
    });

    it('should display loading state while fetching questions', () => {
      mockTenantApiGet.mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<QuestionBankTab />);

      expect(screen.getByText('Loading questions...')).toBeInTheDocument();
    });

    it('should display error message on fetch failure', async () => {
      mockTenantApiGet.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to load questions' }),
      } as Response);

      render(<QuestionBankTab />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load questions/)).toBeInTheDocument();
      });
    });

    it('should display empty state when no questions exist', async () => {
      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 0,
            byDifficulty: { Easy: 0, Medium: 0, Hard: 0 },
            byType: { objective: 0, truefalse: 0, essay: 0 },
          },
        }),
      } as Response);

      render(<QuestionBankTab />);

      await waitFor(() => {
        expect(screen.getByText(/No questions found/)).toBeInTheDocument();
      });
    });
  });

  describe('Question Creation', () => {
    it('should open add question dialog when clicking Add Question button', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      render(<QuestionBankTab />);

      const addButton = await screen.findByText('Add Question');
      fireEvent.click(addButton);

      expect(screen.getByText('Add Question')).toBeInTheDocument();
    });

    it('should validate required fields before saving', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      render(<QuestionBankTab />);

      const addButton = await screen.findByText('Add Question');
      fireEvent.click(addButton);

      const saveButton = screen.getByText('Save Question');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Question text is required')).toBeInTheDocument();
      });
    });

    it('should save a new question to the database', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      mockTenantApiPost.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '1',
            text: 'Test Question',
            type: 'objective',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
            difficulty: 'Medium',
            subject: 'Math',
            tags: [],
          },
        }),
      } as Response);

      render(<QuestionBankTab />);

      const addButton = await screen.findByText('Add Question');
      fireEvent.click(addButton);

      const textArea = screen.getByPlaceholderText('Enter question text...');
      await userEvent.type(textArea, 'Test Question');

      const subjectInput = screen.getByPlaceholderText('e.g. Mathematics');
      await userEvent.type(subjectInput, 'Math');

      const saveButton = screen.getByText('Save Question');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockTenantApiPost).toHaveBeenCalledWith(
          '/api/tenant/cbt/questions',
          expect.objectContaining({
            text: 'Test Question',
            subject: 'Math',
          })
        );
      });
    });
  });

  describe('Question Deletion', () => {
    it('should delete a question when confirmed', async () => {
      const mockQuestions = [
        {
          id: '1',
          text: 'Test Question',
          type: 'objective' as const,
          options: ['A', 'B'],
          correctAnswer: 'A',
          difficulty: 'Easy' as const,
          subject: 'Math',
          tags: [],
          createdAt: '2024-01-01',
        },
      ];

      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockQuestions, pagination: { pages: 1 } }),
      } as Response);

      mockTenantApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      render(<QuestionBankTab />);

      await waitFor(() => {
        expect(screen.getByText('Test Question')).toBeInTheDocument();
      });

      const deleteButton = screen.getByLabelText('Delete question');
      window.confirm = vi.fn(() => true);
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockTenantApiFetch).toHaveBeenCalledWith(
          '/api/tenant/cbt/questions/1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Search and Filter', () => {
    it('should filter questions by subject', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      render(<QuestionBankTab />);

      const subjectSelect = screen.getByDisplayValue('All Subjects');
      await userEvent.selectOptions(subjectSelect, 'Mathematics');

      await waitFor(() => {
        expect(mockTenantApiGet).toHaveBeenCalledWith(
          expect.stringContaining('subject=Mathematics')
        );
      });
    });

    it('should filter questions by difficulty', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      render(<QuestionBankTab />);

      const difficultySelect = screen.getByDisplayValue('All Difficulties');
      await userEvent.selectOptions(difficultySelect, 'Hard');

      await waitFor(() => {
        expect(mockTenantApiGet).toHaveBeenCalledWith(
          expect.stringContaining('difficulty=Hard')
        );
      });
    });

    it('should search questions by text', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      render(<QuestionBankTab />);

      const searchInput = screen.getByPlaceholderText('Search questions...');
      await userEvent.type(searchInput, 'algebra');

      await waitFor(() => {
        expect(mockTenantApiGet).toHaveBeenCalledWith(
          expect.stringContaining('searchText=algebra')
        );
      });
    });
  });

  describe('CSV Import/Export', () => {
    it('should trigger file input when clicking Import CSV', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      render(<QuestionBankTab />);

      const importButton = screen.getByText('Import CSV');
      fireEvent.click(importButton);

      const fileInput = screen.getByDisplayValue('');
      expect(fileInput).toHaveAttribute('type', 'file');
    });

    it('should export questions to CSV', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      render(<QuestionBankTab />);

      const exportButton = screen.getByText('Export CSV');
      window.open = vi.fn();
      fireEvent.click(exportButton);

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('/api/tenant/cbt/questions/export'),
        '_blank'
      );
    });
  });

  describe('Pagination', () => {
    it('should navigate between pages', async () => {
      mockTenantApiGet.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { pages: 3, page: 1 },
        }),
      } as Response);

      render(<QuestionBankTab />);

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockTenantApiGet).toHaveBeenCalledWith(
          expect.stringContaining('page=2')
        );
      });
    });
  });

  describe('Statistics Display', () => {
    it('should display question statistics', async () => {
      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);

      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 10,
            byDifficulty: { Easy: 3, Medium: 5, Hard: 2 },
            byType: { objective: 6, truefalse: 2, essay: 2 },
          },
        }),
      } as Response);

      render(<QuestionBankTab />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('3 / 5 / 2')).toBeInTheDocument();
      });
    });
  });
});
