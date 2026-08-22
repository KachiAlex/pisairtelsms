import { poolQuery } from '../../_lib/pg-pool.js'

export interface CAConfig {
  primary: {
    tests: number;
    assignments: number;
    projects: number;
    exams: number;
  };
  jss: {
    tests: number;
    assignments: number;
    projects: number;
    exams: number;
  };
  sss: {
    tests: number;
    assignments: number;
    projects: number;
    exams: number;
  };
}

export interface CAConfigRow {
  id: number;
  tenant_id: string;
  published_config: CAConfig;
  draft_config: CAConfig | null;
  status: 'published' | 'has_draft';
  updated_at: string;
  published_at: string | null;
}

export interface CAAuditEntry {
  id: number;
  tenant_id: string;
  action: 'save' | 'publish' | 'override';
  config: CAConfig | null;
  actor_id: string;
  actor_name: string;
  summary: string;
  created_at: string;
}

export interface CAOverride {
  id: number;
  tenant_id: string;
  class_name: string;
  subject_name: string | null;
  config: CAConfig;
  created_at: string;
  updated_at: string;
}

const defaultCAConfig: CAConfig = {
  primary: { tests: 30, assignments: 20, projects: 10, exams: 40 },
  jss: { tests: 25, assignments: 15, projects: 10, exams: 50 },
  sss: { tests: 20, assignments: 15, projects: 15, exams: 50 },
};

const defaultConfigJson = JSON.stringify(defaultCAConfig)

