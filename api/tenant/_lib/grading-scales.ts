import { v4 as uuidv4 } from 'uuid';

interface GradeBand {
  id: string;
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
  gpaWeight: number;
  color?: string;
}

interface GradingScale {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'primary' | 'secondary' | 'equivalency';
  bands: GradeBand[];
  version: number;
  status: 'draft' | 'live' | 'archived';
  minimumPassMark: number;
  distinctionThreshold: number;
  remediationTrigger: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  publishedAt?: Date;
  publishedBy?: string;
}

interface GradingScaleVersion {
  id: string;
  scaleId: string;
  version: number;
  bands: GradeBand[];
  createdAt: Date;
  createdBy: string;
}

interface PolicyRule {
  id: string;
  scaleId: string;
  label: string;
  value: string;
  owner: string;
  status: 'active' | 'inactive';
}

const scales: GradingScale[] = [];
const versions: GradingScaleVersion[] = [];
const policyRules: PolicyRule[] = [];

export const gradingScalesApi = {
  // List grading scales
  list: (tenantId: string, filters?: { type?: string; status?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { type, status, limit = 50, offset = 0 } = filters || {};

    let filtered = scales.filter(s => s.tenantId === tenantId);
    if (type) filtered = filtered.filter(s => s.type === type);
    if (status) filtered = filtered.filter(s => s.status === status);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Get scale by ID
  getById: (tenantId: string, id: string) => {
    const scale = scales.find(s => s.id === id && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');
    return scale;
  },

  // Create grading scale
  create: (tenantId: string, userId: string, payload: Partial<GradingScale>) => {
    if (!tenantId || !userId || !payload.name) {
      throw new Error('Missing required fields');
    }

    // Validate bands
    if (payload.bands && payload.bands.length > 0) {
      validateBands(payload.bands);
    }

    const scale: GradingScale = {
      id: uuidv4(),
      tenantId,
      name: payload.name,
      description: payload.description || '',
      type: payload.type || 'primary',
      bands: payload.bands || [],
      version: 1,
      status: 'draft',
      minimumPassMark: payload.minimumPassMark || 40,
      distinctionThreshold: payload.distinctionThreshold || 80,
      remediationTrigger: payload.remediationTrigger || 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    scales.push(scale);

    // Create initial version
    versions.push({
      id: uuidv4(),
      scaleId: scale.id,
      version: 1,
      bands: scale.bands,
      createdAt: new Date(),
      createdBy: userId,
    });

    return scale;
  },

  // Update scale
  update: (tenantId: string, userId: string, id: string, payload: Partial<GradingScale>) => {
    const scale = scales.find(s => s.id === id && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    if (scale.status === 'archived') {
      throw new Error('Cannot update archived scale');
    }

    if (payload.name) scale.name = payload.name;
    if (payload.description !== undefined) scale.description = payload.description;
    if (payload.minimumPassMark !== undefined) scale.minimumPassMark = payload.minimumPassMark;
    if (payload.distinctionThreshold !== undefined) scale.distinctionThreshold = payload.distinctionThreshold;
    if (payload.remediationTrigger !== undefined) scale.remediationTrigger = payload.remediationTrigger;

    scale.updatedAt = new Date();
    scale.updatedBy = userId;

    return scale;
  },

  // Add/update grade band
  addBand: (tenantId: string, userId: string, scaleId: string, band: GradeBand) => {
    const scale = scales.find(s => s.id === scaleId && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    if (scale.status === 'archived') {
      throw new Error('Cannot modify archived scale');
    }

    // Validate band
    validateBand(band, scale.bands);

    const existingBandIndex = scale.bands.findIndex(b => b.id === band.id);

    if (existingBandIndex >= 0) {
      scale.bands[existingBandIndex] = band;
    } else {
      if (!band.id) band.id = uuidv4();
      scale.bands.push(band);
    }

    // Sort by max score descending
    scale.bands.sort((a, b) => b.maxScore - a.maxScore);

    scale.updatedAt = new Date();
    scale.updatedBy = userId;

    return scale;
  },

  // Remove grade band
  removeBand: (tenantId: string, userId: string, scaleId: string, bandId: string) => {
    const scale = scales.find(s => s.id === scaleId && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    if (scale.status === 'archived') {
      throw new Error('Cannot modify archived scale');
    }

    scale.bands = scale.bands.filter(b => b.id !== bandId);
    scale.updatedAt = new Date();
    scale.updatedBy = userId;

    return scale;
  },

  // Add policy rule
  addPolicyRule: (tenantId: string, userId: string, scaleId: string, rule: Omit<PolicyRule, 'id'>) => {
    const scale = scales.find(s => s.id === scaleId && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    const policyRule: PolicyRule = {
      id: uuidv4(),
      scaleId,
      ...rule,
    };

    policyRules.push(policyRule);

    return policyRule;
  },

  // Get policy rules
  getPolicyRules: (tenantId: string, scaleId: string) => {
    const scale = scales.find(s => s.id === scaleId && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    return policyRules.filter(r => r.scaleId === scaleId);
  },

  // Update policy rule
  updatePolicyRule: (tenantId: string, scaleId: string, ruleId: string, updates: Partial<PolicyRule>) => {
    const scale = scales.find(s => s.id === scaleId && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    const rule = policyRules.find(r => r.id === ruleId && r.scaleId === scaleId);
    if (!rule) throw new Error('Policy rule not found');

    if (updates.label) rule.label = updates.label;
    if (updates.value) rule.value = updates.value;
    if (updates.owner) rule.owner = updates.owner;
    if (updates.status) rule.status = updates.status;

    return rule;
  },

  // Publish scale
  publish: (tenantId: string, userId: string, id: string) => {
    const scale = scales.find(s => s.id === id && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    if (scale.bands.length === 0) {
      throw new Error('Cannot publish scale without grade bands');
    }

    scale.status = 'live';
    scale.publishedAt = new Date();
    scale.publishedBy = userId;
    scale.updatedAt = new Date();
    scale.updatedBy = userId;
    scale.version += 1;

    // Create version
    versions.push({
      id: uuidv4(),
      scaleId: scale.id,
      version: scale.version,
      bands: JSON.parse(JSON.stringify(scale.bands)),
      createdAt: new Date(),
      createdBy: userId,
    });

    return scale;
  },

  // Archive scale
  archive: (tenantId: string, userId: string, id: string) => {
    const scale = scales.find(s => s.id === id && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    scale.status = 'archived';
    scale.updatedAt = new Date();
    scale.updatedBy = userId;

    return scale;
  },

  // Duplicate scale
  duplicate: (tenantId: string, userId: string, id: string, newName: string) => {
    const original = scales.find(s => s.id === id && s.tenantId === tenantId);
    if (!original) throw new Error('Grading scale not found');

    const duplicate: GradingScale = {
      id: uuidv4(),
      tenantId,
      name: newName,
      description: original.description,
      type: original.type,
      bands: JSON.parse(JSON.stringify(original.bands)),
      version: 1,
      status: 'draft',
      minimumPassMark: original.minimumPassMark,
      distinctionThreshold: original.distinctionThreshold,
      remediationTrigger: original.remediationTrigger,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    scales.push(duplicate);

    versions.push({
      id: uuidv4(),
      scaleId: duplicate.id,
      version: 1,
      bands: duplicate.bands,
      createdAt: new Date(),
      createdBy: userId,
    });

    return duplicate;
  },

  // Get scale versions
  getVersions: (tenantId: string, scaleId: string) => {
    const scale = scales.find(s => s.id === scaleId && s.tenantId === tenantId);
    if (!scale) throw new Error('Grading scale not found');

    return versions
      .filter(v => v.scaleId === scaleId)
      .sort((a, b) => b.version - a.version);
  },

  // Delete scale
  delete: (tenantId: string, id: string) => {
    const index = scales.findIndex(s => s.id === id && s.tenantId === tenantId);
    if (index === -1) throw new Error('Grading scale not found');

    scales.splice(index, 1);
    versions.splice(
      0,
      versions.length,
      ...versions.filter(v => v.scaleId !== id)
    );
    policyRules.splice(
      0,
      policyRules.length,
      ...policyRules.filter(r => r.scaleId !== id)
    );

    return { success: true };
  },
};

// Helper functions
function validateBand(band: GradeBand, existingBands: GradeBand[]): void {
  if (band.minScore < 0 || band.maxScore > 100) {
    throw new Error('Score range must be between 0 and 100');
  }
  if (band.minScore > band.maxScore) {
    throw new Error('Minimum score cannot be greater than maximum score');
  }
  if (band.gpaWeight < 0 || band.gpaWeight > 4.0) {
    throw new Error('GPA weight must be between 0 and 4.0');
  }

  // Check for overlaps with other bands
  for (const existing of existingBands) {
    if (existing.id === band.id) continue; // Skip self
    if (
      (band.minScore >= existing.minScore && band.minScore <= existing.maxScore) ||
      (band.maxScore >= existing.minScore && band.maxScore <= existing.maxScore) ||
      (band.minScore <= existing.minScore && band.maxScore >= existing.maxScore)
    ) {
      throw new Error('Grade band overlaps with existing band');
    }
  }
}

function validateBands(bands: GradeBand[]): void {
  for (const band of bands) {
    validateBand(band, bands.filter(b => b.id !== band.id));
  }
}

export default gradingScalesApi;
