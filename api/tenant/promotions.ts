import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  fetchPromotionRecords,
  createPromotionRecord,
  createBulkPromotionRecords,
  updatePromotionRecord,
  fetchPromotionRules,
  updatePromotionRule,
  type PromotionRecord,
  type PromotionPayload,
  type PromotionRule
} from './_lib/promotions.js'
import { requireRole } from '../_lib/auth-middleware.js'

interface ApiResponse<T> {
  data?: T
  error?: string
}

function methodNotAllowed(res: VercelResponse) {
  res.setHeader('Allow', 'GET,POST,PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}

function parseBody(req: VercelRequest) {
  if (!req.body) return null
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch (error) {
      console.error('Failed to parse request body', error)
      return null
    }
  }
  return req.body
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['staff', 'tenant_admin'])
  if (!decoded) return

  const { method } = req

  if (method === 'GET') {
    try {
      const { academicSession, term, fromClass } = req.query

      const records = await fetchPromotionRecords(
        academicSession as string,
        term as string,
        fromClass as string
      )

      return res.status(200).json({ data: records })
    } catch (error) {
      console.error('Error fetching promotion records:', error)
      return res.status(500).json({ error: 'Failed to fetch promotion records' })
    }
  }

  if (method === 'POST') {
    try {
      const body = parseBody(req)
      if (!body) {
        return res.status(400).json({ error: 'Request body is required' })
      }

      // Check if this is a bulk create or single create
      if (Array.isArray(body.records)) {
        // Bulk create
        const records: PromotionPayload[] = body.records
        const createdRecords = await createBulkPromotionRecords(records)
        return res.status(201).json({ data: createdRecords })
      } else {
        // Single create
        const record: PromotionPayload = body.record || body
        const createdRecord = await createPromotionRecord(record)
        return res.status(201).json({ data: createdRecord })
      }
    } catch (error) {
      console.error('Error creating promotion record(s):', error)
      return res.status(500).json({ error: 'Failed to create promotion record(s)' })
    }
  }

  if (method === 'PUT') {
    try {
      const body = parseBody(req)
      if (!body || !body.id) {
        return res.status(400).json({ error: 'Record ID and update data are required' })
      }

      const { id, ...updateData } = body
      const updatedRecord = await updatePromotionRecord(id, updateData)

      if (!updatedRecord) {
        return res.status(404).json({ error: 'Promotion record not found' })
      }

      return res.status(200).json({ data: updatedRecord })
    } catch (error) {
      console.error('Error updating promotion record:', error)
      return res.status(500).json({ error: 'Failed to update promotion record' })
    }
  }

  return methodNotAllowed(res)
}
