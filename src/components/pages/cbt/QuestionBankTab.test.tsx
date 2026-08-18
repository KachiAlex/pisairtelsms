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
    vi.resetAllMocks();
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

      // mount: subjects, tags, initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tag = await screen.findByText('#math');
      // effect re-runs on viewMode/filterTag change and calls subjects, tags, then questions
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockQuestions, pagination: { pages: 1 } }) } as Response);
      // stats after questions load
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 1, byDifficulty: { Easy: 1, Medium: 0, Hard: 0 }, byType: { objective: 1, truefalse: 0, essay: 0 } } }) } as Response);
      fireEvent.click(tag);

      await waitFor(() => {
        expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
      });
    });

    it('should display loading state while fetching questions', async () => {
      // subjects + tags (with a tag to click) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      // effect will call subjects, tags, then questions (pending)
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockImplementationOnce(() => new Promise(() => {}));
      fireEvent.click(tagCard);

      expect(screen.getByText('Loading questions...')).toBeInTheDocument();
    });

    it('should display error message on fetch failure', async () => {
      // subjects + tags (with a tag) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      // effect: subjects, tags, then questions (fails)
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to load questions' }),
      } as Response);
      fireEvent.click(tagCard);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load questions/)).toBeInTheDocument();
      });
    });

    it('should display empty state when no questions exist', async () => {
      // subjects + tags (with a tag) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      // effect: subjects, tags, questions (empty), stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { pages: 1 } }),
      } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);
      fireEvent.click(tagCard);

      await waitFor(() => {
        expect(screen.getByText(/No questions found/)).toBeInTheDocument();
      });
    });
  });

  describe('Question Creation', () => {
    it('should open add question dialog when clicking Add Question button', async () => {
      // subjects + tags (mount) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: ['Mathematics'] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const addButton = await screen.findByText('Add Question');
      fireEvent.click(addButton);

      // dialog title or the save action should appear
      await waitFor(() => {
        expect(screen.getByText('Save Question')).toBeInTheDocument();
      });
    });

    it('should validate required fields before saving', async () => {
      // subjects + tags (mount) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: ['Mathematics'] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const addButton = await screen.findByText('Add Question');
      fireEvent.click(addButton);

      const saveButton = await screen.findByText('Save Question');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Question text is required')).toBeInTheDocument();
      });
    });

    it('should save a new question to the database', async () => {
      // subjects + tags (mount) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: ['Mathematics'] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

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
            subject: 'Mathematics',
            tags: [],
          },
        }),
      } as Response);

      render(<QuestionBankTab />);

      const addButton = await screen.findByText('Add Question');
      fireEvent.click(addButton);

      const textArea = screen.getByPlaceholderText('Enter question text...');
      await userEvent.type(textArea, 'Test Question');

      // subject is a select; choose the available option
      const subjectSelect = screen.getByLabelText('Subject *') as HTMLSelectElement;
      await userEvent.selectOptions(subjectSelect, 'Mathematics');

      // Fill objective options (4) so validation passes
      const optionInputs = screen.getAllByPlaceholderText(/Option [A-D]/);
      for (let i = 0; i < optionInputs.length && i < 4; i++) {
        await userEvent.type(optionInputs[i], String.fromCharCode(65 + i));
      }

      const saveButton = screen.getByText('Save Question');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockTenantApiPost).toHaveBeenCalledWith(
          '/api/tenant/cbt/questions',
          expect.objectContaining({
            text: 'Test Question',
            subject: 'Mathematics',
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

      // subjects + tags (mount) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Math' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      // effect: subjects, tags, questions, stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockQuestions, pagination: { pages: 1 } }),
      } as Response);

      mockTenantApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      fireEvent.click(tagCard);

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
    it('should filter questions by type', async () => {
      // subjects + tags (with one tag) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: { pages: 1 } }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);
      fireEvent.click(tagCard);

      const typeSelect = await screen.findByDisplayValue('All Types');
      await userEvent.selectOptions(typeSelect, 'essay');

      await waitFor(() => {
        expect(mockTenantApiGet).toHaveBeenCalledWith(
          expect.stringContaining('type=essay')
        );
      });
    });

    it('should filter questions by difficulty', async () => {
      // subjects + tags (with one tag) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: { pages: 1 } }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);
      fireEvent.click(tagCard);

      const difficultySelect = await screen.findByDisplayValue('All Difficulties');
      await userEvent.selectOptions(difficultySelect, 'Hard');

      await waitFor(() => {
        expect(mockTenantApiGet).toHaveBeenCalledWith(
          expect.stringContaining('difficulty=Hard')
        );
      });
    });

    it('should search questions by text', async () => {
      // subjects + tags (with one tag) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: { pages: 1 } }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);
      fireEvent.click(tagCard);

      const searchInput = await screen.findByPlaceholderText('Search questions...');
      await userEvent.type(searchInput, 'algebra');

      await waitFor(() => {
        expect(mockTenantApiGet).toHaveBeenCalledWith(
          expect.stringContaining('searchText=algebra')
        );
      });
    });
  });

  describe('CSV Import/Export', () => {
    it('should open import dialog and show file input', async () => {
      // subjects + tags (with one tag) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: { pages: 1 } }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);
      fireEvent.click(tagCard);

      const addBtn = await screen.findByText('Add Question');
      fireEvent.click(addBtn);

      const importTab = await screen.findByText('Import from CSV/Excel');
      fireEvent.click(importTab);

      // file input is rendered inside the import tab
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      expect(fileInput.getAttribute('type')).toBe('file');
    });

    it('should export questions to CSV', async () => {
      // subjects + tags (with one tag) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], pagination: { pages: 1 } }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);
      fireEvent.click(tagCard);

      const exportButton = await screen.findByText('Export CSV');
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
      // subjects + tags (with one tag) + initial stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 't1', name: 'math', usageCount: 1, subject: 'Mathematics' }] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 0, byDifficulty: { Easy: 0, Medium: 0, Hard: 0 }, byType: { objective: 0, truefalse: 0, essay: 0 } } }) } as Response);

      render(<QuestionBankTab />);

      const tagEl = await screen.findByText('#math');
      const tagCard = (tagEl.closest('div[class*="cursor-pointer"]') || tagEl.closest('div')) as HTMLElement;
      // effect: subjects, tags, questions (paged), stats
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      mockTenantApiGet.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 'q1', text: 'Q1?', type: 'objective', options: ['A','B','C','D'], correctAnswer: 'A', difficulty: 'Easy', subject: 'Mathematics', tags: [], createdAt: '2024-01-01' },
          ],
          pagination: { pages: 3, page: 1 },
        }),
      } as Response);
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { total: 1, byDifficulty: { Easy: 1, Medium: 0, Hard: 0 }, byType: { objective: 1, truefalse: 0, essay: 0 } } }) } as Response);
      fireEvent.click(tagCard);

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
      // subjects
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      // tags
      mockTenantApiGet.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) } as Response);
      // stats (shown in tags view immediately)
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
