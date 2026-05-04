# CBT & Examinations System - Component Documentation

## Overview

This document provides comprehensive documentation for all React components in the CBT (Computer-Based Testing) & Examinations system. The system is built with React functional components using hooks for state management and side effects.

## Component Hierarchy

```
ExamManagement (Container)
├── Dashboard Stats (StatCard components)
├── TabErrorBoundary
│   └── Tabs Container
│       ├── ExamCreationTab
│       ├── LiveMonitoringTab
│       ├── QuestionBankTab
│       ├── ExamResultsTab
│       └── SecuritySettingsTab
```

## Component Architecture

### Design Patterns

1. **Container/Presentational Pattern**: ExamManagement acts as a container managing state and data fetching
2. **Error Boundaries**: TabErrorBoundary catches rendering errors in tabs
3. **Custom Hooks**: Reusable logic for API calls and data management
4. **Controlled Components**: Form inputs with state management
5. **Composition**: Small, reusable UI components (Card, Button, Badge, etc.)

### State Management

- **Local State**: useState for component-level state
- **Side Effects**: useEffect for data fetching and subscriptions
- **Refs**: useRef for file inputs, polling intervals, and DOM references
- **API Integration**: tenantApiGet, tenantApiPost, tenantApiPut for backend communication

---

## Component Documentation

### 1. ExamManagement (Container Component)

**File**: `src/components/pages/ExamManagement.tsx`

**Purpose**: Main container component that manages the CBT examination system interface with tabbed navigation and dashboard statistics.

#### Props

None - This is a top-level container component.

#### State

```typescript
interface DashboardStats {
  totalQuestions: number;      // Total questions in question bank
  ongoingExams: number;        // Number of exams currently in progress
  scheduledExams: number;      // Number of exams scheduled for future
  activeStudents: number;      // Number of students currently taking exams
}
```

#### Hooks & Lifecycle

```typescript
useEffect(() => {
  // Fetch dashboard statistics on component mount
  // Calls /api/tenant/cbt/questions/stats and /api/tenant/cbt/exams
  // Updates stats state with fetched data
}, []);
```

#### Key Features

- **Dashboard Statistics**: Displays real-time counts of exams and students
- **Tab Navigation**: Five main tabs for different exam management functions
- **Error Boundary**: Catches errors in child tab components
- **Responsive Layout**: Grid layout adapts to screen size

#### Sub-Components

- **StatCard**: Displays individual statistics with icon and color coding
  - Props: `label`, `value`, `color`, `icon`
  - Used for: Ongoing Exams, Scheduled, Active Students, Question Bank

#### Usage Example

```typescript
import { ExamManagement } from '@/components/pages/ExamManagement';

export default function AdminDashboard() {
  return <ExamManagement />;
}
```

#### Error Handling

- TabErrorBoundary catches rendering errors
- Displays error message with reload button
- Non-critical stats failures don't block UI

#### Testing

```typescript
// Test component renders
render(<ExamManagement />);

// Test statistics display
expect(screen.getByText('Ongoing Exams')).toBeInTheDocument();

// Test tab navigation
fireEvent.click(screen.getByRole('tab', { name: /live monitoring/i }));
```

---

### 2. QuestionBankTab

**File**: `src/components/pages/cbt/QuestionBankTab.tsx`

**Purpose**: Manages the question bank with CRUD operations, search/filter, and CSV import/export functionality.

#### Props

None - Receives data from parent ExamManagement component.

#### State

```typescript
interface Question {
  id: string;
  text: string;
  type: 'objective' | 'truefalse' | 'essay';
  options: string[];
  correctAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  tags: string[];
  createdAt: string;
}

interface QuestionStats {
  total: number;
  byDifficulty: { Easy: number; Medium: number; Hard: number };
  byType: { objective: number; truefalse: number; essay: number };
}

interface QuestionFormData {
  text: string;
  type: 'objective' | 'truefalse' | 'essay';
  options: string[];
  correctAnswer: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  tags: string;
}
```

#### Hooks & Lifecycle

```typescript
// Fetch questions on mount and when filters change
useEffect(() => {
  fetchQuestions();
}, [page, search, filterSubject, filterDifficulty, filterType]);

// Fetch statistics after questions update
useEffect(() => {
  fetchStats();
}, [questions]);
```

