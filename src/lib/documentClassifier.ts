interface DocumentClassification {
  category: string
  confidence: number
  keywords: string[]
  validationRules: ValidationRule[]
  suggestedName?: string
  metadata: {
    detectedType: 'academic' | 'medical' | 'financial' | 'conduct' | 'administrative' | 'other'
    hasPersonalInfo: boolean
    requiresApproval: boolean
    expiryDate?: string
    studentName?: string
    documentType: string
  }
}

interface ValidationRule {
  rule: string
  description: string
  severity: 'error' | 'warning' | 'info'
  isRequired: boolean
  validator: (content: string, metadata?: any) => ValidationResult
}

interface ValidationResult {
  passed: boolean
  message: string
  suggestion?: string
}

class DocumentClassifier {
  private static readonly DOCUMENT_TYPES = {
    academic: {
      keywords: [
        'transcript', 'result', 'grade', 'score', 'exam', 'test', 'assessment',
        'report card', 'academic record', 'certificate', 'diploma', 'qualification',
        'continuous assessment', 'term result', 'final grade'
      ],
      categories: ['Academic Transcript', 'Exam Result', 'Report Card', 'Certificate', 'Assessment Record']
    },
    medical: {
      keywords: [
        'medical', 'health', 'immunization', 'vaccination', 'doctor', 'clinic',
        'hospital', 'sick', 'illness', 'treatment', 'prescription', 'diagnosis',
        'sickle cell', 'genotype', 'blood test', 'medical clearance', 'health record'
      ],
      categories: ['Medical Clearance', 'Immunization Record', 'Sickle Cell Test', 'Health Certificate', 'Medical Report']
    },
    financial: {
      keywords: [
        'fee', 'payment', 'tuition', 'scholarship', 'bursary', 'financial',
        'invoice', 'receipt', 'bank', 'account', 'loan', 'grant', 'aid',
        'financial statement', 'fee structure', 'payment plan'
      ],
      categories: ['Fee Payment Receipt', 'Scholarship Award', 'Financial Statement', 'Invoice', 'Payment Record']
    },
    conduct: {
      keywords: [
        'conduct', 'behavior', 'discipline', 'disciplinary', 'warning', 'suspension',
        'contract', 'agreement', 'code of conduct', 'behavior contract', 'counseling',
        'disciplinary action', 'behavior record', 'conduct certificate'
      ],
      categories: ['Behavior Contract', 'Disciplinary Record', 'Conduct Certificate', 'Counseling Report', 'Warning Letter']
    },
    administrative: {
      keywords: [
        'admission', 'enrollment', 'registration', 'application', 'form',
        'consent', 'permission', 'authorization', 'boarding', 'transport',
        'emergency contact', 'parent consent', 'boarding agreement'
      ],
      categories: ['Admission Form', 'Boarding Consent', 'Transport Consent', 'Emergency Contact', 'Parent Authorization']
    }
  }

