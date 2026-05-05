# Attendance Logging System - API Documentation

## Overview

The Attendance Logging System provides a comprehensive REST API for managing attendance records, biometric devices, analytics, and audit trails. This documentation covers all available endpoints, request/response formats, error handling, and integration guidelines.

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Response Format](#response-format)
5. [Attendance Endpoints](#attendance-endpoints)
6. [Biometric Device Endpoints](#biometric-device-endpoints)
7. [Analytics Endpoints](#analytics-endpoints)
8. [Audit Trail Endpoints](#audit-trail-endpoints)
9. [Error Codes & Responses](#error-codes--responses)
10. [Integration Guide for Device Vendors](#integration-guide-for-device-vendors)

---

## API Overview

### Base URL

```
https://api.schoolmanagement.com/api/tenant
```

### API Version

Current version: **v1**

### Supported Content Types

- Request: `application/json`
- Response: `application/json`

### Authentication

All API requests require authentication using an API key or OAuth 2.0 token.

**API Key Authentication**:
```
Authorization: Bearer YOUR_API_KEY
```

**OAuth 2.0**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Rate Limiting

- **Limit**: 100 requests per minute per API key
- **Headers**: 
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Authentication

### API Key Authentication

1. Generate API key from admin dashboard
2. Include in request header:
   ```
   Authorization: Bearer sk_live_abc123xyz789
   ```

### OAuth 2.0 Authentication

1. Obtain access token from `/oauth/token` endpoint
2. Include in request header:
   ```
   Authorization: Bearer access_token_here
   ```

### Permissions

API keys can be scoped to specific permissions:
- `attendance:read` - Read attendance records
- `attendance:write` - Create/update attendance records
- `devices:read` - Read device information
- `devices:write` - Manage devices
- `analytics:read` - Read analytics data
- `audit:read` - Read audit trail

---

## Rate Limiting

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1620000000
```

### Handling Rate Limits

When rate limit is exceeded:
- HTTP Status: `429 Too Many Requests`
- Retry after: Check `Retry-After` header
- Wait time: Typically 60 seconds

**Example**:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1620000060
```

---

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

### Error Response

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "status",
        "message": "Status must be present, absent, or late"
      }
    ]
  }
}
```

### Pagination

Paginated responses include:
- `total`: Total number of records
- `limit`: Records per page
- `offset`: Starting position

**Query Parameters**:
- `limit`: Number of records (default: 100, max: 1000)
- `offset`: Starting position (default: 0)

---

## Attendance Endpoints

### POST /api/tenant/attendance

Submit attendance records (teacher entry, batch, or API entry).

**Authentication**: Required (attendance:write)

**Request**:
```json
{
  "records": [
    {
      "studentId": "STU001",
      "class": "JSS 1",
      "date": "2024-05-04",
      "status": "present",
      "absenceReasonId": null,
      "academicSession": "2024/2025",
      "term": "1"
    },
    {
      "studentId": "STU002",
      "class": "JSS 1",
      "date": "2024-05-04",
      "status": "absent",
      "absenceReasonId": "reason-uuid-123",
      "academicSession": "2024/2025",
      "term": "1"
    }
  ]
}
```

**Request Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| records | array | Yes | Array of attendance records |
| studentId | string | Yes | Student ID |
| class | string | Yes | Class name |
| date | string | Yes | Date in YYYY-MM-DD format |
| status | string | Yes | present, absent, or late |
| absenceReasonId | string | No | UUID of absence reason |
| academicSession | string | Yes | Academic session (YYYY/YYYY) |
| term | string | Yes | Term number (1, 2, or 3) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "count": 2,
    "message": "2 attendance records saved",
    "inserted": 2,
    "updated": 0
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded

**Validation Rules**:
- Date cannot be in future
- Status must be: present, absent, late
- Student must exist in system
- Class must exist in system
- Academic session format: YYYY/YYYY
- Term must be: 1, 2, or 3

---

### GET /api/tenant/attendance

Fetch attendance records with filtering and pagination.

**Authentication**: Required (attendance:read)

**Query Parameters**:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| class | string | Filter by class name | JSS 1 |
| date | string | Filter by specific date | 2024-05-04 |
| startDate | string | Filter by date range start | 2024-05-01 |
| endDate | string | Filter by date range end | 2024-05-31 |
| studentId | string | Filter by student | STU001 |
| status | string | Filter by status | present |
| source | string | Filter by source | teacher_entry |
| term | string | Filter by term | 1 |
| limit | integer | Records per page (max: 1000) | 100 |
| offset | integer | Starting position | 0 |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "studentId": "STU001",
      "class": "JSS 1",
      "date": "2024-05-04",
      "status": "present",
      "absenceReason": null,
      "source": "teacher_entry",
      "deviceId": null,
      "createdAt": "2024-05-04T10:30:00Z",
      "updatedAt": "2024-05-04T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0
  }
}
```

**Example Request**:
```
GET /api/tenant/attendance?class=JSS%201&startDate=2024-05-01&endDate=2024-05-31&limit=50&offset=0
Authorization: Bearer sk_live_abc123xyz789
```

---

### POST /api/tenant/attendance/batch-upload

Upload attendance records in bulk via CSV file.

**Authentication**: Required (attendance:write)

**Request**: Multipart form data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | Yes | CSV file |

**CSV Format**:
```
studentId,class,date,status,academicSession,term,absenceReason
STU001,JSS 1,2024-05-04,present,2024/2025,1,
STU002,JSS 1,2024-05-04,absent,2024/2025,1,Sick
STU003,JSS 1,2024-05-04,late,2024/2025,1,
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalRecords": 100,
    "validRecords": 98,
    "invalidRecords": 2,
    "inserted": 98,
    "errors": [
      {
        "row": 5,
        "error": "Invalid status: 'maybe' (must be present, absent, or late)"
      },
      {
        "row": 42,
        "error": "Student STU999 not found"
      }
    ]
  }
}
```

**Validation Rules**:
- CSV must have required columns
- Date cannot be in future
- Status must be: present, absent, late
- Student must exist
- Class must exist
- Maximum file size: 10MB
- Maximum records: 10,000

---

## Biometric Device Endpoints

### GET /api/tenant/biometric-devices

List all registered biometric devices.

**Authentication**: Required (devices:read)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (active, inactive, maintenance, error) |
| limit | integer | Records per page (default: 100) |
| offset | integer | Starting position (default: 0) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "device-uuid-123",
      "deviceName": "Main Gate Scanner",
      "deviceType": "fingerprint",
      "manufacturer": "ZKTeco",
      "model": "MB360",
      "serialNumber": "ZK123456",
      "location": "Main Gate",
      "status": "active",
      "syncStatus": "synced",
      "lastSync": "2024-05-04T10:30:00Z",
      "enrolledStudentsCount": 450,
      "attendanceCount": 1250,
      "createdAt": "2024-04-01T08:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 100,
    "offset": 0
  }
}
```

---

### POST /api/tenant/biometric-devices

Register a new biometric device.

**Authentication**: Required (devices:write)

**Request**:
```json
{
  "deviceName": "Main Gate Scanner",
  "deviceType": "fingerprint",
  "manufacturer": "ZKTeco",
  "model": "MB360",
  "serialNumber": "ZK123456",
  "location": "Main Gate",
  "ipAddress": "192.168.1.100",
  "port": 8080,
  "connectionProtocol": "HTTPS",
  "syncFrequency": "hourly"
}
```

**Request Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| deviceName | string | Yes | Unique device name |
| deviceType | string | Yes | fingerprint, face, iris, or palm |
| manufacturer | string | Yes | Device manufacturer |
| model | string | Yes | Device model |
| serialNumber | string | Yes | Unique serial number |
| location | string | Yes | Physical location |
| ipAddress | string | No | Device IP address |
| port | integer | No | Device port (1-65535) |
| connectionProtocol | string | No | HTTP, HTTPS, or custom |
| syncFrequency | string | Yes | hourly, every_4_hours, daily, manual |

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "device-uuid-123",
    "deviceName": "Main Gate Scanner",
    "status": "inactive",
    "message": "Device registered successfully. Status: inactive until first sync."
  }
}
```

---

### PUT /api/tenant/biometric-devices/{deviceId}

Update device configuration.

**Authentication**: Required (devices:write)

**Request**:
```json
{
  "ipAddress": "192.168.1.101",
  "port": 8081,
  "syncFrequency": "every_4_hours"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "device-uuid-123",
    "message": "Device configuration updated"
  }
}
```

---

### POST /api/tenant/biometric-devices/{deviceId}/test-connection

Test device connectivity.

**Authentication**: Required (devices:write)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "connected": true,
    "deviceInfo": {
      "model": "MB360",
      "firmwareVersion": "1.2.3",
      "enrolledUsers": 450
    },
    "message": "Connection successful"
  }
}
```

**Error Response** (200 OK with error):
```json
{
  "success": false,
  "error": {
    "code": "CONNECTION_TIMEOUT",
    "message": "Connection to device timed out",
    "troubleshooting": [
      "Verify device is powered on",
      "Check IP address is correct",
      "Verify network connectivity"
    ]
  }
}
```

---

### POST /api/tenant/biometric-devices/{deviceId}/sync

Trigger manual device sync.

**Authentication**: Required (devices:write)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "syncId": "sync-uuid-123",
    "status": "in_progress",
    "message": "Sync initiated"
  }
}
```

