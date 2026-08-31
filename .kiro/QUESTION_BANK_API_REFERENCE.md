# Question Bank API - Quick Reference Guide

## Base URL
```
/api/tenant/cbt/questions
```

## Required Headers
All requests must include:
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>  (required for POST/PUT/DELETE)
```

---

## Endpoints

### 1. List Questions
```
GET /api/tenant/cbt/questions
```

**Query Parameters:**
- `subject` - Filter by subject (optional)
- `difficulty` - Filter by difficulty: Easy, Medium, Hard (optional)
- `type` - Filter by type: objective, truefalse, essay (optional)
- `searchText` - Search in question text (optional)
- `page` - Page number, default 1 (optional)
- `limit` - Items per page, default 20 (optional)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/tenant/cbt/questions?subject=Mathematics&difficulty=Easy&page=1&limit=10" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "tenantId": "550e8400-e29b-41d4-a716-446655440000",
      "text": "What is 2 + 2?",
      "type": "objective",
      "options": [
        { "id": "1", "text": "3" },
        { "id": "2", "text": "4" },
        { "id": "3", "text": "5" }
      ],
      "correctAnswer": "2",
      "difficulty": "Easy",
      "subject": "Mathematics",
      "tags": ["arithmetic", "basic"],
      "createdBy": "550e8400-e29b-41d4-a716-446655440001",
      "createdAt": "2026-05-03T10:00:00Z",
      "updatedAt": "2026-05-03T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

---

### 2. Get Single Question
```
GET /api/tenant/cbt/questions/:id
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/tenant/cbt/questions/550e8400-e29b-41d4-a716-446655440002" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001"
```

**Response:**
```json
{
  "success": true,
  "data": { /* question object */ }
}
```

---

### 3. Create Question
```
POST /api/tenant/cbt/questions
```

**Request Body:**
```json
{
  "text": "What is the capital of France?",
  "type": "objective",
  "options": [
    { "id": "1", "text": "London" },
    { "id": "2", "text": "Paris" },
    { "id": "3", "text": "Berlin" }
  ],
  "correctAnswer": "2",
  "difficulty": "Easy",
  "subject": "Geography",
  "tags": ["capitals", "europe"]
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/tenant/cbt/questions" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What is the capital of France?",
    "type": "objective",
    "options": [
      { "id": "1", "text": "London" },
      { "id": "2", "text": "Paris" },
      { "id": "3", "text": "Berlin" }
    ],
    "correctAnswer": "2",
    "difficulty": "Easy",
    "subject": "Geography",
    "tags": ["capitals", "europe"]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": { /* created question object */ }
}
```

**Status Codes:**
- `201` - Question created successfully
- `400` - Validation error or missing required fields
- `409` - Question with this text already exists

---

### 4. Update Question
```
PUT /api/tenant/cbt/questions/:id
```

**Request Body:** (partial update - only include fields to update)
```json
{
  "text": "Updated question text",
  "difficulty": "Medium"
}
```

**Example:**
```bash
curl -X PUT "http://localhost:3000/api/tenant/cbt/questions/550e8400-e29b-41d4-a716-446655440002" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -d '{ "difficulty": "Medium" }'
```

**Response:**
```json
{
  "success": true,
  "data": { /* updated question object */ }
}
```

**Status Codes:**
- `200` - Question updated successfully
- `400` - Validation error
- `404` - Question not found
- `409` - Duplicate text detected

---

### 5. Delete Question
```
DELETE /api/tenant/cbt/questions/:id
```

**Example:**
```bash
curl -X DELETE "http://localhost:3000/api/tenant/cbt/questions/550e8400-e29b-41d4-a716-446655440002" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001"
```

**Response:**
```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

**Status Codes:**
- `200` - Question deleted successfully
- `404` - Question not found

---

### 6. Import Questions from CSV
```
POST /api/tenant/cbt/questions/import
```

**Request Body:**
```json
{
  "csvContent": "text,type,options,correctAnswer,difficulty,subject,tags\n\"What is 2+2?\",objective,\"[{\\\"id\\\":\\\"1\\\",\\\"text\\\":\\\"3\\\"},{\\\"id\\\":\\\"2\\\",\\\"text\\\":\\\"4\\\"}]\",2,Easy,Mathematics,\"[\\\"arithmetic\\\"]\"\n"
}
```

