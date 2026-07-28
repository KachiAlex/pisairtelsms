/**
 * Question Tag Catalog Service
 * Manages first-class tag entities and their relationships to questions
 */

import { queryAll, queryOne, query } from './db.js';

// ============================================================================
// Types
// ============================================================================

export interface Tag {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  subject?: string;
  description?: string;
  usageCount: number;
  lastUsedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagWithQuestions extends Tag {
  questionCount: number;
}

export interface TagFilter {
  subject?: string;
  search?: string;
  minUsage?: number;
  limit?: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Slugify a tag name for URL-safe storage
 */
export function slugifyTag(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 120);
}

/**
 * Normalize tag name (trim, collapse whitespace)
 */
export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// ============================================================================
// Tag CRUD Operations
// ============================================================================

/**
 * Get or create a tag by name for a tenant
 */
export async function upsertTag(
  tenantId: string,
  name: string,
  options?: {
    subject?: string;
    description?: string;
    createdBy?: string;
  }
): Promise<Tag> {
  const normalizedName = normalizeTagName(name);
  const slug = slugifyTag(normalizedName);

  // Try to find existing tag by slug
  const existing = await queryOne<Tag>(
    `SELECT * FROM question_tags
     WHERE tenant_id = $1 AND slug = $2 AND deleted_at IS NULL`,
    [tenantId, slug]
  );

  if (existing) {
    // Update usage count and last used
    await query(
      `UPDATE question_tags
       SET usage_count = usage_count + 1,
           last_used_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [existing.id]
    );
    return existing;
  }

  // Create new tag
  const row = await queryOne<Tag>(
    `INSERT INTO question_tags (tenant_id, name, slug, subject, description, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      tenantId,
      normalizedName,
      slug,
      options?.subject || null,
      options?.description || null,
      options?.createdBy || null,
    ]
  );

  if (!row) {
    throw new Error('Failed to create tag');
  }

  return row;
}

/**
 * Get tags for a tenant with optional filtering
 */
export async function getTags(
  tenantId: string,
  filter?: TagFilter
): Promise<Tag[]> {
  let whereClause = 'WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  let paramIndex = 2;

  if (filter?.subject) {
    whereClause += ` AND subject = $${paramIndex}`;
    params.push(filter.subject);
    paramIndex++;
  }

  if (filter?.search) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
    params.push(`%${filter.search}%`);
    paramIndex++;
  }

  if (filter?.minUsage !== undefined) {
    whereClause += ` AND usage_count >= $${paramIndex}`;
    params.push(filter.minUsage);
    paramIndex++;
  }

  const limit = filter?.limit || 100;
  const rows = await queryAll<Tag>(
    `SELECT * FROM question_tags
     ${whereClause}
     ORDER BY usage_count DESC, last_used_at DESC NULLS LAST
     LIMIT $${paramIndex}`,
    [...params, limit]
  );

  return rows;
}

/**
 * Get a single tag by ID
 */
export async function getTag(tenantId: string, tagId: string): Promise<Tag | null> {
  const row = await queryOne<Tag>(
    `SELECT * FROM question_tags
     WHERE id = $1 AND tenant_id = $2`,
    [tagId, tenantId]
  );
  return row || null;
}

/**
 * Get tag with question count
 */
export async function getTagWithQuestionCount(
  tenantId: string,
  tagId: string
): Promise<TagWithQuestions | null> {
  const row = await queryOne<TagWithQuestions>(
    `SELECT t.*, COUNT(qtl.question_id) as question_count
     FROM question_tags t
     LEFT JOIN question_tag_links qtl ON t.id = qtl.tag_id
     LEFT JOIN questions_bank qb ON qtl.question_id = qb.id AND qb.deleted_at IS NULL
     WHERE t.id = $1 AND t.tenant_id = $2
     GROUP BY t.id`,
    [tagId, tenantId]
  );
  return row || null;
}

/**
 * Delete a tag (soft delete)
 */
export async function deleteTag(tenantId: string, tagId: string): Promise<void> {
  await query(
    `UPDATE question_tags
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2`,
    [tagId, tenantId]
  );
}

/**
 * Delete a tag and all questions that belong exclusively to it (soft delete)
 */
export async function deleteTagWithQuestions(
  tenantId: string,
  tagId: string
): Promise<{ deletedQuestions: number }> {
  // Soft-delete questions that are ONLY linked to this tag (no other tags)
  const result = await query(
    `UPDATE questions_bank
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE tenant_id = $1
       AND deleted_at IS NULL
       AND id IN (
         SELECT question_id FROM question_tag_links WHERE tag_id = $2 AND tenant_id = $1
       )
       AND id NOT IN (
         SELECT question_id FROM question_tag_links
         WHERE tag_id <> $2 AND tenant_id = $1
       )`,
    [tenantId, tagId]
  );

  // Also remove all tag links for this tag
  await query(
    `DELETE FROM question_tag_links WHERE tag_id = $1 AND tenant_id = $2`,
    [tagId, tenantId]
  );

  // Soft-delete the tag itself
  await deleteTag(tenantId, tagId);

  return { deletedQuestions: result.rowCount || 0 };
}

// ============================================================================
// Tag-Question Link Operations
// ============================================================================

/**
 * Link a question to a tag
 */
export async function linkQuestionToTag(
  tenantId: string,
  questionId: string,
  tagId: string
): Promise<void> {
  await query(
    `INSERT INTO question_tag_links (tenant_id, question_id, tag_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (question_id, tag_id) DO NOTHING`,
    [tenantId, questionId, tagId]
  );
}

/**
 * Unlink a question from a tag
 */
export async function unlinkQuestionFromTag(
  tenantId: string,
  questionId: string,
  tagId: string
): Promise<void> {
  await query(
    `DELETE FROM question_tag_links
     WHERE tenant_id = $1 AND question_id = $2 AND tag_id = $3`,
    [tenantId, questionId, tagId]
  );
}

/**
 * Get all tags for a question
 */
export async function getQuestionTags(tenantId: string, questionId: string): Promise<Tag[]> {
  const rows = await queryAll<Tag>(
    `SELECT t.* FROM question_tags t
     INNER JOIN question_tag_links qtl ON t.id = qtl.tag_id
     WHERE qtl.tenant_id = $1 AND qtl.question_id = $2 AND t.deleted_at IS NULL
     ORDER BY t.usage_count DESC`,
    [tenantId, questionId]
  );
  return rows;
}

/**
 * Sync tags for a question (ensure links match normalized tag array)
 */
export async function syncQuestionTags(
  tenantId: string,
  questionId: string,
  tagNames: string[],
  options?: {
    subject?: string;
    createdBy?: string;
  }
): Promise<Tag[]> {
  const normalizedNames = tagNames.map(normalizeTagName).filter(Boolean);

  if (normalizedNames.length === 0) {
    // Remove all existing links
    await query(
      `DELETE FROM question_tag_links
       WHERE tenant_id = $1 AND question_id = $2`,
      [tenantId, questionId]
    );
    return [];
  }

  // Upsert all tags
  const tags: Tag[] = [];
  for (const name of normalizedNames) {
    const tag = await upsertTag(tenantId, name, {
      subject: options?.subject,
      createdBy: options?.createdBy,
    });
    tags.push(tag);
  }

  // Get existing links
  const existingLinks = await queryAll<{ tag_id: string }>(
    `SELECT tag_id FROM question_tag_links
     WHERE tenant_id = $1 AND question_id = $2`,
    [tenantId, questionId]
  );
  const existingTagIds = new Set(existingLinks.map((l) => l.tag_id));

  const newTagIds = new Set(tags.map((t) => t.id));

  // Add new links
  for (const tag of tags) {
    if (!existingTagIds.has(tag.id)) {
      await linkQuestionToTag(tenantId, questionId, tag.id);
    }
  }

  // Remove old links
  for (const existingTagId of existingTagIds) {
    if (!newTagIds.has(existingTagId)) {
      await unlinkQuestionFromTag(tenantId, questionId, existingTagId);
    }
  }

  return tags;
}

/**
 * Get all questions for a tag
 */
export async function getQuestionsByTag(
  tenantId: string,
  tagId: string,
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  const rows = await queryAll<any>(
    `SELECT qb.* FROM questions_bank qb
     INNER JOIN question_tag_links qtl ON qb.id = qtl.question_id
     WHERE qtl.tenant_id = $1 AND qtl.tag_id = $2 AND qb.deleted_at IS NULL
     ORDER BY qb.created_at DESC
     LIMIT $3 OFFSET $4`,
    [tenantId, tagId, limit, offset]
  );
  return rows;
}

// ============================================================================
// Analytics & Cleanup
// ============================================================================

/**
 * Get tag usage statistics for a tenant
 */
export async function getTagStats(tenantId: string): Promise<{
  totalTags: number;
  totalLinks: number;
  unusedTags: number;
}> {
  const totalTags = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM question_tags
     WHERE tenant_id = $1 AND deleted_at IS NULL`,
    [tenantId]
  );

  const totalLinks = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM question_tag_links
     WHERE tenant_id = $1`,
    [tenantId]
  );

  const unusedTags = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM question_tags t
     WHERE t.tenant_id = $1 AND t.deleted_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM question_tag_links qtl WHERE qtl.tag_id = t.id
     )`,
    [tenantId]
  );

  return {
    totalTags: parseInt(totalTags?.count || '0'),
    totalLinks: parseInt(totalLinks?.count || '0'),
    unusedTags: parseInt(unusedTags?.count || '0'),
  };
}

/**
 * Clean up unused tags (tags with no links)
 */
export async function cleanupUnusedTags(tenantId: string): Promise<number> {
  const result = await query(
    `UPDATE question_tags
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE tenant_id = $1 AND deleted_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM question_tag_links qtl WHERE qtl.tag_id = question_tags.id
     )`,
    [tenantId]
  );
  return result.rowCount || 0;
}