---

### GET /api/tenant/biometric-devices/{deviceId}/sync-logs

View device sync history.

**Authentication**: Required (devices:read)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Number of logs (default: 20) |
| offset | integer | Starting position (default: 0) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid-123",
      "syncTimestamp": "2024-05-04T10:30:00Z",
      "status": "success",
      "recordsSynced": 45,
      "recordsFailed": 0,
      "syncDurationMs": 2500,
      "errorDetails": null
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Analytics Endpoints

### GET /api/tenant/attendance/analytics/dashboard

Get summary statistics for attendance dashboard.

**Authentication**: Required (analytics:read)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "presentRate": 92.5,
    "absentRate": 5.2,
    "lateRate": 2.3,
    "totalRecords": 1250,
    "dataFreshness": "2024-05-04T10:30:00Z"
  }
}
```

---

### GET /api/tenant/attendance/analytics/heatmap

Get weekly attendance heatmap.

**Authentication**: Required (analytics:read)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| weeks | integer | Number of weeks (default: 4) |
| class | string | Filter by class |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "week": "2024-W18",
      "presentPct": 92,
      "absentPct": 5,
      "latePct": 3,
      "total": 450
    }
  ]
}
```

---

### GET /api/tenant/attendance/analytics/at-risk-students

Get list of at-risk students (attendance < 85%).

