import { v4 as uuidv4 } from 'uuid';

interface ItemAnalysis {
  id: string;
  tenantId: string;
  examId: string;
  itemCode: string;
  difficulty: number;
  discrimination: number;
  responses: number;
  flagged: string;
  createdAt: Date;
  updatedAt: Date;
}

interface DistractorStat {
  id: string;
  tenantId: string;
  itemCode: string;
  distractor: string;
  picks: number;
  quality: string;
  createdAt: Date;
}

interface BlueprintCoverage {
  id: string;
  tenantId: string;
  examId: string;
  strand: string;
  coverage: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AnchorStability {
  id: string;
  tenantId: string;
  examId: string;
  anchor: string;
  drift: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const items: ItemAnalysis[] = [];
const distractors: DistractorStat[] = [];
const blueprints: BlueprintCoverage[] = [];
const anchors: AnchorStability[] = [];

export const itemAnalysisApi = {
  // List item analysis
  listItems: (tenantId: string, examId: string, filters?: { limit?: number; offset?: number }) => {
    if (!tenantId || !examId) throw new Error('Missing required fields');

    const { limit = 50, offset = 0 } = filters || {};

    const filtered = items.filter(i => i.tenantId === tenantId && i.examId === examId);
    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Create item analysis
  createItem: (tenantId: string, examId: string, payload: { itemCode: string; difficulty: number; discrimination: number; responses: number; flagged?: string }) => {
    if (!tenantId || !examId || !payload.itemCode) {
      throw new Error('Missing required fields');
    }

    const item: ItemAnalysis = {
      id: uuidv4(),
      tenantId,
      examId,
      itemCode: payload.itemCode,
      difficulty: payload.difficulty,
      discrimination: payload.discrimination,
      responses: payload.responses,
      flagged: payload.flagged || 'Stable',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    items.push(item);
    return item;
  },

  // List distractor statistics
  listDistractors: (tenantId: string, examId: string) => {
    if (!tenantId || !examId) throw new Error('Missing required fields');

    return distractors
      .filter(d => d.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Create distractor stat
  createDistractor: (tenantId: string, payload: { itemCode: string; distractor: string; picks: number; quality: string }) => {
    if (!tenantId || !payload.itemCode || !payload.distractor) {
      throw new Error('Missing required fields');
    }

    const stat: DistractorStat = {
      id: uuidv4(),
      tenantId,
      itemCode: payload.itemCode,
      distractor: payload.distractor,
      picks: payload.picks,
      quality: payload.quality,
      createdAt: new Date(),
    };

    distractors.push(stat);
    return stat;
  },

  // List blueprint coverage
  listBlueprintCoverage: (tenantId: string, examId: string) => {
    if (!tenantId || !examId) throw new Error('Missing required fields');

    return blueprints
      .filter(b => b.tenantId === tenantId && b.examId === examId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create blueprint coverage
  createBlueprintCoverage: (tenantId: string, examId: string, payload: { strand: string; coverage: number }) => {
    if (!tenantId || !examId || !payload.strand) {
      throw new Error('Missing required fields');
    }

    const blueprint: BlueprintCoverage = {
      id: uuidv4(),
      tenantId,
      examId,
      strand: payload.strand,
      coverage: payload.coverage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    blueprints.push(blueprint);
    return blueprint;
  },

  // List anchor stability
  listAnchors: (tenantId: string, examId: string) => {
    if (!tenantId || !examId) throw new Error('Missing required fields');

    return anchors
      .filter(a => a.tenantId === tenantId && a.examId === examId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Create anchor stability
  createAnchor: (tenantId: string, examId: string, payload: { anchor: string; drift: string; status: string }) => {
    if (!tenantId || !examId || !payload.anchor) {
      throw new Error('Missing required fields');
    }

    const anchorRecord: AnchorStability = {
      id: uuidv4(),
      tenantId,
      examId,
      anchor: payload.anchor,
      drift: payload.drift,
      status: payload.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    anchors.push(anchorRecord);
    return anchorRecord;
  },

  // Get analysis statistics
  getStatistics: (tenantId: string, examId: string) => {
    if (!tenantId || !examId) throw new Error('Missing required fields');

    const examItems = items.filter(i => i.tenantId === tenantId && i.examId === examId);
    const flaggedCount = examItems.filter(i => i.flagged !== 'Stable').length;

    return {
      itemsAnalyzed: examItems.length,
      flaggedVariance: examItems.length > 0 ? ((flaggedCount / examItems.length) * 100).toFixed(1) : '0',
      anchorStability: anchors.filter(a => a.tenantId === tenantId && a.examId === examId && a.status === 'Within band').length,
      blueprintCoverage: blueprints.filter(b => b.tenantId === tenantId && b.examId === examId).reduce((sum, b) => sum + b.coverage, 0) / Math.max(blueprints.filter(b => b.tenantId === tenantId && b.examId === examId).length, 1),
    };
  },
};

export default itemAnalysisApi;
