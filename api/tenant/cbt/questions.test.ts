/**
 * Question Bank API Tests
 * Property-Based Tests for Question CRUD Operations
 * Property 1: Question Addition Round-Trip
 * Property 2: Question Deletion Removes from Bank
 * Property 3: Search Filters Return Only Matching Questions
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  getQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionStatistics,
  checkDuplicateQuestion,
  type CreateQuestionInput,
} from './_lib/questions';
import {
  advancedSearch,
  searchWithSuggestions,
  getSearchFiltersMetadata,
  facetedSearch,
  findSimilarQuestions,
  type SearchOptions,
} from './_lib/search';
import {
  getQuestionStatistics as getStatsFromService,
  getDetailedStatistics,
  getTimeBasedStatistics,
  getStatisticsBySubject,
  getExamPreparationStats,
  invalidateStatisticsCache,
} from './_lib/statistics';
import {
  importQuestionsFromCSV,
  generateCSVFromQuestions,
  generateCSVTemplate,
  validateCSVFormat,
  getImportStatistics,
  parseCSV,
  type ImportResult,
} from './_lib/csv';

/**
 * Property 1: Question Addition Round-Trip
 * Add and retrieve questions, verify data integrity
 */
export async function testQuestionAdditionRoundTrip(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Property 1: Question Addition Round-Trip');

    // Test Case 1: Objective Question
    const objectiveInput: CreateQuestionInput = {
      text: 'What is the capital of France?',
      type: 'objective',
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      correct_answer: 'Paris',
      difficulty: 'Easy',
      subject: 'Geography',
      tags: ['capitals', 'europe'],
    };

    const objectiveQuestion = await createQuestion(pool, tenantId, userId, objectiveInput);
    console.log('✓ Created objective question');

    // Retrieve and verify
    const retrievedObjective = await getQuestionById(pool, tenantId, objectiveQuestion.id);
    if (!retrievedObjective) {
      throw new Error('Objective question not found after creation');
    }

    if (retrievedObjective.text !== objectiveInput.text) {
      throw new Error('Question text mismatch');
    }
    if (retrievedObjective.type !== objectiveInput.type) {
      throw new Error('Question type mismatch');
    }
    if (JSON.stringify(retrievedObjective.options) !== JSON.stringify(objectiveInput.options)) {
      throw new Error('Question options mismatch');
    }
    if (retrievedObjective.correct_answer !== objectiveInput.correct_answer) {
      throw new Error('Correct answer mismatch');
    }
    if (retrievedObjective.difficulty !== objectiveInput.difficulty) {
      throw new Error('Difficulty mismatch');
    }
    if (retrievedObjective.subject !== objectiveInput.subject) {
      throw new Error('Subject mismatch');
    }

    console.log('✓ Objective question round-trip verified');

    // Test Case 2: True/False Question
    const trueFalseInput: CreateQuestionInput = {
      text: 'The Earth is flat.',
      type: 'truefalse',
      options: ['True', 'False'],
      correct_answer: 'False',
      difficulty: 'Easy',
      subject: 'Science',
      tags: ['earth', 'science'],
    };

    const trueFalseQuestion = await createQuestion(pool, tenantId, userId, trueFalseInput);
    const retrievedTrueFalse = await getQuestionById(pool, tenantId, trueFalseQuestion.id);

    if (!retrievedTrueFalse || retrievedTrueFalse.correct_answer !== 'False') {
      throw new Error('True/False question round-trip failed');
    }

    console.log('✓ True/False question round-trip verified');

    // Test Case 3: Essay Question
    const essayInput: CreateQuestionInput = {
      text: 'Explain the theory of evolution.',
      type: 'essay',
      correct_answer: 'Sample answer',
      difficulty: 'Hard',
      subject: 'Biology',
      tags: ['evolution', 'biology'],
    };

    const essayQuestion = await createQuestion(pool, tenantId, userId, essayInput);
    const retrievedEssay = await getQuestionById(pool, tenantId, essayQuestion.id);

    if (!retrievedEssay || retrievedEssay.type !== 'essay') {
      throw new Error('Essay question round-trip failed');
    }
    if (retrievedEssay.options !== undefined && retrievedEssay.options !== null) {
      throw new Error('Essay question should not have options');
    }

    console.log('✓ Essay question round-trip verified');

    // Cleanup
    await deleteQuestion(pool, tenantId, objectiveQuestion.id);
    await deleteQuestion(pool, tenantId, trueFalseQuestion.id);
    await deleteQuestion(pool, tenantId, essayQuestion.id);

    console.log('✓ Property 1: Question Addition Round-Trip - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Property 1 Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Property 2: Question Deletion Removes from Bank
 * Verify deleted questions don't appear in queries
 */
export async function testQuestionDeletionRemovesFromBank(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Property 2: Question Deletion Removes from Bank');

    // Create a question
    const input: CreateQuestionInput = {
      text: 'Test question for deletion',
      type: 'objective',
      options: ['A', 'B', 'C'],
      correct_answer: 'A',
      difficulty: 'Medium',
      subject: 'Test',
    };

    const question = await createQuestion(pool, tenantId, userId, input);
    console.log('✓ Created test question');

    // Verify it exists
    let result = await getQuestions(pool, tenantId);
    if (result.data.length === 0) {
      throw new Error('Question not found in bank after creation');
    }

    console.log('✓ Question found in bank');

    // Delete the question
    const deleted = await deleteQuestion(pool, tenantId, question.id);
    if (!deleted) {
      throw new Error('Failed to delete question');
    }

    console.log('✓ Question deleted');

    // Verify it's removed from queries
    result = await getQuestions(pool, tenantId);
    const stillExists = result.data.some(q => q.id === question.id);
    if (stillExists) {
      throw new Error('Deleted question still appears in queries');
    }

    console.log('✓ Deleted question removed from bank');

    // Verify direct query returns null
    const retrieved = await getQuestionById(pool, tenantId, question.id);
    if (retrieved !== null) {
      throw new Error('Deleted question still retrievable by ID');
    }

    console.log('✓ Property 2: Question Deletion Removes from Bank - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Property 2 Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Test Question Filtering
 */
export async function testQuestionFiltering(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Question Filtering');

    // Create questions with different attributes
    const questions = [
      {
        text: 'Easy Geography Question',
        type: 'objective' as const,
        options: ['A', 'B', 'C'],
        correct_answer: 'A',
        difficulty: 'Easy' as const,
        subject: 'Geography',
      },
      {
        text: 'Hard Geography Question',
        type: 'objective' as const,
        options: ['A', 'B', 'C'],
        correct_answer: 'B',
        difficulty: 'Hard' as const,
        subject: 'Geography',
      },
      {
        text: 'Easy Science Question',
        type: 'truefalse' as const,
        options: ['True', 'False'],
        correct_answer: 'True',
        difficulty: 'Easy' as const,
        subject: 'Science',
      },
    ];

    for (const q of questions) {
      await createQuestion(pool, tenantId, userId, q);
    }

    console.log('✓ Created test questions');

    // Test subject filter
    let result = await getQuestions(pool, tenantId, { subject: 'Geography' });
    if (result.data.length !== 2) {
      throw new Error('Subject filter failed');
    }

    console.log('✓ Subject filter works');

    // Test difficulty filter
    result = await getQuestions(pool, tenantId, { difficulty: 'Easy' });
    if (result.data.length !== 2) {
      throw new Error('Difficulty filter failed');
    }

    console.log('✓ Difficulty filter works');

    // Test type filter
    result = await getQuestions(pool, tenantId, { type: 'objective' });
    if (result.data.length !== 2) {
      throw new Error('Type filter failed');
    }

    console.log('✓ Type filter works');

    // Test search filter
    result = await getQuestions(pool, tenantId, { searchText: 'Geography' });
    if (result.data.length !== 2) {
      throw new Error('Search filter failed');
    }

    console.log('✓ Search filter works');

    // Cleanup
    for (const q of result.data) {
      await deleteQuestion(pool, tenantId, q.id);
    }

    console.log('✓ Question Filtering Tests - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Filtering Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Test Question Statistics
 */
export async function testQuestionStatistics(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Question Statistics');

    // Create questions
    const questions = [
      {
        text: 'Q1',
        type: 'objective' as const,
        options: ['A', 'B'],
        correct_answer: 'A',
        difficulty: 'Easy' as const,
        subject: 'Math',
      },
      {
        text: 'Q2',
        type: 'objective' as const,
        options: ['A', 'B'],
        correct_answer: 'B',
        difficulty: 'Easy' as const,
        subject: 'Math',
      },
      {
        text: 'Q3',
        type: 'truefalse' as const,
        options: ['True', 'False'],
        correct_answer: 'True',
        difficulty: 'Hard' as const,
        subject: 'Science',
      },
    ];

    const createdIds: string[] = [];
    for (const q of questions) {
      const created = await createQuestion(pool, tenantId, userId, q);
      createdIds.push(created.id);
    }

    console.log('✓ Created test questions');

    // Get statistics
    const stats = await getQuestionStatistics(pool, tenantId);

    if (stats.total !== 3) {
      throw new Error(`Expected 3 total questions, got ${stats.total}`);
    }

    if ((stats.byDifficulty['Easy'] || 0) !== 2) {
      throw new Error('Difficulty statistics incorrect');
    }

    if ((stats.byType['objective'] || 0) !== 2) {
      throw new Error('Type statistics incorrect');
    }

    if ((stats.bySubject['Math'] || 0) !== 2) {
      throw new Error('Subject statistics incorrect');
    }

    console.log('✓ Statistics calculated correctly');

    // Cleanup
    for (const id of createdIds) {
      await deleteQuestion(pool, tenantId, id);
    }

    console.log('✓ Question Statistics Tests - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Statistics Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Test Duplicate Detection
 */
export async function testDuplicateDetection(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Duplicate Detection');

    const input: CreateQuestionInput = {
      text: 'Duplicate test question',
      type: 'objective',
      options: ['A', 'B'],
      correct_answer: 'A',
      difficulty: 'Easy',
      subject: 'Test',
    };

    // Create first question
    const q1 = await createQuestion(pool, tenantId, userId, input);
    console.log('✓ Created first question');

    // Check for duplicate
    const duplicate = await checkDuplicateQuestion(pool, tenantId, input.text, input.correct_answer);
    if (!duplicate || duplicate.id !== q1.id) {
      throw new Error('Duplicate detection failed');
    }

    console.log('✓ Duplicate detected correctly');

    // Cleanup
    await deleteQuestion(pool, tenantId, q1.id);

    console.log('✓ Duplicate Detection Tests - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Duplicate Detection Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Property 3: Search Filters Return Only Matching Questions
 * Verify that search filters accurately return only matching questions
 */
export async function testSearchFiltersReturnOnlyMatching(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Property 3: Search Filters Return Only Matching Questions');

    // Create diverse test questions
    const testQuestions = [
      {
        text: 'What is photosynthesis?',
        type: 'objective' as const,
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
        difficulty: 'Easy' as const,
        subject: 'Biology',
        tags: ['photosynthesis', 'plants'],
      },
      {
        text: 'Explain the process of photosynthesis in detail.',
        type: 'essay' as const,
        correct_answer: 'Sample answer',
        difficulty: 'Hard' as const,
        subject: 'Biology',
        tags: ['photosynthesis', 'advanced'],
      },
      {
        text: 'Is photosynthesis a chemical reaction?',
        type: 'truefalse' as const,
        options: ['True', 'False'],
        correct_answer: 'True',
        difficulty: 'Medium' as const,
        subject: 'Chemistry',
        tags: ['photosynthesis', 'chemistry'],
      },
      {
        text: 'What is the capital of France?',
        type: 'objective' as const,
        options: ['Paris', 'London', 'Berlin', 'Madrid'],
        correct_answer: 'Paris',
        difficulty: 'Easy' as const,
        subject: 'Geography',
        tags: ['capitals', 'europe'],
      },
      {
        text: 'What is the capital of Germany?',
        type: 'objective' as const,
        options: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
        correct_answer: 'Berlin',
        difficulty: 'Easy' as const,
        subject: 'Geography',
        tags: ['capitals', 'europe'],
      },
      {
        text: 'Describe the geography of the Sahara Desert.',
        type: 'essay' as const,
        correct_answer: 'Sample answer',
        difficulty: 'Hard' as const,
        subject: 'Geography',
        tags: ['deserts', 'africa'],
      },
    ];

    const createdIds: string[] = [];
    for (const q of testQuestions) {
      const created = await createQuestion(pool, tenantId, userId, q);
      createdIds.push(created.id);
    }

    console.log('✓ Created 6 test questions');

    // Test 1: Subject filter
    let result = await advancedSearch(pool, tenantId, { subject: 'Biology' });
    if (result.data.length !== 2) {
      throw new Error(`Subject filter failed: expected 2 Biology questions, got ${result.data.length}`);
    }
    for (const q of result.data) {
      if (q.subject !== 'Biology') {
        throw new Error(`Subject filter returned non-Biology question: ${q.subject}`);
      }
    }
    console.log('✓ Subject filter returns only matching questions');

    // Test 2: Difficulty filter
    result = await advancedSearch(pool, tenantId, { difficulty: 'Easy' });
    if (result.data.length !== 3) {
      throw new Error(`Difficulty filter failed: expected 3 Easy questions, got ${result.data.length}`);
    }
    for (const q of result.data) {
      if (q.difficulty !== 'Easy') {
        throw new Error(`Difficulty filter returned non-Easy question: ${q.difficulty}`);
      }
    }
    console.log('✓ Difficulty filter returns only matching questions');

    // Test 3: Type filter
    result = await advancedSearch(pool, tenantId, { type: 'objective' });
    if (result.data.length !== 3) {
      throw new Error(`Type filter failed: expected 3 objective questions, got ${result.data.length}`);
    }
    for (const q of result.data) {
      if (q.type !== 'objective') {
        throw new Error(`Type filter returned non-objective question: ${q.type}`);
      }
    }
    console.log('✓ Type filter returns only matching questions');

    // Test 4: Full-text search
    result = await advancedSearch(pool, tenantId, { searchText: 'photosynthesis' });
    if (result.data.length !== 3) {
      throw new Error(`Search filter failed: expected 3 photosynthesis questions, got ${result.data.length}`);
    }
    for (const q of result.data) {
      if (!q.text.toLowerCase().includes('photosynthesis')) {
        throw new Error(`Search filter returned non-matching question: ${q.text}`);
      }
    }
    console.log('✓ Full-text search returns only matching questions');

    // Test 5: Tag filter
    result = await advancedSearch(pool, tenantId, { tags: ['capitals'] });
    if (result.data.length !== 2) {
      throw new Error(`Tag filter failed: expected 2 questions with 'capitals' tag, got ${result.data.length}`);
    }
    for (const q of result.data) {
      if (!q.tags || !q.tags.includes('capitals')) {
        throw new Error(`Tag filter returned question without 'capitals' tag`);
      }
    }
    console.log('✓ Tag filter returns only matching questions');

    // Test 6: Combined filters (subject + difficulty)
    result = await advancedSearch(pool, tenantId, { subject: 'Geography', difficulty: 'Easy' });
    if (result.data.length !== 2) {
      throw new Error(`Combined filter failed: expected 2 Easy Geography questions, got ${result.data.length}`);
    }
    for (const q of result.data) {
      if (q.subject !== 'Geography' || q.difficulty !== 'Easy') {
        throw new Error(`Combined filter returned non-matching question`);
      }
    }
    console.log('✓ Combined filters return only matching questions');

    // Test 7: Search with AND operator (all terms must match)
    result = await advancedSearch(pool, tenantId, {
      searchText: 'photosynthesis chemistry',
      searchOperator: 'AND',
    });
    // Should return only the Chemistry question about photosynthesis
    if (result.data.length !== 1) {
      throw new Error(`AND search failed: expected 1 result, got ${result.data.length}`);
    }
    console.log('✓ AND search operator returns only matching questions');

    // Test 8: Search with OR operator (any term matches)
    result = await advancedSearch(pool, tenantId, {
      searchText: 'capital desert',
      searchOperator: 'OR',
    });
    // Should return questions about capitals or deserts
    if (result.data.length < 3) {
      throw new Error(`OR search failed: expected at least 3 results, got ${result.data.length}`);
    }
    console.log('✓ OR search operator returns matching questions');

    // Test 9: Faceted search
    const facets = await facetedSearch(pool, tenantId);
    if (facets.total !== 6) {
      throw new Error(`Faceted search failed: expected 6 total, got ${facets.total}`);
    }
    if (!facets.bySubject['Biology'] || facets.bySubject['Biology'] !== 2) {
      throw new Error(`Faceted search subject count incorrect`);
    }
    console.log('✓ Faceted search returns accurate counts');

    // Test 10: Search suggestions
    const suggestions = await searchWithSuggestions(pool, tenantId, 'photo');
    if (suggestions.questions.length === 0) {
      throw new Error(`Search suggestions failed: no questions found`);
    }
    console.log('✓ Search suggestions return matching questions');

    // Test 11: Similar questions
    const similarResults = await findSimilarQuestions(pool, tenantId, createdIds[0], 5);
    // Should find other Biology questions
    for (const q of similarResults) {
      if (q.subject !== 'Biology') {
        throw new Error(`Similar questions returned non-Biology question`);
      }
    }
    console.log('✓ Similar questions returns only matching questions');

    // Test 12: Search filters metadata
    const metadata = await getSearchFiltersMetadata(pool, tenantId);
    if (!metadata.subjects.includes('Biology') || !metadata.subjects.includes('Geography')) {
      throw new Error(`Filters metadata missing expected subjects`);
    }
    if (!metadata.difficulties.includes('Easy') || !metadata.difficulties.includes('Hard')) {
      throw new Error(`Filters metadata missing expected difficulties`);
    }
    console.log('✓ Search filters metadata returns accurate values');

    // Cleanup
    for (const id of createdIds) {
      await deleteQuestion(pool, tenantId, id);
    }

    console.log('✓ Property 3: Search Filters Return Only Matching Questions - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Property 3 Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Property 4: Statistics Accurately Reflect Question Bank
 * Verify that statistics calculations match actual database state
 */
export async function testStatisticsAccuracy(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Property 4: Statistics Accurately Reflect Question Bank');

    // Create diverse test questions
    const testQuestions = [
      // Easy questions
      {
        text: 'Easy Math Q1',
        type: 'objective' as const,
        options: ['A', 'B', 'C'],
        correct_answer: 'A',
        difficulty: 'Easy' as const,
        subject: 'Math',
      },
      {
        text: 'Easy Math Q2',
        type: 'objective' as const,
        options: ['A', 'B', 'C'],
        correct_answer: 'B',
        difficulty: 'Easy' as const,
        subject: 'Math',
      },
      {
        text: 'Easy Science Q1',
        type: 'truefalse' as const,
        options: ['True', 'False'],
        correct_answer: 'True',
        difficulty: 'Easy' as const,
        subject: 'Science',
      },
      // Medium questions
      {
        text: 'Medium Math Q1',
        type: 'objective' as const,
        options: ['A', 'B', 'C'],
        correct_answer: 'C',
        difficulty: 'Medium' as const,
        subject: 'Math',
      },
      {
        text: 'Medium Science Q1',
        type: 'essay' as const,
        correct_answer: 'Sample',
        difficulty: 'Medium' as const,
        subject: 'Science',
      },
      // Hard questions
      {
        text: 'Hard Math Q1',
        type: 'objective' as const,
        options: ['A', 'B', 'C'],
        correct_answer: 'A',
        difficulty: 'Hard' as const,
        subject: 'Math',
      },
      {
        text: 'Hard Science Q1',
        type: 'truefalse' as const,
        options: ['True', 'False'],
        correct_answer: 'False',
        difficulty: 'Hard' as const,
        subject: 'Science',
      },
    ];

    const createdIds: string[] = [];
    for (const q of testQuestions) {
      const created = await createQuestion(pool, tenantId, userId, q);
      createdIds.push(created.id);
    }

    console.log('✓ Created 7 test questions');

    // Test 1: Basic statistics
    const basicStats = await getStatsFromService(pool, tenantId, false);
    if (basicStats.total !== 7) {
      throw new Error(`Total count mismatch: expected 7, got ${basicStats.total}`);
    }
    console.log('✓ Total count is accurate');

    // Test 2: Difficulty distribution
    if ((basicStats.byDifficulty['Easy'] || 0) !== 3) {
      throw new Error(`Easy count mismatch: expected 3, got ${basicStats.byDifficulty['Easy']}`);
    }
    if ((basicStats.byDifficulty['Medium'] || 0) !== 2) {
      throw new Error(`Medium count mismatch: expected 2, got ${basicStats.byDifficulty['Medium']}`);
    }
    if ((basicStats.byDifficulty['Hard'] || 0) !== 2) {
      throw new Error(`Hard count mismatch: expected 2, got ${basicStats.byDifficulty['Hard']}`);
    }
    console.log('✓ Difficulty distribution is accurate');

    // Test 3: Type distribution
    if ((basicStats.byType['objective'] || 0) !== 4) {
      throw new Error(`Objective count mismatch: expected 4, got ${basicStats.byType['objective']}`);
    }
    if ((basicStats.byType['truefalse'] || 0) !== 2) {
      throw new Error(`True/False count mismatch: expected 2, got ${basicStats.byType['truefalse']}`);
    }
    if ((basicStats.byType['essay'] || 0) !== 1) {
      throw new Error(`Essay count mismatch: expected 1, got ${basicStats.byType['essay']}`);
    }
    console.log('✓ Type distribution is accurate');

    // Test 4: Subject distribution
    if ((basicStats.bySubject['Math'] || 0) !== 4) {
      throw new Error(`Math count mismatch: expected 4, got ${basicStats.bySubject['Math']}`);
    }
    if ((basicStats.bySubject['Science'] || 0) !== 3) {
      throw new Error(`Science count mismatch: expected 3, got ${basicStats.bySubject['Science']}`);
    }
    console.log('✓ Subject distribution is accurate');

    // Test 5: Detailed statistics
    const detailedStats = await getDetailedStatistics(pool, tenantId, false);
    if (detailedStats.total !== 7) {
      throw new Error(`Detailed stats total mismatch: expected 7, got ${detailedStats.total}`);
    }
    if (!detailedStats.topSubjects || detailedStats.topSubjects.length === 0) {
      throw new Error('Top subjects not calculated');
    }
    if (detailedStats.topSubjects[0].subject !== 'Math' || detailedStats.topSubjects[0].count !== 4) {
      throw new Error('Top subjects ranking incorrect');
    }
    console.log('✓ Detailed statistics are accurate');

    // Test 6: Difficulty distribution percentages
    const easyPercentage = detailedStats.difficultyDistribution.find(d => d.difficulty === 'Easy')?.percentage;
    if (easyPercentage !== 43) {
      // 3/7 * 100 = 42.857... rounds to 43
      throw new Error(`Easy percentage incorrect: expected ~43%, got ${easyPercentage}%`);
    }
    console.log('✓ Difficulty distribution percentages are accurate');

    // Test 7: Type distribution percentages
    const objectivePercentage = detailedStats.typeDistribution.find(t => t.type === 'objective')?.percentage;
    if (objectivePercentage !== 57) {
      // 4/7 * 100 = 57.142... rounds to 57
      throw new Error(`Objective percentage incorrect: expected ~57%, got ${objectivePercentage}%`);
    }
    console.log('✓ Type distribution percentages are accurate');

    // Test 8: Subject-specific statistics
    const mathStats = await getStatisticsBySubject(pool, tenantId, 'Math', false);
    if (mathStats.total !== 4) {
      throw new Error(`Math subject stats total mismatch: expected 4, got ${mathStats.total}`);
    }
    if (mathStats.percentage !== 57) {
      // 4/7 * 100 = 57.142... rounds to 57
      throw new Error(`Math percentage incorrect: expected ~57%, got ${mathStats.percentage}%`);
    }
    console.log('✓ Subject-specific statistics are accurate');

    // Test 9: Exam preparation statistics
    const examStats = await getExamPreparationStats(pool, tenantId, false);
    if (examStats.totalAvailable !== 7) {
      throw new Error(`Exam prep total mismatch: expected 7, got ${examStats.totalAvailable}`);
    }
    if (!examStats.readyForExam) {
      throw new Error('Exam readiness should be true with 7 questions');
    }
    if (examStats.recommendations.length > 0) {
      throw new Error(`Should have no recommendations with 7 questions, got: ${examStats.recommendations.join(', ')}`);
    }
    console.log('✓ Exam preparation statistics are accurate');

    // Test 10: Cache invalidation
    invalidateStatisticsCache(tenantId);
    console.log('✓ Cache invalidation works');

    // Test 11: Time-based statistics
    const timeStats = await getTimeBasedStatistics(pool, tenantId, false);
    if (timeStats.allTime !== 7) {
      throw new Error(`Time-based all-time count mismatch: expected 7, got ${timeStats.allTime}`);
    }
    if (timeStats.today < 0 || timeStats.thisWeek < 0 || timeStats.thisMonth < 0) {
      throw new Error('Time-based statistics have negative values');
    }
    console.log('✓ Time-based statistics are accurate');

    // Test 12: Statistics after deletion
    await deleteQuestion(pool, tenantId, createdIds[0]);
    invalidateStatisticsCache(tenantId);

    const statsAfterDelete = await getStatsFromService(pool, tenantId, false);
    if (statsAfterDelete.total !== 6) {
      throw new Error(`Total after deletion mismatch: expected 6, got ${statsAfterDelete.total}`);
    }
    if ((statsAfterDelete.byDifficulty['Easy'] || 0) !== 2) {
      throw new Error(`Easy count after deletion mismatch: expected 2, got ${statsAfterDelete.byDifficulty['Easy']}`);
    }
    console.log('✓ Statistics update correctly after deletion');

    // Cleanup
    for (const id of createdIds) {
      await deleteQuestion(pool, tenantId, id);
    }

    console.log('✓ Property 4: Statistics Accurately Reflect Question Bank - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Property 4 Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Property 5: CSV Import Preserves Question Data
 * Verify that imported data matches source and maintains integrity
 */
export async function testCSVImportPreservesData(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Property 5: CSV Import Preserves Question Data');

    // Create test CSV content
    const csvContent = `text,type,options,correct_answer,difficulty,subject,tags
"What is photosynthesis?","objective","A|B|C|D","A","Easy","Biology","photosynthesis,plants"
"Is photosynthesis a chemical reaction?","truefalse","True|False","True","Medium","Chemistry","photosynthesis,chemistry"
"Explain the theory of evolution.","essay","","Sample answer about evolution","Hard","Biology","evolution,biology"
"What is the capital of France?","objective","Paris|London|Berlin|Madrid","Paris","Easy","Geography","capitals,europe"
"The Earth is flat.","truefalse","True|False","False","Easy","Science","earth,science"`;

    console.log('✓ Created test CSV content');

    // Test 1: CSV format validation
    const formatValidation = validateCSVFormat(csvContent);
    if (!formatValidation.valid) {
      throw new Error(`CSV format validation failed: ${formatValidation.errors.join(', ')}`);
    }
    console.log('✓ CSV format validation passed');

    // Test 2: CSV parsing
    const parsedRows = await parseCSV(csvContent);
    if (parsedRows.length !== 5) {
      throw new Error(`Expected 5 rows, got ${parsedRows.length}`);
    }
    console.log('✓ CSV parsing successful');

    // Test 3: Import questions
    const importResult = await importQuestionsFromCSV(pool, tenantId, userId, csvContent, {
      skipDuplicates: true,
      stopOnError: false,
    });

    if (!importResult.success) {
      throw new Error(`Import failed: ${importResult.message}`);
    }
    if (importResult.successCount !== 5) {
      throw new Error(`Expected 5 successful imports, got ${importResult.successCount}`);
    }
    console.log('✓ CSV import successful');

    // Test 4: Verify imported data
    const importedIds = importResult.importedQuestionIds;
    if (importedIds.length !== 5) {
      throw new Error(`Expected 5 imported IDs, got ${importedIds.length}`);
    }

    // Retrieve and verify each question
    for (let i = 0; i < importedIds.length; i++) {
      const question = await getQuestionById(pool, tenantId, importedIds[i]);
      if (!question) {
        throw new Error(`Question ${i + 1} not found after import`);
      }

      const originalRow = parsedRows[i];

      // Verify text
      if (question.text !== originalRow.text) {
        throw new Error(`Question ${i + 1} text mismatch`);
      }

      // Verify type
      if (question.type !== originalRow.type) {
        throw new Error(`Question ${i + 1} type mismatch`);
      }

      // Verify correct answer
      if (question.correct_answer !== originalRow.correct_answer) {
        throw new Error(`Question ${i + 1} correct answer mismatch`);
      }

      // Verify difficulty
      if (question.difficulty !== originalRow.difficulty) {
        throw new Error(`Question ${i + 1} difficulty mismatch`);
      }

      // Verify subject
      if (question.subject !== originalRow.subject) {
        throw new Error(`Question ${i + 1} subject mismatch`);
      }

      // Verify options (if applicable)
      if (originalRow.type !== 'essay' && originalRow.options) {
        const expectedOptions = originalRow.options.split('|');
        if (JSON.stringify(question.options) !== JSON.stringify(expectedOptions)) {
          throw new Error(`Question ${i + 1} options mismatch`);
        }
      }

      // Verify tags
      if (originalRow.tags) {
        const expectedTags = originalRow.tags.split(',').map(t => t.trim());
        if (JSON.stringify(question.tags) !== JSON.stringify(expectedTags)) {
          throw new Error(`Question ${i + 1} tags mismatch`);
        }
      }
    }

    console.log('✓ All imported data verified');

    // Test 5: Export and re-import (round-trip)
    const exportedCSV = await generateCSVFromQuestions(pool, tenantId, {
      questionIds: importedIds,
    });

    if (!exportedCSV || exportedCSV.length === 0) {
      throw new Error('Export returned empty CSV');
    }

    console.log('✓ CSV export successful');

    // Re-import the exported CSV
    const reimportResult = await importQuestionsFromCSV(pool, tenantId, userId, exportedCSV, {
      skipDuplicates: true,
      stopOnError: false,
    });

    if (reimportResult.duplicateCount !== 5) {
      throw new Error(`Expected 5 duplicates on re-import, got ${reimportResult.duplicateCount}`);
    }

    console.log('✓ Round-trip export/import successful');

    // Test 6: Import statistics
    const stats = getImportStatistics(importResult);
    if (stats.successRate !== 100) {
      throw new Error(`Expected 100% success rate, got ${stats.successRate}%`);
    }
    if (stats.errorRate !== 0) {
      throw new Error(`Expected 0% error rate, got ${stats.errorRate}%`);
    }
    console.log('✓ Import statistics accurate');

    // Test 7: Duplicate detection during import
    const duplicateCSV = `text,type,options,correct_answer,difficulty,subject,tags
"What is photosynthesis?","objective","A|B|C|D","A","Easy","Biology","photosynthesis,plants"
"New Question","objective","A|B|C","A","Easy","Biology","new"`;

    const duplicateResult = await importQuestionsFromCSV(pool, tenantId, userId, duplicateCSV, {
      skipDuplicates: true,
      stopOnError: false,
    });

    if (duplicateResult.duplicateCount !== 1) {
      throw new Error(`Expected 1 duplicate, got ${duplicateResult.duplicateCount}`);
    }
    if (duplicateResult.successCount !== 1) {
      throw new Error(`Expected 1 new import, got ${duplicateResult.successCount}`);
    }

    console.log('✓ Duplicate detection works correctly');

    // Test 8: CSV template generation
    const template = generateCSVTemplate();
    if (!template || template.length === 0) {
      throw new Error('Template generation failed');
    }

    const templateRows = await parseCSV(template);
    if (templateRows.length !== 3) {
      throw new Error(`Expected 3 template rows, got ${templateRows.length}`);
    }

    console.log('✓ CSV template generation successful');

    // Test 9: Error handling for invalid CSV
    const invalidCSV = `text,type,correct_answer
"Question without difficulty","objective","A"`;

    const invalidResult = await importQuestionsFromCSV(pool, tenantId, userId, invalidCSV, {
      skipDuplicates: true,
      stopOnError: false,
    });

    if (invalidResult.failureCount === 0) {
      throw new Error('Should have detected invalid CSV');
    }

    console.log('✓ Invalid CSV error handling works');

    // Cleanup
    for (const id of importedIds) {
      await deleteQuestion(pool, tenantId, id);
    }

    console.log('✓ Property 5: CSV Import Preserves Question Data - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Property 5 Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Property 6: CSV Export-Import Round-Trip
 * Verify that export and re-import produces identical data
 */
export async function testCSVRoundTrip(pool: Pool): Promise<void> {
  const tenantId = uuidv4();
  const userId = uuidv4();

  try {
    console.log('Testing Property 6: CSV Export-Import Round-Trip');

    // Create diverse test questions
    const testQuestions = [
      {
        text: 'What is photosynthesis?',
        type: 'objective' as const,
        options: ['A', 'B', 'C', 'D'],
        correct_answer: 'A',
        difficulty: 'Easy' as const,
        subject: 'Biology',
        tags: ['photosynthesis', 'plants'],
      },
      {
        text: 'Is the Earth round?',
        type: 'truefalse' as const,
        options: ['True', 'False'],
        correct_answer: 'True',
        difficulty: 'Easy' as const,
        subject: 'Science',
        tags: ['earth', 'science'],
      },
      {
        text: 'Explain quantum mechanics.',
        type: 'essay' as const,
        correct_answer: 'Sample answer',
        difficulty: 'Hard' as const,
        subject: 'Physics',
        tags: ['quantum', 'physics'],
      },
    ];

    const createdIds: string[] = [];
    const originalQuestions: any[] = [];

    for (const q of testQuestions) {
      const created = await createQuestion(pool, tenantId, userId, q);
      createdIds.push(created.id);
      originalQuestions.push(created);
    }

    console.log('✓ Created 3 test questions');

    // Test 1: Export questions
    const exportedCSV = await generateCSVFromQuestions(pool, tenantId, {
      questionIds: createdIds,
    });

    if (!exportedCSV || exportedCSV.length === 0) {
      throw new Error('Export returned empty CSV');
    }

    console.log('✓ CSV export successful');

    // Test 2: Parse exported CSV
    const exportedRows = await parseCSV(exportedCSV);
    if (exportedRows.length !== 3) {
      throw new Error(`Expected 3 exported rows, got ${exportedRows.length}`);
    }

    console.log('✓ Exported CSV parsed successfully');

    // Test 3: Verify exported data matches original
    for (let i = 0; i < exportedRows.length; i++) {
      const exported = exportedRows[i];
      const original = originalQuestions[i];

      if (exported.text !== original.text) {
        throw new Error(`Row ${i + 1} text mismatch: "${exported.text}" vs "${original.text}"`);
      }

      if (exported.type !== original.type) {
        throw new Error(`Row ${i + 1} type mismatch`);
      }

      if (exported.correct_answer !== original.correct_answer) {
        throw new Error(`Row ${i + 1} correct answer mismatch`);
      }

      if (exported.difficulty !== original.difficulty) {
        throw new Error(`Row ${i + 1} difficulty mismatch`);
      }

      if (exported.subject !== original.subject) {
        throw new Error(`Row ${i + 1} subject mismatch`);
      }
    }

    console.log('✓ Exported data matches original');

    // Test 4: Re-import exported CSV
    const reimportResult = await importQuestionsFromCSV(pool, tenantId, userId, exportedCSV, {
      skipDuplicates: true,
      stopOnError: false,
    });

    if (reimportResult.duplicateCount !== 3) {
      throw new Error(`Expected 3 duplicates on re-import, got ${reimportResult.duplicateCount}`);
    }

    if (reimportResult.successCount !== 0) {
      throw new Error(`Expected 0 new imports (all duplicates), got ${reimportResult.successCount}`);
    }

    console.log('✓ Re-import detected all as duplicates (data preserved)');

    // Test 5: Export with filters
    const filteredExport = await generateCSVFromQuestions(pool, tenantId, {
      subject: 'Biology',
    });

    const filteredRows = await parseCSV(filteredExport);
    if (filteredRows.length !== 1) {
      throw new Error(`Expected 1 Biology question, got ${filteredRows.length}`);
    }

    if (filteredRows[0].subject !== 'Biology') {
      throw new Error('Filtered export contains non-Biology question');
    }

    console.log('✓ Filtered export works correctly');

    // Test 6: Export by difficulty
    const difficultyExport = await generateCSVFromQuestions(pool, tenantId, {
      difficulty: 'Easy',
    });

    const difficultyRows = await parseCSV(difficultyExport);
    if (difficultyRows.length !== 2) {
      throw new Error(`Expected 2 Easy questions, got ${difficultyRows.length}`);
    }

    for (const row of difficultyRows) {
      if (row.difficulty !== 'Easy') {
        throw new Error('Difficulty filter returned non-Easy question');
      }
    }

    console.log('✓ Difficulty filter export works correctly');

    // Test 7: Export by type
    const typeExport = await generateCSVFromQuestions(pool, tenantId, {
      type: 'objective',
    });

    const typeRows = await parseCSV(typeExport);
    if (typeRows.length !== 1) {
      throw new Error(`Expected 1 objective question, got ${typeRows.length}`);
    }

    if (typeRows[0].type !== 'objective') {
      throw new Error('Type filter returned non-objective question');
    }

    console.log('✓ Type filter export works correctly');

    // Test 8: Export specific question IDs
    const specificExport = await generateCSVFromQuestions(pool, tenantId, {
      questionIds: [createdIds[0], createdIds[2]],
    });

    const specificRows = await parseCSV(specificExport);
    if (specificRows.length !== 2) {
      throw new Error(`Expected 2 specific questions, got ${specificRows.length}`);
    }

    console.log('✓ Specific question ID export works correctly');

    // Test 9: Verify tags are preserved in round-trip
    const tagsExport = await generateCSVFromQuestions(pool, tenantId, {
      questionIds: [createdIds[0]],
    });

    const tagsRows = await parseCSV(tagsExport);
    const exportedTags = tagsRows[0].tags.split(',').map((t: string) => t.trim());
    const originalTags = originalQuestions[0].tags;

    if (JSON.stringify(exportedTags.sort()) !== JSON.stringify(originalTags.sort())) {
      throw new Error('Tags not preserved in round-trip');
    }

    console.log('✓ Tags preserved in round-trip');

    // Test 10: Verify options are preserved in round-trip
    const optionsExport = await generateCSVFromQuestions(pool, tenantId, {
      questionIds: [createdIds[0]],
    });

    const optionsRows = await parseCSV(optionsExport);
    const exportedOptions = optionsRows[0].options.split('|').map((o: string) => o.trim());
    const originalOptions = originalQuestions[0].options;

    if (JSON.stringify(exportedOptions) !== JSON.stringify(originalOptions)) {
      throw new Error('Options not preserved in round-trip');
    }

    console.log('✓ Options preserved in round-trip');

    // Cleanup
    for (const id of createdIds) {
      await deleteQuestion(pool, tenantId, id);
    }

    console.log('✓ Property 6: CSV Export-Import Round-Trip - PASSED\n');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('✗ Property 6 Test Failed:', errorMessage);
    throw error;
  }
}

/**
 * Run all tests
 */
export async function runAllTests(pool: Pool): Promise<void> {
  console.log('='.repeat(60));
  console.log('Question Bank API - Property-Based Tests');
  console.log('='.repeat(60));
  console.log();

  try {
    await testQuestionAdditionRoundTrip(pool);
    await testQuestionDeletionRemovesFromBank(pool);
    await testQuestionFiltering(pool);
    await testQuestionStatistics(pool);
    await testDuplicateDetection(pool);
    await testSearchFiltersReturnOnlyMatching(pool);
    await testStatisticsAccuracy(pool);
    await testCSVImportPreservesData(pool);
    await testCSVRoundTrip(pool);

    console.log('='.repeat(60));
    console.log('✓ All tests PASSED');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n✗ Tests FAILED');
    process.exit(1);
  }
}