export async function ensureCAConfigTable(): Promise<void> {
  try {
    await poolQuery(
      `CREATE TABLE IF NOT EXISTS ca_config (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT UNIQUE NOT NULL,
        published_config JSONB NOT NULL DEFAULT '${defaultConfigJson.replace(/'/g, "''")}'::jsonb,
        draft_config JSONB,
        status TEXT NOT NULL DEFAULT 'published',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        published_at TIMESTAMPTZ
      )`,
      []
    )
    // Add columns if table already existed with old schema
    await poolQuery(`ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS published_config JSONB`, [])
    await poolQuery(`ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS draft_config JSONB`, [])
    await poolQuery(`ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'`, [])
    await poolQuery(`ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`, [])
    await poolQuery(`ALTER TABLE ca_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, [])
    await poolQuery(
      `CREATE TABLE IF NOT EXISTS ca_config_audit (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        action TEXT NOT NULL,
        config JSONB,
        actor_id TEXT,
        actor_name TEXT,
        summary TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      []
    )
    await poolQuery(
      `CREATE TABLE IF NOT EXISTS ca_config_overrides (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        class_name TEXT NOT NULL,
        subject_name TEXT,
        config JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(tenant_id, class_name, subject_name)
      )`,
      []
    )
  } catch (error) {
    console.error('Error ensuring CA config tables:', error);
  }
}

export async function getTenantCAConfig(tenantId: string): Promise<{
  published: CAConfig;
  draft: CAConfig | null;
  status: 'published' | 'has_draft';
  updated_at: string;
  published_at: string | null;
}> {
  try {
    await ensureCAConfigTable();

    const result = await poolQuery(
      `SELECT published_config, draft_config, status, updated_at, published_at
       FROM ca_config WHERE tenant_id = $1`,
      [tenantId]
    )

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        published: row.published_config as CAConfig,
        draft: row.draft_config as CAConfig | null,
        status: row.status as 'published' | 'has_draft',
        updated_at: row.updated_at as string,
        published_at: row.published_at as string | null,
      };
    } else {
      await poolQuery(
        `INSERT INTO ca_config (tenant_id, published_config, status, published_at)
         VALUES ($1, $2, 'published', NOW())`,
        [tenantId, defaultConfigJson]
      );
      return {
        published: defaultCAConfig,
        draft: null,
        status: 'published',
        updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('Error fetching CA config:', error);
    return {
      published: defaultCAConfig,
      draft: null,
      status: 'published',
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    };
  }
}

export async function saveDraftCAConfig(
  tenantId: string,
  config: CAConfig,
  actorId: string,
  actorName: string
): Promise<CAConfig> {
  try {
    await ensureCAConfigTable();

    const configJson = JSON.stringify(config)
    await poolQuery(
      `INSERT INTO ca_config (tenant_id, published_config, draft_config, status, updated_at)
       VALUES ($1, $2, $3, 'has_draft', NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET draft_config = EXCLUDED.draft_config, status = 'has_draft', updated_at = NOW()`,
      [tenantId, configJson, configJson]
    )

    await poolQuery(
      `INSERT INTO ca_config_audit (tenant_id, action, config, actor_id, actor_name, summary)
       VALUES ($1, 'save', $2, $3, $4, 'Draft saved')`,
      [tenantId, configJson, actorId, actorName]
    )

    return config;
  } catch (error) {
    console.error('Error saving draft CA config:', error);
    return config;
  }
}

export async function publishCAConfig(
  tenantId: string,
  actorId: string,
  actorName: string
): Promise<CAConfig> {
  try {
    await ensureCAConfigTable();

    const result = await poolQuery(
      `UPDATE ca_config
       SET published_config = COALESCE(draft_config, published_config),
           draft_config = NULL,
           status = 'published',
           updated_at = NOW(),
           published_at = NOW()
       WHERE tenant_id = $1
       RETURNING published_config`,
      [tenantId]
    )

    const publishedConfig = (result.rows[0]?.published_config as CAConfig) || defaultCAConfig;

    await poolQuery(
      `INSERT INTO ca_config_audit (tenant_id, action, config, actor_id, actor_name, summary)
       VALUES ($1, 'publish', $2, $3, $4, 'Configuration published to all classes')`,
      [tenantId, JSON.stringify(publishedConfig), actorId, actorName]
    )

    return publishedConfig;
  } catch (error) {
    console.error('Error publishing CA config:', error);
    return defaultCAConfig;
  }
}

export async function getCAConfigAuditLog(tenantId: string, limit: number = 20): Promise<CAAuditEntry[]> {
  try {
    await ensureCAConfigTable();

    const result = await poolQuery(
      `SELECT id, tenant_id, action, config, actor_id, actor_name, summary, created_at
       FROM ca_config_audit
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    )

    return result.rows as CAAuditEntry[];
  } catch (error) {
    console.error('Error fetching CA config audit log:', error);
    return [];
  }
}

export async function getCAConfigOverrides(tenantId: string): Promise<CAOverride[]> {
  try {
    await ensureCAConfigTable();

    const result = await poolQuery(
      `SELECT id, tenant_id, class_name, subject_name, config, created_at, updated_at
       FROM ca_config_overrides
       WHERE tenant_id = $1
       ORDER BY updated_at DESC`,
      [tenantId]
    )

    return result.rows as CAOverride[];
  } catch (error) {
    console.error('Error fetching CA config overrides:', error);
    return [];
  }
}

export async function saveCAConfigOverride(
  tenantId: string,
  className: string,
  subjectName: string | null,
  config: CAConfig,
  actorId: string,
  actorName: string
): Promise<CAOverride> {
  try {
    await ensureCAConfigTable();

    const configJson = JSON.stringify(config)
    const result = await poolQuery(
      `INSERT INTO ca_config_overrides (tenant_id, class_name, subject_name, config, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant_id, class_name, subject_name)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
       RETURNING *`,
      [tenantId, className, subjectName, configJson]
    )

    await poolQuery(
      `INSERT INTO ca_config_audit (tenant_id, action, config, actor_id, actor_name, summary)
       VALUES ($1, 'override', $2, $3, $4, $5)`,
      [tenantId, configJson, actorId, actorName, 'Override saved for ' + className + (subjectName ? ' / ' + subjectName : '')]
    )

    return result.rows[0] as CAOverride;
  } catch (error) {
    console.error('Error saving CA config override:', error);
    throw error;
  }
}

export async function deleteCAConfigOverride(
  tenantId: string,
  overrideId: number
): Promise<void> {
  try {
    await ensureCAConfigTable();

    await poolQuery(
      `DELETE FROM ca_config_overrides
       WHERE id = $1 AND tenant_id = $2`,
      [overrideId, tenantId]
    )
  } catch (error) {
    console.error('Error deleting CA config override:', error);
    throw error;
  }
}
