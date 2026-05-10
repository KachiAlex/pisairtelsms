/**
 * CBT Metadata API Endpoints
 * Provides metadata for exam creation (subjects, classes, tags, etc.)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSubjectNames } from './_lib/subjects.js'
import { initializeDatabase } from './_lib/db.js'
import { queryAll } from './_lib/db.js'

/**
 * Get all available tags from questions
 */
async function getAvailableTags(tenantId: string): Promise<string[]> {
  try {
    const rows = await queryAll<{ tags: string }>(
      `SELECT DISTINCT tags FROM questions_bank 
       WHERE tenant_id = $1 AND deleted_at IS NULL AND tags IS NOT NULL AND tags != '[]'`,
      [tenantId]
    );

    const allTags = new Set<string>();
    for (const row of rows) {
      try {
        const tags = JSON.parse(row.tags || '[]');
        if (Array.isArray(tags)) {
          tags.forEach((tag: string) => allTags.add(tag));
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return Array.from(allTags).sort();
  } catch {
    return [];
  }
}

/**
 * Get all available classes from staff classes endpoint
 */
async function getAvailableClasses(): Promise<Array<{ id: string; name: string; arm: string }>> {
  try {
    // This would normally call the staff classes endpoint
    // For now, return empty array - the frontend will fetch from /api/staff/classes
    return [];
  } catch {
    return [];
  }
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId = req.headers['x-tenant-id'] as string

  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'x-tenant-id header is required' })
  }

  try {
    initializeDatabase()
  } catch (error: any) {
    return res.status(503).json({ success: false, error: 'Database initialization failed: ' + error.message })
  }

  const { action } = req.query

  // GET /api/tenant/cbt/metadata/subjects
  if (req.method === 'GET' && action === 'subjects') {
    try {
      const subjects = await getSubjectNames(tenantId)
      return res.status(200).json({ success: true, data: subjects })
    } catch (error: any) {
      console.error('Error fetching subjects:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch subjects' })
    }
  }

  // GET /api/tenant/cbt/metadata/tags
  if (req.method === 'GET' && action === 'tags') {
    try {
      const tags = await getAvailableTags(tenantId)
      return res.status(200).json({ success: true, data: tags })
    } catch (error: any) {
      console.error('Error fetching tags:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch tags' })
    }
  }

  // GET /api/tenant/cbt/metadata/classes
  if (req.method === 'GET' && action === 'classes') {
    try {
      const classes = await getAvailableClasses()
      return res.status(200).json({ success: true, data: classes })
    } catch (error: any) {
      console.error('Error fetching classes:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch classes' })
    }
  }

  // GET /api/tenant/cbt/metadata (all metadata)
  if (req.method === 'GET' && !action) {
    try {
      const [subjects, tags, classes] = await Promise.all([
        getSubjectNames(tenantId),
        getAvailableTags(tenantId),
        getAvailableClasses(),
      ])

      return res.status(200).json({
        success: true,
        data: {
          subjects,
          tags,
          classes,
        },
      })
    } catch (error: any) {
      console.error('Error fetching metadata:', error)
      return res.status(500).json({ success: false, error: 'Failed to fetch metadata' })
    }
  }

  // Method not allowed
  res.setHeader('Allow', 'GET')
  return res.status(405).json({ success: false, error: 'Method not allowed' })
}
