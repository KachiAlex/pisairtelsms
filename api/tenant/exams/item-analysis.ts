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
  irtTheta?: number;
  irtAlpha?: number;
  irtBeta?: number;
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
  targetCoverage: number;
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

interface PerformanceByQuestion {
  id: string;
  tenantId: string;
  examId: string;
  questionCode: string;
  correctCount: number;
  totalAttempts: number;
  successRate: number;
  averageTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const items: ItemAnalysis[] = [];
const distractors: DistractorStat[] = [];
const blueprints: BlueprintCoverage[] = [];
const anchors: AnchorStability[] = [];
const performanceData: PerformanceByQuestion[] = [];

// IRT calculation utilities
const calculateIRTMetrics = (difficulty: number, discrimination: number) => {
  const theta = -Math.log(difficulty / (1 - difficulty));
  const alpha = discrimination * 1.7;
  const beta = theta;
  return { theta, alpha, beta };
};

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

  // Create item analysis with IRT metrics
  createItem: (tenantId: string, examId: string, payload: { itemCode: string; difficulty: number; discrimination: number; responses: number; flagged?: string }) => {
    if (!tenantId || !examId || !payload.itemCode) {
      throw new Error('Missing required fields');
    }

    const { theta, alpha, beta } = calculateIRTMetrics(payload.difficulty, payload.discrimination);

    const item: ItemAnalysis = {
      id: uuidv4(),
      tenantId,
      examId,
      itemCode: payload.itemCode,
      difficulty: payload.difficulty,
      discrimination: payload.discrimination,
      responses: payload.responses,
      flagged: payload.flagged || 'Stable',
      irtTheta: theta,
      irtAlpha: alpha,
      irtBeta: beta,
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
  createBlueprintCoverage: (tenantId: string, examId: string, payload: { strand: string; coverage: number; targetCoverage?: number }) => {
    if (!tenantId || !examId || !payload.strand) {
      throw new Error('Missing required fields');
    }

    const blueprint: BlueprintCoverage = {
      id: uuidv4(),
      tenantId,
      examId,
      strand: payload.strand,
      coverage: payload.coverage,
      targetCoverage: payload.targetCoverage || 100,
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

  // Track performance by question
  trackPerformanceByQuestion: (tenantId: string, examId: string, payload: { questionCode: string; correctCount: number; totalAttempts: number; averageTime: number }) => {
    if (!tenantId || !examId || !payload.questionCode) {
      throw new Error('Missing required fields');
    }

    const successRate = (payload.correctCount / payload.totalAttempts) * 100;

    const performance: PerformanceByQuestion = {
      id: uuidv4(),
      tenantId,
      examId,
      questionCode: payload.questionCode,
      correctCount: payload.correctCount,
      totalAttempts: payload.totalAttempts,
      successRate,
      averageTime: payload.averageTime,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    performanceData.push(performance);
    return performance;
  },

  // List performance by question
  listPerformanceByQuestion: (tenantId: string, examId: string) => {
    if (!tenantId || !examId) throw new Error('Missing required fields');

    return performanceData
      .filter(p => p.tenantId === tenantId && p.examId === examId)
      .sort((a, b) => b.successRate - a.successRate);
  },

  // Get analysis statistics
  getStatistics: (tenantId: string, examId: string) => {
    if (!tenantId || !examId) throw new Error('Missing required fields');

    const examItems = items.filter(i => i.tenantId === tenantId && i.examId === examId);
    const flaggedCount = examItems.filter(i => i.flagged !== 'Stable').length;
    const examPerformance = performanceData.filter(p => p.tenantId === tenantId && p.examId === examId);

    return {
      itemsAnalyzed: examItems.length,
      flaggedVariance: examItems.length > 0 ? ((flaggedCount / examItems.length) * 100).toFixed(1) : '0',
      anchorStability: anchors.filter(a => a.tenantId === tenantId && a.examId === examId && a.status === 'Within band').length,
      blueprintCoverage: blueprints.filter(b => b.tenantId === tenantId && b.examId === examId).reduce((sum, b) => sum + b.coverage, 0) / Math.max(blueprints.filter(b => b.tenantId === tenantId && b.examId === examId).length, 1),
      averageSuccessRate: examPerformance.length > 0 
        ? (examPerformance.reduce((sum, p) => sum + p.successRate, 0) / examPerformance.length).toFixed(2)
        : '0',
    };
  },
};

export default itemAnalysisApi;
