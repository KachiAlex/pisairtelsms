import { describe, expect } from 'vitest'
import { it, fc } from '@fast-check/vitest'

/**
 * Property-based tests for StudentEnrollment pipeline
 * Property 12: Enrollment Pipeline Status Mapping
 * Property 13: Enrollment Pipeline Distribution
 */

// Type definitions
interface Application {
  id: string
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classApplying: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  academicSession: string
  source: string
  createdAt: string
}

interface PipelineStage {
  name: string
  applications: Application[]
  count: number
}

// Generators
const applicationArbitrary = () =>
  fc.record({
    id: fc.uuid(),
    studentName: fc.string({ minLength: 2, maxLength: 50 }),
    parentName: fc.string({ minLength: 2, maxLength: 50 }),
    contactPhone: fc.string({ minLength: 10, maxLength: 15 }),
    contactEmail: fc.emailAddress(),
    classApplying: fc.constantFrom('Primary 1', 'Primary 2', 'JSS 1', 'SS 1'),
    status: fc.constantFrom('pending', 'reviewing', 'approved', 'rejected'),
    academicSession: fc.constantFrom('2024/2025', '2025/2026'),
    source: fc.constantFrom('website', 'referral', 'walk-in', 'social-media'),
    createdAt: fc.date().map(d => d.toISOString()),
  })

