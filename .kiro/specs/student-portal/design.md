# Student Portal Design

## Architecture Overview

The Student Portal is a read-only interface that aggregates data from existing admin APIs and presents it in a student-friendly format. It uses role-based access control to ensure students only see their own data.

## Component Structure

```
StudentLayout
├── Sidebar (simplified navigation)
├── Header (student name, logout)
└── Main Content Area
    ├── StudentDashboard
    ├── MyResults
    ├── MyAttendance
    ├── MyTimetable
    ├── MyFees
    ├── Communications
    ├── Messages
    └── Profile
```

## Data Flow

```
Student Login
    ↓
JWT Token (includes studentId, role='student')
    ↓
StudentLayout (validates role)
    ↓
Page Component
    ↓
API Call with studentId filter
    ↓
Backend validates studentId matches token
    ↓
Return filtered data
    ↓
Render component
```

## API Design

### Student-Specific Endpoints

All endpoints auto-filter by logged-in student's ID. Backend validates studentId from JWT token.

#### Dashboard
```
GET /api/student/dashboard
Response: {
  student: { id, name, admissionNo, class, arm },
  metrics: { gpa, attendancePercent, nextExamDate, feeBalance },
  recentAnnouncements: [...],
  recentMessages: [...]
}
```

#### Results
```
GET /api/student/results?academicSession=2024/2025&term=Third Term
Response: {
  results: [
    { id, subject, caScore, examScore, totalScore, attendancePercent, classAverage }
  ],
  averageScore: 75,
  classAverage: 72
}
```

#### Attendance
```
GET /api/student/attendance?startDate=2024-01-01&endDate=2024-12-31
Response: {
  records: [
    { id, date, subject, status, reason }
  ],
  attendancePercent: 92,
  totalPresent: 180,
  totalAbsent: 15,
  totalLate: 5
}
```

#### Timetable
```
GET /api/student/timetable?termId=term-123
Response: {
  schedule: [
    { dayOfWeek, timeSlot, subject, teacher, room }
  ],
  examSchedule: [
    { subject, date, time, room, duration }
  ]
}
```

#### Fees
```
GET /api/student/fees
Response: {
  summary: { totalFees, paidAmount, balance, status },
  payments: [
    { id, date, amount, method, reference, receiptUrl }
  ],
  paymentPlan: { installments: [...] } (if applicable)
}
```

#### Announcements
```
GET /api/student/announcements?limit=10
Response: {
  announcements: [
    { id, title, body, date, audience }
  ]
}
```

#### Messages
```
GET /api/student/messages?limit=20
Response: {
  messages: [
    { id, sender, subject, body, date, isRead, replies: [...] }
  ]
}

POST /api/student/messages/:id/reply
Body: { body: "reply text" }
Response: { id, sender, subject, body, date, isRead, replies: [...] }

PUT /api/student/messages/:id/read
Response: { id, isRead: true }
```

#### Profile
```
GET /api/student/profile
Response: {
  id, name, admissionNo, class, arm, gender,
  email, phone, guardianName, guardianPhone
}

PUT /api/student/profile
Body: { email, phone }
Response: { id, name, ... }

POST /api/student/change-password
Body: { currentPassword, newPassword }
Response: { success: true }
```

## Component Specifications

### StudentLayout
- Simplified sidebar with 7 menu items (Dashboard, Results, Attendance, Timetable, Fees, Communications, Profile)
- Header with student name and logout button
- Mobile hamburger menu
- Responsive design (mobile-first)

### StudentDashboard
- Grid layout with 4 metric cards (GPA, Attendance %, Next Exam, Fee Balance)
- Recent announcements section (5 items)
- Recent messages section (5 items)
- Quick action buttons (View Results, Check Attendance, etc.)
- Loading skeletons while fetching
- Error states with retry buttons

### MyResults
- Filter by academic session and term
- Table with columns: Subject, CA Score, Exam Score, Total Score, Attendance %
- Show average score and class average
- Download result slip button
- Empty state if no results

### MyAttendance
- Calendar view or list view toggle
- Filter by date range
- Show attendance percentage
- Highlight absences and late arrivals
- Show absence reasons if available
- Statistics: total present, absent, late

### MyTimetable
- Weekly grid view (Mon-Fri columns, time slots rows)
- Show subject, teacher, room
- Highlight current day
- Separate exam schedule section
- Show holidays and term dates
- Download timetable button

### MyFees
- Fee summary card (total, paid, balance)
- Payment history table (date, amount, method, receipt link)
- Payment plan section (if applicable)
- Highlight overdue amounts
- Download receipt button per payment
- Online payment button (if enabled)

### Communications
- Announcements list with date, title, body
- Search and filter options
- Pagination (10 per page)
- Empty state if no announcements

### Messages
- Inbox list with sender, subject, date, read status
- Click to expand and read full message
- Reply button opens reply form
- Mark as read/unread toggle
- Search and filter options
- Empty state if no messages

### Profile
- Display personal information
- Edit button for email and phone
- Change password form
- Login history (last 5 logins)
- Logout all sessions button

## Database Schema

### Student-Specific Tables
None required - all data comes from existing admin tables with studentId filtering.

### API Layer Filtering
- `student_id` from JWT token
- Backend validates before returning data
- No client-side filtering

## Security Considerations

### Authentication
- JWT token includes `studentId` and `role='student'`
- Token expires after 24 hours
- Refresh token mechanism for extended sessions

### Authorization
- Backend validates `studentId` from token matches requested data
- No student can access another student's data
- API endpoints check `req.user.studentId === req.query.studentId`

### Data Protection
- HTTPS only
- No sensitive data in localStorage except JWT token
- Clear token on logout
- Rate limiting on API endpoints (10 requests/minute per student)

### Audit Trail
- Log all student portal access
- Log all data downloads (results, receipts, timetable)
- Log password changes

## Performance Optimization

### Caching
- Cache student dashboard data for 5 minutes
- Cache results and attendance for 1 hour
- Cache timetable for 1 day (only changes on term change)
- Cache announcements for 30 minutes

### Lazy Loading
- Load announcements and messages on demand
- Paginate message list (20 per page)
- Lazy load PDF downloads

### Image Optimization
- Compress school logo and images
- Use WebP format with fallback
- Lazy load images below fold

## UI/UX Patterns

### Loading States
- Skeleton loaders for all data sections
- Animated pulse effect
- Show "Loading..." text

### Error States
- Display error message with icon
- Show retry button
- Log error to monitoring service

### Empty States
- Show contextual message (e.g., "No announcements yet")
- Show icon relevant to section
- Suggest next action if applicable

### Responsive Design
- Mobile: Single column, hamburger menu
- Tablet: Two columns where applicable
- Desktop: Full layout with sidebar

## Accessibility

### WCAG 2.1 AA Compliance
- Semantic HTML (nav, main, section, article)
- ARIA labels for interactive elements
- Color contrast ratio ≥ 4.5:1
- Focus indicators visible
- Keyboard navigation support

### Screen Reader Support
- Alt text for all images
- Form labels associated with inputs
- Table headers marked with `<th>`
- Skip to main content link

## Testing Strategy

### Unit Tests
- Component rendering with mock data
- Data formatting and calculations
- Error handling

### Integration Tests
- API calls with real backend
- Authentication flow
- Data filtering by studentId

### E2E Tests
- Login flow
- Navigate through all pages
- Download PDFs
- Reply to messages

### Security Tests
- Attempt to access another student's data
- Attempt to modify data (should fail)
- Token expiration handling
- Rate limiting