#### Key Features

- **Question CRUD**: Create, read, update, delete questions
- **Search & Filter**: Filter by subject, difficulty, type
- **Pagination**: 20 questions per page
- **CSV Import/Export**: Bulk import/export questions
- **Statistics**: Display question bank statistics
- **Form Validation**: Client-side validation for question data

#### API Endpoints Used

- `GET /api/tenant/cbt/questions` - List questions with filters
- `POST /api/tenant/cbt/questions` - Create new question
- `DELETE /api/tenant/cbt/questions/:id` - Delete question
- `POST /api/tenant/cbt/questions/import` - Import CSV
- `GET /api/tenant/cbt/questions/export` - Export CSV
- `GET /api/tenant/cbt/questions/stats` - Get statistics

#### Form Validation

```typescript
function validateForm(form: QuestionFormData): FormErrors {
  // Question text: required, max 1000 characters
  // Subject: required
  // Options: required for objective/truefalse, 2-4 options
  // Correct answer: must match one of the options
  // Difficulty: Easy, Medium, or Hard
}
```

#### Usage Example

```typescript
import { QuestionBankTab } from '@/components/pages/cbt/QuestionBankTab';

export default function QuestionBank() {
  return <QuestionBankTab />;
}
```

#### CSV Format

**Import Format**:
```csv
text,type,option1,option1_correct,option2,option2_correct,difficulty,subject
"What is 2+2?",objective,"3",false,"4",true,Easy,Math
```

**Export Format**: Same as import format with all questions

#### Testing

```typescript
// Test question creation
fireEvent.click(screen.getByText('Add Question'));
fireEvent.change(screen.getByPlaceholderText('Enter question text...'), {
  target: { value: 'Test question?' }
});
fireEvent.click(screen.getByText('Save Question'));

// Test search
fireEvent.change(screen.getByPlaceholderText('Search questions...'), {
  target: { value: 'math' }
});

// Test CSV import
const file = new File(['text,type,...'], 'questions.csv', { type: 'text/csv' });
fireEvent.change(screen.getByLabelText('Import CSV'), { target: { files: [file] } });
```

---

### 3. ExamCreationTab

**File**: `src/components/pages/cbt/ExamCreationTab.tsx`

**Purpose**: Manages exam creation, editing, scheduling, and question selection.

#### Props

None - Receives data from parent ExamManagement component.

#### State

```typescript
interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  description?: string;
  duration: number;           // minutes
  passMark: number;           // 0-100
  totalMarks: number;
  status: 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed';
  scheduledDate?: string;
  scheduledTime?: string;
  questions: Array<{ id: string; questionId: string; marks: number; order: number }>;
  createdAt: string;
}

interface ExamForm {
  title: string;
  subject: string;
  class: string;
  duration: string;
  passMark: string;
  totalMarks: string;
  scheduledDate: string;
  scheduledTime: string;
  description: string;
}
```

#### Hooks & Lifecycle

```typescript
// Fetch exams on mount
useEffect(() => {
  fetchExams();
}, []);

// Fetch available questions when form opens
useEffect(() => {
  if (isFormOpen) fetchQuestions(questionSearch);
}, [isFormOpen, questionSearch]);
```

#### Key Features

- **Exam CRUD**: Create, read, update, delete exams
- **Question Selection**: Select questions from question bank
- **Exam Scheduling**: Schedule exams for future dates
- **Form Validation**: Comprehensive validation for exam data
- **Status Tracking**: Draft → Scheduled → Ongoing → Completed
- **Question Search**: Search questions while creating exam

#### API Endpoints Used

- `GET /api/tenant/cbt/exams` - List exams
- `POST /api/tenant/cbt/exams` - Create exam
- `PUT /api/tenant/cbt/exams/:id` - Update exam
- `DELETE /api/tenant/cbt/exams/:id` - Delete exam
- `POST /api/tenant/cbt/exams/:id/schedule` - Schedule exam
- `GET /api/tenant/cbt/questions` - Get questions for selection

#### Form Validation