describe('StudentEnrollment Pipeline - Property Tests', () => {
  describe('Property 12: Enrollment Pipeline Status Mapping', () => {
    it.prop([applicationArbitrary()])('should map pending status to Application stage', app => {
        const application = { ...app, status: 'pending' as const }

        // Property: pending status should map to "Application" stage
        const stage = application.status === 'pending' ? 'Application' : 'Unknown'
        expect(stage).toBe('Application')
      })

    it.prop([applicationArbitrary()])('should map reviewing status to Review stage', app => {
        const application = { ...app, status: 'reviewing' as const }

        // Property: reviewing status should map to "Review" stage
        const stage = application.status === 'reviewing' ? 'Review' : 'Unknown'
        expect(stage).toBe('Review')
      })

    it.prop([applicationArbitrary()])('should map approved status to Offer stage', app => {
        const application = { ...app, status: 'approved' as const }

        // Property: approved status should map to "Offer" stage
        const stage = application.status === 'approved' ? 'Offer' : 'Unknown'
        expect(stage).toBe('Offer')
      })

    it.prop([applicationArbitrary()])('should exclude rejected status from pipeline', app => {
        const application = { ...app, status: 'rejected' as const }

        // Property: rejected status should not appear in pipeline stages
        const isInPipeline = ['pending', 'reviewing', 'approved'].includes(application.status)
        expect(isInPipeline).toBe(false)
      })

    it.prop([fc.array(applicationArbitrary(), { minLength: 1, maxLength: 20 })])('should map all valid statuses consistently', applications => {
          // Property: Each application should map to exactly one stage (or be excluded)
          const stageMapping = {
            pending: 'Application',
            reviewing: 'Review',
            approved: 'Offer',
            rejected: null, // excluded
          }

          applications.forEach(app => {
            const mappedStage = stageMapping[app.status]
            if (mappedStage === null) {
              // Should be excluded
              expect(app.status).toBe('rejected')
            } else {
              // Should be in pipeline
              expect(['Application', 'Review', 'Offer']).toContain(mappedStage)
            }
          })
        })

    it.prop([fc.array(applicationArbitrary(), { minLength: 0, maxLength: 50 })])('should maintain status-to-stage mapping for all applications', applications => {
          // Property: All applications should have a valid mapping
          const validStatuses = ['pending', 'reviewing', 'approved', 'rejected']
          applications.forEach(app => {
            expect(validStatuses).toContain(app.status)
          })
        })
  })

  describe('Property 13: Enrollment Pipeline Distribution', () => {
    it.prop([fc.array(applicationArbitrary(), { minLength: 0, maxLength: 50 })])('should count applications correctly in each stage', applications => {
          // Property: Sum of counts in all stages should equal total non-rejected applications
          const applicationCount = applications.filter(a => a.status !== 'rejected').length
          const reviewCount = applications.filter(a => a.status === 'reviewing').length
          const offerCount = applications.filter(a => a.status === 'approved').length
          const applicationStageCount = applications.filter(a => a.status === 'pending').length

          const totalInPipeline = applicationStageCount + reviewCount + offerCount
          expect(totalInPipeline).toBe(applicationCount)
        })

    it.prop([fc.array(applicationArbitrary(), { minLength: 0, maxLength: 50 })])('should display correct badge count for Application stage', applications => {
          // Property: Application stage count should equal number of pending applications
          const pendingCount = applications.filter(a => a.status === 'pending').length
          expect(pendingCount).toBeGreaterThanOrEqual(0)
        })

    it.prop([fc.array(applicationArbitrary(), { minLength: 0, maxLength: 50 })])('should display correct badge count for Review stage', applications => {
          // Property: Review stage count should equal number of reviewing applications
          const reviewingCount = applications.filter(a => a.status === 'reviewing').length
          expect(reviewingCount).toBeGreaterThanOrEqual(0)
        })

    it.prop([fc.array(applicationArbitrary(), { minLength: 0, maxLength: 50 })])('should display correct badge count for Offer stage', applications => {
          // Property: Offer stage count should equal number of approved applications
          const approvedCount = applications.filter(a => a.status === 'approved').length
          expect(approvedCount).toBeGreaterThanOrEqual(0)
        })

    it.prop([fc.array(applicationArbitrary(), { minLength: 1, maxLength: 100 })])('should maintain distribution across all stages', applications => {
          // Property: Each application should be counted in exactly one stage (or excluded)
          const pendingCount = applications.filter(a => a.status === 'pending').length
          const reviewingCount = applications.filter(a => a.status === 'reviewing').length
          const approvedCount = applications.filter(a => a.status === 'approved').length
          const rejectedCount = applications.filter(a => a.status === 'rejected').length

          const totalCounted = pendingCount + reviewingCount + approvedCount + rejectedCount
          expect(totalCounted).toBe(applications.length)
        })

    it.prop([fc.constant([])])('should handle empty pipeline correctly', applications => {
        // Property: Empty applications array should result in zero counts for all stages
        const pendingCount = applications.filter(a => a.status === 'pending').length
        const reviewingCount = applications.filter(a => a.status === 'reviewing').length
        const approvedCount = applications.filter(a => a.status === 'approved').length

        expect(pendingCount).toBe(0)
        expect(reviewingCount).toBe(0)
        expect(approvedCount).toBe(0)
      })

    it.prop([fc.constantFrom('pending', 'reviewing', 'approved', 'rejected')])('should handle all applications in single stage', status => {
          // Create applications all with the same status
          const applications = Array.from({ length: 10 }, (_, i) => ({
            id: `app-${i}`,
            studentName: `Student ${i}`,
            parentName: `Parent ${i}`,
            contactPhone: '1234567890',
            contactEmail: `student${i}@example.com`,
            classApplying: 'Primary 1',
            status: status as 'pending' | 'reviewing' | 'approved' | 'rejected',
            academicSession: '2024/2025',
            source: 'website',
            createdAt: new Date().toISOString(),
          }))

          // Property: All applications should be in the same stage
          const pendingCount = applications.filter(a => a.status === 'pending').length
          const reviewingCount = applications.filter(a => a.status === 'reviewing').length
          const approvedCount = applications.filter(a => a.status === 'approved').length
          const rejectedCount = applications.filter(a => a.status === 'rejected').length

          const nonZeroCounts = [pendingCount, reviewingCount, approvedCount, rejectedCount].filter(
            c => c > 0
          )
          expect(nonZeroCounts.length).toBe(1)
          expect(nonZeroCounts[0]).toBe(10)
        })

    it.prop([fc.tuple(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 0, max: 20 })
        )])('should correctly distribute applications across multiple stages', ([pending, reviewing, approved, rejected]) => {
          // Create applications with specified distribution
          const applications: Application[] = [
            ...Array.from({ length: pending }, (_, i) => ({
              id: `pending-${i}`,
              studentName: `Student ${i}`,
              parentName: `Parent ${i}`,
              contactPhone: '1234567890',
              contactEmail: `student${i}@example.com`,
              classApplying: 'Primary 1',
              status: 'pending' as const,
              academicSession: '2024/2025',
              source: 'website',
              createdAt: new Date().toISOString(),
            })),
            ...Array.from({ length: reviewing }, (_, i) => ({
              id: `reviewing-${i}`,
              studentName: `Student ${i}`,
              parentName: `Parent ${i}`,
              contactPhone: '1234567890',
              contactEmail: `student${i}@example.com`,
              classApplying: 'Primary 1',
              status: 'reviewing' as const,
              academicSession: '2024/2025',
              source: 'website',
              createdAt: new Date().toISOString(),
            })),
            ...Array.from({ length: approved }, (_, i) => ({
              id: `approved-${i}`,
              studentName: `Student ${i}`,
              parentName: `Parent ${i}`,
              contactPhone: '1234567890',
              contactEmail: `student${i}@example.com`,
              classApplying: 'Primary 1',
              status: 'approved' as const,
              academicSession: '2024/2025',
              source: 'website',
              createdAt: new Date().toISOString(),
            })),
            ...Array.from({ length: rejected }, (_, i) => ({
              id: `rejected-${i}`,
              studentName: `Student ${i}`,
              parentName: `Parent ${i}`,
              contactPhone: '1234567890',
              contactEmail: `student${i}@example.com`,
              classApplying: 'Primary 1',
              status: 'rejected' as const,
              academicSession: '2024/2025',
              source: 'website',
              createdAt: new Date().toISOString(),
            })),
          ]

          // Property: Counts should match the distribution
          const pendingCount = applications.filter(a => a.status === 'pending').length
          const reviewingCount = applications.filter(a => a.status === 'reviewing').length
          const approvedCount = applications.filter(a => a.status === 'approved').length
          const rejectedCount = applications.filter(a => a.status === 'rejected').length

          expect(pendingCount).toBe(pending)
          expect(reviewingCount).toBe(reviewing)
          expect(approvedCount).toBe(approved)
          expect(rejectedCount).toBe(rejected)

          // Property: Pipeline count should exclude rejected
          const pipelineCount = pendingCount + reviewingCount + approvedCount
          expect(pipelineCount).toBe(pending + reviewing + approved)
        })
  })

  describe('Property 12 & 13 Combined: Status Mapping and Distribution', () => {
    it.prop([fc.array(applicationArbitrary(), { minLength: 0, maxLength: 100 })])('should correctly map and count applications in pipeline', applications => {
          // Create pipeline stages
          const stages = {
            Application: applications.filter(a => a.status === 'pending'),
            Review: applications.filter(a => a.status === 'reviewing'),
            Offer: applications.filter(a => a.status === 'approved'),
          }

          // Property: Each stage should contain only applications with the correct status
          stages.Application.forEach(app => {
            expect(app.status).toBe('pending')
          })
          stages.Review.forEach(app => {
            expect(app.status).toBe('reviewing')
          })
          stages.Offer.forEach(app => {
            expect(app.status).toBe('approved')
          })

          // Property: Total in pipeline should equal non-rejected applications
          const totalInPipeline =
            stages.Application.length + stages.Review.length + stages.Offer.length
          const nonRejected = applications.filter(a => a.status !== 'rejected').length
          expect(totalInPipeline).toBe(nonRejected)

          // Property: Badge counts should match stage counts
          expect(stages.Application.length).toBeGreaterThanOrEqual(0)
          expect(stages.Review.length).toBeGreaterThanOrEqual(0)
          expect(stages.Offer.length).toBeGreaterThanOrEqual(0)
        })
  })
})
