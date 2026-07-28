# Live Monitoring & Offline Sync API Reference

## Live Monitoring API (`/api/tenant/cbt/monitoring`)

### 1. Get Live Monitoring Data
**Endpoint:** `GET /api/tenant/cbt/monitoring/:examId`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "examId": "exam-uuid",
    "totalStudents": 45,
    "activeStudents": 38,
    "completedStudents": 5,
    "flaggedStudents": 2,
    "students": [
      {
        "id": "progress-uuid",
        "examId": "exam-uuid",
        "studentId": "student-uuid",
        "questionsAnswered": 15,
        "currentQuestion": 16,
        "status": "Active",
        "timeRemaining": 1200,
        "lastActivityTime": "2026-05-03T10:30:45Z",
        "flagReason": null,
        "flaggedAt": null,
        "createdAt": "2026-05-03T10:00:00Z",
        "updatedAt": "2026-05-03T10:30:45Z"
      }
    ]
  },
  "requestId": "req-uuid"
}
```

---

### 2. Get Student Progress
**Endpoint:** `GET /api/tenant/cbt/monitoring/:examId/student/:studentId`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "progress-uuid",
    "examId": "exam-uuid",
    "studentId": "student-uuid",
    "questionsAnswered": 15,
    "currentQuestion": 16,
    "status": "Active",
    "timeRemaining": 1200,
    "lastActivityTime": "2026-05-03T10:30:45Z",
    "flagReason": null,
    "flaggedAt": null,
    "createdAt": "2026-05-03T10:00:00Z",
    "updatedAt": "2026-05-03T10:30:45Z"
  },
  "requestId": "req-uuid"
}
```

**Error (404):**
```json
{
  "success": false,
  "error": "Student progress not found"
}
```

---

### 3. Update Student Progress
**Endpoint:** `PUT /api/tenant/cbt/monitoring/:examId/student/:studentId`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
Content-Type: application/json
```

**Request Body:**
```json
{
  "questionsAnswered": 16,
  "currentQuestion": 17,
  "status": "Active",
  "timeRemaining": 1100
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "progress-uuid",
    "examId": "exam-uuid",
    "studentId": "student-uuid",
    "questionsAnswered": 16,
    "currentQuestion": 17,
    "status": "Active",
    "timeRemaining": 1100,
    "lastActivityTime": "2026-05-03T10:31:00Z",
    "flagReason": null,
    "flaggedAt": null,
    "createdAt": "2026-05-03T10:00:00Z",
    "updatedAt": "2026-05-03T10:31:00Z"
  },
  "requestId": "req-uuid"
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": {
    "questionsAnswered": "Must be a non-negative number",
    "status": "Must be Active, Completed, Paused, or Flagged"
  }
}
```

---

### 4. Flag Student for Suspicious Activity
**Endpoint:** `PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/flag`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Tab switch detected during exam"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "progress-uuid",
    "examId": "exam-uuid",
    "studentId": "student-uuid",
    "questionsAnswered": 15,
    "currentQuestion": 16,
    "status": "Flagged",
    "timeRemaining": 1200,
    "lastActivityTime": "2026-05-03T10:31:15Z",
    "flagReason": "Tab switch detected during exam",
    "flaggedAt": "2026-05-03T10:31:15Z",
    "createdAt": "2026-05-03T10:00:00Z",
    "updatedAt": "2026-05-03T10:31:15Z"
  },
  "requestId": "req-uuid"
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": {
    "reason": "Reason is required and must be a non-empty string"
  }
}
```

---

### 5. Complete Student Exam
**Endpoint:** `POST /api/tenant/cbt/monitoring/:examId/student/:studentId/complete`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "progress-uuid",
    "examId": "exam-uuid",
    "studentId": "student-uuid",
    "questionsAnswered": 50,
    "currentQuestion": 50,
    "status": "Completed",
    "timeRemaining": 0,
    "lastActivityTime": "2026-05-03T10:45:00Z",
    "flagReason": null,
    "flaggedAt": null,
    "createdAt": "2026-05-03T10:00:00Z",
    "updatedAt": "2026-05-03T10:45:00Z"
  },
  "requestId": "req-uuid"
}
```

---

### 6. Get Students by Status
**Endpoint:** `GET /api/tenant/cbt/monitoring/:examId/students/by-status/:status`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
```