```typescript
function validateExamForm(form: ExamForm, selectedQuestions: string[]): FormErrors {
  // Title: required, max 255 characters
  // Subject: required
  // Class: required
  // Duration: 15-480 minutes
  // Pass mark: 0-100
  // Total marks: must be > pass mark
  // Scheduled date: must be in future
  // Questions: at least 1 required
}
```

#### Usage Example

```typescript
import { ExamCreationTab } from '@/components/pages/cbt/ExamCreationTab';

export default function ExamCreation() {
  return <ExamCreationTab />;
}
```

#### Testing

```typescript
// Test exam creation
fireEvent.click(screen.getByText('Create Exam'));
fireEvent.change(screen.getByPlaceholderText('Exam title'), {
  target: { value: 'Math Final' }
});
fireEvent.change(screen.getByPlaceholderText('60'), {
  target: { value: '120' }
});

// Test question selection
fireEvent.click(screen.getByRole('checkbox', { name: /question 1/i }));

// Test scheduling
fireEvent.change(screen.getByLabelText('Scheduled Date'), {
  target: { value: '2026-05-15' }
});
fireEvent.click(screen.getByText('Save & Schedule'));
```

---

### 4. LiveMonitoringTab

**File**: `src/components/pages/cbt/LiveMonitoringTab.tsx`

**Purpose**: Real-time monitoring of student progress during exams with WebSocket support and student flagging.

#### Props

None - Receives data from parent ExamManagement component.

#### State

```typescript
interface StudentProgress {
  id: string;
  studentId: string;
  studentName: string;
  questionsAnswered: number;
  totalQuestions: number;
  currentQuestion: number;
  status: 'Active' | 'Completed' | 'Paused' | 'Flagged';
  timeRemaining: number;      // seconds
  completionPercentage: number;
  lastActivityTime: string;
  flagReason?: string;
}

interface MonitoringData {
  examId: string;
  examTitle: string;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  averageProgress: number;
  students: StudentProgress[];
}
```

#### Hooks & Lifecycle

```typescript
// Fetch ongoing exams on mount
useEffect(() => {
  fetchOngoingExams();
}, []);

// Fetch monitoring data and set up polling
useEffect(() => {
  if (selectedExamId) {
    fetchMonitoring(selectedExamId);
    // Poll every 10 seconds
    pollRef.current = setInterval(() => fetchMonitoring(selectedExamId), 10000);
  }
  return () => { if (pollRef.current) clearInterval(pollRef.current); };
}, [selectedExamId]);
```

#### Key Features

- **Real-Time Updates**: Polls monitoring data every 10 seconds
- **Student Progress**: Shows questions answered, time remaining, completion %
- **Status Filtering**: Filter students by status (Active, Completed, Paused, Flagged)
- **Student Flagging**: Flag students for suspicious activity with reason
- **Statistics**: Display total, active, completed, and flagged student counts
- **WebSocket Ready**: Designed for WebSocket integration (currently uses polling)

#### API Endpoints Used

- `GET /api/tenant/cbt/exams?status=Ongoing` - Get ongoing exams
- `GET /api/tenant/cbt/monitoring/:examId` - Get live monitoring data
- `PUT /api/tenant/cbt/monitoring/:examId/student/:studentId/flag` - Flag student

#### Usage Example

```typescript
import { LiveMonitoringTab } from '@/components/pages/cbt/LiveMonitoringTab';

export default function Monitoring() {
  return <LiveMonitoringTab />;
}
```

#### Real-Time Updates

**Current Implementation**: Polling every 10 seconds
```typescript
pollRef.current = setInterval(() => fetchMonitoring(selectedExamId), 10000);
```

**Future Enhancement**: WebSocket connection
```typescript
const ws = new WebSocket(`wss://api.example.com/ws/cbt/monitoring/${examId}`);
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setMonitoring(data);
};
```

#### Testing

```typescript
// Test exam selection
fireEvent.change(screen.getByLabelText('Select Ongoing Exam'), {
  target: { value: 'exam-123' }
});

// Test status filtering
fireEvent.click(screen.getByRole('button', { name: /Active/i }));

