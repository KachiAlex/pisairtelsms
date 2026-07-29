import { sql } from '@vercel/postgres';

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
  config: CAConfig;
  updated_at: Date;
}

const defaultCAConfig: CAConfig = {
  primary: { tests: 30, assignments: 20, projects: 10, exams: 40 },
  jss: { tests: 25, assignments: 15, projects: 10, exams: 50 },
  sss: { tests: 20, assignments: 15, projects: 15, exams: 50 },
};

export async function ensureCAConfigTable(): Promise<void> {
  try {
    console.log('CA config table ensured.');
  } catch (error) {
    console.error('Error ensuring CA config table:', error);
  }
}

export async function getTenantCAConfig(tenantId: string): Promise<CAConfig> {
  try {
    await ensureCAConfigTable();

    const result = await sql<CAConfigRow>`
      SELECT * FROM ca_config WHERE tenant_id = ${tenantId}
    `;

    if (result.rows.length > 0) {
      return result.rows[0].config;
    } else {
      // Insert default config for new tenant
      await sql`
        INSERT INTO ca_config (tenant_id, config) VALUES (${tenantId}, ${JSON.stringify(defaultCAConfig)})
      `;
      return defaultCAConfig;
    }
  } catch (error) {
    console.error('Error fetching CA config:', error);
    // Fallback to defaults
    return defaultCAConfig;
  }
}

export async function updateTenantCAConfig(tenantId: string, config: CAConfig): Promise<CAConfig> {
  try {
    await ensureCAConfigTable();

    const result = await sql<CAConfigRow>`
      INSERT INTO ca_config (tenant_id, config)
      VALUES (${tenantId}, ${JSON.stringify(config)})
      ON CONFLICT (tenant_id)
      DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
      RETURNING *
    `;

    return result.rows[0].config;
  } catch (error) {
    console.error('Error updating CA config:', error);
    // Fallback to provided config
    return config;
  }
}
