import { NextApiRequest, NextApiResponse } from 'next';
import itemAnalysisApi from './item-analysis';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { tenantId, examId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'Missing tenant ID' });
  }

  try {
    if (req.method === 'GET') {
      const { type, limit, offset } = req.query;

      if (type === 'items' && examId) {
        const result = itemAnalysisApi.listItems(tenantId, examId as string, {
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        });
        return res.status(200).json(result);
      }

      if (type === 'distractors' && examId) {
        const result = itemAnalysisApi.listDistractors(tenantId, examId as string);
        return res.status(200).json({ data: result });
      }

      if (type === 'blueprint' && examId) {
        const result = itemAnalysisApi.listBlueprintCoverage(tenantId, examId as string);
        return res.status(200).json({ data: result });
      }

      if (type === 'anchors' && examId) {
        const result = itemAnalysisApi.listAnchors(tenantId, examId as string);
        return res.status(200).json({ data: result });
      }

      if (type === 'statistics' && examId) {
        const result = itemAnalysisApi.getStatistics(tenantId, examId as string);
        return res.status(200).json(result);
      }

      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    if (req.method === 'POST') {
      const { action, payload } = req.body;

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

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in item analysis routes:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
