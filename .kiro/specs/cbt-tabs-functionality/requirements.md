# CBT Dashboard Tabs Functionality - Requirements

## Introduction

The CBT (Computer-Based Testing) Dashboard currently has five tabs in the Exam Management section: Exam Creation, Question Bank, Live Monitoring, Exam Results, and Security Settings. While the UI components exist, most tabs display only mock data and lack real functionality. This specification defines requirements to make all tabs fully functional with real data integration, backend connectivity, and operational capabilities.

## Glossary

- **CBT System**: Computer-Based Testing platform for administering digital exams
- **Question Bank**: Repository of exam questions organized by subject, difficulty, and type
- **Live Monitoring**: Real-time tracking of student exam progress during active exams
- **Exam Results**: Historical data and analytics of completed exams and student performance
- **Security Settings**: Configuration options for exam security, proctoring, and access control
- **Exam**: A structured assessment with questions, duration, and pass criteria
- **Student**: User taking an exam through the CBT system
- **Invigilator**: Administrator monitoring and managing exams
- **Mock Data**: Placeholder data used for UI demonstration (currently in use)
- **Real Data**: Actual data persisted in the database and retrieved via APIs

## Requirements

### Requirement 1: Question Bank Management

**User Story:** As an invigilator, I want to manage a persistent question bank, so that I can create, organize, and reuse questions across multiple exams.

#### Acceptance Criteria

1. WHEN an invigilator navigates to the Question Bank tab, THE System SHALL display all questions from the database, not mock data
2. WHEN an invigilator adds a new question, THE System SHALL persist it to the database and display it in the question bank
3. WHEN an invigilator deletes a question, THE System SHALL remove it from the database and update the display
4. WHEN an invigilator searches for questions by subject or keyword, THE System SHALL filter and display matching questions
5. WHEN an invigilator views the question bank, THE System SHALL display question count, difficulty distribution, and type breakdown
6. WHEN an invigilator imports questions from a CSV file, THE System SHALL validate the format and persist valid questions to the database
7. WHEN an invigilator exports questions, THE System SHALL generate a CSV file containing all selected questions with metadata

### Requirement 2: Exam Creation with Real Data

**User Story:** As an invigilator, I want to create exams with real data persistence, so that exams are saved and can be scheduled for students.

#### Acceptance Criteria

1. WHEN an invigilator creates an exam, THE System SHALL persist it to the database with all details (title, subject, class, duration, questions)
2. WHEN an invigilator selects questions for an exam, THE System SHALL retrieve them from the database question bank
3. WHEN an invigilator saves an exam, THE System SHALL validate that all required fields are populated and questions are selected
4. WHEN an invigilator views the exam list, THE System SHALL display only exams from the database, not mock data
5. WHEN an invigilator schedules an exam, THE System SHALL update the exam status and make it available to students at the scheduled time
6. WHEN an invigilator edits an exam, THE System SHALL update the database and reflect changes immediately

### Requirement 3: Live Monitoring with Real Student Data

**User Story:** As an invigilator, I want to monitor student progress in real-time during active exams, so that I can ensure exam integrity and identify issues.

#### Acceptance Criteria

1. WHEN an exam is ongoing, THE System SHALL display real student data from the database, not mock data
2. WHEN a student answers a question, THE System SHALL update their progress in real-time on the invigilator's monitoring dashboard
3. WHEN an invigilator views the Live Monitoring tab, THE System SHALL show each student's name, questions answered, time remaining, and completion percentage
4. WHEN a student completes an exam, THE System SHALL update their status to "Completed" and record the completion time
5. WHEN an invigilator flags a student for suspicious activity, THE System SHALL record the flag with timestamp and reason
6. WHEN an invigilator views monitoring data, THE System SHALL support filtering by exam, class, or status

### Requirement 4: Exam Results with Real Performance Data

**User Story:** As an invigilator, I want to view and analyze real exam results and student performance, so that I can assess learning outcomes and identify struggling students.

#### Acceptance Criteria

