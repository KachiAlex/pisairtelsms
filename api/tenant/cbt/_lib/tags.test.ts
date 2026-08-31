/**
 * Tag Service Tests
 * Tests for tag catalog operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  slugifyTag,
  normalizeTagName,
  getTags,
  getTag,
  getTagWithQuestionCount,
  deleteTag,
  syncQuestionTags,
  getQuestionTags,
  linkQuestionToTag,
  unlinkQuestionFromTag,
  getQuestionsByTag,
  getTagStats,
  cleanupUnusedTags,
} from './tags.js';

// Mock the database functions
const mockQueryAll = vi.fn();
const mockQueryOne = vi.fn();
const mockQuery = vi.fn();

vi.mock('./db.js', () => ({
  queryAll: (...args: any[]) => mockQueryAll(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  query: (...args: any[]) => mockQuery(...args),
}));

describe('Tag Service Helpers', () => {
  beforeEach(() => {
    mockQueryAll.mockClear();
    mockQueryOne.mockClear();
    mockQuery.mockClear();
  });

  describe('slugifyTag', () => {
    it('should convert tag name to slug', () => {
      expect(slugifyTag('Algebra Equations')).toBe('algebra-equations');
      expect(slugifyTag('1st CA Test')).toBe('1st-ca-test');
      expect(slugifyTag('Week 2')).toBe('week-2');
    });

    it('should handle special characters', () => {
      expect(slugifyTag('Test@#$%')).toBe('test');
      expect(slugifyTag('Multiple   Spaces')).toBe('multiple-spaces');
    });

    it('should truncate long slugs', () => {
      const longName = 'a'.repeat(200);
      const slug = slugifyTag(longName);
      expect(slug.length).toBeLessThanOrEqual(120);
    });
  });

  describe('normalizeTagName', () => {
    it('should trim and normalize whitespace', () => {
      expect(normalizeTagName('  algebra  ')).toBe('algebra');
      expect(normalizeTagName('multiple   spaces')).toBe('multiple spaces');
    });
  });

  describe('syncQuestionTags', () => {
    it('should sync tags for a question', async () => {
      mockQueryOne.mockResolvedValueOnce({
        id: 'tag-1',
        name: 'algebra',
        slug: 'algebra',
        tenantId: 'tenant-1',
        usageCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      mockQueryAll.mockResolvedValueOnce([]);
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const tags = await syncQuestionTags('tenant-1', 'question-1', ['algebra']);
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe('algebra');
    });

    it('should handle empty tag array', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 });
      const tags = await syncQuestionTags('tenant-1', 'question-1', []);
      expect(tags).toHaveLength(0);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM question_tag_links'),
        expect.any(Array)
      );
    });
  });

  describe('getQuestionTags', () => {
    it('should fetch tags for a question', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'algebra', slug: 'algebra', usageCount: 5 },
        { id: 'tag-2', name: 'equations', slug: 'equations', usageCount: 3 },
      ];
      mockQueryAll.mockResolvedValue(mockTags);

      const tags = await getQuestionTags('tenant-1', 'question-1');
      expect(tags).toHaveLength(2);
      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN question_tag_links'),
        expect.any(Array)
      );
    });
  });

  describe('getTags', () => {
    it('should fetch tags with filters', async () => {
      const mockTags = [
        { id: 'tag-1', name: 'algebra', slug: 'algebra', usageCount: 5, subject: 'Math' },
      ];
      mockQueryAll.mockResolvedValue(mockTags);

      const tags = await getTags('tenant-1', { subject: 'Math', minUsage: 3 });
      expect(tags).toHaveLength(1);
      expect(mockQueryAll).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1'),
        expect.any(Array)
      );
    });
  });

  describe('getTagStats', () => {
    it('should fetch tag statistics', async () => {
      mockQueryOne.mockResolvedValueOnce({ count: '10' });
      mockQueryOne.mockResolvedValueOnce({ count: '25' });
      mockQueryOne.mockResolvedValueOnce({ count: '2' });

      const stats = await getTagStats('tenant-1');
      expect(stats.totalTags).toBe(10);
      expect(stats.totalLinks).toBe(25);
      expect(stats.unusedTags).toBe(2);
    });
  });

  describe('cleanupUnusedTags', () => {
    it('should delete unused tags', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 3 });

      const count = await cleanupUnusedTags('tenant-1');
      expect(count).toBe(3);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE question_tags SET deleted_at'),
        expect.any(Array)
      );
    });
  });
});
