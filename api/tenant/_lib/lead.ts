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
    await sql`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(255) PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        parent_name VARCHAR(255),
        contact_phone VARCHAR(255),
        contact_email VARCHAR(255),
        class_interested VARCHAR(255),
        source VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(255) DEFAULT 'new'
      )
    `
  } catch (error) {
    console.error('Error creating leads table:', error)
  }
}

export async function fetchLeads(): Promise<LeadRow[]> {
  try {
    await ensureLeadTable()
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
}) {
  try {
    await ensureLeadTable()
    await sql`
      INSERT INTO leads (id, student_name, parent_name, contact_phone, contact_email, class_interested, source, status)
      VALUES (${lead.id}, ${lead.studentName}, ${lead.parentName}, ${lead.contactPhone}, ${lead.contactEmail}, ${lead.classInterested}, ${lead.source}, ${lead.status})
    `
    return { success: true, id: lead.id }
  } catch (error) {
    console.error('Error creating lead:', error)
    throw error
  }
}