// Test student flagging
fireEvent.click(screen.getByRole('button', { name: /Flag/i }));
fireEvent.change(screen.getByPlaceholderText('Describe the suspicious activity...'), {
  target: { value: 'Tab switching detected' }
});
fireEvent.click(screen.getByText('Flag Student'));
```

---

### 5. ExamResultsTab

**File**: `src/components/pages/cbt/ExamResultsTab.tsx`

**Purpose**: Display exam results, analytics, and detailed student performance with export functionality.

#### Props

None - Receives data from parent ExamManagement component.

#### State

```typescript
interface ExamResult {
  id: string;
  studentId: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: 'Passed' | 'Failed';
  timeSpent: number;          // seconds
  submittedAt: string;
}

interface StudentAnswer {
  questionId: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksObtained: number;
  totalMarks: number;
}

interface ResultsSummary {
  examId: string;
  examTitle: string;
  totalStudents: number;
  completedStudents: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
  results: ExamResult[];
}
```

#### Hooks & Lifecycle

```typescript
// Fetch completed exams on mount
useEffect(() => {
  fetchCompletedExams();
}, []);

// Fetch results when exam selected or filters change
useEffect(() => {
  if (selectedExamId) fetchResults(selectedExamId);
}, [selectedExamId, startDate, endDate]);
```

#### Key Features

- **Results Summary**: Average score, pass rate, highest/lowest scores
- **Results List**: Paginated list of student results
- **Status Filtering**: Filter by Passed/Failed status
- **Date Filtering**: Filter results by date range
- **Detailed View**: View individual student answers and performance
- **Export**: Export results to CSV or PDF
- **Analytics**: Display completion rate and statistical metrics

#### API Endpoints Used

- `GET /api/tenant/cbt/exams?status=Completed` - Get completed exams
- `GET /api/tenant/cbt/results/:examId` - Get exam results summary
- `GET /api/tenant/cbt/results/:examId/student/:studentId` - Get detailed result
- `GET /api/tenant/cbt/results/export` - Export results

#### Usage Example

```typescript
import { ExamResultsTab } from '@/components/pages/cbt/ExamResultsTab';

export default function Results() {
  return <ExamResultsTab />;
}
```

#### Analytics Calculations

```typescript
// Average Score: Mean of all student scores
averageScore = results.reduce((sum, r) => sum + r.percentage, 0) / results.length;

// Pass Rate: Percentage of students who passed
passRate = (results.filter(r => r.status === 'Passed').length / results.length) * 100;

// Completion Rate: Percentage of students who completed
completionRate = (completedStudents / totalStudents) * 100;
```

#### Testing

```typescript
// Test exam selection
fireEvent.change(screen.getByLabelText('Select Completed Exam'), {
  target: { value: 'exam-123' }
});

// Test status filtering
fireEvent.click(screen.getByRole('button', { name: /Passed/i }));

// Test date filtering
fireEvent.change(screen.getByPlaceholderText('Start date'), {
  target: { value: '2026-05-01' }
});

// Test detailed view
fireEvent.click(screen.getByRole('button', { name: /View Details/i }));

// Test export
fireEvent.click(screen.getByRole('button', { name: /CSV/i }));
```

---

### 6. SecuritySettingsTab

**File**: `src/components/pages/cbt/SecuritySettingsTab.tsx`

**Purpose**: Configure exam security settings, proctoring options, and view security event logs.

#### Props

None - Receives data from parent ExamManagement component.

#### State

```typescript
interface SecuritySettings {
  id?: string;
  examId: string;
  proctoringEnabled: boolean;
  cameraRequired: boolean;
  copyPasteDisabled: boolean;
  rightClickDisabled: boolean;
  questionRandomization: boolean;
  optionRandomization: boolean;
  ipWhitelist?: string;       // CIDR notation
  examPassword?: string;
}

interface ProctoringLog {
  id: string;
  studentId: string;
  studentName?: string;
  eventType: 'camera_on' | 'camera_off' | 'tab_switch' | 'copy_attempt' | 'right_click';
  createdAt: string;
  eventDetails?: Record<string, any>;
}
```

#### Hooks & Lifecycle

```typescript
// Fetch exams on mount
useEffect(() => {
  fetchExams();
}, []);