**Authentication**: Required (analytics:read)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| class | string | Filter by class |
| reason | string | Filter by reason (Absence/Late) |
| limit | integer | Records per page (default: 100) |
| offset | integer | Starting position (default: 0) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "studentId": "STU001",
      "name": "John Doe",
      "class": "JSS 1",
      "attendance": "78%",
      "reason": "Absence",
      "absenceCount": 8,
      "lateCount": 2,
      "owner": "Class Advisor"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 100,
    "offset": 0
  }
}
```

---

### GET /api/tenant/attendance/analytics/homeroom-leaderboard

Get class performance ranking.

**Authentication**: Required (analytics:read)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "homeroom": "JSS 1",
      "rate": 94,
      "studentCount": 45,
      "presentCount": 42
    }
  ]
}
```

---

## Audit Trail Endpoints

### GET /api/tenant/attendance/audit-trail

View audit trail records.

**Authentication**: Required (audit:read)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| studentId | string | Filter by student |
| startDate | string | Filter by date range start |
| endDate | string | Filter by date range end |
| action | string | Filter by action (create, update, delete) |
| limit | integer | Records per page (default: 100) |
| offset | integer | Starting position (default: 0) |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-uuid-123",
      "attendanceRecordId": "record-uuid-123",
      "action": "update",
      "oldValue": {
        "status": "absent"
      },
      "newValue": {
        "status": "present"
      },
      "changedBy": "teacher-uuid-123",
      "changedAt": "2024-05-04T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 500,
    "limit": 100,
    "offset": 0
  }
}
```

---

## Error Codes & Responses

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "fieldName",
        "message": "Field-specific error message"
      }
    ]
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_REQUEST | 400 | Invalid request parameters |
| INVALID_STATUS | 422 | Invalid attendance status |
| FUTURE_DATE | 422 | Date cannot be in future |
| STUDENT_NOT_FOUND | 422 | Student does not exist |
| CLASS_NOT_FOUND | 422 | Class does not exist |
| DUPLICATE_RECORD | 409 | Record already exists |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit exceeded |
| VALIDATION_ERROR | 422 | Validation failed |
| SERVER_ERROR | 500 | Internal server error |

### Example Error Responses

**Invalid Status**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS",
    "message": "Invalid attendance status",
    "details": [
      {
        "field": "status",
        "message": "Status must be present, absent, or late"
      }
    ]
  }
}
```