**CSV Format:**
```
text,type,options,correctAnswer,difficulty,subject,tags
"What is 2+2?",objective,"[{""id"":""1"",""text"":""3""},{""id"":""2"",""text"":""4""}]",2,Easy,Mathematics,"[""arithmetic""]"
"True or False: Earth is flat",truefalse,"[{""id"":""1"",""text"":""True""},{""id"":""2"",""text"":""False""}]",2,Easy,Science,"[""earth""]"
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/tenant/cbt/questions/import" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -d '{ "csvContent": "..." }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 2,
    "errors": [
      { "row": 3, "error": "Question with this text already exists" },
      { "row": 5, "error": "Invalid question type" }
    ]
  }
}
```

**Status Codes:**
- `200` - Import completed (check errors array for failures)
- `400` - CSV format error

---

### 7. Export Questions to CSV
```
GET /api/tenant/cbt/questions/export
```

**Query Parameters:**
- `questionIds` - Comma-separated question IDs to export (optional)
- `subject` - Filter by subject before export (optional)

**Example:**
```bash
curl -X GET "http://localhost:3000/api/tenant/cbt/questions/export?subject=Mathematics" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001" \
  -o questions.csv
```

**Response:** CSV file download

**Status Codes:**
- `200` - CSV file returned
- `500` - Export error

---

### 8. Get Question Statistics
```
GET /api/tenant/cbt/questions/stats
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/tenant/cbt/questions/stats" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "byDifficulty": {
      "Easy": 50,
      "Medium": 75,
      "Hard": 25
    },
    "byType": {
      "objective": 100,
      "truefalse": 30,
      "essay": 20
    },
    "bySubject": {
      "Mathematics": 60,
      "English": 40,
      "Science": 50
    }
  }
}
```

---

## Error Responses

### Validation Error
```json
{
  "success": false,
  "error": "Missing required fields",
  "validationErrors": {
    "text": "text is required",
    "type": "type is required",
    "difficulty": "difficulty is required"
  }
}
```

### Not Found Error
```json
{
  "success": false,
  "error": "Question not found"
}
```

### Duplicate Error
```json
{
  "success": false,
  "error": "A question with this text already exists"
}
```

### Missing Header Error
```json
{
  "error": "x-tenant-id header is required"
}
```

---

## Question Types

- `objective` - Multiple choice questions
- `truefalse` - True/False questions
- `essay` - Essay/short answer questions

## Difficulty Levels

- `Easy`
- `Medium`
- `Hard`

---

## Common Use Cases

### Create a Multiple Choice Question
```bash
curl -X POST "http://localhost:3000/api/tenant/cbt/questions" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What is the largest planet in our solar system?",
    "type": "objective",
    "options": [
      { "id": "1", "text": "Earth" },
      { "id": "2", "text": "Jupiter" },
      { "id": "3", "text": "Saturn" },
      { "id": "4", "text": "Neptune" }
    ],
    "correctAnswer": "2",
    "difficulty": "Easy",
    "subject": "Science",
    "tags": ["astronomy", "planets"]
  }'
```

### Search for Questions
```bash
curl -X GET "http://localhost:3000/api/tenant/cbt/questions?searchText=planet&difficulty=Easy&page=1&limit=20" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001"
```

### Export All Mathematics Questions
```bash
curl -X GET "http://localhost:3000/api/tenant/cbt/questions/export?subject=Mathematics" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001" \
  -o math_questions.csv
```

### Get Statistics
```bash
curl -X GET "http://localhost:3000/api/tenant/cbt/questions/stats" \
  -H "x-tenant-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "x-user-id: 550e8400-e29b-41d4-a716-446655440001"
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Question IDs are UUIDs
- Soft deletes are used - deleted questions are not returned in list queries
- Duplicate detection is case-sensitive
- CSV import validates each row individually and reports errors per row
- All operations are tenant-isolated for multi-tenant support
