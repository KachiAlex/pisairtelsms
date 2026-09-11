import { sql } from '@vercel/postgres'

interface LeadRow {
  id: string
  student_name: string
  parent_name: string
  contact_phone: string
  contact_email: string
  class_interested: string
  source: string
  created_at: Date
  status: string
}

export async function ensureLeadTable() {
  try {
    } catch (error) {
    console.error('Error creating leads table:', error)
  }
}

export async function fetchLeads(tenantId?: string): Promise<LeadRow[]> {
  try {
    await ensureLeadTable()
    if (tenantId) {
      const result = await sql`SELECT * FROM leads WHERE tenant_id = ${tenantId} ORDER BY created_at DESC`
      return result.rows as LeadRow[]
    }
    const result = await sql`SELECT * FROM leads ORDER BY created_at DESC`
    return result.rows as LeadRow[]
  } catch (error) {
    console.error('Error fetching leads:', error)
    return []
  }
}

export async function createLead(lead: {
  id: string
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classInterested: string
  source: string
  status: string
  tenantId?: string | null
}) {
  try {
    await ensureLeadTable()
    await sql`
      INSERT INTO leads (id, student_name, parent_name, contact_phone, contact_email, class_interested, source, status, tenant_id)
      VALUES (${lead.id}, ${lead.studentName}, ${lead.parentName}, ${lead.contactPhone}, ${lead.contactEmail}, ${lead.classInterested}, ${lead.source}, ${lead.status}, ${lead.tenantId ?? null})
    `
    return { success: true, id: lead.id }
  } catch (error) {
    console.error('Error creating lead:', error)
    throw error
  }
}