**Future Date**:
```json
{
  "success": false,
  "error": {
    "code": "FUTURE_DATE",
    "message": "Date cannot be in the future",
    "details": [
      {
        "field": "date",
        "message": "Date must be today or in the past"
      }
    ]
  }
}
```

**Student Not Found**:
```json
{
  "success": false,
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student not found",
    "details": [
      {
        "field": "studentId",
        "message": "Student with ID STU999 does not exist"
      }
    ]
  }
}
```

---

## Integration Guide for Device Vendors

### Device Sync Protocol

Biometric devices sync attendance data to the system using the following protocol:

#### 1. Device Initiates Connection

Device connects to system using configured IP and port:
```
Device → System: HTTPS POST /api/tenant/biometric-devices/{deviceId}/sync
```

#### 2. Authentication

Device authenticates using device credentials:
```
Authorization: Bearer device_token_xyz789
```

#### 3. Retrieve Unsynced Records

Device sends request to retrieve unsynced records:
```json
{
  "action": "get_unsynced_records",
  "deviceId": "device-uuid-123",
  "lastSyncTimestamp": "2024-05-04T10:00:00Z"
}
```

#### 4. System Returns Records

System returns attendance records from device:
```json
{
  "success": true,
  "data": [
    {
      "biometricId": "12345",
      "timestamp": "2024-05-04T10:15:00Z",
      "status": "present"
    }
  ]
}
```

#### 5. Device Processes Records

Device processes records and sends to system:
```json
{
  "records": [
    {
      "biometricId": "12345",
      "timestamp": "2024-05-04T10:15:00Z",
      "status": "present"
    }
  ]
}
```

#### 6. System Confirms Sync

System confirms sync completion:
```json
{
  "success": true,
  "data": {
    "recordsProcessed": 45,
    "recordsFailed": 0,
    "nextSyncTime": "2024-05-04T11:00:00Z"
  }
}
```

### Data Format Specifications

#### Attendance Record Format

```json
{
  "biometricId": "12345",
  "timestamp": "2024-05-04T10:15:00Z",
  "status": "present",
  "deviceId": "device-uuid-123"
}
```

**Fields**:
- `biometricId`: Device's identifier for the biometric data (required)
- `timestamp`: ISO 8601 timestamp of attendance (required)
- `status`: present, absent, or late (required)
- `deviceId`: Device identifier (required)

#### Device Information Format

```json
{
  "deviceId": "device-uuid-123",
  "model": "MB360",
  "firmwareVersion": "1.2.3",
  "enrolledUsers": 450,
  "status": "active"
}
```

### Authentication Requirements

#### Device API Key

Devices authenticate using a device-specific API key:

```
Authorization: Bearer device_sk_live_abc123xyz789
```

#### Permissions

Device API keys have limited permissions:
- `attendance:sync` - Sync attendance records
- `device:status` - Report device status

#### Token Refresh

Device tokens expire after 24 hours. Devices must refresh tokens:

