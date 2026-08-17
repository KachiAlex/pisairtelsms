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
    await sql`CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      title TEXT NOT NULL DEFAULT '',
      body TEXT,
      audience TEXT DEFAULT 'all',
      category TEXT DEFAULT 'general',
      author TEXT DEFAULT 'Admin',
      sent_by TEXT DEFAULT 'Admin',
      sent_at TIMESTAMP,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW()
    )`.catch((e: any) => console.error('announcements create table failed:', e.message))

    await sql`ALTER TABLE IF EXISTS announcements
      ADD COLUMN IF NOT EXISTS tenant_id TEXT,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS body TEXT,
      ADD COLUMN IF NOT EXISTS audience TEXT,
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS author TEXT,
      ADD COLUMN IF NOT EXISTS sent_by TEXT,
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS status TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`.catch((e: any) => console.error('announcements alter failed:', e.message))

    await sql`CREATE INDEX IF NOT EXISTS idx_announcements_tenant_id ON announcements(tenant_id)`.catch((e: any) => console.error('announcements tenant index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status)`.catch((e: any) => console.error('announcements status index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience)`.catch((e: any) => console.error('announcements audience index failed:', e.message))
  } catch (error) {
    console.error('Error ensuring announcements table:', error)
  }
}

export async function fetchAnnouncements(tenantId: string, audience?: string, status?: string): Promise<Announcement[]> {
  await ensureCommunicationTable()
  try {
    if (audience && status) {
      const result = await sql<AnnouncementRow>`
        SELECT * FROM announcements WHERE tenant_id = ${tenantId} AND audience = ${audience} AND status = ${status} ORDER BY sent_at DESC NULLS LAST, created_at DESC
      `
      return result.rows.map(rowToAnnouncement)
    } else if (audience) {
      const result = await sql<AnnouncementRow>`
        SELECT * FROM announcements WHERE tenant_id = ${tenantId} AND audience = ${audience} ORDER BY sent_at DESC NULLS LAST, created_at DESC
      `
      return result.rows.map(rowToAnnouncement)
    } else if (status) {
      const result = await sql<AnnouncementRow>`
        SELECT * FROM announcements WHERE tenant_id = ${tenantId} AND status = ${status} ORDER BY sent_at DESC NULLS LAST, created_at DESC
      `
      return result.rows.map(rowToAnnouncement)
    } else {
      const result = await sql<AnnouncementRow>`
        SELECT * FROM announcements WHERE tenant_id = ${tenantId} ORDER BY sent_at DESC NULLS LAST, created_at DESC
      `
      return result.rows.map(rowToAnnouncement)
    }
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return []
  }
}

export async function createAnnouncement(tenantId: string, payload: AnnouncementPayload): Promise<Announcement> {
  await ensureCommunicationTable()
  const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const sentAt = payload.status === 'sent' ? new Date().toISOString() : null
  const result = await sql<AnnouncementRow>`
    INSERT INTO announcements (id, tenant_id, title, body, audience, sent_by, sent_at, status)
    VALUES (${id}, ${tenantId}, ${payload.title}, ${payload.body}, ${payload.audience},
            ${payload.sentBy || 'Admin'}, ${sentAt}, ${payload.status})
    RETURNING *
  `
  return rowToAnnouncement(result.rows[0])
}

// ── Read Tracking ───────────────────────────────────────────────────────────

export interface AnnouncementRead {
  id: string
  announcementId: string
  readerId: string
  readerType: 'student' | 'parent' | 'staff'
  readerName: string
  readAt: string
  tenantId: string
}

export async function ensureAnnouncementReadsTable(): Promise<void> {
  try {
    await sql`CREATE TABLE IF NOT EXISTS announcement_reads (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
      announcement_id TEXT NOT NULL,
      reader_id TEXT NOT NULL,
      reader_type TEXT NOT NULL,
      reader_name TEXT,
      read_at TIMESTAMP DEFAULT NOW()
    )`.catch((e: any) => console.error('announcement_reads create table failed:', e.message))

    await sql`ALTER TABLE IF EXISTS announcement_reads
      ADD COLUMN IF NOT EXISTS tenant_id TEXT,
      ADD COLUMN IF NOT EXISTS announcement_id TEXT,
      ADD COLUMN IF NOT EXISTS reader_id TEXT,
      ADD COLUMN IF NOT EXISTS reader_type TEXT,
      ADD COLUMN IF NOT EXISTS reader_name TEXT,
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`.catch((e: any) => console.error('announcement_reads alter failed:', e.message))

    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_reads_unique ON announcement_reads(announcement_id, reader_id, reader_type)`.catch((e: any) => console.error('announcement_reads unique index failed:', e.message))
    await sql`CREATE INDEX IF NOT EXISTS idx_announcement_reads_tenant_id ON announcement_reads(tenant_id)`.catch((e: any) => console.error('announcement_reads tenant index failed:', e.message))
  } catch (error) {
    console.error('Error ensuring announcement_reads table:', error)
  }
}

export async function recordAnnouncementRead(
  announcementId: string,
  readerId: string,
  readerType: 'student' | 'parent' | 'staff',
  readerName: string,
  tenantId: string
): Promise<void> {
  await ensureAnnouncementReadsTable()
  const id = `ar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  try {
    await sql`
      INSERT INTO announcement_reads (id, announcement_id, reader_id, reader_type, reader_name, tenant_id)
      VALUES (${id}, ${announcementId}, ${readerId}, ${readerType}, ${readerName}, ${tenantId})
      ON CONFLICT (announcement_id, reader_id, reader_type) DO UPDATE SET read_at = NOW()
    `
  } catch (error) {
    console.error('Error recording announcement read:', error)
  }
}

export async function getAnnouncementReadCount(tenantId: string, announcementId: string): Promise<number> {
  await ensureAnnouncementReadsTable()
  try {
    const result = await sql<{ count: string }>`
      SELECT COUNT(*) as count FROM announcement_reads WHERE announcement_id = ${announcementId} AND tenant_id = ${tenantId}
    `
    return parseInt(result.rows[0]?.count || '0', 10)
  } catch (error) {
    console.error('Error fetching read count:', error)
    return 0
  }
}

export async function getAnnouncementReaders(tenantId: string, announcementId: string): Promise<AnnouncementRead[]> {
  await ensureAnnouncementReadsTable()
  try {
    const result = await sql<{
      id: string
      announcement_id: string
      reader_id: string
      reader_type: string
      reader_name: string
      read_at: Date
      tenant_id: string
    }>`
      SELECT * FROM announcement_reads
      WHERE announcement_id = ${announcementId} AND tenant_id = ${tenantId}
      ORDER BY read_at DESC
    `
    return result.rows.map(row => ({
      id: row.id,
      announcementId: row.announcement_id,
      readerId: row.reader_id,
      readerType: row.reader_type as AnnouncementRead['readerType'],
      readerName: row.reader_name,
      readAt: row.read_at.toISOString(),
      tenantId: row.tenant_id,
    }))
  } catch (error) {
    console.error('Error fetching announcement readers:', error)
    return []
  }
}
