import { v4 as uuidv4 } from 'uuid';

interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'table' | 'image' | 'signature';
  required: boolean;
  order: number;
  config?: Record<string, any>;
}

interface ReportTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  audience: 'parents' | 'universities' | 'internal' | 'other';
  format: string; // 'PDF', 'PDF + Portal', 'Portal', etc.
  fields: TemplateField[];
  version: number;
  status: 'draft' | 'live' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  publishedAt?: Date;
  publishedBy?: string;
}

interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  fields: TemplateField[];
  createdAt: Date;
  createdBy: string;
}

const templates: ReportTemplate[] = [];
const versions: TemplateVersion[] = [];

export const reportTemplatesApi = {
  // List templates
  list: (tenantId: string, filters?: { status?: string; audience?: string; limit?: number; offset?: number }) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const { status, audience, limit = 50, offset = 0 } = filters || {};

    let filtered = templates.filter(t => t.tenantId === tenantId);
    if (status) filtered = filtered.filter(t => t.status === status);
    if (audience) filtered = filtered.filter(t => t.audience === audience);

    const data = filtered
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);

    return { data, total: filtered.length };
  },

  // Get template by ID
  getById: (tenantId: string, id: string) => {
    const template = templates.find(t => t.id === id && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');
    return template;
  },

  // Create template
  create: (tenantId: string, userId: string, payload: Partial<ReportTemplate>) => {
    if (!tenantId || !userId || !payload.name) {
      throw new Error('Missing required fields');
    }

    const template: ReportTemplate = {
      id: uuidv4(),
      tenantId,
      name: payload.name,
      description: payload.description || '',
      audience: payload.audience || 'internal',
      format: payload.format || 'PDF',
      fields: payload.fields || [],
      version: 1,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    templates.push(template);

    // Create initial version
    versions.push({
      id: uuidv4(),
      templateId: template.id,
      version: 1,
      fields: template.fields,
      createdAt: new Date(),
      createdBy: userId,
    });

    return template;
  },

  // Update template
  update: (tenantId: string, userId: string, id: string, payload: Partial<ReportTemplate>) => {
    const template = templates.find(t => t.id === id && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');

    if (template.status === 'archived') {
      throw new Error('Cannot update archived template');
    }

    if (payload.name) template.name = payload.name;
    if (payload.description !== undefined) template.description = payload.description;
    if (payload.audience) template.audience = payload.audience;
    if (payload.format) template.format = payload.format;
    if (payload.fields) {
      template.fields = payload.fields;
    }

    template.updatedAt = new Date();
    template.updatedBy = userId;

    return template;
  },

  // Add/update field
  addField: (tenantId: string, userId: string, templateId: string, field: TemplateField) => {
    const template = templates.find(t => t.id === templateId && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');

    if (template.status === 'archived') {
      throw new Error('Cannot modify archived template');
    }

    const existingFieldIndex = template.fields.findIndex(f => f.id === field.id);

    if (existingFieldIndex >= 0) {
      template.fields[existingFieldIndex] = field;
    } else {
      template.fields.push(field);
    }

    // Sort by order
    template.fields.sort((a, b) => a.order - b.order);

    template.updatedAt = new Date();
    template.updatedBy = userId;

    return template;
  },

  // Remove field
  removeField: (tenantId: string, userId: string, templateId: string, fieldId: string) => {
    const template = templates.find(t => t.id === templateId && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');

    if (template.status === 'archived') {
      throw new Error('Cannot modify archived template');
    }

    template.fields = template.fields.filter(f => f.id !== fieldId);
    template.updatedAt = new Date();
    template.updatedBy = userId;

    return template;
  },

  // Reorder fields
  reorderFields: (tenantId: string, userId: string, templateId: string, fieldIds: string[]) => {
    const template = templates.find(t => t.id === templateId && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');

    if (template.status === 'archived') {
      throw new Error('Cannot modify archived template');
    }

    const reorderedFields: TemplateField[] = [];
    fieldIds.forEach((id, index) => {
      const field = template.fields.find(f => f.id === id);
      if (field) {
        field.order = index;
        reorderedFields.push(field);
      }
    });

    template.fields = reorderedFields;
    template.updatedAt = new Date();
    template.updatedBy = userId;

    return template;
  },

  // Publish template
  publish: (tenantId: string, userId: string, id: string) => {
    const template = templates.find(t => t.id === id && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');

    if (template.fields.length === 0) {
      throw new Error('Cannot publish template without fields');
    }

    template.status = 'live';
    template.publishedAt = new Date();
    template.publishedBy = userId;
    template.updatedAt = new Date();
    template.updatedBy = userId;

    // Create version
    versions.push({
      id: uuidv4(),
      templateId: template.id,
      version: template.version,
      fields: JSON.parse(JSON.stringify(template.fields)),
      createdAt: new Date(),
      createdBy: userId,
    });

    return template;
  },

  // Archive template
  archive: (tenantId: string, userId: string, id: string) => {
    const template = templates.find(t => t.id === id && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');

    template.status = 'archived';
    template.updatedAt = new Date();
    template.updatedBy = userId;

    return template;
  },

  // Duplicate template
  duplicate: (tenantId: string, userId: string, id: string, newName: string) => {
    const original = templates.find(t => t.id === id && t.tenantId === tenantId);
    if (!original) throw new Error('Template not found');

    const duplicate: ReportTemplate = {
      id: uuidv4(),
      tenantId,
      name: newName,
      description: original.description,
      audience: original.audience,
      format: original.format,
      fields: JSON.parse(JSON.stringify(original.fields)),
      version: 1,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    templates.push(duplicate);

    versions.push({
      id: uuidv4(),
      templateId: duplicate.id,
      version: 1,
      fields: duplicate.fields,
      createdAt: new Date(),
      createdBy: userId,
    });

    return duplicate;
  },

  // Get template versions
  getVersions: (tenantId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');

    return versions
      .filter(v => v.templateId === templateId)
      .sort((a, b) => b.version - a.version);
  },

  // Get version by number
  getVersion: (tenantId: string, templateId: string, versionNumber: number) => {
    const template = templates.find(t => t.id === templateId && t.tenantId === tenantId);
    if (!template) throw new Error('Template not found');

    return versions.find(v => v.templateId === templateId && v.version === versionNumber);
  },

  // Delete template
  delete: (tenantId: string, id: string) => {
    const index = templates.findIndex(t => t.id === id && t.tenantId === tenantId);
    if (index === -1) throw new Error('Template not found');

    templates.splice(index, 1);
    versions.splice(
      0,
      versions.length,
      ...versions.filter(v => v.templateId !== id)
    );

    return { success: true };
  },
};

export default reportTemplatesApi;
