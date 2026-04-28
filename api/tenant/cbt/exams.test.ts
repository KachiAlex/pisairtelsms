/**
 * Exam Management API Tests
 * Property-Based Tests for Exam CRUD Operations
 * Property 7: Exam Creation Persists All Details
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  scheduleExam,
  getExamStatistics,
  type CreateExamInput,
} from './_lib/exams';

/**
 * Property 7: Exam Creation Persists All Details
 * Verify that all exam data is persisted correctly
 */
export async function testExamCreationPersistsDetails(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Property 7: Exam Creation Persists All Details');

    // Test Case 1: Create exam with all details
    const examInput: CreateExamInput = {
      title: 'Mathematics Final Exam',
      subject: 'Mathematics',
      class: 'Class 10',
      duration: 120,
      pass_mark: 40,
      total_marks: 100,
    };

    const createdExam = await createExam(pool, tenantId, userId, examInput);
    console.log('✓ Created exam');

    // Verify all fields persisted
    if (createdExam.title !== examInput.title) {
      throw new Error('Exam title not persisted');
    }
    if (createdExam.subject !== examInput.subject) {
      throw new Error('Exam subject not persisted');
    }
    if (createdExam.class !== examInput.class) {
      throw new Error('Exam class not persisted');
    }
    if (createdExam.duration !== examInput.duration) {
      throw new Error('Exam duration not persisted');
    }
    if (createdExam.pass_mark !== examInput.pass_mark) {
      throw new Error('Exam pass mark not persisted');
    }
    if (createdExam.total_marks !== examInput.total_marks) {
      throw new Error('Exam total marks not persisted');
    }
    if (createdExam.status !== 'Draft') {
      throw new Error('Exam status should be Draft');
    }
    if (createdExam.created_by !== userId) {
      throw new Error('Exam created_by not set correctly');
    }

    console.log('✓ All exam details persisted correctly');

    // Test Case 2: Retrieve exam and verify persistence
    const retrievedExam = await getExamById(pool, tenantId, createdExam.id);
    if (!retrievedExam) {
      throw new Error('Exam not found after creation');
    }

    if (JSON.stringify(retrievedExam) !== JSON.stringify(createdExam)) {
      throw new Error('Retrieved exam does not match created exam');
    }

    console.log('✓ Exam retrieval verified');

    // Test Case 3: Create multiple exams and verify all persisted
    const exams = [
      {
        title: 'Science Midterm',
        subject: 'Science',
        class: 'Class 9',
        duration: 90,
        pass_mark: 35,
        total_marks: 80,
      },
      {
        title: 'English Quiz',
        subject: 'English',
        class: 'Class 8',
        duration: 45,
        pass_mark: 50,
        total_marks: 100,
      },
      {
        title: 'History Test',
        subject: 'History',
        class: 'Class 10',
        duration: 60,
        pass_mark: 40,
        total_marks: 75,
      },
    ];

    const createdIds: string[] = [createdExam.id];
    for (const exam of exams) {
      const created = await createExam(pool, tenantId, userId, exam);
      createdIds.push(created.id);
    }

    console.log('✓ Created 3 additional exams');

    // Verify all exams in database
    const allExams = await getExams(pool, tenantId);
    if (allExams.data.length !== 4) {
      throw new Error(`Expected 4 exams, got ${allExams.data.length}`);
    }

    console.log('✓ All exams persisted in database');

    // Test Case 4: Verify exam status transitions
    if (createdExam.status !== 'Draft') {
      throw new Error('New exam should have Draft status');
    }

    console.log('✓ Exam status correctly set to Draft');

    // Test Case 5: Verify timestamps
    if (!createdExam.created_at) {
      throw new Error('created_at timestamp missing');
    }
    if (!createdExam.updated_at) {
      throw new Error('updated_at timestamp missing');
    }

    console.log('✓ Timestamps correctly set');

    // Test Case 6: Verify tenant isolation
    const otherTenantId = uuidv4();
    const otherTenantExams = await getExams(pool, otherTenantId);
    if (otherTenantExams.data.length !== 0) {
      throw new Error('Tenant isolation violated');
    }

    console.log('✓ Tenant isolation verified');

    // Cleanup
    for (const id of createdIds) {
      await deleteExam(pool, tenantId, id);
    }

    console.log('✓ Property 7: Exam Creation Persists All Details - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Property 7 Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Test Exam Validation
 */
export async function testExamValidation(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Exam Validation');

    // Test Case 1: Invalid duration
    try {
      await createExam(pool, tenantId, userId, {
        title: 'Test',
        subject: 'Math',
        class: 'Class 10',
        duration: 10, // Too short
        pass_mark: 40,
        total_marks: 100,
      });
      throw new Error('Should have rejected duration < 15');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Duration')) {
        throw error;
      }
    }

    console.log('✓ Duration validation works');

    // Test Case 2: Invalid pass mark
    try {
      await createExam(pool, tenantId, userId, {
        title: 'Test',
        subject: 'Math',
        class: 'Class 10',
        duration: 60,
        pass_mark: 150, // Too high
        total_marks: 100,
      });
      throw new Error('Should have rejected pass mark > 100');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Pass mark')) {
        throw error;
      }
    }

    console.log('✓ Pass mark validation works');

    // Test Case 3: Total marks <= pass mark
    try {
      await createExam(pool, tenantId, userId, {
        title: 'Test',
        subject: 'Math',
        class: 'Class 10',
        duration: 60,
        pass_mark: 100,
        total_marks: 80, // Less than pass mark
      });
      throw new Error('Should have rejected total_marks <= pass_mark');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Total marks')) {
        throw error;
      }
    }

    console.log('✓ Total marks validation works');

    // Test Case 4: Missing required fields
    try {
      await createExam(pool, tenantId, userId, {
        title: '',
        subject: 'Math',
        class: 'Class 10',
        duration: 60,
        pass_mark: 40,
        total_marks: 100,
      });
      throw new Error('Should have rejected empty title');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('title')) {
        throw error;
      }
    }

    console.log('✓ Required field validation works');

    console.log('✓ Exam Validation Tests - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Validation Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Test Exam Filtering
 */
export async function testExamFiltering(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Exam Filtering');

    // Create test exams
    const exams = [
      {
        title: 'Math Final',
        subject: 'Mathematics',
        class: 'Class 10',
        duration: 120,
        pass_mark: 40,
        total_marks: 100,
      },
      {
        title: 'Science Midterm',
        subject: 'Science',
        class: 'Class 10',
        duration: 90,
        pass_mark: 35,
        total_marks: 80,
      },
      {
        title: 'English Quiz',
        subject: 'English',
        class: 'Class 9',
        duration: 45,
        pass_mark: 50,
        total_marks: 100,
      },
    ];

    const createdIds: string[] = [];
    for (const exam of exams) {
      const created = await createExam(pool, tenantId, userId, exam);
      createdIds.push(created.id);
    }

    console.log('✓ Created test exams');

    // Test subject filter
    let result = await getExams(pool, tenantId, { subject: 'Mathematics' });
    if (result.data.length !== 1) {
      throw new Error('Subject filter failed');
    }

    console.log('✓ Subject filter works');

    // Test class filter
    result = await getExams(pool, tenantId, { class: 'Class 10' });
    if (result.data.length !== 2) {
      throw new Error('Class filter failed');
    }

    console.log('✓ Class filter works');

    // Test search filter
    result = await getExams(pool, tenantId, { searchText: 'Final' });
    if (result.data.length !== 1) {
      throw new Error('Search filter failed');
    }

    console.log('✓ Search filter works');

    // Cleanup
    for (const id of createdIds) {
      await deleteExam(pool, tenantId, id);
    }

    console.log('✓ Exam Filtering Tests - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Filtering Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Test Exam Statistics
 */
export async function testExamStatistics(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Exam Statistics');

    // Create test exams
    const exams = [
      {
        title: 'Math Final',
        subject: 'Mathematics',
        class: 'Class 10',
        duration: 120,
        pass_mark: 40,
        total_marks: 100,
      },
      {
        title: 'Science Midterm',
        subject: 'Science',
        class: 'Class 10',
        duration: 90,
        pass_mark: 35,
        total_marks: 80,
      },
      {
        title: 'English Quiz',
        subject: 'English',
        class: 'Class 9',
        duration: 45,
        pass_mark: 50,
        total_marks: 100,
      },
    ];

    const createdIds: string[] = [];
    for (const exam of exams) {
      const created = await createExam(pool, tenantId, userId, exam);
      createdIds.push(created.id);
    }

    console.log('✓ Created test exams');

    // Get statistics
    const stats = await getExamStatistics(pool, tenantId);

    if (stats.total !== 3) {
      throw new Error(`Expected 3 total exams, got ${stats.total}`);
    }

    if ((stats.byStatus['Draft'] || 0) !== 3) {
      throw new Error('All exams should have Draft status');
    }

    if ((stats.bySubject['Mathematics'] || 0) !== 1) {
      throw new Error('Mathematics count incorrect');
    }

    if ((stats.byClass['Class 10'] || 0) !== 2) {
      throw new Error('Class 10 count incorrect');
    }

    console.log('✓ Statistics calculated correctly');

    // Cleanup
    for (const id of createdIds) {
      await deleteExam(pool, tenantId, id);
    }

    console.log('✓ Exam Statistics Tests - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Statistics Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Run all tests
 */
export async function runAllTests(pool: Pool): Promise<void> {
  console.log('='.repeat(60));
  console.log('Exam Management API - Property-Based Tests');
  console.log('='.repeat(60));
  console.log();

  try {
    await testExamCreationPersistsDetails(pool);
    await testExamValidation(pool);
    await testExamFiltering(pool);
    await testExamStatistics(pool);

    console.log('='.repeat(60));
    console.log('✓ All tests PASSED');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n✗ Tests FAILED');
    process.exit(1);
  }
}
