/**
 * Security Settings Service for CBT Exams
 * Handles CRUD operations for exam security settings
 */

import { Pool } from 'pg';
import { getPool } from './db';

/**
 * Security Settings interface
 */
export interface SecuritySettings {
  id: string;
  examId: string;
  tenantId: string;
  proctoringEnabled: boolean;
  cameraRequired: boolean;
  copyPasteDisabled: boolean;
  rightClickDisabled: boolean;
  questionRandomization: boolean;
  optionRandomization: boolean;
  ipWhitelist?: string;
  examPassword?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Security Settings Input for creation/update
 */
export interface SecuritySettingsInput {
  proctoringEnabled?: boolean;
  cameraRequired?: boolean;
  copyPasteDisabled?: boolean;
  rightClickDisabled?: boolean;
  questionRandomization?: boolean;
  optionRandomization?: boolean;
  ipWhitelist?: string;
  examPassword?: string;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Get security settings for an exam
 */
export async function getSecuritySettings(
  examId: string,
  tenantId: string
): Promise<SecuritySettings | null> {
  const pool = getPool();

  try {
    // Verify exam exists and belongs to tenant
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    // Get security settings
    const result = await pool.query(
      `SELECT 
        id, exam_id, enable_proctoring, disable_copy_paste, disable_right_click,
        require_camera, randomize_questions, randomize_options, allowed_ips,
        exam_password, created_at, updated_at
       FROM security_settings
       WHERE exam_id = $1`,
      [examId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return mapRowToSecuritySettings(row, tenantId);
  } catch (error) {
    throw new Error(
      `Failed to get security settings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create security settings for an exam
 */
export async function createSecuritySettings(
  examId: string,
  tenantId: string,
  settings: SecuritySettingsInput
): Promise<SecuritySettings> {
  const pool = getPool();

  try {
    // Validate input
    const validationErrors = validateSecuritySettings(settings);
    if (validationErrors.length > 0) {
      throw new Error(
        `Validation failed: ${validationErrors.map((e) => e.message).join(', ')}`
      );
    }

    // Verify exam exists and belongs to tenant
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    // Check if settings already exist
    const existingResult = await pool.query(
      `SELECT id FROM security_settings WHERE exam_id = $1`,
      [examId]
    );

    if (existingResult.rows.length > 0) {
      // Update existing settings
      return updateSecuritySettings(examId, tenantId, settings);
    }

    // Create new settings
    const result = await pool.query(
      `INSERT INTO security_settings (
        exam_id, enable_proctoring, disable_copy_paste, disable_right_click,
        require_camera, randomize_questions, randomize_options, allowed_ips,
        exam_password, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, exam_id, enable_proctoring, disable_copy_paste, disable_right_click,
        require_camera, randomize_questions, randomize_options, allowed_ips,
        exam_password, created_at, updated_at`,
      [
        examId,
        settings.proctoringEnabled ?? false,
        settings.copyPasteDisabled ?? false,
        settings.rightClickDisabled ?? false,
        settings.cameraRequired ?? false,
        settings.questionRandomization ?? false,
        settings.optionRandomization ?? false,
        settings.ipWhitelist ? JSON.stringify(settings.ipWhitelist.split(',').map((ip) => ip.trim())) : '[]',
        settings.examPassword ?? null,
      ]
    );

    const row = result.rows[0];
    return mapRowToSecuritySettings(row, tenantId);
  } catch (error) {
    throw new Error(
      `Failed to create security settings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update security settings for an exam
 */
export async function updateSecuritySettings(
  examId: string,
  tenantId: string,
  settings: SecuritySettingsInput
): Promise<SecuritySettings> {
  const pool = getPool();

  try {
    // Validate input
    const validationErrors = validateSecuritySettings(settings);
    if (validationErrors.length > 0) {
      throw new Error(
        `Validation failed: ${validationErrors.map((e) => e.message).join(', ')}`
      );
    }

    // Verify exam exists and belongs to tenant
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (settings.proctoringEnabled !== undefined) {
      updates.push(`enable_proctoring = $${paramIndex}`);
      values.push(settings.proctoringEnabled);
      paramIndex++;
    }

    if (settings.copyPasteDisabled !== undefined) {
      updates.push(`disable_copy_paste = $${paramIndex}`);
      values.push(settings.copyPasteDisabled);
      paramIndex++;
    }

    if (settings.rightClickDisabled !== undefined) {
      updates.push(`disable_right_click = $${paramIndex}`);
      values.push(settings.rightClickDisabled);
      paramIndex++;
    }

    if (settings.cameraRequired !== undefined) {
      updates.push(`require_camera = $${paramIndex}`);
      values.push(settings.cameraRequired);
      paramIndex++;
    }

    if (settings.questionRandomization !== undefined) {
      updates.push(`randomize_questions = $${paramIndex}`);
      values.push(settings.questionRandomization);
      paramIndex++;
    }

    if (settings.optionRandomization !== undefined) {
      updates.push(`randomize_options = $${paramIndex}`);
      values.push(settings.optionRandomization);
      paramIndex++;
    }

    if (settings.ipWhitelist !== undefined) {
      updates.push(`allowed_ips = $${paramIndex}`);
      values.push(
        settings.ipWhitelist
          ? JSON.stringify(settings.ipWhitelist.split(',').map((ip) => ip.trim()))
          : '[]'
      );
      paramIndex++;
    }

    if (settings.examPassword !== undefined) {
      updates.push(`exam_password = $${paramIndex}`);
      values.push(settings.examPassword ?? null);
      paramIndex++;
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 1) {
      // Only updated_at, just return existing settings
      return getSecuritySettings(examId, tenantId) as Promise<SecuritySettings>;
    }

    values.push(examId);

    const query = `UPDATE security_settings SET ${updates.join(', ')}
      WHERE exam_id = $${paramIndex}
      RETURNING id, exam_id, enable_proctoring, disable_copy_paste, disable_right_click,
        require_camera, randomize_questions, randomize_options, allowed_ips,
        exam_password, created_at, updated_at`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Security settings not found for exam ${examId}`);
    }

    const row = result.rows[0];
    return mapRowToSecuritySettings(row, tenantId);
  } catch (error) {
    throw new Error(
      `Failed to update security settings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete security settings for an exam
 */
export async function deleteSecuritySettings(
  examId: string,
  tenantId: string
): Promise<boolean> {
  const pool = getPool();

  try {
    // Verify exam exists and belongs to tenant
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    const result = await pool.query(
      `DELETE FROM security_settings WHERE exam_id = $1`,
      [examId]
    );

    return result.rowCount ? result.rowCount > 0 : false;
  } catch (error) {
    throw new Error(
      `Failed to delete security settings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate security settings
 */
export function validateSecuritySettings(
  settings: SecuritySettingsInput
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate IP whitelist if provided
  if (settings.ipWhitelist) {
    const ips = settings.ipWhitelist.split(',').map((ip) => ip.trim());
    for (const ip of ips) {
      if (!isValidCIDR(ip)) {
        errors.push({
          field: 'ipWhitelist',
          message: `Invalid CIDR notation: ${ip}`,
        });
      }
    }
  }

  // Validate exam password if provided
  if (settings.examPassword) {
    if (settings.examPassword.length < 4) {
      errors.push({
        field: 'examPassword',
        message: 'Exam password must be at least 4 characters',
      });
    }
    if (settings.examPassword.length > 50) {
      errors.push({
        field: 'examPassword',
        message: 'Exam password must not exceed 50 characters',
      });
    }
  }

  // Validate boolean fields
  if (settings.proctoringEnabled !== undefined && typeof settings.proctoringEnabled !== 'boolean') {
    errors.push({
      field: 'proctoringEnabled',
      message: 'Proctoring enabled must be a boolean',
    });
  }

  if (settings.cameraRequired !== undefined && typeof settings.cameraRequired !== 'boolean') {
    errors.push({
      field: 'cameraRequired',
      message: 'Camera required must be a boolean',
    });
  }

  if (settings.copyPasteDisabled !== undefined && typeof settings.copyPasteDisabled !== 'boolean') {
    errors.push({
      field: 'copyPasteDisabled',
      message: 'Copy paste disabled must be a boolean',
    });
  }

  if (settings.rightClickDisabled !== undefined && typeof settings.rightClickDisabled !== 'boolean') {
    errors.push({
      field: 'rightClickDisabled',
      message: 'Right click disabled must be a boolean',
    });
  }

  if (settings.questionRandomization !== undefined && typeof settings.questionRandomization !== 'boolean') {
    errors.push({
      field: 'questionRandomization',
      message: 'Question randomization must be a boolean',
    });
  }

  if (settings.optionRandomization !== undefined && typeof settings.optionRandomization !== 'boolean') {
    errors.push({
      field: 'optionRandomization',
      message: 'Option randomization must be a boolean',
    });
  }

  return errors;
}

/**
 * Validate CIDR notation
 */
function isValidCIDR(cidr: string): boolean {
  // Simple CIDR validation: xxx.xxx.xxx.xxx/xx or xxx.xxx.xxx.xxx
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (!cidrRegex.test(cidr)) {
    return false;
  }

  const parts = cidr.split('/');
  const ipParts = parts[0].split('.');

  // Validate IP octets
  for (const part of ipParts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) {
      return false;
    }
  }

  // Validate CIDR prefix if provided
  if (parts.length === 2) {
    const prefix = parseInt(parts[1], 10);
    if (prefix < 0 || prefix > 32) {
      return false;
    }
  }

  return true;
}

/**
 * Check if camera is available on the device
 * This is a client-side check that will be called from the frontend
 * Returns true if camera is available, false otherwise
 */
export function checkCameraAvailability(): boolean {
  // This function will be called from the client
  // It checks if the browser has access to camera via getUserMedia API
  // For now, we return a placeholder that will be implemented on the client
  return true;
}

/**
 * Enforce camera requirement for an exam
 * Verifies that if camera is required, it is available
 */
export async function enforceCameraRequirement(
  examId: string,
  tenantId: string,
  cameraAvailable: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  const pool = getPool();

  try {
    // Get security settings for the exam
    const settings = await getSecuritySettings(examId, tenantId);

    if (!settings) {
      // No security settings, camera not required
      return { allowed: true };
    }

    // If camera is not required, allow access
    if (!settings.cameraRequired) {
      return { allowed: true };
    }

    // Camera is required, check if available
    if (!cameraAvailable) {
      return {
        allowed: false,
        reason: 'Camera is required for this exam but is not available on your device',
      };
    }

    // Camera is required and available
    return { allowed: true };
  } catch (error) {
    throw new Error(
      `Failed to enforce camera requirement: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Map database row to SecuritySettings interface
 */
function mapRowToSecuritySettings(row: any, tenantId: string): SecuritySettings {
  const ipWhitelist = row.allowed_ips ? JSON.parse(row.allowed_ips).join(', ') : '';

  return {
    id: row.id,
    examId: row.exam_id,
    tenantId,
    proctoringEnabled: row.enable_proctoring,
    cameraRequired: row.require_camera,
    copyPasteDisabled: row.disable_copy_paste,
    rightClickDisabled: row.disable_right_click,
    questionRandomization: row.randomize_questions,
    optionRandomization: row.randomize_options,
    ipWhitelist: ipWhitelist || undefined,
    examPassword: row.exam_password || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Simple seeded random number generator for deterministic randomization
 * Uses student ID as seed to ensure same student always gets same order
 */
function seededRandom(seed: string, index: number): number {
  // Convert seed string to a number using a better hash function
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) + seed.charCodeAt(i);
  }

  // Mix in the index for additional variation
  hash = hash ^ (index * 2654435761);
  hash = hash & hash; // Convert to 32bit integer

  // Use the hash to generate a pseudo-random number between 0 and 1
  const x = Math.sin(hash + index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Fisher-Yates shuffle algorithm with seeded randomization
 * Ensures deterministic but unique ordering per student
 */
function shuffleArray<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate a pseudo-random index using the seed and current position
    const randomValue = seededRandom(seed, shuffled.length - i);
    const j = Math.floor(randomValue * (i + 1));

    // Swap elements
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Generate deterministic but unique question order per student
 * Same student always gets same order, different students get different orders
 */
export function generateQuestionOrder(
  examId: string,
  studentId: string,
  questions: Array<{ id: string; [key: string]: any }>
): Array<{ id: string; [key: string]: any }> {
  // Use combination of examId and studentId as seed for deterministic randomization
  const seed = `${examId}:${studentId}`;
  return shuffleArray(questions, seed);
}

/**
 * Get randomized questions for a specific student
 * Returns questions in randomized order if randomization is enabled
 * Returns questions in original order if randomization is disabled
 */
export async function getRandomizedQuestions(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<Array<{ id: string; question_id: string; question_order: number; marks: number; text: string; type: string; options: any; difficulty: string; subject: string }>> {
  const pool = getPool();

  try {
    // Verify exam exists and belongs to tenant
    const examResult = await pool.query(
      `SELECT id FROM exams WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [examId, tenantId]
    );

    if (examResult.rows.length === 0) {
      throw new Error(`Exam ${examId} not found`);
    }

    // Get security settings to check if randomization is enabled
    const securityResult = await pool.query(
      `SELECT randomize_questions FROM security_settings WHERE exam_id = $1`,
      [examId]
    );

    const randomizeQuestions = securityResult.rows.length > 0 
      ? securityResult.rows[0].randomize_questions 
      : false;

    // Get exam questions with question details
    const questionsResult = await pool.query(
      `SELECT 
        eq.id,
        eq.question_id,
        eq.question_order,
        eq.marks,
        qb.text,
        qb.type,
        qb.options,
        qb.difficulty,
        qb.subject
       FROM exam_questions eq
       JOIN questions_bank qb ON eq.question_id = qb.id
       WHERE eq.exam_id = $1
       ORDER BY eq.question_order ASC`,
      [examId]
    );

    const questions = questionsResult.rows;

    if (questions.length === 0) {
      return [];
    }

    // If randomization is disabled, return in original order
    if (!randomizeQuestions) {
      return questions;
    }

    // If randomization is enabled, shuffle using student ID as seed
    const randomizedQuestions = generateQuestionOrder(examId, studentId, questions);

    return randomizedQuestions;
  } catch (error) {
    throw new Error(
      `Failed to get randomized questions: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Randomize answer options for a question
 * Uses seeded randomization to ensure same student always gets same order
 * but different students get different orders
 */
export function randomizeOptions(
  options: string[],
  seed: string
): string[] {
  if (!Array.isArray(options) || options.length === 0) {
    return options;
  }

  // Use Fisher-Yates shuffle with seeded randomization
  return shuffleArray(options, seed);
}

/**
 * Get randomized options for a specific question and student
 * Returns options in randomized order if option randomization is enabled
 * Returns options in original order if option randomization is disabled
 */
export async function getRandomizedOptions(
  examId: string,
  studentId: string,
  questionId: string,
  options: string[],
  tenantId: string
): Promise<string[]> {
  const pool = getPool();

  try {
    // Get security settings to check if option randomization is enabled
    const securityResult = await pool.query(
      `SELECT randomize_options FROM security_settings WHERE exam_id = $1`,
      [examId]
    );

    const shouldRandomizeOptions = securityResult.rows.length > 0 
      ? securityResult.rows[0].randomize_options 
      : false;

    // If randomization is disabled, return in original order
    if (!shouldRandomizeOptions) {
      return options;
    }

    // If randomization is enabled, shuffle using combination of studentId and questionId as seed
    const seed = `${examId}:${studentId}:${questionId}`;
    return randomizeOptions(options, seed);
  } catch (error) {
    throw new Error(
      `Failed to get randomized options: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get randomized questions with randomized options for a specific student
 * Returns questions and options in randomized order if enabled
 */
export async function getRandomizedQuestionsWithOptions(
  examId: string,
  studentId: string,
  tenantId: string
): Promise<Array<{ id: string; question_id: string; question_order: number; marks: number; text: string; type: string; options: string[]; difficulty: string; subject: string }>> {
  const pool = getPool();

  try {
    // Get randomized questions (with randomized question order if enabled)
    const questions = await getRandomizedQuestions(examId, studentId, tenantId);

    // Get security settings to check if option randomization is enabled
    const securityResult = await pool.query(
      `SELECT randomize_options FROM security_settings WHERE exam_id = $1`,
      [examId]
    );

    const shouldRandomizeOptions = securityResult.rows.length > 0 
      ? securityResult.rows[0].randomize_options 
      : false;

    // If option randomization is disabled, return questions as-is
    if (!shouldRandomizeOptions) {
      return questions;
    }

    // If option randomization is enabled, randomize options for each question
    const questionsWithRandomizedOptions = questions.map(question => {
      const seed = `${examId}:${studentId}:${question.question_id}`;
      const randomizedOpts = randomizeOptions(question.options, seed);
      
      return {
        ...question,
        options: randomizedOpts,
      };
    });

    return questionsWithRandomizedOptions;
  } catch (error) {
    throw new Error(
      `Failed to get randomized questions with options: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Convert an IP address string to a 32-bit integer
 */
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

/**
 * Check if an IP address is within a CIDR range
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  // Validate the IP address format
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return false;
  }

  // Validate IP octets
  const ipOctets = ip.split('.');
  for (const octet of ipOctets) {
    const num = parseInt(octet, 10);
    if (num < 0 || num > 255) return false;
  }

  // Handle plain IP (no CIDR prefix) — exact match
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  if (prefix < 0 || prefix > 32) return false;

  const ipInt = ipToInt(ip);
  const networkInt = ipToInt(network);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  return (ipInt & mask) === (networkInt & mask);
}

/**
 * Validate a student's IP address against the exam's IP whitelist
 * Returns { allowed: true } if the IP is whitelisted or no whitelist is set
 * Returns { allowed: false, reason } if the IP is blocked
 */
export async function validateIPWhitelist(
  examId: string,
  tenantId: string,
  studentIP: string
): Promise<{ allowed: boolean; reason?: string }> {
  const pool = getPool();

  try {
    // Get security settings for the exam
    const securityResult = await pool.query(
      `SELECT allowed_ips FROM security_settings WHERE exam_id = $1`,
      [examId]
    );

    // No security settings — allow all IPs
    if (securityResult.rows.length === 0) {
      return { allowed: true };
    }

    const allowedIPs: string[] = JSON.parse(securityResult.rows[0].allowed_ips || '[]');

    // Empty whitelist — allow all IPs
    if (!allowedIPs || allowedIPs.length === 0) {
      return { allowed: true };
    }

    // Check if student IP matches any whitelisted CIDR
    const isAllowed = allowedIPs.some((cidr) => isIPInCIDR(studentIP, cidr.trim()));

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Access denied: your IP address (${studentIP}) is not in the allowed list for this exam`,
      };
    }

    return { allowed: true };
  } catch (error) {
    throw new Error(
      `Failed to validate IP whitelist: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if an IP address string is valid (IPv4)
 */
export function isValidIPv4(ip: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;

  return ip.split('.').every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Hash an exam password using argon2
 * Returns the hashed password string
 */
export async function hashExamPassword(password: string): Promise<string> {
  const { hash } = await import('@node-rs/argon2');
  return hash(password);
}

/**
 * Verify an exam password against its stored hash
 * Returns true if the password matches, false otherwise
 */
export async function verifyExamPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const { verify } = await import('@node-rs/argon2');
  try {
    return await verify(hashedPassword, password);
  } catch {
    return false;
  }
}

/**
 * Validate that a student has provided the correct exam password
 * Returns { allowed: true } if password is correct or no password is set
 * Returns { allowed: false, reason } if password is wrong
 */
export async function validateExamPassword(
  examId: string,
  tenantId: string,
  providedPassword: string | undefined
): Promise<{ allowed: boolean; reason?: string }> {
  const pool = getPool();

  try {
    // Get security settings for the exam
    const securityResult = await pool.query(
      `SELECT exam_password FROM security_settings WHERE exam_id = $1`,
      [examId]
    );

    // No security settings — no password required
    if (securityResult.rows.length === 0) {
      return { allowed: true };
    }

    const storedPassword: string | null = securityResult.rows[0].exam_password;

    // No password set — allow access
    if (!storedPassword) {
      return { allowed: true };
    }

    // Password is required but not provided
    if (!providedPassword) {
      return {
        allowed: false,
        reason: 'This exam requires a password. Please enter the exam password to proceed.',
      };
    }

    // Verify the provided password
    const isCorrect = await verifyExamPassword(providedPassword, storedPassword);

    if (!isCorrect) {
      return {
        allowed: false,
        reason: 'Incorrect exam password. Please try again.',
      };
    }

    return { allowed: true };
  } catch (error) {
    throw new Error(
      `Failed to validate exam password: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Store a hashed exam password in the security settings
 * Hashes the password before storing
 */
export async function setExamPassword(
  examId: string,
  tenantId: string,
  plainPassword: string
): Promise<void> {
  const pool = getPool();

  try {
    // Validate password length
    if (plainPassword.length < 4) {
      throw new Error('Exam password must be at least 4 characters');
    }
    if (plainPassword.length > 50) {
      throw new Error('Exam password must not exceed 50 characters');
    }

    // Hash the password
    const hashedPassword = await hashExamPassword(plainPassword);

    // Update or insert security settings with hashed password
    await pool.query(
      `INSERT INTO security_settings (exam_id, exam_password, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (exam_id) DO UPDATE SET
         exam_password = EXCLUDED.exam_password,
         updated_at = CURRENT_TIMESTAMP`,
      [examId, hashedPassword]
    );
  } catch (error) {
    throw new Error(
      `Failed to set exam password: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
