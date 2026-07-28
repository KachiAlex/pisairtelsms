import { v4 as uuidv4 } from 'uuid';

interface BrandingConfig {
  id: string;
  tenantId: string;
  schoolName: string;
  schoolMotto?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  logoFileName?: string;
  faviconUrl?: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

interface BrandingAuditLog {
  id: string;
  brandingId: string;
  tenantId: string;
  action: 'created' | 'updated' | 'logo_uploaded' | 'colors_changed' | 'published';
  changes: Record<string, any>;
  performedBy: string;
  createdAt: Date;
}

const brandingConfigs: BrandingConfig[] = [];
const auditLogs: BrandingAuditLog[] = [];

export const brandingApi = {
  // Get branding config for tenant
  get: (tenantId: string) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const config = brandingConfigs.find(b => b.tenantId === tenantId && b.isActive);
    if (!config) {
      // Return default branding
      return {
        id: uuidv4(),
        tenantId,
        schoolName: 'Your School',
        schoolMotto: '',
        primaryColor: '#1E3A8A',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B',
        logoUrl: null,
        faviconUrl: null,
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system',
      };
    }
    return config;
  },

  // Create or update branding config
  upsert: (tenantId: string, userId: string, payload: Partial<BrandingConfig>) => {
    if (!tenantId || !userId) throw new Error('Missing tenant or user ID');

    const { schoolName, schoolMotto, primaryColor, secondaryColor, accentColor } = payload;

    // Validate colors
    if (primaryColor && !isValidHexColor(primaryColor)) {
      throw new Error('Invalid primary color format');
    }
    if (secondaryColor && !isValidHexColor(secondaryColor)) {
      throw new Error('Invalid secondary color format');
    }
    if (accentColor && !isValidHexColor(accentColor)) {
      throw new Error('Invalid accent color format');
    }

    let config = brandingConfigs.find(b => b.tenantId === tenantId && b.isActive);

    if (!config) {
      config = {
        id: uuidv4(),
        tenantId,
        schoolName: schoolName || 'Your School',
        schoolMotto: schoolMotto || '',
        primaryColor: primaryColor || '#1E3A8A',
        secondaryColor: secondaryColor || '#10B981',
        accentColor: accentColor || '#F59E0B',
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };
      brandingConfigs.push(config);

      auditLogs.push({
        id: uuidv4(),
        brandingId: config.id,
        tenantId,
        action: 'created',
        changes: payload,
        performedBy: userId,
        createdAt: new Date(),
      });
    } else {
      const changes: Record<string, any> = {};

      if (schoolName && schoolName !== config.schoolName) {
        changes.schoolName = { old: config.schoolName, new: schoolName };
        config.schoolName = schoolName;
      }
      if (schoolMotto !== undefined && schoolMotto !== config.schoolMotto) {
        changes.schoolMotto = { old: config.schoolMotto, new: schoolMotto };
        config.schoolMotto = schoolMotto;
      }
      if (primaryColor && primaryColor !== config.primaryColor) {
        changes.primaryColor = { old: config.primaryColor, new: primaryColor };
        config.primaryColor = primaryColor;
      }
      if (secondaryColor && secondaryColor !== config.secondaryColor) {
        changes.secondaryColor = { old: config.secondaryColor, new: secondaryColor };
        config.secondaryColor = secondaryColor;
      }
      if (accentColor && accentColor !== config.accentColor) {
        changes.accentColor = { old: config.accentColor, new: accentColor };
        config.accentColor = accentColor;
      }

      if (Object.keys(changes).length > 0) {
        config.updatedAt = new Date();
        config.updatedBy = userId;
        config.version += 1;

        auditLogs.push({
          id: uuidv4(),
          brandingId: config.id,
          tenantId,
          action: 'updated',
          changes,
          performedBy: userId,
          createdAt: new Date(),
        });
      }
    }

    return config;
  },

  // Upload logo
  uploadLogo: (tenantId: string, userId: string, logoUrl: string, fileName: string) => {
    if (!tenantId || !userId || !logoUrl) throw new Error('Missing required fields');

    let config = brandingConfigs.find(b => b.tenantId === tenantId && b.isActive);

    if (!config) {
      config = {
        id: uuidv4(),
        tenantId,
        schoolName: 'Your School',
        schoolMotto: '',
        primaryColor: '#1E3A8A',
        secondaryColor: '#10B981',
        accentColor: '#F59E0B',
        logoUrl,
        logoFileName: fileName,
        version: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      };
      brandingConfigs.push(config);
    } else {
      const oldLogoUrl = config.logoUrl;
      config.logoUrl = logoUrl;
      config.logoFileName = fileName;
      config.updatedAt = new Date();
      config.updatedBy = userId;
      config.version += 1;

      auditLogs.push({
        id: uuidv4(),
        brandingId: config.id,
        tenantId,
        action: 'logo_uploaded',
        changes: { logoUrl: { old: oldLogoUrl, new: logoUrl }, fileName },
        performedBy: userId,
        createdAt: new Date(),
      });
    }

    return config;
  },

  // Get audit logs
  getAuditLogs: (tenantId: string, limit: number = 50, offset: number = 0) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    const logs = auditLogs
      .filter(log => log.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    const total = auditLogs.filter(log => log.tenantId === tenantId).length;

    return { data: logs, total };
  },

  // Get branding history
  getHistory: (tenantId: string, limit: number = 10) => {
    if (!tenantId) throw new Error('Missing tenant ID');

    return brandingConfigs
      .filter(b => b.tenantId === tenantId)
      .sort((a, b) => b.version - a.version)
      .slice(0, limit);
  },

  // Publish branding (create new version)
  publish: (tenantId: string, userId: string) => {
    if (!tenantId || !userId) throw new Error('Missing tenant or user ID');

    const currentConfig = brandingConfigs.find(b => b.tenantId === tenantId && b.isActive);
    if (!currentConfig) throw new Error('No branding config found');

    // Deactivate current version
    currentConfig.isActive = false;

    // Create new version
    const newConfig: BrandingConfig = {
      ...currentConfig,
      id: uuidv4(),
      version: currentConfig.version + 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
    };

    brandingConfigs.push(newConfig);

    auditLogs.push({
      id: uuidv4(),
      brandingId: newConfig.id,
      tenantId,
      action: 'published',
      changes: { version: newConfig.version },
      performedBy: userId,
      createdAt: new Date(),
    });

    return newConfig;
  },
};

// Helper function to validate hex color
function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

export default brandingApi;