  private static readonly VALIDATION_RULES: Record<string, ValidationRule[]> = {
    'Medical Clearance': [
      {
        rule: 'expiry_check',
        description: 'Medical documents should have valid expiry dates',
        severity: 'warning',
        isRequired: true,
        validator: (content, metadata) => {
          // Check for expiry date patterns
          const expiryPatterns = [
            /expir(?:y|es)?\s*(?:date|on)?:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
            /valid\s*(?:until|through|to)?:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
            /(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s*exp/i
          ]

          for (const pattern of expiryPatterns) {
            const match = content.match(pattern)
            if (match) {
              return { passed: true, message: 'Expiry date found' }
            }
          }

          return {
            passed: false,
            message: 'No expiry date found',
            suggestion: 'Please ensure the medical document includes a valid expiry date'
          }
        }
      },
      {
        rule: 'personal_info',
        description: 'Should contain student personal information',
        severity: 'error',
        isRequired: true,
        validator: (content) => {
          const personalInfoPatterns = [
            /(?:name|student)[\s:]+([A-Za-z\s]+)/i,
            /date\s*of\s*birth/i,
            /student\s*id|admission\s*no/i
          ]

          const matches = personalInfoPatterns.filter(pattern => pattern.test(content))

          if (matches.length >= 2) {
            return { passed: true, message: 'Personal information found' }
          }

          return {
            passed: false,
            message: 'Missing required personal information',
            suggestion: 'Document should include student name, date of birth, or student ID'
          }
        }
      }
    ],
    'Academic Transcript': [
      {
        rule: 'grade_structure',
        description: 'Should contain proper grading structure',
        severity: 'warning',
        isRequired: false,
        validator: (content) => {
          const gradePatterns = [
            /(?:grade|score|mark)[s]?\s*:?\s*[A-F0-9]/i,
            /percentage|percent/i,
            /GPA|CGPA/i
          ]

          const hasGrades = gradePatterns.some(pattern => pattern.test(content))

          if (hasGrades) {
            return { passed: true, message: 'Grade information found' }
          }

          return {
            passed: false,
            message: 'No grade information detected',
            suggestion: 'Academic documents should include grades, scores, or percentages'
          }
        }
      },
      {
        rule: 'subject_list',
        description: 'Should list academic subjects',
        severity: 'info',
        isRequired: false,
        validator: (content) => {
          const subjectKeywords = [
            'mathematics', 'english', 'science', 'physics', 'chemistry', 'biology',
            'history', 'geography', 'civic', 'economics', 'commerce', 'art',
            'music', 'physical education', 'computer', 'french', 'yoruba', 'hausa'
          ]

          const foundSubjects = subjectKeywords.filter(subject =>
            content.toLowerCase().includes(subject.toLowerCase())
          )

          if (foundSubjects.length > 0) {
            return { passed: true, message: `Found ${foundSubjects.length} subject(s)` }
          }

          return {
            passed: false,
            message: 'No academic subjects detected',
            suggestion: 'Academic transcripts should list subjects and their grades'
          }
        }
      }
    ],
    'Fee Payment Receipt': [
      {
        rule: 'payment_details',
        description: 'Should contain payment information',
        severity: 'error',
        isRequired: true,
        validator: (content) => {
          const paymentPatterns = [
            /(?:amount|paid|sum)[\s:]+(?:₦|#|NGN|Naira)?\s*[\d,]+(?:\.\d{2})?/i,
            /(?:receipt|payment)\s*(?:no|number|#)[\s:]+[\w\d-]+/i,
            /(?:date|time)\s*of\s*payment/i
          ]

          const matches = paymentPatterns.filter(pattern => pattern.test(content))

          if (matches.length >= 2) {
            return { passed: true, message: 'Payment details found' }
          }

          return {
            passed: false,
            message: 'Missing payment information',
            suggestion: 'Receipts should include amount, receipt number, and payment date'
          }
        }
      }
    ],
    'Behavior Contract': [
      {
        rule: 'contract_terms',
        description: 'Should contain contract terms and conditions',
        severity: 'warning',
        isRequired: true,
        validator: (content) => {
          const contractPatterns = [
            /(?:agree|agreement|contract|terms)/i,
            /(?:sign|signature|signed)/i,
            /(?:consequence|penalty|punishment)/i,
            /(?:behavior|conduct|discipline)/i
          ]

          const matches = contractPatterns.filter(pattern => pattern.test(content))

          if (matches.length >= 3) {
            return { passed: true, message: 'Contract terms found' }
          }

          return {
            passed: false,
            message: 'Missing contract terms',
            suggestion: 'Behavior contracts should include terms, consequences, and signatures'
          }
        }
      }
    ]
  }

  static async classifyDocument(
    fileName: string,
    fileType: string,
    extractedText: string,
    fileSize: number
  ): Promise<DocumentClassification> {
    // Extract keywords from filename and content
    const allKeywords = this.extractKeywords(fileName + ' ' + extractedText)

    // Determine document type based on keywords
    const typeScores = this.calculateTypeScores(allKeywords)

    // Find the best matching type
    const bestType = Object.entries(typeScores).reduce((a, b) =>
      typeScores[a[0]] > typeScores[b[0]] ? a : b
    )[0] as keyof typeof this.DOCUMENT_TYPES

    const confidence = typeScores[bestType]
    const typeData = this.DOCUMENT_TYPES[bestType]

    // Suggest specific category
    const category = this.suggestCategory(extractedText, typeData.categories)

    // Get validation rules for the suggested category
    const validationRules = this.VALIDATION_RULES[category] || []

    // Extract metadata
    const metadata = this.extractMetadata(extractedText, bestType, category)

    return {
      category,
      confidence: Math.round(confidence * 100) / 100,
      keywords: allKeywords.slice(0, 10), // Top 10 keywords
      validationRules,
      suggestedName: this.generateSuggestedName(fileName, category, metadata),
      metadata
    }
  }

  private static extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, use NLP library
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)

    // Count word frequency
    const wordCount: Record<string, number> = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    // Return most frequent words
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word]) => word)
  }

  private static calculateTypeScores(keywords: string[]): Record<string, number> {
    const scores: Record<string, number> = {}

    for (const [type, data] of Object.entries(this.DOCUMENT_TYPES)) {
      let score = 0
      const typeKeywords = data.keywords

      for (const keyword of keywords) {
        for (const typeKeyword of typeKeywords) {
          if (keyword.includes(typeKeyword) || typeKeyword.includes(keyword)) {
            score += 1
          }
        }
      }

      // Normalize score by keyword count
      scores[type] = score / Math.max(keywords.length, 1)
    }

    return scores
  }

  private static suggestCategory(text: string, categories: string[]): string {
    // Simple category suggestion - in production, use ML classification
    for (const category of categories) {
      const categoryWords = category.toLowerCase().split(' ')
      const textLower = text.toLowerCase()

      const matches = categoryWords.filter(word => textLower.includes(word))
      if (matches.length > 0) {
        return category
      }
    }

    return categories[0] // Default to first category
  }

  private static extractMetadata(
    text: string,
    type: keyof typeof this.DOCUMENT_TYPES,
    category: string
  ): DocumentClassification['metadata'] {
    const metadata: DocumentClassification['metadata'] = {
      detectedType: type,
      hasPersonalInfo: false,
      requiresApproval: false,
      documentType: category
    }

    // Check for personal information
    const personalInfoPatterns = [
      /(?:name|student)[\s:]+([A-Za-z\s]+)/i,
      /date\s*of\s*birth/i,
      /student\s*id|admission\s*no/i,
      /(?:phone|mobile|contact)/i
    ]

    metadata.hasPersonalInfo = personalInfoPatterns.some(pattern => pattern.test(text))

    // Check if approval is required
    const approvalRequiredTypes = ['Medical Clearance', 'Behavior Contract', 'Disciplinary Record']
    metadata.requiresApproval = approvalRequiredTypes.includes(category)

    // Try to extract student name
    const nameMatch = text.match(/(?:student|name)[\s:]+([A-Za-z\s]{3,30})/i)
    if (nameMatch) {
      metadata.studentName = nameMatch[1].trim()
    }

    // Try to extract expiry date
    const expiryPatterns = [
      /expir(?:y|es)?\s*(?:date|on)?:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
      /valid\s*(?:until|through|to)?:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i
    ]

    for (const pattern of expiryPatterns) {
      const match = text.match(pattern)
      if (match) {
        metadata.expiryDate = match[1]
        break
      }
    }

    return metadata
  }

  private static generateSuggestedName(
    originalName: string,
    category: string,
    metadata: DocumentClassification['metadata']
  ): string {
    const parts = []

    if (metadata.studentName) {
      parts.push(metadata.studentName.replace(/\s+/g, '_'))
    }

    parts.push(category.replace(/\s+/g, '_'))

    if (metadata.expiryDate) {
      parts.push(metadata.expiryDate.replace(/[/]/g, '-'))
    }

    const baseName = parts.join('_')
    const extension = originalName.split('.').pop() || 'pdf'

    return `${baseName}.${extension}`
  }

  static async validateDocument(
    category: string,
    extractedText: string,
    metadata?: any
  ): Promise<ValidationResult[]> {
    const rules = this.VALIDATION_RULES[category] || []
    const results: ValidationResult[] = []

    for (const rule of rules) {
      const result = rule.validator(extractedText, metadata)
      results.push({
        passed: result.passed,
        message: `${rule.description}: ${result.message}`,
        suggestion: result.suggestion
      })
    }

    return results
  }

  static getDocumentCategories(): Record<string, string[]> {
    const categories: Record<string, string[]> = {}

    for (const [type, data] of Object.entries(this.DOCUMENT_TYPES)) {
      categories[type] = data.categories
    }

    return categories
  }

  static getValidationRulesForCategory(category: string): ValidationRule[] {
    return this.VALIDATION_RULES[category] || []
  }
}

// Export types and main class
export type { DocumentClassification, ValidationRule, ValidationResult }
export { DocumentClassifier }
