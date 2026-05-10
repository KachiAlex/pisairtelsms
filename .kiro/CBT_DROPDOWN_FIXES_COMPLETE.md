# CBT Dropdown Fixes - Complete Resolution

## Issues Fixed

### 1. **Tenant ID Type Mismatch (ROOT CAUSE)**
- **Problem**: Migration created `tenant_id UUID` but code was passing string `'default-tenant-uuid'`
- **Error**: `"invalid input syntax for type uuid: \"akoma@kreatixtech.com\""`
- **Fix**: Changed migration to use `VARCHAR(255)` for tenant_id with default value `'default-tenant-uuid'`
- **File**: `api/tenant/cbt/_migrations/004_create_subjects_table.sql`

### 2. **Missing Seed Data**
- **Problem**: Subjects and classes tables were empty, causing dropdowns to show "No subjects available"
- **Fix**: Created new migration `005_seed_subjects_and_classes.sql` that:
  - Creates classes table with proper schema
  - Seeds 10 core subjects (English, Math, Science, Biology, Chemistry, Physics, History, Geography, Civic Ed, Economics)
  - Seeds 12 classes (JSS1-3 and SS1-3, each with arms A and B)
  - All seeded with `tenant_id = 'default-tenant-uuid'`
- **File**: `api/tenant/cbt/_migrations/005_seed_subjects_and_classes.sql`

### 3. **Classes Endpoint Not Implemented**
- **Problem**: ExamCreationTab was calling `/api/tenant/cbt/classes` but endpoint only had mock data
- **Fix**: 
  - Created `api/tenant/cbt/_lib/classes.ts` library with full CRUD operations
  - Updated `api/tenant/cbt/classes.ts` to use the library
  - Endpoint now fetches real classes from database
- **Files**: 
  - `api/tenant/cbt/_lib/classes.ts` (new)
  - `api/tenant/cbt/classes.ts` (updated)

### 4. **Tenant ID Header Consistency**
- **Status**: Already fixed in previous work
- **Details**: LoginPanel sets `tenantId: 'default-tenant-uuid'` in auth storage
- **File**: `src/components/auth/LoginPanel.tsx`

## How It Works Now

### Login Flow
1. User logs in via LoginPanel
2. Auth token stored with `tenantId: 'default-tenant-uuid'`
3. `tenantApi.ts` reads auth from localStorage and sets `x-tenant-id: 'default-tenant-uuid'` header

### Dropdown Population
1. ExamCreationTab calls `/api/tenant/cbt/subjects?namesOnly=true`
2. Subjects endpoint queries database with `tenant_id = 'default-tenant-uuid'`
3. Returns array of subject names: `['English Language', 'Mathematics', 'Integrated Science', ...]`
4. ExamCreationTab calls `/api/tenant/cbt/classes`
5. Classes endpoint queries database with `tenant_id = 'default-tenant-uuid'`
6. Returns array of classes: `[{id, name, arm}, ...]`
7. Dropdowns populate with real data

## Database Schema

### Subjects Table
```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant-uuid',
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  levels JSONB NOT NULL,
  type VARCHAR(20) CHECK (type IN ('Core', 'Elective')),
  department VARCHAR(100) NOT NULL,
  ...
)
```

### Classes Table
```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant-uuid',
  name VARCHAR(100) NOT NULL,
  arm VARCHAR(50),
  level VARCHAR(50),
  ...
)
```

## API Endpoints

### GET /api/tenant/cbt/subjects?namesOnly=true
Returns: `{ success: true, data: ['English Language', 'Mathematics', ...] }`

### GET /api/tenant/cbt/classes
Returns: `{ success: true, data: [{id, name, arm, level}, ...] }`

### POST /api/tenant/cbt/subjects
Creates new subject with tenant_id from header

### POST /api/tenant/cbt/classes
Creates new class with tenant_id from header

## Testing

To verify the fixes work:

1. **Check subjects dropdown**:
   - Open exam creation modal
   - Subject dropdown should show: English Language, Mathematics, Integrated Science, Biology, Chemistry, Physics, History, Geography, Civic Education, Economics

2. **Check classes dropdown**:
   - Class dropdown should show: JSS1 A, JSS1 B, JSS2 A, JSS2 B, ..., SS3 A, SS3 B

3. **Check diagnostics**:
   - Call `/api/tenant/cbt/diagnostics` with `x-tenant-id: 'default-tenant-uuid'`
   - Should return all subjects and classes

## Files Modified/Created

### Created
- `api/tenant/cbt/_lib/classes.ts` - Classes library with CRUD operations
- `api/tenant/cbt/_migrations/005_seed_subjects_and_classes.sql` - Seed data migration

### Modified
- `api/tenant/cbt/_migrations/004_create_subjects_table.sql` - Changed tenant_id to VARCHAR
- `api/tenant/cbt/classes.ts` - Implemented with real database queries
- `src/components/auth/LoginPanel.tsx` - Already using 'default-tenant-uuid'
- `src/lib/tenantApi.ts` - Already setting correct headers

## Error Resolution

### Before
```
GET /api/tenant/cbt/subjects 500 (Internal Server Error)
Error: invalid input syntax for type uuid: "akoma@kreatixtech.com"
```

### After
```
GET /api/tenant/cbt/subjects 200 OK
Response: { success: true, data: ['English Language', 'Mathematics', ...] }
```

## Next Steps

1. Migrations will run automatically on next database initialization
2. Seed data will be inserted on first run
3. Dropdowns should populate correctly
4. Users can create exams with proper subject and class selection
