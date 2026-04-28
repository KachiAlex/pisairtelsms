/**
 * Data Encryption Service for CBT System
 * Encrypts questions at rest, exam passwords, proctoring logs, and student answers
 * Requirements: 5.1
 */

import crypto from 'crypto';

/**
 * Encryption configuration
 */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.CBT_ENCRYPTION_KEY || 'default-key-change-in-production';
const ENCRYPTION_IV_LENGTH = 16;
const ENCRYPTION_AUTH_TAG_LENGTH = 16;

/**
 * Derive a 256-bit key from the encryption key
 */
function deriveKey(key: string): Buffer {
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt data using AES-256-GCM
 * Returns encrypted data with IV and auth tag prepended
 */
export function encryptData(data: string): string {
  try {
    const key = deriveKey(ENCRYPTION_KEY);
    const iv = crypto.randomBytes(ENCRYPTION_IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;

    return combined;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * Expects data with IV and auth tag prepended
 */
export function decryptData(encryptedData: string): string {
  try {
    const key = deriveKey(ENCRYPTION_KEY);

    // Extract IV, authTag, and encrypted data
    const iv = Buffer.from(encryptedData.substring(0, ENCRYPTION_IV_LENGTH * 2), 'hex');
    const authTag = Buffer.from(
      encryptedData.substring(ENCRYPTION_IV_LENGTH * 2, ENCRYPTION_IV_LENGTH * 2 + ENCRYPTION_AUTH_TAG_LENGTH * 2),
      'hex'
    );
    const encrypted = encryptedData.substring(ENCRYPTION_IV_LENGTH * 2 + ENCRYPTION_AUTH_TAG_LENGTH * 2);

    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash data using SHA-256
 * Used for password hashing and data integrity verification
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify hashed data
 */
export function verifyHashedData(data: string, hash: string): boolean {
  return hashData(data) === hash;
}

/**
 * Encrypt question text
 */
export function encryptQuestion(questionText: string): string {
  return encryptData(questionText);
}

/**
 * Decrypt question text
 */
export function decryptQuestion(encryptedText: string): string {
  return decryptData(encryptedText);
}

/**
 * Encrypt exam password using bcrypt-like approach
 * For now, we'll use a simple hash with salt
 */
export async function hashExamPassword(password: string): Promise<string> {
  try {
    // Use argon2 if available, otherwise use bcrypt
    try {
      const { hash } = await import('@node-rs/argon2');
      return await hash(password);
    } catch {
      // Fallback to bcrypt
      const bcrypt = await import('bcrypt');
      return await bcrypt.hash(password, 10);
    }
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify exam password
 */
export async function verifyExamPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Try argon2 first
    try {
      const { verify } = await import('@node-rs/argon2');
      return await verify(hash, password);
    } catch {
      // Fallback to bcrypt
      const bcrypt = await import('bcrypt');
      return await bcrypt.compare(password, hash);
    }
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Encrypt proctoring log details
 */
export function encryptProctoringLog(logDetails: Record<string, any>): string {
  const jsonString = JSON.stringify(logDetails);
  return encryptData(jsonString);
}

/**
 * Decrypt proctoring log details
 */
export function decryptProctoringLog(encryptedLog: string): Record<string, any> {
  const jsonString = decryptData(encryptedLog);
  return JSON.parse(jsonString);
}

/**
 * Encrypt student answer
 */
export function encryptStudentAnswer(answer: string): string {
  return encryptData(answer);
}

/**
 * Decrypt student answer
 */
export function decryptStudentAnswer(encryptedAnswer: string): string {
  return decryptData(encryptedAnswer);
}

/**
 * Encrypt student answers object
 */
export function encryptStudentAnswers(answers: Record<string, any>): string {
  const jsonString = JSON.stringify(answers);
  return encryptData(jsonString);
}

/**
 * Decrypt student answers object
 */
export function decryptStudentAnswers(encryptedAnswers: string): Record<string, any> {
  const jsonString = decryptData(encryptedAnswers);
  return JSON.parse(jsonString);
}

/**
 * Generate a random encryption key
 * Should be called once and stored securely
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt data for transmission (TLS should be used in production)
 * This adds an additional layer of encryption for sensitive data in transit
 */
export function encryptForTransmission(data: string): string {
  return encryptData(data);
}

/**
 * Decrypt data received from transmission
 */
export function decryptFromTransmission(encryptedData: string): string {
  return decryptData(encryptedData);
}

/**
 * Create a hash for data integrity verification
 */
export function createIntegrityHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify data integrity
 */
export function verifyIntegrity(data: string, hash: string): boolean {
  return createIntegrityHash(data) === hash;
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'answer', 'studentAnswer'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
