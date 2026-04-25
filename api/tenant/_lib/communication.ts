import { sql } from '@vercel/postgres'

export interface Announcement {
  id: string
  title: string
  body: string
  audience: 'all' | 'students' | 'staff' | 'parents'
  sentBy: string
  sentAt: string | null
  status: 'draft' | 'sent'
  createdAt: string
}

export interface AnnouncementPayload {
  title: string
  body: string
  audience: 'all' | 'students' | 'staff' | 'parents'
  status: 'draft' | 'sent'
  sentBy?: string
}

interface AnnouncementRow {
  id: string
  title: string
  body: string
  audience: string
  sent_by: string
  sent_at: Date | null
  status: string
  created_at: Date
}

function rowToAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience as Announcement['audience'],
    sentBy: row.sent_by,
    sentAt: row.sent_at ? row.sent_at.toISOString() : null,
    status: row.status as Announcement['status'],
    createdAt: row.created_at.toISOString(),
  }
}

export async function ensureCommunicationTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        audience TEXT NOT NULL CHECK (audience IN ('all', 'students', 'staff', 'parents')),
        sent_by TEXT NOT NULL DEFAULT 'Admin',
        sent_at TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_announcements_sent_at ON announcements(sent_at)`
  } catch (error) {
    console.error('Error ensuring announcements table:', error)
  }
}

export async function fetchAnnouncements(audience?: string, status?: string): Promise<Announcement[]> {
  await ensureCommunicationTable()
  try {
    if (audience && status) {
      const result = await sql<AnnouncementRow>`
        SELECT * FROM announcements WHERE audience = ${audience} AND status = ${status} ORDER BY sent_at DESC NULLS LAST, created_at DESC
      `
      return result.rows.map(rowToAnnouncement)
    } else if (audience) {
      const result = await sql<AnnouncementRow>`
        SELECT * FROM announcements WHERE audience = ${audience} ORDER BY sent_at DESC NULLS LAST, created_at DESC
      `
      return result.rows.map(rowToAnnouncement)
    } else if (status) {
      const result = await sql<AnnouncementRow>`
        SELECT * FROM announcements WHERE status = ${status} ORDER BY sent_at DESC NULLS LAST, created_at DESC
      `
      return result.rows.map(rowToAnnouncement)
    } else {
      const result = await sql<AnnouncementRow>`
        SELECT * FROM announcements ORDER BY sent_at DESC NULLS LAST, created_at DESC
      `
      return result.rows.map(rowToAnnouncement)
    }
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return []
  }
}

export async function createAnnouncement(payload: AnnouncementPayload): Promise<Announcement> {
  await ensureCommunicationTable()
  const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const sentAt = payload.status === 'sent' ? new Date().toISOString() : null
  const result = await sql<AnnouncementRow>`
    INSERT INTO announcements (id, title, body, audience, sent_by, sent_at, status)
    VALUES (${id}, ${payload.title}, ${payload.body}, ${payload.audience},
            ${payload.sentBy || 'Admin'}, ${sentAt}, ${payload.status})
    RETURNING *
  `
  return rowToAnnouncement(result.rows[0])
}
