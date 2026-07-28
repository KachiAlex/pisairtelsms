# CBT & Examinations System - API Documentation

## Overview

The CBT (Computer-Based Testing) & Examinations System provides a comprehensive REST API for managing exams, questions, results, and real-time monitoring. This documentation covers all available endpoints, request/response formats, and authentication requirements.

## Base URL

```
https://api.example.com/api/tenant/cbt
```

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the `Authorization` header:

```
Authorization: Bearer <token>
```

### Token Format
- **Type:** JWT (JSON Web Token)
- **Expiration:** 24 hours
- **Refresh:** Use refresh endpoint to obtain new token

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions for this operation |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `CONFLICT` | 409 | Resource already exists or state conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Question Bank Endpoints

### List Questions

**Endpoint:** `GET /questions`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `subject` (optional): Filter by subject
- `difficulty` (optional): Filter by difficulty (easy, medium, hard)
- `search` (optional): Search in question text

**Response:**
```json
{
  "data": [
    {
      "id": "q-123",
      "text": "What is 2+2?",
      "type": "multiple_choice",
      "options": [
        { "id": "opt-1", "text": "3", "isCorrect": false },
        { "id": "opt-2", "text": "4", "isCorrect": true }
      ],
      "difficulty": "easy",
      "subject": "Math",
      "createdAt": "2026-05-03T10:00:00Z",
      "updatedAt": "2026-05-03T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Create Question

**Endpoint:** `POST /questions`

**Request Body:**
```json
{
  "text": "What is the capital of France?",
  "type": "multiple_choice",
  "options": [
    { "text": "London", "isCorrect": false },
    { "text": "Paris", "isCorrect": true },
    { "text": "Berlin", "isCorrect": false }
  ],
  "difficulty": "easy",
  "subject": "Geography"
}
```

**Response:** (201 Created)
```json
{
  "id": "q-456",
  "text": "What is the capital of France?",
  "type": "multiple_choice",
  "options": [
    { "id": "opt-1", "text": "London", "isCorrect": false },
    { "id": "opt-2", "text": "Paris", "isCorrect": true },
    { "id": "opt-3", "text": "Berlin", "isCorrect": false }
  ],
  "difficulty": "easy",
  "subject": "Geography",
  "createdAt": "2026-05-03T10:00:00Z"
}
```

### Update Question

**Endpoint:** `PUT /questions/:id`

**Request Body:**
```json
{
  "text": "Updated question text",
  "difficulty": "medium"
}
```

**Response:** (200 OK)
```json
{
  "id": "q-456",
  "text": "Updated question text",
  "type": "multiple_choice",
  "options": [...],
  "difficulty": "medium",
  "subject": "Geography",
  "updatedAt": "2026-05-03T11:00:00Z"
}
```

### Delete Question

**Endpoint:** `DELETE /questions/:id`

**Response:** (204 No Content)

### Import Questions (CSV)

**Endpoint:** `POST /questions/import`

**Request:** Multipart form data with CSV file

**CSV Format:**
```
text,type,option1,option1_correct,option2,option2_correct,difficulty,subject
"What is 2+2?",multiple_choice,"3",false,"4",true,easy,Math
```

**Response:**
```json
{
  "imported": 100,
  "failed": 2,
  "errors": [
    { "row": 5, "error": "Invalid difficulty level" }
  ]
}
```

### Export Questions (CSV)

**Endpoint:** `GET /questions/export`

**Query Parameters:**
- `format` (optional): csv or json (default: csv)
- `subject` (optional): Filter by subject

**Response:** CSV file download

## Exam Management Endpoints

### List Exams

**Endpoint:** `GET /exams`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status (draft, scheduled, ongoing, completed)

**Response:**
```json
{
  "data": [
    {
      "id": "exam-123",
      "title": "Math Final Exam",
      "description": "Final examination for Math course",
      "duration": 120,
      "passMark": 50,
      "totalMarks": 100,
      "status": "scheduled",
      "questionIds": ["q-1", "q-2", "q-3"],
      "createdAt": "2026-05-03T10:00:00Z",
      "scheduledAt": "2026-05-10T14:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Create Exam

**Endpoint:** `POST /exams`

**Request Body:**
```json
{
  "title": "Math Final Exam",
  "description": "Final examination for Math course",
  "duration": 120,
  "passMark": 50,
  "totalMarks": 100,
  "questionIds": ["q-1", "q-2", "q-3"]
}
```

**Response:** (201 Created)
```json
{
  "id": "exam-123",
  "title": "Math Final Exam",
  "description": "Final examination for Math course",
  "duration": 120,
  "passMark": 50,
  "totalMarks": 100,
  "status": "draft",
  "questionIds": ["q-1", "q-2", "q-3"],
  "createdAt": "2026-05-03T10:00:00Z"
}
```

### Start Exam

**Endpoint:** `POST /exams/:id/start`

**Request Body:**
```json
{
  "studentId": "student-123"
}
```

**Response:** (200 OK)
```json
{
  "id": "exam-123",
  "status": "ongoing",
  "startedAt": "2026-05-10T14:00:00Z",
  "endTime": "2026-05-10T16:00:00Z",
  "questions": [
    {
      "id": "q-1",
      "text": "Question text",
      "type": "multiple_choice",
      "options": [...]
    }
  ]
}
```

### Submit Answer

**Endpoint:** `POST /exams/:id/answers`

**Request Body:**
```json
{
  "questionId": "q-1",
  "selectedOption": 1,
  "timeSpent": 45
}
```

**Response:** (200 OK)
```json
{
  "questionId": "q-1",
  "selectedOption": 1,
  "timeSpent": 45,
  "savedAt": "2026-05-10T14:00:45Z"
}
```

### End Exam

**Endpoint:** `POST /exams/:id/end`

**Request Body:**
```json
{
  "studentId": "student-123"
}
```

**Response:** (200 OK)
```json
{
  "id": "exam-123",
  "status": "completed",
  "endedAt": "2026-05-10T16:00:00Z",
  "score": 75,
  "passed": true
}
```

## Results Endpoints

### Get Exam Results Summary

**Endpoint:** `GET /results/:examId`

**Response:**
```json
{
  "examId": "exam-123",
  "title": "Math Final Exam",
  "totalStudents": 50,
  "averageScore": 72.5,
  "passRate": 0.88,
  "highestScore": 98,
  "lowestScore": 35,
  "statistics": {
    "mean": 72.5,
    "median": 75,
    "stdDev": 12.3
  }
}
```

### Get Student Result

**Endpoint:** `GET /results/:examId/student/:studentId`

**Response:**
```json
{
  "examId": "exam-123",
  "studentId": "student-123",
  "score": 85,
  "passed": true,
  "timeSpent": 95,
  "answers": [
    {
      "questionId": "q-1",
      "questionText": "What is 2+2?",
      "selectedOption": 1,
      "correctOption": 1,
      "isCorrect": true,
      "timeSpent": 30
    }
  ],
  "completedAt": "2026-05-10T16:00:00Z"
}
```

### Export Results

**Endpoint:** `GET /results/:examId/export`

**Query Parameters:**
- `format` (optional): csv or pdf (default: csv)

**Response:** File download

## Real-Time Monitoring Endpoints

### Get Live Monitoring Data

**Endpoint:** `GET /monitoring/:examId`

**Response:**
```json
{
  "examId": "exam-123",
  "activeStudents": 45,
  "completedStudents": 5,
  "students": [
    {
      "studentId": "student-123",
      "name": "John Doe",
      "status": "in_progress",
      "questionsAnswered": 8,
      "totalQuestions": 10,
      "timeRemaining": 30,
      "flagged": false
    }
  ]
}
```

### Get Student Progress

**Endpoint:** `GET /monitoring/:examId/student/:studentId`

**Response:**
```json
{
  "studentId": "student-123",
  "questionsAnswered": 8,
  "totalQuestions": 10,
  "currentQuestion": 9,
  "timeSpent": 65,
  "timeRemaining": 55,
  "flagged": false,
  "flagReason": null
}
```

### Flag Student

**Endpoint:** `PUT /monitoring/:examId/student/:studentId/flag`

**Request Body:**
```json
{
  "reason": "Suspicious activity detected",
  "severity": "high"
}
```

**Response:** (200 OK)
```json
{
  "studentId": "student-123",
  "flagged": true,
  "reason": "Suspicious activity detected",
  "severity": "high",
  "flaggedAt": "2026-05-10T14:30:00Z"
}
```

## Offline Sync Endpoints

### Sync Offline Answers

**Endpoint:** `POST /sync`

**Request Body:**
```json
{
  "examId": "exam-123",
  "studentId": "student-123",
  "answers": [
    {
      "questionId": "q-1",
      "selectedOption": 1,
      "timeSpent": 30,
      "timestamp": 1714329600000
    }
  ]
}
```

**Response:** (200 OK)
```json
{
  "synced": true,
  "answersCount": 10,
  "conflicts": 0,
  "conflictResolution": "server-as-authoritative"
}
```

## Security Settings Endpoints

### Get Security Settings

**Endpoint:** `GET /security/:examId`

**Response:**
```json
{
  "examId": "exam-123",
  "proctoring": true,
  "cameraRequired": true,
  "preventCopyPaste": true,
  "preventRightClick": true,
  "randomizeQuestions": true,
  "randomizeOptions": true,
  "ipWhitelist": ["192.168.1.0/24"],
  "passwordRequired": true
}
```

### Update Security Settings

**Endpoint:** `POST /security/:examId`

**Request Body:**
```json
{
  "proctoring": true,
  "cameraRequired": true,
  "preventCopyPaste": true,
  "preventRightClick": true,
  "randomizeQuestions": true,
  "randomizeOptions": true,
  "ipWhitelist": ["192.168.1.0/24"],
  "password": "SecureP@ssw0rd"
}
```

**Response:** (200 OK)
```json
{
  "examId": "exam-123",
  "proctoring": true,
  "cameraRequired": true,
  "preventCopyPaste": true,
  "preventRightClick": true,
  "randomizeQuestions": true,
  "randomizeOptions": true,
  "ipWhitelist": ["192.168.1.0/24"],
  "passwordRequired": true,
  "updatedAt": "2026-05-03T11:00:00Z"
}
```

## WebSocket Endpoints

### Real-Time Monitoring WebSocket

**Endpoint:** `wss://api.example.com/ws/cbt/monitoring/:examId`

**Connection:**
```javascript
const ws = new WebSocket('wss://api.example.com/ws/cbt/monitoring/exam-123?token=<jwt_token>');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Monitoring update:', data);
};
```

**Message Format:**
```json
{
  "type": "student_progress",
  "data": {
    "studentId": "student-123",
    "questionsAnswered": 8,
    "totalQuestions": 10,
    "timeRemaining": 30
  }
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Standard:** 100 requests per minute
- **Burst:** 1000 requests per hour
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Pagination

List endpoints support pagination with the following parameters:

- `page`: Page number (1-indexed)
- `limit`: Items per page (1-100, default: 20)

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Timestamps

All timestamps are in ISO 8601 format with UTC timezone:
```
2026-05-03T10:00:00Z
```

## Examples

### Complete Exam Taking Workflow

```bash
# 1. Start exam
curl -X POST https://api.example.com/api/tenant/cbt/exams/exam-123/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "student-123"}'

# 2. Submit answer
curl -X POST https://api.example.com/api/tenant/cbt/exams/exam-123/answers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"questionId": "q-1", "selectedOption": 1, "timeSpent": 45}'

# 3. End exam
curl -X POST https://api.example.com/api/tenant/cbt/exams/exam-123/end \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"studentId": "student-123"}'

# 4. Get results
curl -X GET https://api.example.com/api/tenant/cbt/results/exam-123/student/student-123 \
  -H "Authorization: Bearer <token>"
```

## Support

For API support, contact: api-support@example.com

---

**Last Updated:** May 3, 2026  
**API Version:** 1.0.0
