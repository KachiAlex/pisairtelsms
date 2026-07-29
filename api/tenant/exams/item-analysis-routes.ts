import type { VercelRequest, VercelResponse } from '@vercel/node';
import itemAnalysisApi from './item-analysis';

/**
 * Exam Item Analysis API Handler
 * Routes:
 *   GET  /api/tenant/exams/item-analysis?type=items|distractors|blueprint|anchors|performance|statistics&examId=...
 *   POST /api/tenant/exams/item-analysis  (action: create-item|create-distractor|create-blueprint|create-anchor|track-performance)
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const tenantId = decoded.tenantId || 'default-tenant';

  const { examId } = req.query;

  try {
    if (req.method === 'GET') {
      const { type, limit, offset } = req.query;

      if (!examId) {
        return res.status(400).json({ error: 'Missing exam ID' });
      }

      if (type === 'items') {
        const result = itemAnalysisApi.listItems(tenantId, examId as string, {
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'distractors') {
        const result = itemAnalysisApi.listDistractors(tenantId, examId as string);
        return res.status(200).json({ data: result });
      }

      if (type === 'blueprint') {
        const result = itemAnalysisApi.listBlueprintCoverage(tenantId, examId as string);
        return res.status(200).json({ data: result });
      }

      if (type === 'anchors') {
        const result = itemAnalysisApi.listAnchors(tenantId, examId as string);
        return res.status(200).json({ data: result });
      }

      if (type === 'performance') {
        const result = itemAnalysisApi.listPerformanceByQuestion(tenantId, examId as string);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics') {
        const result = itemAnalysisApi.getStatistics(tenantId, examId as string);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body || {};

      if (!examId) {
        return res.status(400).json({ error: 'Missing exam ID' });
      }

      if (action === 'create-item') {
        const item = itemAnalysisApi.createItem(tenantId, examId as string, payload);
        return res.status(201).json(item);
      }

      if (action === 'create-distractor') {
        const distractor = itemAnalysisApi.createDistractor(tenantId, payload);
        return res.status(201).json(distractor);
      }

      if (action === 'create-blueprint') {
        const blueprint = itemAnalysisApi.createBlueprintCoverage(tenantId, examId as string, payload);
        return res.status(201).json(blueprint);
      }

      if (action === 'create-anchor') {
        const anchor = itemAnalysisApi.createAnchor(tenantId, examId as string, payload);
        return res.status(201).json(anchor);
      }

      if (action === 'track-performance') {
        const performance = itemAnalysisApi.trackPerformanceByQuestion(tenantId, examId as string, payload);
        return res.status(201).json(performance);
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: message });
  }
}