// Fetch settings and logs when exam selected
useEffect(() => {
  if (selectedExamId) {
    fetchSettings(selectedExamId);
    fetchLogs(selectedExamId);
  }
}, [selectedExamId]);

// Refetch logs when filters change
useEffect(() => {
  if (selectedExamId) fetchLogs(selectedExamId);
}, [logEventFilter, logStartDate, logEndDate]);
```

#### Key Features

- **Proctoring Options**: Enable/disable camera, copy/paste, right-click
- **Question Randomization**: Randomize question and option order
- **IP Whitelist**: Restrict access by IP address (CIDR notation)
- **Exam Password**: Optional password protection
- **Proctoring Logs**: View security events with filtering
- **Form Validation**: Validate IP addresses and password strength

#### API Endpoints Used

- `GET /api/tenant/cbt/exams` - Get exams
- `GET /api/tenant/cbt/security/:examId` - Get security settings
- `POST /api/tenant/cbt/security/:examId` - Save security settings
- `GET /api/tenant/cbt/security/:examId/logs` - Get proctoring logs

#### Security Settings

```typescript
// Proctoring & Restrictions
- proctoringEnabled: Monitor students during exam
- cameraRequired: Students must enable camera
- copyPasteDisabled: Prevent copying exam content
- rightClickDisabled: Prevent context menu access
- questionRandomization: Random question order per student
- optionRandomization: Random option order per student

// Access Control
- ipWhitelist: Allowed IP addresses (CIDR notation)
- examPassword: Optional password protection
```

#### IP Whitelist Validation

```typescript
// Valid CIDR formats:
// 192.168.1.0/24
// 10.0.0.0/8
// 172.16.0.0/12

// Multiple ranges (comma-separated):
// 192.168.1.0/24, 10.0.0.0/8
```

#### Usage Example

```typescript
import { SecuritySettingsTab } from '@/components/pages/cbt/SecuritySettingsTab';

export default function SecuritySettings() {
  return <SecuritySettingsTab />;
}
```

#### Testing

```typescript
// Test exam selection
fireEvent.change(screen.getByLabelText('Select Exam'), {
  target: { value: 'exam-123' }
});

// Test toggle settings
fireEvent.click(screen.getByRole('switch', { name: /Enable Proctoring/i }));

// Test IP whitelist
fireEvent.change(screen.getByPlaceholderText('e.g. 192.168.1.0/24'), {
  target: { value: '192.168.1.0/24' }
});

// Test password
fireEvent.change(screen.getByPlaceholderText('Leave empty to keep existing password'), {
  target: { value: 'SecureP@ssw0rd' }
});

// Test save
fireEvent.click(screen.getByText('Save Settings'));

// Test log filtering
fireEvent.change(screen.getByDisplayValue('All Events'), {
  target: { value: 'tab_switch' }
});
```

---

## Common Patterns & Best Practices

### 1. Data Fetching Pattern

```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await tenantApiGet('/api/endpoint');
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    setData(data.data);
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Error');
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

### 2. Form Validation Pattern

```typescript
const [form, setForm] = useState(initialForm);
const [errors, setErrors] = useState<FormErrors>({});

const validate = (): FormErrors => {
  const errors: FormErrors = {};
  if (!form.field) errors.field = 'Field is required';
  return errors;
};

const handleSubmit = async () => {
  const errors = validate();
  if (Object.keys(errors).length > 0) {
    setErrors(errors);
    return;
  }
  // Submit form
};
```

### 3. Dialog/Modal Pattern

```typescript
const [isOpen, setIsOpen] = useState(false);

const handleOpen = () => {
  resetForm();
  setIsOpen(true);
};

const handleClose = () => {
  setIsOpen(false);
};

return (
  <>
    <Button onClick={handleOpen}>Open</Button>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* Dialog content */}
    </Dialog>
  </>
);
```

### 4. Polling Pattern

```typescript
const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

useEffect(() => {
  if (selectedId) {
    fetchData(selectedId);
    pollRef.current = setInterval(() => fetchData(selectedId), 10000);
  }
  return () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };
}, [selectedId]);
```

---

## Component Testing Guide

### Unit Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuestionBankTab } from '@/components/pages/cbt/QuestionBankTab';

