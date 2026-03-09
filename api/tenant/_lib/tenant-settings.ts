import { sql } from '@vercel/postgres';
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
  currentSession: '2024/2025',
  currentTerm: 'First Term',
  enableSMS: false,
  enableEmail: true,
  enableBiometric: false,
  enableOnlinePayment: true,
  autoBackup: true,
  twoFactorAuth: false,
  maintenanceMode: false,
  logoUrl: null,
};

export async function ensureTenantSettingsTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id SERIAL PRIMARY KEY,
        settings JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('Tenant settings table ensured.');
  } catch (error) {
    console.error('Error ensuring tenant settings table:', error);
  }
}

export async function fetchTenantSettings(): Promise<TenantSettingsResponse> {
  try {
    await ensureTenantSettingsTable();

    const result = await sql<TenantSettingsRow>`
      SELECT * FROM tenant_settings ORDER BY updated_at DESC LIMIT 1
    `;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        ...row.settings,
        updatedAt: row.updated_at.toISOString(),
      };
    } else {
      // Insert fallback and return it
      await sql`
        INSERT INTO tenant_settings (settings) VALUES (${JSON.stringify(fallbackSettings)})
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

export async function updateTenantSettings(settings: TenantSettingsPayload): Promise<TenantSettingsResponse> {
  try {
    await ensureTenantSettingsTable();

    const result = await sql<TenantSettingsRow>`
      INSERT INTO tenant_settings (settings)
      VALUES (${JSON.stringify(settings)})
      RETURNING *
    `;

    const row = result.rows[0];
    return {
      ...row.settings,
      updatedAt: row.updated_at.toISOString(),
    };
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    // Fallback to in-memory
    return {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
  }
}
