export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  custom?: (value: unknown) => string | null
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

/**
 * Validate a data object against a schema.
 */
export function validate(data: Record<string, unknown>, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string> = {}

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field]

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`
      continue
    }

    // Skip other validations if value is empty and not required
    if (value === undefined || value === null || value === '') {
      continue
    }

    const strValue = String(value)

    // Min length
    if (rules.minLength && strValue.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`
    }

    // Max length
    if (rules.maxLength && strValue.length > rules.maxLength) {
      errors[field] = `${field} must not exceed ${rules.maxLength} characters`
    }

    // Pattern
    if (rules.pattern && !rules.pattern.test(strValue)) {
      errors[field] = `${field} format is invalid`
    }

    // Email
    if (rules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(strValue)) {
        errors[field] = `${field} must be a valid email address`
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value)
      if (customError) {
        errors[field] = customError
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Common validation schemas.
 */
export const Schemas = {
  login: {
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
  },
  staffLogin: {
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
  },
  studentLogin: {
    admissionNumber: { required: true, minLength: 3 },
    password: { required: true, minLength: 6 },
  },
  passwordChange: {
    currentPassword: { required: true },
    newPassword: { required: true, minLength: 8 },
  },
  parentProfile: {
    email: { email: true },
    phone: { pattern: /^\+?[\d\s-]{10,}$/ },
  },
  studentProfile: {
    email: { email: true },
    phone: { pattern: /^\+?[\d\s-]{10,}$/ },
  },
}
