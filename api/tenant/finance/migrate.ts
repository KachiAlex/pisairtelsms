import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '@vercel/postgres'
import { requireRole } from '../../_lib/auth-middleware'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const decoded = requireRole(req, res, ['tenant_admin'])
  if (!decoded) return

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Starting payment tables migration...')

    // Drop existing tables (WARNING: This will delete all data)
    console.log('Dropping existing tables...')
    await sql`DROP TABLE IF EXISTS payment_proofs CASCADE`
    await sql`DROP TABLE IF EXISTS payments CASCADE`
    await sql`DROP TABLE IF EXISTS tenant_payment_settings CASCADE`

    // Recreate payments table with tenant_id
    console.log('Creating payments table...')
    await sql`
      CREATE TABLE payments (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        fee_assignment_id TEXT NOT NULL,
        fee_structure_id TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        payment_method TEXT NOT NULL,
        reference_number TEXT NOT NULL,
        receipt_number TEXT NOT NULL UNIQUE,
        payment_date DATE NOT NULL,
        payment_time TIME NOT NULL,
        recorded_by TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        gateway TEXT,
        gateway_ref TEXT,
        gateway_response TEXT,
        paid_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create indexes for payments
    console.log('Creating payments indexes...')
    await sql`CREATE INDEX idx_payments_tenant_id ON payments(tenant_id)`
    await sql`CREATE INDEX idx_payments_student_id ON payments(student_id)`
    await sql`CREATE INDEX idx_payments_fee_assignment_id ON payments(fee_assignment_id)`
    await sql`CREATE INDEX idx_payments_payment_date ON payments(payment_date)`
    await sql`CREATE INDEX idx_payments_status ON payments(status)`
    await sql`CREATE INDEX idx_payments_gateway_ref ON payments(gateway_ref)`

    // Recreate tenant_payment_settings table with tenant_id
    console.log('Creating tenant_payment_settings table...')
    await sql`
      CREATE TABLE tenant_payment_settings (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        gateway TEXT NOT NULL,
        public_key TEXT NOT NULL,
        secret_key TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT false,
        metadata TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create indexes for tenant_payment_settings
    console.log('Creating tenant_payment_settings indexes...')
    await sql`CREATE INDEX idx_tenant_payment_settings_tenant_id ON tenant_payment_settings(tenant_id)`
    await sql`CREATE UNIQUE INDEX idx_tenant_payment_settings_tenant_gateway ON tenant_payment_settings(tenant_id, gateway)`

    // Recreate payment_proofs table
    console.log('Creating payment_proofs table...')
    await sql`
      CREATE TABLE payment_proofs (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id),
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    console.log('Migration completed successfully')
    return res.status(200).json({ 
      success: true, 
      message: 'Payment tables migrated successfully' 
    })
  } catch (error) {
    console.error('Migration failed:', error)
    return res.status(500).json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : String(error) 
    })
  }
}