1. WHEN an invigilator navigates to the Exam Results tab, THE System SHALL display real exam results from the database, not mock data
2. WHEN an exam is completed, THE System SHALL automatically calculate and store the student's score, pass/fail status, and performance metrics
3. WHEN an invigilator views exam results, THE System SHALL display total exams completed, average score, and pass rate
4. WHEN an invigilator views individual exam results, THE System SHALL show exam name, number of students, average score, pass rate, and number of students who passed
5. WHEN an invigilator filters results by exam or date range, THE System SHALL retrieve and display matching results from the database
6. WHEN an invigilator exports results, THE System SHALL generate a report with student names, scores, and performance metrics
7. WHEN an invigilator views a student's detailed result, THE System SHALL show their answers, correct answers, score breakdown by question, and time spent

### Requirement 5: Security Settings Persistence

**User Story:** As an invigilator, I want to configure and persist security settings for exams, so that exam integrity is maintained and unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN an invigilator configures security settings, THE System SHALL persist them to the database
2. WHEN an invigilator enables proctoring, THE System SHALL activate camera monitoring and record proctoring data during the exam
3. WHEN an invigilator enables copy/paste prevention, THE System SHALL prevent students from copying exam content
4. WHEN an invigilator enables right-click prevention, THE System SHALL disable context menu access during the exam
5. WHEN an invigilator requires a camera, THE System SHALL verify camera access before allowing exam start
6. WHEN an invigilator enables question randomization, THE System SHALL randomize question order for each student
7. WHEN an invigilator enables option randomization, THE System SHALL randomize answer options for each student
8. WHEN an invigilator sets an IP whitelist, THE System SHALL validate student IP addresses against the whitelist before allowing exam access
9. WHEN an invigilator sets an exam password, THE System SHALL require students to enter the password before accessing the exam
10. WHEN an invigilator saves security settings, THE System SHALL apply them to the specified exam and record the configuration

### Requirement 6: Data Synchronization and Real-Time Updates

**User Story:** As an invigilator, I want real-time data synchronization across the dashboard, so that I always see current exam and student information.

#### Acceptance Criteria

1. WHEN student data changes during an exam, THE System SHALL update the Live Monitoring tab in real-time without requiring page refresh
2. WHEN exam results are submitted, THE System SHALL immediately update the Exam Results tab with new data
3. WHEN questions are added or deleted, THE System SHALL update the Question Bank tab immediately
4. WHEN security settings are changed, THE System SHALL apply changes to active exams where applicable
5. WHEN multiple invigilators access the same exam, THE System SHALL ensure data consistency across all sessions

### Requirement 7: API Integration

**User Story:** As a developer, I want the CBT dashboard to use real backend APIs, so that all data operations are properly persisted and retrievable.

#### Acceptance Criteria

1. THE System SHALL have API endpoints for question bank CRUD operations (Create, Read, Update, Delete)
2. THE System SHALL have API endpoints for exam management (create, schedule, update, retrieve)
3. THE System SHALL have API endpoints for live monitoring data retrieval and student progress updates
4. THE System SHALL have API endpoints for exam results retrieval and analytics
5. THE System SHALL have API endpoints for security settings configuration and retrieval
6. WHEN an API call fails, THE System SHALL display an appropriate error message and allow retry
7. WHEN data is submitted, THE System SHALL validate it on both client and server before persistence

### Requirement 8: Error Handling and Data Validation

**User Story:** As an invigilator, I want proper error handling and validation, so that data integrity is maintained and I receive clear feedback on issues.

#### Acceptance Criteria

1. WHEN invalid data is submitted, THE System SHALL display validation errors and prevent submission
2. WHEN a database operation fails, THE System SHALL log the error and display a user-friendly message
3. WHEN a network error occurs, THE System SHALL allow the user to retry the operation
4. WHEN required fields are missing, THE System SHALL highlight them and prevent form submission
5. WHEN duplicate questions are detected, THE System SHALL warn the user before adding to the bank
6. WHEN an exam has no questions, THE System SHALL prevent scheduling until questions are added

