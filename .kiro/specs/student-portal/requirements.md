# Student Portal Requirements

## Overview

Build a read-only student portal where students can view their academic progress, attendance, timetable, fees, and receive school communications. The portal provides a personalized view of data already managed in the admin system.

## User Stories

### Dashboard
- As a student, I want to see my GPA, attendance percentage, next exam date, and outstanding fees at a glance
- As a student, I want to see recent announcements and messages from the school
- As a student, I want quick access to my key information without scrolling

### Results & Academic Performance
- As a student, I want to view my scores by subject, term, and academic session
- As a student, I want to see my average score and how it compares to class average
- As a student, I want to download my result slip as PDF
- As a student, I want to see my promotion status and next class assignment

### Attendance
- As a student, I want to view my attendance record by date and subject
- As a student, I want to see my attendance percentage and any absences
- As a student, I want to understand why I was marked absent (if reason is provided)

### Timetable
- As a student, I want to view my class timetable for the current term
- As a student, I want to see which teacher teaches each subject
- As a student, I want to see exam dates and times
- As a student, I want to download my timetable as PDF

### Fees & Payments
- As a student, I want to view my total fees, amount paid, and outstanding balance
- As a student, I want to see payment history with dates and amounts
- As a student, I want to download receipts for payments made
- As a student, I want to see payment due dates and any overdue amounts
- As a student, I want to make online payments (if enabled)

### Communications
- As a student, I want to receive and read school announcements
- As a student, I want to receive messages from teachers and school
- As a student, I want to mark messages as read/unread
- As a student, I want to reply to messages from teachers

## Functional Requirements

### 1. Authentication & Authorization
- Students log in with admission number and password
- Session persists for 24 hours or until logout
- Student can only view their own data
- Backend enforces row-level security (RLS) by studentId

### 2. Dashboard
- Display student name, admission number, class, and arm
- Show key metrics: GPA, attendance %, next exam, fee balance
- Display 5 most recent announcements
- Display 5 most recent messages
- Show loading skeletons while fetching data
- Handle API errors gracefully with retry options

### 3. Results
- List all scores by academic session and term
- Show subject, CA score, exam score, total score, attendance %
- Calculate and display average score
- Show class average for comparison
- Filter by academic session and term
- Download result slip as PDF with school letterhead

### 4. Attendance
- Display attendance records by date
- Show status (Present, Absent, Late, Excused)
- Calculate attendance percentage
- Show absence reasons if available
- Filter by date range and subject
- Highlight patterns (e.g., frequent absences on specific days)

### 5. Timetable
- Display weekly class schedule in grid format
- Show subject, teacher name, room number, time
- Highlight current day
- Show exam schedule separately
- Download timetable as PDF
- Show holidays and term dates

### 6. Fees
- Display fee summary: total fees, paid amount, balance
- Show payment status (Paid, Partially Paid, Unpaid)
- List all payments with date, amount, method, reference
- Show payment due dates
- Highlight overdue amounts in red
- Download receipts as PDF
- Show payment plan if applicable

### 7. Communications
- Display announcements with date, title, body
- Show message inbox with sender, subject, date
- Mark messages as read/unread
- Reply to messages (if enabled)
- Search announcements and messages
- Filter by sender or date range

### 8. Profile
- View personal information (name, admission number, class, contact)
- Change password
- Update contact information (if allowed)
- View login history

## Non-Functional Requirements

### Performance
- Dashboard loads in < 2 seconds
- All pages load in < 3 seconds
- Lazy load images and PDFs
- Cache student data for 5 minutes

### Security
- All API calls require valid JWT token
- Backend validates studentId matches token
- No sensitive data in localStorage except token
- HTTPS only
- Rate limit API calls to prevent abuse

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support

### Usability
- Mobile-first responsive design
- Intuitive navigation
- Clear error messages
- Confirmation dialogs for sensitive actions
- Undo/retry options where applicable

## Data Requirements

### Student Data
- Student ID, admission number, name, class, arm, gender
- Contact information (email, phone)
- Guardian information

### Academic Data
- Scores (CA, exam, total, attendance %)
- Attendance records (date, status, reason)
- Promotion status and next class
- Timetable entries (subject, teacher, room, time)

### Financial Data
- Fee assignments (total fees, due date)
- Payments (date, amount, method, reference)
- Payment plans (if applicable)
- Receipts

### Communication Data
- Announcements (title, body, date, audience)
- Messages (sender, subject, body, date, read status)

## API Endpoints Required

### Student-Specific APIs
- `GET /api/student/dashboard` - Dashboard summary
- `GET /api/student/results` - Student scores
- `GET /api/student/attendance` - Student attendance
- `GET /api/student/timetable` - Student timetable
- `GET /api/student/fees` - Student fee summary
- `GET /api/student/payments` - Payment history
- `GET /api/student/announcements` - School announcements
- `GET /api/student/messages` - Student messages
- `POST /api/student/messages/:id/reply` - Reply to message
- `PUT /api/student/messages/:id/read` - Mark message as read
- `GET /api/student/profile` - Student profile
- `PUT /api/student/profile` - Update profile
- `POST /api/student/change-password` - Change password

### Reused Admin APIs
- `/api/tenant/results` - For score data
- `/api/tenant/attendance` - For attendance data
- `/api/tenant/timetable/class-schedules` - For timetable
- `/api/tenant/finance` - For fee data
- `/api/tenant/communication` - For announcements
- `/api/tenant/parent-messages` - For messages

## Success Criteria

- Student can log in and view dashboard within 2 seconds
- All student data is correctly filtered to show only their information
- No data leakage between students
- Mobile experience is smooth and responsive
- All pages load without errors
- Students can download PDFs (results, receipts, timetable)
- Messages and announcements display correctly
- Attendance and fees calculations are accurate

