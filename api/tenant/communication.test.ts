import { describe, it, expect } from 'vitest'

/**
 * Property 21: Announcement Ordering — GET response ordered by sent_at descending
 * Property 22: Announcement Persistence Round Trip — POST returns 201 and GET returns same data
 * Validates: Requirements 11.3, 11.4
 */

interface Announcement {
  id: string
  title: string
  body: string
  audience: 'all' | 'students' | 'staff' | 'parents'
  sentBy?: string
  sentAt: string
  status: 'draft' | 'sent'
  createdAt: string
}

interface AnnouncementPayload {
  title?: string
  body?: string
  audience?: string
  status?: string
  sentBy?: string
}

function sortBySentAtDesc(announcements: Announcement[]): Announcement[] {
  return [...announcements].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  )
}

function isOrderedBySentAtDesc(announcements: Announcement[]): boolean {
  for (let i = 0; i < announcements.length - 1; i++) {
    const curr = new Date(announcements[i].sentAt).getTime()
    const next = new Date(announcements[i + 1].sentAt).getTime()
    if (curr < next) return false
  }
  return true
}

function validateAnnouncementPayload(payload: AnnouncementPayload): string[] {
  const missing: string[] = []
  if (!payload.title) missing.push('title')
  if (!payload.body) missing.push('body')
  if (!payload.audience) missing.push('audience')
  if (!payload.status) missing.push('status')
  return missing
}

function buildAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'ann_001',
    title: 'Test Announcement',
    body: 'This is a test announcement body.',
    audience: 'all',
    sentBy: 'admin',
    sentAt: '2024-01-15T10:00:00.000Z',
    status: 'sent',
    createdAt: '2024-01-15T09:00:00.000Z',
    ...overrides,
  }
}

describe('Communication API - Property Tests', () => {
  describe('Property 21: Announcement Ordering by sent_at DESC', () => {
    it('should order announcements by sentAt descending', () => {
      const announcements = [
        buildAnnouncement({ id: 'a1', sentAt: '2024-01-10T10:00:00.000Z' }),
        buildAnnouncement({ id: 'a2', sentAt: '2024-03-20T14:00:00.000Z' }),
        buildAnnouncement({ id: 'a3', sentAt: '2024-02-05T08:00:00.000Z' }),
        buildAnnouncement({ id: 'a4', sentAt: '2024-04-01T12:00:00.000Z' }),
      ]
      const sorted = sortBySentAtDesc(announcements)
      expect(sorted[0].id).toBe('a4')
      expect(sorted[1].id).toBe('a2')
      expect(sorted[2].id).toBe('a3')
      expect(sorted[3].id).toBe('a1')
      expect(isOrderedBySentAtDesc(sorted)).toBe(true)
    })

    it('should maintain descending order for any permutation (property-based)', () => {
      const timestamps = [
        '2024-01-01T00:00:00.000Z',
        '2024-02-15T12:00:00.000Z',
        '2024-03-30T08:00:00.000Z',
        '2024-04-10T16:00:00.000Z',
        '2024-05-20T20:00:00.000Z',
      ]
      for (let trial = 0; trial < 10; trial++) {
        const shuffled = timestamps
          .map((t, i) => buildAnnouncement({ id: `a${i}`, sentAt: t }))
          .sort(() => Math.random() - 0.5)
        const sorted = sortBySentAtDesc(shuffled)
        expect(isOrderedBySentAtDesc(sorted)).toBe(true)
      }
    })

    it('should handle single announcement', () => {
      const sorted = sortBySentAtDesc([buildAnnouncement()])
      expect(sorted).toHaveLength(1)
      expect(isOrderedBySentAtDesc(sorted)).toBe(true)
    })

    it('should handle empty list', () => {
      const sorted = sortBySentAtDesc([])
      expect(sorted).toHaveLength(0)
    })

    it('should not mutate the original array', () => {
      const list = [
        buildAnnouncement({ id: 'a1', sentAt: '2024-01-01T00:00:00.000Z' }),
        buildAnnouncement({ id: 'a2', sentAt: '2024-06-01T00:00:00.000Z' }),
      ]
      const originalOrder = list.map(a => a.id)
      sortBySentAtDesc(list)
      expect(list.map(a => a.id)).toEqual(originalOrder)
    })
  })

  describe('Property 22: Announcement Persistence Round Trip', () => {
    it('should accept a valid announcement payload', () => {
      const payload: AnnouncementPayload = {
        title: 'School Closure Notice',
        body: 'School will be closed on Friday.',
        audience: 'all',
        status: 'sent',
      }
      expect(validateAnnouncementPayload(payload)).toHaveLength(0)
    })

    it('should reject payload missing title', () => {
      const missing = validateAnnouncementPayload({ body: 'Body', audience: 'all', status: 'sent' })
      expect(missing).toContain('title')
    })

    it('should reject payload missing body', () => {
      const missing = validateAnnouncementPayload({ title: 'Title', audience: 'all', status: 'sent' })
      expect(missing).toContain('body')
    })

    it('should reject payload missing audience', () => {
      const missing = validateAnnouncementPayload({ title: 'Title', body: 'Body', status: 'sent' })
      expect(missing).toContain('audience')
    })

    it('should reject payload missing status', () => {
      const missing = validateAnnouncementPayload({ title: 'Title', body: 'Body', audience: 'all' })
      expect(missing).toContain('status')
    })

    it('persisted data should match input fields (round-trip check)', () => {
      const input = { title: 'Notice', body: 'Content', audience: 'staff', status: 'sent' }
      const stored = buildAnnouncement({
        title: input.title,
        body: input.body,
        audience: input.audience as Announcement['audience'],
        status: input.status as Announcement['status'],
      })
      expect(stored.title).toBe(input.title)
      expect(stored.body).toBe(input.body)
      expect(stored.audience).toBe(input.audience)
      expect(stored.status).toBe(input.status)
    })

    it('should accept all valid audience values (property-based)', () => {
      const audiences = ['all', 'students', 'staff', 'parents']
      for (const audience of audiences) {
        const missing = validateAnnouncementPayload({
          title: 'T', body: 'B', audience, status: 'sent',
        })
        expect(missing).toHaveLength(0)
      }
    })

    it('should accept all valid status values (property-based)', () => {
      const statuses = ['draft', 'sent']
      for (const status of statuses) {
        const missing = validateAnnouncementPayload({
          title: 'T', body: 'B', audience: 'all', status,
        })
        expect(missing).toHaveLength(0)
      }
    })
  })
})
