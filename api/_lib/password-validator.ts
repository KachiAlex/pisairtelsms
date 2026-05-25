export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  forbiddenPatterns?: RegExp[]
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}

/**
 * Validate a password against the given policy.
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_POLICY
): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`)
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  // Check for forbidden patterns (e.g., common passwords, sequences)
  if (policy.forbiddenPatterns) {
    for (const pattern of policy.forbiddenPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains a forbidden pattern')
        break
      }
    }
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password1', 'admin', 'welcome', 'letmein', 'monkey'
  ]
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common')
  }

  // Check for sequential characters
  if (/(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    errors.push('Password contains sequential characters')
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password contains repeated characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check password strength (returns a score 0-4).
 */
export function getPasswordStrength(password: string): number {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++

  // Normalize to 0-4
  return Math.min(score, 4)
}

/**
 * Get password strength label.
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
  return labels[strength] || 'Unknown'
}
