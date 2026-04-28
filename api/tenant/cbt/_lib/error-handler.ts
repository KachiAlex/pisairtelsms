/**
 * Centralized Error Handling and Response Formatting
 * Provides consistent error responses with request IDs and user-friendly messages
 * Requirements: 7.6, 8.2
 */

import { NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from './types';

/**
 * Error types for categorization
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL',
}

/**
 * Error details for logging and response
 */
export interface ErrorDetails {
  type: ErrorType;
  message: string;
  statusCode: number;
  validationErrors?: Record<string, string>;
  context?: Record<string, any>;
  originalError?: Error;
}

/**
 * Generate a unique request ID for debugging
 */
export function generateRequestId(): string {
  return `req-${uuidv4().substring(0, 8)}`;
}

/**
 * Log error with context
 */
export function logError(
  requestId: string,
  error: ErrorDetails,
  additionalContext?: Record<string, any>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    type: error.type,
    message: error.message,
    statusCode: error.statusCode,
    context: { ...error.context, ...additionalContext },
    originalError: error.originalError?.message,
    stack: error.originalError?.stack,
  };

  console.error('[CBT Error]', JSON.stringify(logEntry, null, 2));
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: ErrorDetails): string {
  switch (error.type) {
    case ErrorType.VALIDATION:
      return 'The provided data is invalid. Please check the highlighted fields and try again.';
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
    case ErrorType.UNAUTHORIZED:
      return 'You are not authorized to perform this action. Please log in.';
    case ErrorType.FORBIDDEN:
      return 'You do not have permission to access this resource.';
    case ErrorType.CONFLICT:
      return 'This resource already exists or conflicts with existing data.';
    case ErrorType.DATABASE:
      return 'A database error occurred. Please try again later.';
    case ErrorType.NETWORK:
      return 'A network error occurred. Please check your connection and try again.';
    case ErrorType.INTERNAL:
      return 'An unexpected error occurred. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}

/**
 * Send error response with consistent format
 */
export function sendErrorResponse<T = any>(
  res: NextApiResponse<ApiResponse<T>>,
  error: ErrorDetails,
  requestId: string
): void {
  const userMessage = getUserFriendlyMessage(error);

  const response: ApiResponse<T> = {
    success: false,
    error: userMessage,
    requestId,
  };

  if (error.validationErrors) {
    response.validationErrors = error.validationErrors;
  }

  res.status(error.statusCode).json(response);
}

/**
 * Create validation error
 */
export function createValidationError(
  validationErrors: Record<string, string>,
  context?: Record<string, any>
): ErrorDetails {
  return {
    type: ErrorType.VALIDATION,
    message: 'Validation failed',
    statusCode: 400,
    validationErrors,
    context,
  };
}

/**
 * Create not found error
 */
export function createNotFoundError(
  resource: string,
  context?: Record<string, any>
): ErrorDetails {
  return {
    type: ErrorType.NOT_FOUND,
    message: `${resource} not found`,
    statusCode: 404,
    context,
  };
}

/**
 * Create unauthorized error
 */
export function createUnauthorizedError(
  context?: Record<string, any>
): ErrorDetails {
  return {
    type: ErrorType.UNAUTHORIZED,
    message: 'Unauthorized',
    statusCode: 401,
    context,
  };
}

/**
 * Create forbidden error
 */
export function createForbiddenError(
  context?: Record<string, any>
): ErrorDetails {
  return {
    type: ErrorType.FORBIDDEN,
    message: 'Forbidden',
    statusCode: 403,
    context,
  };
}

/**
 * Create conflict error
 */
export function createConflictError(
  message: string,
  context?: Record<string, any>
): ErrorDetails {
  return {
    type: ErrorType.CONFLICT,
    message,
    statusCode: 409,
    context,
  };
}

/**
 * Create database error
 */
export function createDatabaseError(
  originalError: Error,
  context?: Record<string, any>
): ErrorDetails {
  return {
    type: ErrorType.DATABASE,
    message: 'Database operation failed',
    statusCode: 500,
    context,
    originalError,
  };
}

/**
 * Create network error
 */
export function createNetworkError(
  originalError: Error,
  context?: Record<string, any>
): ErrorDetails {
  return {
    type: ErrorType.NETWORK,
    message: 'Network error occurred',
    statusCode: 503,
    context,
    originalError,
  };
}

/**
 * Create internal error
 */
export function createInternalError(
  originalError: Error,
  context?: Record<string, any>
): ErrorDetails {
  return {
    type: ErrorType.INTERNAL,
    message: 'Internal server error',
    statusCode: 500,
    context,
    originalError,
  };
}

/**
 * Retry configuration for transient errors
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: ErrorDetails): boolean {
  return (
    error.type === ErrorType.NETWORK ||
    error.type === ErrorType.DATABASE ||
    (error.statusCode >= 500 && error.statusCode < 600)
  );
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxRetries) {
        const delay = calculateRetryDelay(attempt, config);
        if (onRetry) {
          onRetry(attempt, lastError);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