describe('QuestionBankTab', () => {
  it('renders question list', async () => {
    render(<QuestionBankTab />);
    await waitFor(() => {
      expect(screen.getByText(/Question 1/i)).toBeInTheDocument();
    });
  });

  it('opens add question dialog', () => {
    render(<QuestionBankTab />);
    fireEvent.click(screen.getByText('Add Question'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('validates form before submission', () => {
    render(<QuestionBankTab />);
    fireEvent.click(screen.getByText('Add Question'));
    fireEvent.click(screen.getByText('Save Question'));
    expect(screen.getByText(/Question text is required/i)).toBeInTheDocument();
  });
});
```

### Integration Testing

```typescript
describe('Exam Creation Workflow', () => {
  it('creates exam with selected questions', async () => {
    render(<ExamCreationTab />);
    
    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Exam title'), {
      target: { value: 'Math Final' }
    });
    
    // Select questions
    fireEvent.click(screen.getByRole('checkbox', { name: /Question 1/i }));
    
    // Submit
    fireEvent.click(screen.getByText('Save as Draft'));
    
    // Verify
    await waitFor(() => {
      expect(screen.getByText('Math Final')).toBeInTheDocument();
    });
  });
});
```

---

## Troubleshooting Guide

### Issue: Component not rendering

**Cause**: Error in component or missing data
**Solution**: Check browser console for errors, verify API endpoints are working

### Issue: Data not updating

**Cause**: useEffect dependencies incorrect or API call failing
**Solution**: Check useEffect dependencies, verify API response in network tab

### Issue: Form validation not working

**Cause**: Validation function not called or errors not displayed
**Solution**: Verify validate() is called before submit, check error state display

### Issue: Polling not stopping

**Cause**: Cleanup function not called or interval not cleared
**Solution**: Verify useEffect cleanup function clears interval

### Issue: Dialog not closing

**Cause**: onOpenChange handler not updating state
**Solution**: Verify Dialog component receives correct open/onOpenChange props

---

## Performance Optimization

### 1. Memoization

```typescript
const MemoizedComponent = React.memo(Component);
const memoizedCallback = useCallback(() => {}, [dependencies]);
```

### 2. Lazy Loading

```typescript
const QuestionBankTab = lazy(() => import('./QuestionBankTab'));
```

### 3. Pagination

- Limit results to 20 items per page
- Implement next/previous navigation
- Avoid loading all data at once

### 4. Debouncing

```typescript
const debouncedSearch = useCallback(
  debounce((value) => fetchQuestions(value), 300),
  []
);
```

---

## Accessibility

### ARIA Labels

```typescript
<Button aria-label="Refresh">
  <RefreshCw className="w-4 h-4" />
</Button>
```

### Keyboard Navigation

- Tab through form fields
- Enter to submit forms
- Escape to close dialogs

### Screen Reader Support

- Use semantic HTML
- Provide alt text for icons
- Label form inputs

---

## API Integration

### Authentication

All API calls include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Error Handling

```typescript
try {
  const res = await tenantApiGet('/api/endpoint');
  if (!res.ok) throw new Error('API error');
  const data = await res.json();
} catch (e) {
  setError(e instanceof Error ? e.message : 'Unknown error');
}
```

### Rate Limiting

- Standard: 100 requests per minute
- Burst: 1000 requests per hour
- Check X-RateLimit-* headers

---

## Future Enhancements

1. **WebSocket Integration**: Replace polling with real-time WebSocket updates
2. **Offline Support**: Cache data locally for offline access
3. **Advanced Analytics**: More detailed performance metrics
4. **Bulk Operations**: Bulk edit/delete questions and exams
5. **Custom Reports**: Generate custom exam reports
6. **Mobile Optimization**: Improve mobile UI/UX
7. **Accessibility**: Enhanced keyboard navigation and screen reader support

---

## Related Documentation

- [API Documentation](./CBT_API_DOCUMENTATION.md)
- [Database Documentation](./CBT_DATABASE_DOCUMENTATION.md)
- [Deployment Guide](./CBT_DEPLOYMENT_GUIDE.md)
- [User Guide](./CBT_USER_GUIDE.md)

---

**Last Updated**: May 4, 2026  
**Version**: 1.0.0  
**Status**: Complete