```
POST /api/tenant/biometric-devices/{deviceId}/refresh-token
Authorization: Bearer device_sk_live_abc123xyz789
```

### Retry Logic and Exponential Backoff

Devices must implement exponential backoff for failed syncs:

```
Attempt 1: Immediate
Attempt 2: Wait 1 minute
Attempt 3: Wait 5 minutes
Attempt 4: Wait 15 minutes
Attempt 5: Wait 1 hour
After 5 failures: Set device status to ERROR
```

**Implementation Example**:
```javascript
const retryDelays = [0, 60, 300, 900, 3600]; // seconds

async function syncWithRetry(deviceId, records) {
  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(retryDelays[attempt] * 1000);
      }
      
      const response = await fetch(
        `/api/tenant/attendance`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deviceToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ records })
        }
      );
      
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      if (attempt === retryDelays.length - 1) {
        // All retries exhausted
        setDeviceStatus('error');
        throw error;
      }
    }
  }
}
```

### Example Device Integration

#### Fingerprint Scanner Integration

```javascript
class FingerprintScannerIntegration {
  constructor(deviceId, apiKey) {
    this.deviceId = deviceId;
    this.apiKey = apiKey;
    this.syncInterval = 3600000; // 1 hour
  }

  async startSync() {
    setInterval(() => this.sync(), this.syncInterval);
  }

  async sync() {
    try {
      // Get unsynced records from device
      const records = await this.getUnsyncdRecords();
      
      // Map biometric IDs to student IDs
      const mappedRecords = await this.mapBiometricIds(records);
      
      // Send to system
      const response = await this.sendToSystem(mappedRecords);
      
      // Update device status
      await this.updateDeviceStatus('active');
      
      return response;
    } catch (error) {
      await this.handleSyncError(error);
    }
  }

  async getUnsyncdRecords() {
    // Device-specific implementation
    // Returns array of { biometricId, timestamp, status }
  }

  async mapBiometricIds(records) {
    // Map biometric IDs to student IDs using enrollment data
    return records.map(record => ({
      ...record,
      studentId: this.enrollmentMap[record.biometricId]
    }));
  }

  async sendToSystem(records) {
    const response = await fetch(
      'https://api.schoolmanagement.com/api/tenant/attendance',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records })
      }
    );
    
    return response.json();
  }

  async updateDeviceStatus(status) {
    // Update device status in system
  }

  async handleSyncError(error) {
    // Implement retry logic
    // Update device status to error if retries exhausted
  }
}
```

### Testing Device Integration

1. **Test Connection**
   ```
   POST /api/tenant/biometric-devices/{deviceId}/test-connection
   ```

2. **Test Sync**
   ```
   POST /api/tenant/biometric-devices/{deviceId}/sync
   ```

3. **Verify Records**
   ```
   GET /api/tenant/attendance?deviceId={deviceId}
   ```

4. **Check Sync Logs**
   ```
   GET /api/tenant/biometric-devices/{deviceId}/sync-logs
   ```

---

## Rate Limiting Best Practices

1. **Implement Exponential Backoff**: Retry failed requests with increasing delays
2. **Cache Responses**: Cache frequently accessed data to reduce API calls
3. **Batch Requests**: Combine multiple operations into single requests
4. **Monitor Rate Limits**: Check `X-RateLimit-Remaining` header
5. **Handle 429 Responses**: Implement proper handling for rate limit errors

---

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS for API communication
2. **Secure API Keys**: Store API keys securely, never commit to version control
3. **Rotate Tokens**: Regularly rotate API keys and tokens
4. **Validate Input**: Validate all input data before sending to API
5. **Use Minimal Permissions**: Request only necessary permissions for API keys
6. **Monitor Activity**: Monitor API usage for suspicious activity

---

## Support & Resources

- **API Status**: https://status.schoolmanagement.com
- **Documentation**: https://docs.schoolmanagement.com
- **Support**: support@schoolmanagement.com
- **Issues**: https://github.com/schoolmanagement/api/issues

---

**Last Updated**: May 2024  
**Version**: 1.0
