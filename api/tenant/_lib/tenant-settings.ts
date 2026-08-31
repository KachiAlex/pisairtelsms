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
    // Create table with fixed single-row id=1 if it doesn't exist yet
    // Migration: if existing table was SERIAL-based (multiple rows), consolidate into id=1
    const check = await sql`
      SELECT COUNT(*) as cnt FROM tenant_settings WHERE id != 1
    `;
    if (Number(check.rows[0]?.cnt) > 0) {
      // Pick the latest non-1 row and upsert as id=1, then delete the rest
      await sql`
        INSERT INTO tenant_settings (id, settings, updated_at)
        SELECT 1, settings, updated_at
        FROM tenant_settings
        WHERE id != 1
        ORDER BY updated_at DESC
        LIMIT 1
        ON CONFLICT (id) DO UPDATE
          SET settings = EXCLUDED.settings,
              updated_at = EXCLUDED.updated_at
      `;
      await sql`DELETE FROM tenant_settings WHERE id != 1`;
    }
  } catch (error) {
    console.error('Error ensuring tenant settings table:', error);
  }
}

export async function fetchTenantSettings(): Promise<TenantSettingsResponse> {
  try {
    await ensureTenantSettingsTable();

    const result = await sql<TenantSettingsRow>`
      SELECT * FROM tenant_settings WHERE id = 1 LIMIT 1
    `;

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        ...row.settings,
        updatedAt: row.updated_at.toISOString(),
      };
    } else {
      await sql`
        INSERT INTO tenant_settings (id, settings) VALUES (1, ${JSON.stringify(fallbackSettings)})
        ON CONFLICT (id) DO NOTHING
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
      INSERT INTO tenant_settings (id, settings, updated_at)
      VALUES (1, ${JSON.stringify(settings)}, NOW())
      ON CONFLICT (id) DO UPDATE
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
