import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Secure error response that doesn't leak sensitive information.
 * Logs full error details server-side but returns safe message to client.
 */
export function handleError(
  error: unknown,
  req: VercelRequest,
  res: VercelResponse,
  context?: string
): void {
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Generate error reference ID for tracking
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Log full error details server-side (never exposed to client)
  const errorMessage = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  
  console.error(`[${errorId}] Error in ${context || 'API'}:`, {
    message: errorMessage,
    stack: stack,
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  })
  
  // Return safe error response to client
  const statusCode = res.statusCode >= 400 ? res.statusCode : 500
  
  const response: Record<string, unknown> = {
    error: 'Internal server error',
    errorId, // Client can reference this when reporting issues
  }
  
  // Only include details in non-production environments
  if (!isProduction) {
    response.message = errorMessage
    if (stack) {
      response.stack = stack.split('\n').slice(0, 5) // Limit stack trace
    }
  }
  
  res.status(statusCode).json(response)
}

/**
 * Async handler wrapper that catches errors and applies secure handling.
 */
export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  context?: string
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await handler(req, res)
    } catch (error) {
      handleError(error, req, res, context)
    }
  }
}

/**
 * Validate that required environment variables are set.
 * Throws error with helpful message if any are missing.
 */
export function validateEnvVars(required: string[]): void {
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
