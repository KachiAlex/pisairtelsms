# CBT Dashboard Component Documentation

**Version**: 1.0.0  
**Last Updated**: April 28, 2026

## Table of Contents

1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [ExamManagement Component](#exammanagement-component)
4. [QuestionBankTab Component](#questionbanktab-component)
5. [ExamCreationTab Component](#examcreationtab-component)
6. [LiveMonitoringTab Component](#livemonitoringtab-component)
7. [ExamResultsTab Component](#examresultstab-component)
8. [SecuritySettingsTab Component](#securitysettingstab-component)
9. [State Management](#state-management)
10. [Integration Points](#integration-points)

---

## Overview

The CBT Dashboard is composed of five interconnected tabs that manage the complete exam lifecycle:

1. **Question Bank Tab** - Manage exam questions
2. **Exam Creation Tab** - Create and schedule exams
3. **Live Monitoring Tab** - Monitor student progress in real-time
4. **Exam Results Tab** - View and analyze exam results
5. **Security Settings Tab** - Configure exam security

All components share a common parent component (`ExamManagement`) that manages tab state and provides shared functionality.

---

## Component Architecture

### Component Hierarchy

```
ExamManagement (Main Container)
├── QuestionBankTab
│   ├── QuestionList
│   ├── QuestionForm
│   ├── SearchFilter
│   ├── ImportExport
│   └── Statistics
├── ExamCreationTab
│   ├── ExamForm
│   ├── QuestionSelector
│   ├── SchedulingPanel
│   └── ExamList
├── LiveMonitoringTab
│   ├── MonitoringTable
│   ├── StudentProgressCard
│   ├── FilterPanel
│   └── FlagDialog
├── ExamResultsTab
│   ├── ResultsSummary
│   ├── ResultsTable
│   ├── AnalyticsPanel
│   ├── DetailedResultView
│   └── ExportPanel
└── SecuritySettingsTab
    ├── SecurityForm
    ├── ProctoringLogs
    ├── IPWhitelistPanel
    └── PasswordPanel
```

### Data Flow

```
API Layer
    ↓
State Management (Context/Redux)
    ↓
ExamManagement Component
    ↓
Tab Components
    ↓
Sub-components
    ↓
UI Elements
```

---

## ExamManagement Component

Main container component that manages tab state and provides shared functionality.

### Props

```typescript
interface ExamManagementProps {
  tenantId: string
  userId: string
  userRole: 'admin' | 'invigilator'
}
```

### State

```typescript
interface ExamManagementState {
  activeTab: 'questions' | 'exams' | 'live' | 'results' | 'security'
  selectedExam: Exam | null
  loading: boolean
  error: string | null
  stats: DashboardStats
  refreshInterval: number
}

interface DashboardStats {
  totalQuestions: number
  totalExams: number
  ongoingExams: number
  activeStudents: number
  averageScore: number
  passRate: number
}
```

### Methods

```typescript
// Tab management
switchTab(tab: string): void
selectExam(exam: Exam): void
clearSelection(): void

// Data refresh
refreshStats(): Promise<void>
startAutoRefresh(interval: number): void
stopAutoRefresh(): void

// Error handling
handleError(error: Error): void
clearError(): void
```

### Usage

```tsx
import ExamManagement from '@/components/pages/cbt/ExamManagement'

export default function CBTDashboard() {
  return (
    <ExamManagement
      tenantId="tenant-123"
      userId="user-456"
      userRole="invigilator"
    />
  )
}
```

### Integration Points

- **API**: Calls all CBT endpoints
- **State**: Manages global exam state
- **WebSocket**: Connects to real-time monitoring
- **Child Components**: Passes data and callbacks

---

## QuestionBankTab Component

Manages the question bank with CRUD operations, search, filtering, and import/export.

### Props

```typescript
interface QuestionBankTabProps {
  tenantId: string
  onExamSelect?: (exam: Exam) => void
  refreshTrigger?: number
}
```

### State

```typescript
interface QuestionBankState {
  questions: Question[]
  filteredQuestions: Question[]
  loading: boolean
  error: string | null
  selectedQuestions: Set<string>
  filters: QuestionFilter
  pagination: PaginationState
  showForm: boolean
  editingQuestion: Question | null
  importProgress: number
  exportInProgress: boolean
}

interface QuestionFilter {
  subject?: string
  difficulty?: string
  type?: string
  searchText?: string
  tags?: string[]
}
```

### Methods

```typescript
// CRUD Operations
async createQuestion(data: QuestionInput): Promise<void>
async updateQuestion(id: string, data: Partial<QuestionInput>): Promise<void>
async deleteQuestion(id: string): Promise<void>
async fetchQuestions(page?: number): Promise<void>

// Search and Filter
applyFilters(filters: QuestionFilter): void
searchQuestions(text: string): void
clearFilters(): void

// Import/Export
async importQuestions(file: File): Promise<void>
async exportQuestions(selectedOnly?: boolean): Promise<void>

// Selection
toggleQuestionSelection(id: string): void
selectAllQuestions(): void
clearSelection(): void

// Statistics
getStatistics(): QuestionStatistics
```

### Sub-Components

#### QuestionList
Displays paginated list of questions with actions.

```typescript
interface QuestionListProps {
  questions: Question[]
  selectedIds: Set<string>
  loading: boolean
  onSelect: (id: string) => void
  onEdit: (question: Question) => void
  onDelete: (id: string) => void
  onSelectAll: () => void
}
```

#### QuestionForm
Form for creating/editing questions.

```typescript
interface QuestionFormProps {
  question?: Question
  onSubmit: (data: QuestionInput) => Promise<void>
  onCancel: () => void
  loading: boolean
}
```

#### SearchFilter
Search and filter controls.

```typescript
interface SearchFilterProps {
  filters: QuestionFilter
  onFilterChange: (filters: QuestionFilter) => void
  onSearch: (text: string) => void
  onClear: () => void
}
```

#### ImportExport
Import/export functionality.

```typescript
interface ImportExportProps {
  onImport: (file: File) => Promise<void>
  onExport: (selectedOnly: boolean) => Promise<void>
  importProgress: number
  exportInProgress: boolean
}
```

#### Statistics
Display question statistics.

```typescript
interface StatisticsProps {
  stats: QuestionStatistics
  loading: boolean
}

interface QuestionStatistics {
  totalCount: number
  byDifficulty: Record<string, number>
  byType: Record<string, number>
  bySubject: Record<string, number>
}
```

### Usage

```tsx
<QuestionBankTab
  tenantId="tenant-123"
  onExamSelect={handleExamSelect}
  refreshTrigger={refreshCount}
/>
```

### API Integration

- `GET /api/tenant/cbt/questions` - Fetch questions
- `POST /api/tenant/cbt/questions` - Create question
- `PUT /api/tenant/cbt/questions/:id` - Update question
- `DELETE /api/tenant/cbt/questions/:id` - Delete question
- `POST /api/tenant/cbt/questions/import` - Import from CSV
- `GET /api/tenant/cbt/questions/export` - Export to CSV

---

## ExamCreationTab Component

Manages exam creation, question selection, and scheduling.

### Props

```typescript
interface ExamCreationTabProps {
  tenantId: string
  selectedExam?: Exam
  onExamCreated?: (exam: Exam) => void
  refreshTrigger?: number
}
```

### State

```typescript
interface ExamCreationState {
  exams: Exam[]
  filteredExams: Exam[]
  loading: boolean
  error: string | null
  showForm: boolean
  editingExam: Exam | null
  formData: ExamFormData
  selectedQuestions: Question[]
  availableQuestions: Question[]
  pagination: PaginationState
  scheduling: SchedulingState
}

interface ExamFormData {
  title: string
  subject: string
  class: string
  description?: string
  duration: number
  passMark: number
  totalMarks: number
  scheduledDate?: string
  scheduledTime?: string
  questionIds: string[]
}

interface SchedulingState {
  isScheduling: boolean
  scheduledDate?: string
  scheduledTime?: string
  validationErrors: Record<string, string>
}
```

### Methods

```typescript
// CRUD Operations
async createExam(data: ExamFormData): Promise<void>
async updateExam(id: string, data: Partial<ExamFormData>): Promise<void>
async deleteExam(id: string): Promise<void>
async fetchExams(page?: number): Promise<void>

// Question Management
async fetchAvailableQuestions(): Promise<void>
addQuestion(question: Question): void
removeQuestion(questionId: string): void
reorderQuestions(questions: Question[]): void

// Scheduling
async scheduleExam(examId: string, date: string, time: string): Promise<void>
async startExam(examId: string): Promise<void>

// Validation
validateExamForm(data: ExamFormData): ValidationResult
validateScheduling(date: string, time: string): ValidationResult

// Form Management
resetForm(): void
loadExamForEdit(exam: Exam): void
```

### Sub-Components

#### ExamForm
Form for creating/editing exams.

```typescript
interface ExamFormProps {
  exam?: Exam
  onSubmit: (data: ExamFormData) => Promise<void>
  onCancel: () => void
  loading: boolean
  validationErrors: Record<string, string>
}
```

#### QuestionSelector
Interface for selecting questions for an exam.

```typescript
interface QuestionSelectorProps {
  availableQuestions: Question[]
  selectedQuestions: Question[]
  onAdd: (question: Question) => void
  onRemove: (questionId: string) => void
  onReorder: (questions: Question[]) => void
  loading: boolean
}
```

#### SchedulingPanel
Scheduling controls.

```typescript
interface SchedulingPanelProps {
  exam: Exam
  onSchedule: (date: string, time: string) => Promise<void>
  onStart: () => Promise<void>
  loading: boolean
  validationErrors: Record<string, string>
}
```

#### ExamList
Display list of exams.

```typescript
interface ExamListProps {
  exams: Exam[]
  loading: boolean
  onEdit: (exam: Exam) => void
  onDelete: (id: string) => void
  onSchedule: (exam: Exam) => void
  onStart: (exam: Exam) => void
}
```

### Usage

```tsx
<ExamCreationTab
  tenantId="tenant-123"
  selectedExam={selectedExam}
  onExamCreated={handleExamCreated}
  refreshTrigger={refreshCount}
/>
```

### API Integration

- `GET /api/tenant/cbt/exams` - Fetch exams
- `POST /api/tenant/cbt/exams` - Create exam
- `PUT /api/tenant/cbt/exams/:id` - Update exam
- `DELETE /api/tenant/cbt/exams/:id` - Delete exam
- `POST /api/tenant/cbt/exams/:id/schedule` - Schedule exam
- `POST /api/tenant/cbt/exams/:id/start` - Start exam

---

## LiveMonitoringTab Component

Real-time monitoring of student exam progress.

### Props

```typescript
interface LiveMonitoringTabProps {
  tenantId: string
  selectedExam?: Exam
  refreshInterval?: number
}
```

### State

```typescript
interface LiveMonitoringState {
  monitoringData: LiveMonitoringData | null
  students: StudentExamProgress[]
  filteredStudents: StudentExamProgress[]
  loading: boolean
  error: string | null
  filters: MonitoringFilter
  selectedStudent: StudentExamProgress | null
  showFlagDialog: boolean
  flagReason: string
  wsConnected: boolean
  lastUpdate: Date
}

interface MonitoringFilter {
  status?: string
  class?: string
  searchText?: string
}
```

### Methods

```typescript
// Data Fetching
async fetchMonitoringData(examId: string): Promise<void>
async fetchStudentProgress(examId: string, studentId: string): Promise<void>

// Real-time Updates
connectWebSocket(examId: string): void
disconnectWebSocket(): void
handleProgressUpdate(data: StudentExamProgress): void

// Filtering
applyFilters(filters: MonitoringFilter): void
searchStudents(text: string): void
clearFilters(): void

// Actions
async flagStudent(studentId: string, reason: string): Promise<void>
async unflagStudent(studentId: string): Promise<void>

// Polling Fallback
startPolling(examId: string, interval: number): void
stopPolling(): void
```

### Sub-Components

#### MonitoringTable
Table displaying all students' progress.

```typescript
interface MonitoringTableProps {
  students: StudentExamProgress[]
  loading: boolean
  onSelectStudent: (student: StudentExamProgress) => void
  onFlag: (student: StudentExamProgress) => void
}
```

#### StudentProgressCard
Detailed progress card for a student.

```typescript
interface StudentProgressCardProps {
  student: StudentExamProgress
  onFlag: (reason: string) => Promise<void>
  onClose: () => void
}
```

#### FilterPanel
Filtering controls.

```typescript
interface FilterPanelProps {
  filters: MonitoringFilter
  onFilterChange: (filters: MonitoringFilter) => void
  onSearch: (text: string) => void
  onClear: () => void
}
```

#### FlagDialog
Dialog for flagging students.

```typescript
interface FlagDialogProps {
  student: StudentExamProgress
  onSubmit: (reason: string) => Promise<void>
  onCancel: () => void
  loading: boolean
}
```

### Usage

```tsx
<LiveMonitoringTab
  tenantId="tenant-123"
  selectedExam={selectedExam}
  refreshInterval={3000}
/>
```

### API Integration

- `GET /api/tenant/cbt/monitoring/:examId` - Fetch monitoring data
- `GET /api/tenant/cbt/monitoring/:examId/student/:studentId` - Fetch student progress
- `PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/flag` - Flag student
- `WebSocket /ws/cbt/monitoring/:examId` - Real-time updates

---

## ExamResultsTab Component

View and analyze exam results.

### Props

```typescript
interface ExamResultsTabProps {
  tenantId: string
  selectedExam?: Exam
  refreshTrigger?: number
}
```

### State

```typescript
interface ExamResultsState {
  results: ExamResultsSummary[]
  selectedResult: ExamResult | null
  loading: boolean
  error: string | null
  filters: ResultsFilter
  pagination: PaginationState
  showDetailedView: boolean
  exportInProgress: boolean
  analytics: ResultsAnalytics
}

interface ResultsFilter {
  examId?: string
  startDate?: string
  endDate?: string
  status?: string
}

interface ResultsAnalytics {
  averageScore: number
  passRate: number
  highestScore: number
  lowestScore: number
  medianScore: number
  standardDeviation: number
}
```

### Methods

```typescript
// Data Fetching
async fetchResults(page?: number): Promise<void>
async fetchExamResults(examId: string): Promise<void>
async fetchStudentResult(examId: string, studentId: string): Promise<void>

// Filtering
applyFilters(filters: ResultsFilter): void
clearFilters(): void

// Analytics
calculateAnalytics(results: ExamResult[]): ResultsAnalytics
generateReport(results: ExamResult[]): Report

// Export
async exportResults(format: 'csv' | 'pdf'): Promise<void>

// Detailed View
showDetailedResult(result: ExamResult): void
hideDetailedResult(): void
```

### Sub-Components

#### ResultsSummary
Summary statistics for results.

```typescript
interface ResultsSummaryProps {
  analytics: ResultsAnalytics
  loading: boolean
}
```

#### ResultsTable
Table of exam results.

```typescript
interface ResultsTableProps {
  results: ExamResult[]
  loading: boolean
  onSelectResult: (result: ExamResult) => void
}
```

#### AnalyticsPanel
Analytics visualization.

```typescript
interface AnalyticsPanelProps {
  analytics: ResultsAnalytics
  results: ExamResult[]
}
```

#### DetailedResultView
Detailed view of a single result.

```typescript
interface DetailedResultViewProps {
  result: ExamResult
  onClose: () => void
}
```

#### ExportPanel
Export controls.

```typescript
interface ExportPanelProps {
  onExport: (format: 'csv' | 'pdf') => Promise<void>
  exportInProgress: boolean
}
```

### Usage

```tsx
<ExamResultsTab
  tenantId="tenant-123"
  selectedExam={selectedExam}
  refreshTrigger={refreshCount}
/>
```

### API Integration

- `GET /api/tenant/cbt/results` - Fetch results summary
- `GET /api/tenant/cbt/results/:examId` - Fetch exam results
- `GET /api/tenant/cbt/results/:examId/student/:studentId` - Fetch student result
- `GET /api/tenant/cbt/results/export` - Export results

---

## SecuritySettingsTab Component

Configure exam security and view proctoring logs.

### Props

```typescript
interface SecuritySettingsTabProps {
  tenantId: string
  selectedExam?: Exam
  refreshTrigger?: number
}
```

### State

```typescript
interface SecuritySettingsState {
  settings: SecuritySettings | null
  loading: boolean
  error: string | null
  formData: SecuritySettingsForm
  proctoringLogs: ProctoringLog[]
  logsLoading: boolean
  logsFilter: LogsFilter
  logsPagination: PaginationState
  validationErrors: Record<string, string>
}

interface SecuritySettingsForm {
  enableProctoring: boolean
  disableCopyPaste: boolean
  disableRightClick: boolean
  requireCamera: boolean
  randomizeQuestions: boolean
  randomizeOptions: boolean
  allowedIPs: string[]
  examPassword: string
}

interface LogsFilter {
  eventType?: string
  studentId?: string
  startDate?: string
  endDate?: string
}
```

### Methods

```typescript
// Settings Management
async fetchSecuritySettings(examId: string): Promise<void>
async saveSecuritySettings(examId: string, settings: SecuritySettingsForm): Promise<void>

// Proctoring Logs
async fetchProctoringLogs(examId: string, page?: number): Promise<void>
applyLogsFilter(filter: LogsFilter): void
clearLogsFilter(): void

// Validation
validateSettings(settings: SecuritySettingsForm): ValidationResult
validateIPAddress(ip: string): boolean
validatePassword(password: string): boolean

// Form Management
resetForm(): void
loadSettings(settings: SecuritySettings): void
```

### Sub-Components

#### SecurityForm
Form for security settings.

```typescript
interface SecurityFormProps {
  settings?: SecuritySettings
  onSubmit: (data: SecuritySettingsForm) => Promise<void>
  loading: boolean
  validationErrors: Record<string, string>
}
```

#### ProctoringLogs
Display proctoring logs.

```typescript
interface ProctoringLogsProps {
  logs: ProctoringLog[]
  loading: boolean
  filter: LogsFilter
  onFilterChange: (filter: LogsFilter) => void
  pagination: PaginationState
  onPageChange: (page: number) => void
}
```

#### IPWhitelistPanel
IP whitelist management.

```typescript
interface IPWhitelistPanelProps {
  ips: string[]
  onAdd: (ip: string) => void
  onRemove: (ip: string) => void
  validationError?: string
}
```

#### PasswordPanel
Exam password management.

```typescript
interface PasswordPanelProps {
  password?: string
  onSet: (password: string) => void
  onClear: () => void
  validationError?: string
}
```

### Usage

```tsx
<SecuritySettingsTab
  tenantId="tenant-123"
  selectedExam={selectedExam}
  refreshTrigger={refreshCount}
/>
```

### API Integration

- `GET /api/tenant/cbt/security/:examId` - Fetch security settings
- `POST /api/tenant/cbt/security/:examId` - Save security settings
- `GET /api/tenant/cbt/security/:examId/logs` - Fetch proctoring logs

---

## State Management

### Context Structure

```typescript
interface CBTContextType {
  // Global State
  tenantId: string
  userId: string
  userRole: string

  // Tab State
  activeTab: string
  selectedExam: Exam | null

  // Data State
  questions: Question[]
  exams: Exam[]
  monitoringData: LiveMonitoringData | null
  results: ExamResult[]

  // UI State
  loading: boolean
  error: string | null

  // Actions
  switchTab: (tab: string) => void
  selectExam: (exam: Exam) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}
```

### Usage

```tsx
import { useCBTContext } from '@/contexts/CBTContext'

function MyComponent() {
  const { activeTab, switchTab, selectedExam } = useCBTContext()

  return (
    <button onClick={() => switchTab('questions')}>
      Switch to Questions
    </button>
  )
}
```

---

## Integration Points

### API Integration

All components integrate with the CBT API endpoints:

- Question Bank API
- Exam Management API
- Live Monitoring API
- Exam Results API
- Security Settings API

### WebSocket Integration

Live Monitoring Tab connects to WebSocket for real-time updates:

```typescript
const ws = new WebSocket(`ws://server/ws/cbt/monitoring/${examId}`)

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.type === 'progress_update') {
    updateStudentProgress(message.data)
  }
}
```

### Error Handling

All components implement consistent error handling:

```typescript
try {
  await fetchData()
} catch (error) {
  setError(error.message)
  // Display error to user
}
```

### Loading States

All async operations show loading indicators:

```typescript
{loading ? <Spinner /> : <Content />}
```

### Validation

All forms implement client-side and server-side validation:

```typescript
const errors = validateForm(formData)
if (Object.keys(errors).length > 0) {
  setValidationErrors(errors)
  return
}
```

---

**Document Version**: 1.0.0  
**Last Updated**: April 28, 2026  
**Status**: Complete