**Path Parameters:**
- `status`: One of `Active`, `Completed`, `Paused`, `Flagged`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "progress-uuid-1",
      "examId": "exam-uuid",
      "studentId": "student-uuid-1",
      "questionsAnswered": 15,
      "currentQuestion": 16,
      "status": "Active",
      "timeRemaining": 1200,
      "lastActivityTime": "2026-05-03T10:30:45Z",
      "flagReason": null,
      "flaggedAt": null,
      "createdAt": "2026-05-03T10:00:00Z",
      "updatedAt": "2026-05-03T10:30:45Z"
    }
  ],
  "requestId": "req-uuid"
}
```

---

## Offline Sync API (`/api/tenant/cbt/sync`)

### 1. Sync Offline Answers
**Endpoint:** `POST /api/tenant/cbt/sync`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
Content-Type: application/json
```

**Request Body:**
```json
{
  "studentId": "student-uuid",
  "examId": "exam-uuid",
  "answers": [
    {
      "questionId": "question-uuid-1",
      "studentAnswer": "Option A",
      "correctAnswer": "Option A",
      "isCorrect": true,
      "marksObtained": 1,
      "totalMarks": 1
    },
    {
      "questionId": "question-uuid-2",
      "studentAnswer": "Option B",
      "correctAnswer": "Option C",
      "isCorrect": false,
      "marksObtained": 0,
      "totalMarks": 1
    }
  ],
  "timestamp": "2026-05-03T10:45:00Z"
}
```

**Response (200 - Full Success):**
```json
{
  "success": true,
  "data": {
    "synced": 50,
    "conflicts": 0,
    "failed": 0,
    "errors": []
  },
  "requestId": "req-uuid"
}
```

**Response (207 - Partial Success):**
```json
{
  "success": false,
  "data": {
    "synced": 48,
    "conflicts": 1,
    "failed": 1,
    "errors": [
      "Question question-uuid-3 not found",
      "Conflict detected for question question-uuid-4 (server answer takes precedence)"
    ]
  },
  "requestId": "req-uuid"
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": {
    "studentId": "Student ID is required and must be a string",
    "answers": "Answers must be an array"
  }
}
```

---

### 2. Create Sync Queue Entry
**Endpoint:** `POST /api/tenant/cbt/sync/queue`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
Content-Type: application/json
```

**Request Body:**
```json
{
  "studentId": "student-uuid",
  "examId": "exam-uuid",
  "answers": [
    {
      "questionId": "question-uuid-1",
      "studentAnswer": "Option A",
      "correctAnswer": "Option A",
      "isCorrect": true,
      "marksObtained": 1,
      "totalMarks": 1
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "queue-entry-uuid",
    "status": "pending",
    "createdAt": "2026-05-03T10:45:00Z"
  },
  "requestId": "req-uuid"
}
```

---

### 3. Get Sync Queue Entry Status
**Endpoint:** `GET /api/tenant/cbt/sync/queue/:studentId/:examId`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "queue-entry-uuid",
    "status": "pending",
    "retryCount": 0,
    "lastError": null,
    "createdAt": "2026-05-03T10:45:00Z",
    "syncedAt": null
  },
  "requestId": "req-uuid"
}
```

**Response (200 - After Sync):**
```json
{
  "success": true,
  "data": {
    "id": "queue-entry-uuid",
    "status": "synced",
    "retryCount": 0,
    "lastError": null,
    "createdAt": "2026-05-03T10:45:00Z",
    "syncedAt": "2026-05-03T10:46:00Z"
  },
  "requestId": "req-uuid"
}
```

**Response (200 - After Failed Retry):**
```json
{
  "success": true,
  "data": {
    "id": "queue-entry-uuid",
    "status": "failed",
    "retryCount": 2,
    "lastError": "Question not found",
    "createdAt": "2026-05-03T10:45:00Z",
    "syncedAt": null
  },
  "requestId": "req-uuid"
}
```

---

### 4. Get Sync Statistics
**Endpoint:** `GET /api/tenant/cbt/sync/statistics`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "synced": 142,
    "failed": 3,
    "totalRetries": 8
  },
  "requestId": "req-uuid"
}
```

---

### 5. Retry Failed Syncs
**Endpoint:** `POST /api/tenant/cbt/sync/retry`

**Headers:**
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "retried": 3,
    "succeeded": 2,
    "failed": 1
  },
  "requestId": "req-uuid"
}
```

