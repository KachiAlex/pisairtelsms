# Parent Portal API Documentation

**Version**: 1.0.0  
**Last Updated**: April 27, 2026  
**Base URL**: `https://api.scholarx.app`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Dashboard](#dashboard)
3. [Academic](#academic)
4. [Attendance](#attendance)
5. [Behavioral](#behavioral)
6. [Communications](#communications)
7. [Messages](#messages)
8. [Fees](#fees)
9. [Timetable](#timetable)
10. [Health](#health)
11. [Notifications](#notifications)
12. [Profile](#profile)
13. [Error Handling](#error-handling)
14. [Rate Limiting](#rate-limiting)

---

## Authentication

All API endpoints require JWT authentication via Bearer token in the Authorization header.

### Login

**Endpoint**: `POST /api/parent/auth/login`

**Description**: Authenticate parent and receive JWT token

**Request Body**:
```json
{
  "email": "parent@example.com",
  "password": "password123"
}
```

**Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "parent": {
    "id": "parent-123",
    "email": "parent@example.com",
    "name": "John Doe",
    "childrenIds": ["child-1", "child-2"]
  },
  "expiresIn": 86400
}
```

**Error Responses**:
- 400: Invalid email or password
- 500: Server error

**Example Request**:
```bash
curl -X POST https://api.scholarx.app/api/parent/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "password": "password123"
  }'
```

### Change Password

**Endpoint**: `POST /api/parent/change-password`

**Description**: Change parent account password

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

**Response (200 OK)**:
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses**:
- 401: Unauthorized
- 400: Invalid current password
- 500: Server error

---

## Dashboard

### Get Dashboard Data

**Endpoint**: `GET /api/parent/dashboard?childId=child-123`

**Description**: Get dashboard metrics and overview for a child

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID

**Response (200 OK)**:
```json
{
  "parent": {
    "id": "parent-123",
    "name": "John Doe",
    "email": "parent@example.com"
  },
  "child": {
    "id": "child-123",
    "name": "Jane Doe",
    "class": "10A",
    "rollNumber": "001"
  },
  "metrics": {
    "attendance": 92.5,
    "gpa": 3.8,
    "outstandingFees": 5000,
    "upcomingExams": 3
  },
  "recentGrades": [
    {
      "subject": "Mathematics",
      "grade": "A",
      "percentage": 92
    }
  ],
  "recentAnnouncements": [
    {
      "id": "ann-1",
      "title": "Exam Schedule Released",
      "date": "2026-04-27"
    }
  ],
  "upcomingEvents": [
    {
      "id": "evt-1",
      "title": "Final Exams",
      "date": "2026-05-15"
    }
  ],
  "activeAlerts": [
    {
      "id": "alert-1",
      "type": "warning",
      "message": "Outstanding fees pending"
    }
  ]
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden (child not linked to parent)
- 404: Child not found
- 500: Server error

**Caching**: 5 minutes

---

## Academic

### Get Academic Progress

**Endpoint**: `GET /api/parent/academic?childId=child-123&termId=term-123`

**Description**: Get academic progress and grades for a child

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID
- `termId` (optional): Term ID

**Response (200 OK)**:
```json
{
  "child": {
    "id": "child-123",
    "name": "Jane Doe"
  },
  "term": {
    "id": "term-123",
    "name": "Term 1",
    "year": 2026
  },
  "gpa": 3.8,
  "classAverage": 3.5,
  "subjects": [
    {
      "id": "subj-1",
      "name": "Mathematics",
      "grade": "A",
      "percentage": 92,
      "classAverage": 85
    }
  ],
  "upcomingAssessments": [
    {
      "id": "assess-1",
      "subject": "English",
      "type": "Midterm",
      "date": "2026-05-10"
    }
  ]
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

**Caching**: 1 day

---

## Attendance

### Get Attendance Records

**Endpoint**: `GET /api/parent/attendance?childId=child-123&startDate=2026-04-01&endDate=2026-04-30`

**Description**: Get attendance records for a child

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response (200 OK)**:
```json
{
  "child": {
    "id": "child-123",
    "name": "Jane Doe"
  },
  "statistics": {
    "present": 18,
    "absent": 2,
    "late": 1,
    "percentage": 92.5
  },
  "records": [
    {
      "date": "2026-04-27",
      "status": "present",
      "remarks": ""
    }
  ],
  "trend": [
    {
      "month": "April",
      "percentage": 92.5
    }
  ]
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

**Caching**: 1 day

---

## Behavioral

### Get Behavioral Reports

**Endpoint**: `GET /api/parent/behavioral?childId=child-123`

**Description**: Get behavioral reports and conduct grades

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID

**Response (200 OK)**:
```json
{
  "child": {
    "id": "child-123",
    "name": "Jane Doe"
  },
  "conductGrade": "A",
  "incidents": [
    {
      "id": "inc-1",
      "date": "2026-04-20",
      "type": "positive",
      "description": "Excellent participation in class",
      "teacher": "Mr. Smith"
    }
  ],
  "positiveRecognition": [
    {
      "id": "rec-1",
      "date": "2026-04-25",
      "award": "Student of the Month",
      "reason": "Outstanding academic performance"
    }
  ],
  "trend": [
    {
      "month": "April",
      "grade": "A"
    }
  ]
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

**Caching**: 1 day

---

## Communications

### Get Announcements

**Endpoint**: `GET /api/parent/announcements?limit=10&category=academic`

**Description**: Get announcements for parent

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `limit` (optional): Number of announcements (default: 10)
- `category` (optional): Filter by category

**Response (200 OK)**:
```json
{
  "announcements": [
    {
      "id": "ann-1",
      "title": "Exam Schedule Released",
      "content": "Final exams schedule has been released...",
      "category": "academic",
      "date": "2026-04-27",
      "read": false,
      "attachments": []
    }
  ],
  "total": 25,
  "page": 1
}
```

**Error Responses**:
- 401: Unauthorized
- 500: Server error

**Caching**: 1 hour

### Mark Announcement as Read

**Endpoint**: `PUT /api/parent/announcements/:announcementId/read`

**Description**: Mark announcement as read

**Authentication**: Required (Bearer token)

**Response (200 OK)**:
```json
{
  "message": "Announcement marked as read"
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Not found
- 500: Server error

---

## Messages

### Get Message Conversations

**Endpoint**: `GET /api/parent/messages?childId=child-123&limit=20`

**Description**: Get message conversations for a child

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID
- `limit` (optional): Number of conversations (default: 20)

**Response (200 OK)**:
```json
{
  "conversations": [
    {
      "id": "conv-1",
      "teacher": {
        "id": "teacher-1",
        "name": "Mr. Smith",
        "subject": "Mathematics"
      },
      "lastMessage": "Great work on the assignment!",
      "lastMessageDate": "2026-04-27",
      "unreadCount": 0
    }
  ],
  "total": 5
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

**Caching**: 30 minutes

### Get Message Thread

**Endpoint**: `GET /api/parent/messages/:conversationId?childId=child-123`

**Description**: Get messages in a conversation

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID

**Response (200 OK)**:
```json
{
  "conversation": {
    "id": "conv-1",
    "teacher": {
      "id": "teacher-1",
      "name": "Mr. Smith"
    }
  },
  "messages": [
    {
      "id": "msg-1",
      "sender": "teacher",
      "content": "Great work on the assignment!",
      "date": "2026-04-27",
      "attachments": []
    }
  ]
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

**Caching**: 15 minutes

### Send Message

**Endpoint**: `POST /api/parent/messages`

**Description**: Send a message to a teacher

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "conversationId": "conv-1",
  "childId": "child-123",
  "content": "Thank you for the feedback!",
  "attachments": []
}
```

**Response (201 Created)**:
```json
{
  "id": "msg-2",
  "sender": "parent",
  "content": "Thank you for the feedback!",
  "date": "2026-04-27",
  "status": "sent"
}
```

**Error Responses**:
- 401: Unauthorized
- 400: Invalid request
- 500: Server error

### Mark Conversation as Read

**Endpoint**: `PUT /api/parent/messages/:conversationId/read`

**Description**: Mark all messages in conversation as read

**Authentication**: Required (Bearer token)

**Response (200 OK)**:
```json
{
  "message": "Conversation marked as read"
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Not found
- 500: Server error

---

## Fees

### Get Fee Information

**Endpoint**: `GET /api/parent/fees?childId=child-123`

**Description**: Get fee information for a child

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID

**Response (200 OK)**:
```json
{
  "child": {
    "id": "child-123",
    "name": "Jane Doe"
  },
  "feeSummary": {
    "totalFees": 50000,
    "paidAmount": 45000,
    "outstandingAmount": 5000,
    "dueDate": "2026-05-31"
  },
  "feeStructure": [
    {
      "id": "fee-1",
      "name": "Tuition Fee",
      "amount": 40000,
      "paid": 40000
    }
  ],
  "paymentHistory": [
    {
      "id": "pay-1",
      "date": "2026-04-01",
      "amount": 45000,
      "method": "bank_transfer",
      "status": "completed"
    }
  ],
  "paymentPlans": [
    {
      "id": "plan-1",
      "name": "Monthly Plan",
      "installments": 12,
      "amount": 4166.67
    }
  ]
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

**Caching**: 1 day

---

## Timetable

### Get Timetable

**Endpoint**: `GET /api/parent/timetable?childId=child-123&termId=term-123`

**Description**: Get timetable for a child

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID
- `termId` (optional): Term ID

**Response (200 OK)**:
```json
{
  "child": {
    "id": "child-123",
    "name": "Jane Doe"
  },
  "term": {
    "id": "term-123",
    "name": "Term 1"
  },
  "weeklySchedule": [
    {
      "day": "Monday",
      "classes": [
        {
          "id": "class-1",
          "subject": "Mathematics",
          "teacher": "Mr. Smith",
          "startTime": "09:00",
          "endTime": "10:00",
          "room": "A101"
        }
      ]
    }
  ],
  "examSchedule": [
    {
      "id": "exam-1",
      "subject": "Mathematics",
      "date": "2026-05-15",
      "startTime": "09:00",
      "endTime": "11:00",
      "room": "Exam Hall A"
    }
  ],
  "holidays": [
    {
      "id": "hol-1",
      "name": "Summer Break",
      "startDate": "2026-06-01",
      "endDate": "2026-06-30"
    }
  ]
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

**Caching**: 1 day

---

## Health

### Get Health Information

**Endpoint**: `GET /api/parent/health?childId=child-123`

**Description**: Get health and wellness information

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `childId` (required): Child ID

**Response (200 OK)**:
```json
{
  "child": {
    "id": "child-123",
    "name": "Jane Doe"
  },
  "medicalHistory": [
    {
      "id": "med-1",
      "date": "2026-03-15",
      "condition": "Common Cold",
      "treatment": "Rest and fluids"
    }
  ],
  "vaccinations": [
    {
      "id": "vac-1",
      "name": "COVID-19",
      "date": "2026-01-15",
      "nextDue": "2026-07-15"
    }
  ],
  "allergies": [
    {
      "id": "allergy-1",
      "allergen": "Peanuts",
      "severity": "high",
      "reaction": "Anaphylaxis"
    }
  ],
  "emergencyContacts": [
    {
      "id": "contact-1",
      "name": "Dr. Johnson",
      "relationship": "Family Doctor",
      "phone": "+1-XXX-XXX-XXXX"
    }
  ]
}
```

**Error Responses**:
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

**Caching**: 1 day

---

## Notifications

### Get Notifications

**Endpoint**: `GET /api/parent/notifications?limit=20&type=academic`

**Description**: Get notifications for parent

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `limit` (optional): Number of notifications (default: 20)
- `type` (optional): Filter by type

**Response (200 OK)**:
```json
{
  "notifications": [
    {
      "id": "notif-1",
      "type": "academic",
      "title": "Grade Posted",
      "message": "New grade posted for Mathematics",
      "date": "2026-04-27",
      "read": false
    }
  ],
  "total": 45,
  "unreadCount": 5
}
```

**Error Responses**:
- 401: Unauthorized
- 500: Server error

**Caching**: 5 minutes

### Mark Notification as Read

**Endpoint**: `PUT /api/parent/notifications/:notificationId/read`

**Description**: Mark notification as read

**Authentication**: Required (Bearer token)

**Response (200 OK)**:
```json
{
  "message": "Notification marked as read"
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Not found
- 500: Server error

### Get Notification Preferences

**Endpoint**: `GET /api/parent/notification-preferences`

**Description**: Get notification preferences

**Authentication**: Required (Bearer token)

**Response (200 OK)**:
```json
{
  "preferences": {
    "academic": {
      "email": true,
      "sms": false,
      "inApp": true
    },
    "attendance": {
      "email": true,
      "sms": true,
      "inApp": true
    },
    "behavioral": {
      "email": true,
      "sms": false,
      "inApp": true
    },
    "fees": {
      "email": true,
      "sms": true,
      "inApp": true
    }
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 500: Server error

**Caching**: 1 day

### Update Notification Preferences

**Endpoint**: `PUT /api/parent/notification-preferences`

**Description**: Update notification preferences

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "academic": {
    "email": true,
    "sms": false,
    "inApp": true
  }
}
```

**Response (200 OK)**:
```json
{
  "message": "Preferences updated successfully"
}
```

**Error Responses**:
- 401: Unauthorized
- 400: Invalid request
- 500: Server error

---

## Profile

### Get Parent Profile

**Endpoint**: `GET /api/parent/profile`

**Description**: Get parent profile information

**Authentication**: Required (Bearer token)

**Response (200 OK)**:
```json
{
  "id": "parent-123",
  "email": "parent@example.com",
  "name": "John Doe",
  "phone": "+1-XXX-XXX-XXXX",
  "address": "123 Main St, City, State 12345",
  "city": "City",
  "state": "State",
  "zipCode": "12345"
}
```

**Error Responses**:
- 401: Unauthorized
- 500: Server error

**Caching**: 1 day

### Update Parent Profile

**Endpoint**: `PUT /api/parent/profile`

**Description**: Update parent profile information

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "name": "John Doe",
  "phone": "+1-XXX-XXX-XXXX",
  "address": "123 Main St",
  "city": "City",
  "state": "State",
  "zipCode": "12345"
}
```

**Response (200 OK)**:
```json
{
  "message": "Profile updated successfully"
}
```

**Error Responses**:
- 401: Unauthorized
- 400: Invalid request
- 500: Server error

### Get Linked Children

**Endpoint**: `GET /api/parent/children`

**Description**: Get list of children linked to parent

**Authentication**: Required (Bearer token)

**Response (200 OK)**:
```json
{
  "children": [
    {
      "id": "child-1",
      "name": "Jane Doe",
      "class": "10A",
      "rollNumber": "001",
      "dateOfBirth": "2010-05-15"
    }
  ],
  "total": 2
}
```

**Error Responses**:
- 401: Unauthorized
- 500: Server error

**Caching**: 1 day

### Add Child

**Endpoint**: `POST /api/parent/children`

**Description**: Link a child to parent account

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "childId": "child-2",
  "verificationCode": "ABC123"
}
```

**Response (201 Created)**:
```json
{
  "message": "Child linked successfully",
  "child": {
    "id": "child-2",
    "name": "John Doe Jr.",
    "class": "9B"
  }
}
```

**Error Responses**:
- 401: Unauthorized
- 400: Invalid verification code
- 409: Child already linked
- 500: Server error

### Remove Child

**Endpoint**: `DELETE /api/parent/children/:childId`

**Description**: Unlink a child from parent account

**Authentication**: Required (Bearer token)

**Response (200 OK)**:
```json
{
  "message": "Child unlinked successfully"
}
```

**Error Responses**:
- 401: Unauthorized
- 404: Not found
- 500: Server error

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication token |
| FORBIDDEN | 403 | Authenticated but not authorized |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request parameters |
| CONFLICT | 409 | Resource conflict (e.g., duplicate) |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal server error |

---

## Rate Limiting

### Rate Limits

- **Default**: 100 requests per minute per user
- **Authentication**: 5 requests per minute per IP
- **Search**: 30 requests per minute per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1619635200
```

### Rate Limit Response

When rate limit exceeded (429):

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

---

## Caching Strategy

### Cache Durations

| Endpoint | Duration | Reason |
|----------|----------|--------|
| Dashboard | 5 min | Frequently accessed, real-time updates |
| Academic | 1 day | Grades updated daily |
| Attendance | 1 day | Updated daily |
| Behavioral | 1 day | Updated daily |
| Announcements | 1 hour | Regular updates |
| Messages | 30 min | Frequent updates |
| Fees | 1 day | Updated daily |
| Timetable | 1 day | Rarely changes |
| Health | 1 day | Updated as needed |
| Notifications | 5 min | Real-time updates |
| Profile | 1 day | Rarely changes |

### Cache Invalidation

Caches are invalidated when:
- User updates profile
- New data is posted
- Admin updates data
- Manual cache clear

---

**Document Version**: 1.0.0  
**Last Updated**: April 27, 2026  
**Status**: Complete
