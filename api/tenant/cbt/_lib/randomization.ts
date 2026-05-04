/**
 * Question and Option Randomization Service
 * Handles randomization of questions and options per student
 */

import { queryOne, queryAll } from './db';
import { ExamQuestion, Question } from './types';

/**
 * Seed-based random number generator for consistent randomization per student
 * Uses student ID to generate consistent random order
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash % 1000000) / 1000000;
}

/**
 * Fisher-Yates shuffle algorithm with seeded randomization
 */
function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  let seedCounter = 0;

  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate seeded random index
    const randomSeed = `${seed}-${seedCounter}`;
    const j = Math.floor(seededRandom(randomSeed) * (i + 1));
    seedCounter++;

    // Swap
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Get randomized questions for student
 * Returns questions in randomized order if randomizeQuestions is enabled
 */
export async function getRandomizedQuestions(
  examId: string,
  studentId: string,
  shouldRandomize: boolean
): Promise<ExamQuestion[]> {
  // Get all exam questions
  const questions = await queryAll<ExamQuestion>(
    'SELECT * FROM exam_questions WHERE exam_id = $1 ORDER BY question_order ASC',
    [examId]
  );

  if (!shouldRandomize || questions.length === 0) {
    return questions;
  }

  // Shuffle questions using student ID as seed
  const shuffled = shuffleWithSeed(questions, studentId);

  // Update order numbers to reflect new order
  return shuffled.map((q, index) => ({
    ...q,
    questionOrder: index + 1,
  }));
}

/**
 * Get randomized options for question
 * Returns options in randomized order if randomizeOptions is enabled
 */
export async function getRandomizedOptions(
  question: Question,
  studentId: string,
  shouldRandomize: boolean
): Promise<Question> {
  if (!shouldRandomize || !question.options || question.options.length === 0) {
    return question;
  }

  // Shuffle options using student ID and question ID as seed
  const seed = `${studentId}-${question.id}`;
  const shuffledOptions = shuffleWithSeed(question.options, seed);

  return {
    ...question,
    options: shuffledOptions,
  };
}

/**
 * Get randomized exam for student
 * Randomizes both questions and options if enabled
 */
export async function getRandomizedExam(
  examId: string,
  studentId: string,
  randomizeQuestions: boolean,
  randomizeOptions: boolean
): Promise<{
  questions: ExamQuestion[];
  questionDetails: Question[];
}> {
  // Get randomized questions
  const questions = await getRandomizedQuestions(examId, studentId, randomizeQuestions);

  // Get question details and randomize options if needed
  const questionDetails: Question[] = [];

  for (const examQuestion of questions) {
    const question = await queryOne<Question>(
      'SELECT * FROM questions_bank WHERE id = $1',
      [examQuestion.questionId]
    );

    if (question) {
      const randomized = await getRandomizedOptions(question, studentId, randomizeOptions);
      questionDetails.push(randomized);
    }
  }

  return {
    questions,
    questionDetails,
  };
}

/**
 * Verify randomization consistency
 * Ensures same student gets same randomization on retry
 */
export async function verifyRandomizationConsistency(
  examId: string,
  studentId: string,
  randomizeQuestions: boolean,
  randomizeOptions: boolean,
  previousOrder: string[]
): Promise<boolean> {
  const current = await getRandomizedExam(
    examId,
    studentId,
    randomizeQuestions,
    randomizeOptions
  );

  const currentOrder = current.questions.map(q => q.questionId);

  // Compare orders
  if (previousOrder.length !== currentOrder.length) {
    return false;
  }

  for (let i = 0; i < previousOrder.length; i++) {
    if (previousOrder[i] !== currentOrder[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Get randomization seed for student
 * Used for debugging and verification
 */
export function getRandomizationSeed(studentId: string): string {
  return `exam-randomization-${studentId}`;
}

/**
 * Calculate randomization hash for verification
 */
export function calculateRandomizationHash(
  examId: string,
  studentId: string,
  questionIds: string[]
): string {
  const data = `${examId}-${studentId}-${questionIds.join(',')}`;
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16);
}