---

## Status Codes Reference

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET, PUT, POST |
| 201 | Created | Successful resource creation |
| 207 | Multi-Status | Partial success (some answers synced, some failed) |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid authentication headers |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "validationErrors": {
    "fieldName": "Field-specific error message"
  },
  "requestId": "req-uuid"
}
```

---

## Authentication

All endpoints require the following headers:
- `x-tenant-id`: UUID of the tenant
- `x-user-id`: UUID of the authenticated user

Missing or invalid headers will return a 401 Unauthorized response.

---

## Rate Limiting

No rate limiting is currently implemented. Consider adding rate limiting for production deployments.

---

## Pagination

Live Monitoring endpoints do not support pagination. All students are returned in a single response.

For large exams (100+ students), consider implementing pagination in future versions.

---

## Real-Time Updates

### WebSocket Support (Phase 3)
Live monitoring will support WebSocket connections for real-time updates:
- Endpoint: `ws://host/ws/cbt/monitoring/:examId`
- Messages: progress_update, student_completed, exam_ended
- Automatic reconnection with exponential backoff

### Polling Fallback
For environments without WebSocket support, clients can poll:
- `GET /api/tenant/cbt/monitoring/:examId` every 3 seconds
- Implements exponential backoff on errors

---

## Conflict Resolution Strategy

### Server-as-Authoritative
When syncing offline answers, if a conflict is detected (answer already exists on server):
1. Server answer takes precedence
2. Offline answer is discarded
3. Conflict is recorded in response
4. No data loss (both answers are tracked)

Example:
```
Server has: Question 1 = "Option A" (correct)
Offline has: Question 1 = "Option B" (incorrect)
Result: Server answer kept, conflict recorded
```

---

## Retry Logic

### Exponential Backoff
Failed sync entries are retried with exponential backoff:
- Retry 1: 1 second delay
- Retry 2: 2 seconds delay
- Retry 3: 4 seconds delay
- Max retries: 3

After 3 failed retries, the entry is marked as permanently failed.

---

## Best Practices

### For Live Monitoring
1. Poll every 3-5 seconds for updates
2. Use WebSocket when available for real-time updates
3. Handle disconnections gracefully
4. Implement exponential backoff for polling
5. Cache data locally to reduce API calls

### For Offline Sync
1. Queue answers locally when offline
2. Sync when connection is restored
3. Handle conflicts gracefully
4. Retry failed syncs automatically
5. Notify user of sync status

---

## Example Usage

### JavaScript/TypeScript

```typescript
// Live Monitoring
async function getLiveMonitoring(examId: string) {
  const response = await fetch(
    `/api/tenant/cbt/monitoring/${examId}`,
    {
      headers: {
        'x-tenant-id': tenantId,
        'x-user-id': userId,
      },
    }
  );
  return response.json();
}

// Offline Sync
async function syncOfflineAnswers(
  studentId: string,
  examId: string,
  answers: any[]
) {
  const response = await fetch('/api/tenant/cbt/sync', {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
      'x-user-id': userId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      studentId,
      examId,
      answers,
      timestamp: new Date().toISOString(),
    }),
  });
  return response.json();
}
```

---

## Support

For issues or questions about these APIs, refer to:
- `.kiro/specs/cbt-examinations-rebuild/design.md` - Design specifications
- `.kiro/specs/cbt-examinations-rebuild/requirements.md` - Requirements
- `api/tenant/cbt/_lib/types.ts` - Type definitions
