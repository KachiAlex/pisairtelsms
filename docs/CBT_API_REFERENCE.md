# CBT Dashboard API Reference

**Version**: 1.0.0  
**Last Updated**: April 28, 2026  
**Base URL**: `https://api.scholarx.app/api/tenant/cbt`

## Table of Contents

1. [Authentication](#authentication)
2. [Question Bank API](#question-bank-api)
3. [Exam Management API](#exam-management-api)
4. [Live Monitoring API](#live-monitoring-api)
5. [Exam Results API](#exam-results-api)
6. [Security Settings API](#security-settings-api)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

All CBT API endpoints require JWT authentication via Bearer token.

**Header**: `Authorization: Bearer <token>`

**Example**:
```bash
curl -X GET https://api.scholarx.app/api/tenant/cbt/questions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Question Bank API

### GET /questions

Retrieve all questions with optional filtering and pagination.

**Authentication**: Required

**Query Parameters**:
- `tenantId` (required): Tenant identifier
- `subject` (optional): Filter by subject
- `difficulty` (optional): Filter by difficulty (Easy, Medium, Hard)
- `type` (optional): Filter by type (objective, truefalse, essay)
- `searchText` (optional): Search in question text
- `tags` (optional): Filter by tags (comma-separated)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "q-123",
      "tenantId": "tenant-456",
      "text": "What is the capital of France?",
      "type": "objective",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correctAnswer": "Paris",
      "difficulty": "Easy",
      "subject": "Geography",
      "tags": ["capitals", "europe"],
      "createdBy": "user-789",
      "createdAt": "2026-04-27T10:30:00Z",
      "updatedAt": "2026-04-27T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

**Error Responses**:
- 400: Invalid query parameters
- 401: Unauthorized
- 500: Server error

**Example**:
```bash
curl -X GET "https://api.scholarx.app/api/tenant/cbt/questions?tenantId=tenant-456&subject=Geography&difficulty=Easy&page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

---

### POST /questions

Create a new question.

**Authentication**: Required

**Request Body**:
```json
{
  "text": "What is 2 + 2?",
  "type": "objective",
  "options": ["3", "4", "5", "6"],
  "correctAnswer": "4",
  "difficulty": "Easy",
  "subject": "Mathematics",
  "tags": ["arithmetic", "basic"]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "q-124",
    "tenantId": "tenant-456",
    "text": "What is 2 + 2?",
    "type": "objective",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4",
    "difficulty": "Easy",
    "subject": "Mathematics",
    "tags": ["arithmetic", "basic"],
    "createdBy": "user-789",
    "createdAt": "2026-04-28T10:30:00Z",
    "updatedAt": "2026-04-28T10:30:00Z"
  }
}
```

**Error Responses**:
- 400: Validation error
- 401: Unauthorized
- 500: Server error

**Validation Errors**:
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": {
    "text": "Question text is required",
    "type": "Type must be one of: objective, truefalse, essay",
    "options": "Options required for objective questions",
    "correctAnswer": "Correct answer must match one of the options"
  }
}
```

**Example**:
```bash
curl -X POST https://api.scholarx.app/api/tenant/cbt/questions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What is 2 + 2?",
    "type": "objective",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4",
    "difficulty": "Easy",
    "subject": "Mathematics",
    "tags": ["arithmetic", "basic"]
  }'
```

---

### PUT /questions/:id

Update an existing question.

**Authentication**: Required

**Path Parameters**:
- `id` (required): Question ID

**Request Body**: Same as POST (all fields optional)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "q-124",
    "text": "What is 2 + 2?",
    "type": "objective",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4",
    "difficulty": "Easy",
    "subject": "Mathematics",
    "tags": ["arithmetic", "basic"],
    "updatedAt": "2026-04-28T11:00:00Z"
  }
}
```

**Error Responses**:
- 400: Validation error
- 401: Unauthorized
- 404: Question not found
- 500: Server error

---

### DELETE /questions/:id

Delete a question (soft delete).

**Authentication**: Required

**Path Parameters**:
- `id` (required): Question ID

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Question not found
- 500: Server error

---

### POST /questions/import

Import questions from CSV file.

**Authentication**: Required

**Request**: Form data with file upload

**Form Parameters**:
- `file` (required): CSV file
- `tenantId` (required): Tenant identifier

**CSV Format**:
```
text,type,options,correctAnswer,difficulty,subject,tags
"What is the capital of France?","objective","[""London"",""Paris"",""Berlin"",""Madrid""]","Paris","Easy","Geography","capitals,europe"
"True or False: The Earth is flat","truefalse","[""True"",""False""]","False","Easy","Science","earth,science"
"Describe photosynthesis","essay","","","Medium","Biology","photosynthesis,biology"
```

**Response (200 OK)**:
```json
{
  "success": true,
  "imported": 45,
  "failed": 2,
  "errors": [
    {
      "row": 10,
      "error": "Invalid question type: 'multiple_choice'"
    },
    {
      "row": 25,
      "error": "Correct answer must match one of the options"
    }
  ]
}
```

**Error Responses**:
- 400: Invalid file format
- 401: Unauthorized
- 500: Server error

**Example**:
```bash
curl -X POST https://api.scholarx.app/api/tenant/cbt/questions/import \
  -H "Authorization: Bearer <token>" \
  -F "file=@questions.csv" \
  -F "tenantId=tenant-456"
```

---

### GET /questions/export

Export questions to CSV.

**Authentication**: Required

**Query Parameters**:
- `tenantId` (required): Tenant identifier
- `questionIds` (optional): Comma-separated question IDs
- `subject` (optional): Filter by subject
- `difficulty` (optional): Filter by difficulty

**Response (200 OK)**: CSV file download

**Headers**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="questions-export.csv"
```

**Error Responses**:
- 400: Invalid parameters
- 401: Unauthorized
- 500: Server error

**Example**:
```bash
curl -X GET "https://api.scholarx.app/api/tenant/cbt/questions/export?tenantId=tenant-456&subject=Mathematics" \
  -H "Authorization: Bearer <token>" \
  -o questions.csv
```

---

## Exam Management API

### GET /exams

Retrieve all exams with optional filtering.

**Authentication**: Required

**Query Parameters**:
- `tenantId` (required): Tenant identifier
- `status` (optional): Filter by status (Draft, Scheduled, Ongoing, Completed)
- `class` (optional): Filter by class
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "exam-123",
      "tenantId": "tenant-456",
      "title": "Mathematics Final Exam",
      "subject": "Mathematics",
      "class": "10A",
      "description": "Final examination for Mathematics",
      "duration": 120,
      "passMark": 50,
      "totalMarks": 100,
      "status": "Scheduled",
      "scheduledDate": "2026-05-15",
      "scheduledTime": "09:00",
      "questions": [
        {
          "id": "eq-1",
          "questionId": "q-123",
          "order": 1,
          "marks": 5
        }
      ],
      "createdBy": "user-789",
      "createdAt": "2026-04-27T10:30:00Z",
      "updatedAt": "2026-04-27T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "pages": 2
  }
}
```

**Error Responses**:
- 400: Invalid parameters
- 401: Unauthorized
- 500: Server error

---

### POST /exams

Create a new exam.

**Authentication**: Required

**Request Body**:
```json
{
  "title": "Mathematics Final Exam",
  "subject": "Mathematics",
  "class": "10A",
  "description": "Final examination for Mathematics",
  "duration": 120,
  "passMark": 50,
  "totalMarks": 100,
  "scheduledDate": "2026-05-15",
  "scheduledTime": "09:00",
  "questionIds": ["q-123", "q-124", "q-125"],
  "securitySettings": {
    "enableProctoring": true,
    "requireCamera": true,
    "randomizeQuestions": true
  }
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "exam-124",
    "title": "Mathematics Final Exam",
    "status": "Draft",
    "createdAt": "2026-04-28T10:30:00Z"
  }
}
```

**Error Responses**:
- 400: Validation error
- 401: Unauthorized
- 500: Server error

**Validation Errors**:
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": {
    "title": "Title is required",
    "duration": "Duration must be between 15 and 480 minutes",
    "passMark": "Pass mark must be between 0 and 100",
    "totalMarks": "Total marks must be greater than pass mark",
    "questionIds": "At least one question must be selected"
  }
}
```

---

### PUT /exams/:id

Update an exam.

**Authentication**: Required

**Path Parameters**:
- `id` (required): Exam ID

**Request Body**: Same as POST (all fields optional)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "exam-124",
    "title": "Mathematics Final Exam",
    "updatedAt": "2026-04-28T11:00:00Z"
  }
}
```

**Error Responses**:
- 400: Validation error
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

---

### DELETE /exams/:id

Delete an exam.

**Authentication**: Required

**Path Parameters**:
- `id` (required): Exam ID

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Exam deleted successfully"
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

---

### POST /exams/:id/schedule

Schedule an exam.

**Authentication**: Required

**Path Parameters**:
- `id` (required): Exam ID

**Request Body**:
```json
{
  "scheduledDate": "2026-05-15",
  "scheduledTime": "09:00"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "exam-124",
    "status": "Scheduled",
    "scheduledDate": "2026-05-15",
    "scheduledTime": "09:00"
  }
}
```

**Error Responses**:
- 400: Invalid date/time
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

---

### POST /exams/:id/start

Start an exam (change status to Ongoing).

**Authentication**: Required

**Path Parameters**:
- `id` (required): Exam ID

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "exam-124",
    "status": "Ongoing"
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

---

## Live Monitoring API

### GET /monitoring/:examId

Get live monitoring data for an exam.

**Authentication**: Required

**Path Parameters**:
- `examId` (required): Exam ID

**Query Parameters**:
- `tenantId` (required): Tenant identifier

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "examId": "exam-123",
    "examTitle": "Mathematics Final Exam",
    "totalStudents": 45,
    "activeStudents": 42,
    "completedStudents": 3,
    "averageProgress": 65,
    "students": [
      {
        "id": "sp-1",
        "examId": "exam-123",
        "studentId": "student-1",
        "studentName": "John Doe",
        "questionsAnswered": 15,
        "totalQuestions": 20,
        "currentQuestion": 16,
        "status": "Active",
        "timeRemaining": 3600,
        "completionPercentage": 75,
        "lastActivityTime": "2026-04-28T10:30:00Z"
      }
    ]
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

---

### GET /monitoring/:examId/student/:studentId

Get specific student progress.

**Authentication**: Required

**Path Parameters**:
- `examId` (required): Exam ID
- `studentId` (required): Student ID

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "sp-1",
    "studentName": "John Doe",
    "questionsAnswered": 15,
    "totalQuestions": 20,
    "status": "Active",
    "timeRemaining": 3600,
    "completionPercentage": 75
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Not found
- 500: Server error

---

### PUT /monitoring/:examId/student/:studentId/flag

Flag a student for suspicious activity.

**Authentication**: Required

**Path Parameters**:
- `examId` (required): Exam ID
- `studentId` (required): Student ID

**Request Body**:
```json
{
  "reason": "Multiple tab switches detected"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "sp-1",
    "status": "Flagged",
    "flagReason": "Multiple tab switches detected",
    "flaggedAt": "2026-04-28T10:35:00Z"
  }
}
```

**Error Responses**:
- 400: Invalid reason
- 401: Unauthorized
- 404: Not found
- 500: Server error

---

### WebSocket: /ws/cbt/monitoring/:examId

Real-time monitoring updates via WebSocket.

**Connection URL**:
```
ws://server/ws/cbt/monitoring/:examId?tenantId=xxx
```

**Messages from Server**:
```json
{
  "type": "progress_update",
  "data": {
    "studentId": "student-1",
    "questionsAnswered": 16,
    "completionPercentage": 80
  }
}
```

```json
{
  "type": "student_completed",
  "data": {
    "studentId": "student-1",
    "examId": "exam-123"
  }
}
```

```json
{
  "type": "exam_ended",
  "data": {
    "examId": "exam-123"
  }
}
```

---

## Exam Results API

### GET /results

Get exam results summary.

**Authentication**: Required

**Query Parameters**:
- `tenantId` (required): Tenant identifier
- `examId` (optional): Filter by exam
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "examId": "exam-123",
      "examTitle": "Mathematics Final Exam",
      "totalStudents": 45,
      "completedStudents": 45,
      "averageScore": 72.5,
      "passRate": 88.9,
      "highestScore": 98,
      "lowestScore": 35
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

**Error Responses**:
- 400: Invalid parameters
- 401: Unauthorized
- 500: Server error

---

### GET /results/:examId

Get results for a specific exam.

**Authentication**: Required

**Path Parameters**:
- `examId` (required): Exam ID

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "examId": "exam-123",
    "examTitle": "Mathematics Final Exam",
    "totalStudents": 45,
    "completedStudents": 45,
    "averageScore": 72.5,
    "passRate": 88.9,
    "results": [
      {
        "id": "result-1",
        "studentId": "student-1",
        "studentName": "John Doe",
        "score": 85,
        "totalMarks": 100,
        "percentage": 85,
        "status": "Passed",
        "timeSpent": 3600,
        "submittedAt": "2026-04-28T11:00:00Z"
      }
    ]
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

---

### GET /results/:examId/student/:studentId

Get detailed result for a student.

**Authentication**: Required

**Path Parameters**:
- `examId` (required): Exam ID
- `studentId` (required): Student ID

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "result-1",
    "examId": "exam-123",
    "studentId": "student-1",
    "studentName": "John Doe",
    "score": 85,
    "totalMarks": 100,
    "percentage": 85,
    "status": "Passed",
    "timeSpent": 3600,
    "submittedAt": "2026-04-28T11:00:00Z",
    "answers": [
      {
        "questionId": "q-123",
        "questionText": "What is 2 + 2?",
        "studentAnswer": "4",
        "correctAnswer": "4",
        "isCorrect": true,
        "marksObtained": 5,
        "totalMarks": 5
      }
    ]
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Not found
- 500: Server error

---

### GET /results/export

Export results to CSV/PDF.

**Authentication**: Required

**Query Parameters**:
- `examId` (required): Exam ID
- `format` (optional): Export format (csv, pdf) (default: csv)

**Response (200 OK)**: File download

**Headers**:
```
Content-Type: text/csv or application/pdf
Content-Disposition: attachment; filename="results-export.csv"
```

**Error Responses**:
- 400: Invalid parameters
- 401: Unauthorized
- 500: Server error

---

## Security Settings API

### GET /security/:examId

Get security settings for an exam.

**Authentication**: Required

**Path Parameters**:
- `examId` (required): Exam ID

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "sec-1",
    "examId": "exam-123",
    "enableProctoring": true,
    "disableCopyPaste": true,
    "disableRightClick": true,
    "requireCamera": true,
    "randomizeQuestions": true,
    "randomizeOptions": true,
    "allowedIPs": ["192.168.1.0/24", "10.0.0.0/8"],
    "examPassword": "hashed_password",
    "createdAt": "2026-04-27T10:30:00Z",
    "updatedAt": "2026-04-27T10:30:00Z"
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

---

### POST /security/:examId

Create/update security settings.

**Authentication**: Required

**Path Parameters**:
- `examId` (required): Exam ID

**Request Body**:
```json
{
  "enableProctoring": true,
  "disableCopyPaste": true,
  "disableRightClick": true,
  "requireCamera": true,
  "randomizeQuestions": true,
  "randomizeOptions": true,
  "allowedIPs": ["192.168.1.0/24"],
  "examPassword": "SecurePassword123"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "sec-1",
    "examId": "exam-123",
    "enableProctoring": true,
    "updatedAt": "2026-04-28T10:30:00Z"
  }
}
```

**Error Responses**:
- 400: Validation error
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

**Validation Errors**:
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": {
    "allowedIPs": "Invalid CIDR notation in IP addresses",
    "examPassword": "Password must be at least 8 characters"
  }
}
```

---

### GET /security/:examId/logs

Get proctoring logs.

**Authentication**: Required

**Path Parameters**:
- `examId` (required): Exam ID

**Query Parameters**:
- `studentId` (optional): Filter by student
- `eventType` (optional): Filter by event type
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log-1",
      "examId": "exam-123",
      "studentId": "student-1",
      "eventType": "camera_on",
      "eventDetails": {
        "timestamp": "2026-04-28T10:30:00Z"
      },
      "createdAt": "2026-04-28T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Exam not found
- 500: Server error

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication token |
| FORBIDDEN | 403 | Authenticated but not authorized |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

### Example Error Response

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "validationErrors": {
      "title": "Title is required",
      "duration": "Duration must be between 15 and 480 minutes"
    }
  }
}
```

---

## Rate Limiting

### Rate Limits

- **Default**: 100 requests per minute per user
- **Import/Export**: 10 requests per minute per user
- **WebSocket**: 1 connection per exam per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1619635200
```

### Rate Limit Response (429)

```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMITED",
  "retryAfter": 60
}
```

---

**Document Version**: 1.0.0  
**Last Updated**: April 28, 2026  
**Status**: Complete
