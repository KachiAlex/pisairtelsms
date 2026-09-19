import { sql } from '../../_lib/sql.js';
import type { TenantSettingsPayload, TenantSettingsResponse } from '../../../src/lib/tenantSettingsClient';

export interface TenantSettingsRow {
  id: number;
  settings: TenantSettingsPayload;
  updated_at: Date;
}

const fallbackSettings: TenantSettingsPayload = {
  schoolName: 'Sample School',
  schoolAddress: '123 School Street, City, State',
  schoolEmail: 'admin@sample.edu',
  schoolPhone: '+1-234-567-8900',
  currentSession: '',
  currentTerm: '',
  enableSMS: false,
  enableEmail: true,
  enableBiometric: false,
  enableOnlinePayment: true,
  autoBackup: true,
  twoFactorAuth: false,
  maintenanceMode: false,
  logoUrl: null,
  admissionNoFormat: '{PREFIX}/{YEAR}/{SEQ}',
  admissionNoDigits: 4,
  schoolLatitude: null,
  schoolLongitude: null,
  geofenceRadius: 200,
  checkInWindowStart: '07:00',
  checkInWindowEnd: '09:00',
  checkOutWindowStart: '14:00',
  checkOutWindowEnd: '18:00',
  enforceGeofence: false,
  enforceTimeWindow: false,
};

export async function ensureTenantSettingsTable(): Promise<void> {
  try {
    // Migrate the legacy single-row (id=1, shared across tenants) layout to
    // per-tenant rows keyed by tenant_id.
    await sql`ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS tenant_id TEXT`;
    await sql`UPDATE tenant_settings SET tenant_id = 'default-tenant' WHERE tenant_id IS NULL`;

    // id has DEFAULT 1 from the legacy schema — give it a sequence so inserts
    // for additional tenants don't collide on the primary key.
    await sql`CREATE SEQUENCE IF NOT EXISTS tenant_settings_id_seq`;
    await sql`ALTER TABLE tenant_settings ALTER COLUMN id SET DEFAULT nextval('tenant_settings_id_seq')`;
    await sql`SELECT setval('tenant_settings_id_seq', COALESCE((SELECT MAX(id) FROM tenant_settings), 1))`;

    // One settings row per tenant.
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS tenant_settings_tenant_id_key ON tenant_settings (tenant_id)`;
  } catch (error) {
    console.error('Error ensuring tenant settings table:', error);
  }
}

export async function fetchTenantSettings(tenantId: string = 'default-tenant'): Promise<TenantSettingsResponse> {
  try {
    await ensureTenantSettingsTable();

    const result = await sql<TenantSettingsRow>`
      SELECT * FROM tenant_settings WHERE tenant_id = ${tenantId} LIMIT 1
    `;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        ...row.settings,
        updatedAt: row.updated_at.toISOString(),
      };
    } else {
      await sql`
        INSERT INTO tenant_settings (tenant_id, settings) VALUES (${tenantId}, ${JSON.stringify(fallbackSettings)})
        ON CONFLICT (tenant_id) DO NOTHING
      `;
      return {
        ...fallbackSettings,
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    // Fallback to in-memory
    return {
      ...fallbackSettings,
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateTenantSettings(tenantId: string, settings: TenantSettingsPayload): Promise<TenantSettingsResponse> {
  try {
    await ensureTenantSettingsTable();

    const result = await sql<TenantSettingsRow>`
      INSERT INTO tenant_settings (tenant_id, settings, updated_at)
      VALUES (${tenantId}, ${JSON.stringify(settings)}, NOW())
      ON CONFLICT (tenant_id) DO UPDATE
        SET settings = EXCLUDED.settings,
            updated_at = NOW()
      RETURNING *
    `;

    const row = result.rows[0];
    return {
      ...row.settings,
      updatedAt: row.updated_at.toISOString(),
    };
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
  }
}
