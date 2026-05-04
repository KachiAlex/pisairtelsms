# CBT & Examinations Rebuild - Requirements Document

## Introduction

The CBT (Computer-Based Testing) & Examinations system is being rebuilt from scratch to address persistent React error #306 issues and establish a robust, production-ready platform. The previous implementation had mock data, incomplete backend integration, and architectural issues. This rebuild focuses on proper backend integration with a comprehensive database schema, fully functional endpoints, clean component architecture, and comprehensive error handling.

The system will support the complete exam lifecycle: creation, question management, live monitoring, result calculation, and security enforcement. All components will be properly integrated with the backend, with real data persistence and real-time synchronization capabilities.

## Glossary

- **CBT System**: Computer-Based Testing platform for administering digital exams
- **Exam**: A structured assessment with questions, duration, pass criteria, and security settings
- **Question Bank**: Persistent repository of exam questions organized by subject, difficulty, and type
- **Question**: Individual assessment item with text, type (objective/essay/true-false), options, and correct answer
- **Exam Session**: Active instance of an exam being taken by a student
- **Student Progress**: Real-time tracking of a student's answers and completion status during an exam
- **Exam Result**: Final outcome of a completed exam including score, pass/fail status, and detailed answer analysis
- **Security Settings**: Configuration options for exam security including proctoring, access controls, and cheating detection
- **Invigilator**: Administrator or teacher managing exams and monitoring student progress
- **Proctoring**: Monitoring mechanism to detect and prevent cheating during exams
- **Audit Log**: Comprehensive record of all system actions for compliance and security
- **Offline Sync**: Capability to cache exam data locally and synchronize when connectivity is restored
- **Real-Time Monitoring**: Live dashboard showing current student progress without page refresh
- **Tenant**: Organization/school using the CBT system with isolated data

## Requirements

### Requirement 1: Exam Creation and Management

**User Story:** As an invigilator, I want to create, edit, and manage exams with comprehensive configuration options, so that I can design assessments tailored to specific classes and learning objectives.

#### Acceptance Criteria

1. WHEN an invigilator navigates to Exam Creation, THE System SHALL display a form with fields for exam title, subject, class, duration, pass mark, and total marks
2. WHEN an invigilator creates an exam, THE System SHALL persist all exam details to the database with a unique identifier
3. WHEN an invigilator selects questions for an exam, THE System SHALL retrieve available questions from the Question Bank and allow selection of multiple questions
4. WHEN an invigilator saves an exam, THE System SHALL validate that all required fields are populated and at least one question is selected
5. WHEN an invigilator schedules an exam, THE System SHALL update the exam status to "Scheduled" and record the scheduled date and time
6. WHEN an invigilator edits an exam, THE System SHALL update the database and reflect changes immediately in the UI
7. WHEN an invigilator deletes an exam, THE System SHALL remove it from the database (soft delete) and prevent students from accessing it
8. WHEN an invigilator views the exam list, THE System SHALL display all exams with their status, subject, class, and scheduled date
9. WHEN an invigilator filters exams by status or class, THE System SHALL retrieve and display only matching exams from the database
10. WHEN an invigilator starts an exam, THE System SHALL change its status to "Ongoing" and make it available to enrolled students

### Requirement 2: Question Bank Management

**User Story:** As an invigilator, I want to manage a persistent question bank with import/export capabilities, so that I can create, organize, and reuse questions across multiple exams efficiently.

#### Acceptance Criteria

1. WHEN an invigilator navigates to Question Bank, THE System SHALL display all questions from the database organized by subject and difficulty
2. WHEN an invigilator creates a new question, THE System SHALL persist it to the database with text, type, options, correct answer, difficulty, and subject
3. WHEN an invigilator edits a question, THE System SHALL update the database and reflect changes immediately
4. WHEN an invigilator deletes a question, THE System SHALL remove it from the database (soft delete) and prevent its use in new exams
5. WHEN an invigilator searches for questions by subject, difficulty, or keyword, THE System SHALL filter and display matching questions from the database
6. WHEN an invigilator views the question bank, THE System SHALL display total question count, difficulty distribution (Easy/Medium/Hard), and type breakdown (Objective/Essay/True-False)
7. WHEN an invigilator imports questions from a CSV file, THE System SHALL validate the format, check for duplicates, and persist valid questions to the database
8. WHEN an invigilator exports questions, THE System SHALL generate a CSV file containing selected questions with all metadata
9. WHEN an invigilator attempts to import invalid questions, THE System SHALL display detailed error messages indicating which rows failed and why
10. WHEN an invigilator creates a question with duplicate content, THE System SHALL warn them before adding to prevent redundancy

### Requirement 3: Live Monitoring of Exam Sessions

**User Story:** As an invigilator, I want to monitor student progress in real-time during active exams, so that I can ensure exam integrity, identify issues, and intervene when necessary.

#### Acceptance Criteria

1. WHEN an exam is ongoing, THE System SHALL display real student data from the database on the Live Monitoring dashboard
2. WHEN a student answers a question, THE System SHALL update their progress in real-time (within 1 second) on the invigilator's monitoring dashboard
3. WHEN an invigilator views the Live Monitoring tab, THE System SHALL show each student's name, questions answered, total questions, time remaining, and completion percentage
4. WHEN a student completes an exam, THE System SHALL update their status to "Completed" and record the completion timestamp
5. WHEN an invigilator flags a student for suspicious activity, THE System SHALL record the flag with timestamp, reason, and invigilator identifier
6. WHEN an invigilator views monitoring data, THE System SHALL support filtering by exam, class, or student status (Active/Completed/Paused/Flagged)
7. WHEN an invigilator pauses a student's exam, THE System SHALL stop the timer and prevent further answer submissions
8. WHEN an invigilator resumes a paused exam, THE System SHALL restart the timer and allow answer submissions to continue
9. WHEN an invigilator ends an exam session, THE System SHALL stop all active student exams and calculate final results
10. WHEN multiple invigilators monitor the same exam, THE System SHALL ensure all see consistent, synchronized data

### Requirement 4: Exam Results and Scoring

**User Story:** As an invigilator, I want to view, analyze, and export exam results with automatic scoring and performance metrics, so that I can assess student learning outcomes and identify struggling students.

#### Acceptance Criteria

1. WHEN an exam is completed, THE System SHALL automatically calculate the student's score based on correct answers and marks per question
2. WHEN an exam is completed, THE System SHALL determine pass/fail status by comparing the score against the pass mark
3. WHEN an invigilator navigates to Exam Results, THE System SHALL display real exam results from the database with total exams completed, average score, and pass rate
4. WHEN an invigilator views exam results, THE System SHALL show exam name, number of students, average score, pass rate, highest score, and lowest score
5. WHEN an invigilator filters results by exam or date range, THE System SHALL retrieve and display matching results from the database
6. WHEN an invigilator exports results, THE System SHALL generate a CSV or PDF report with student names, scores, percentages, and pass/fail status
7. WHEN an invigilator views a student's detailed result, THE System SHALL show their answers, correct answers, score breakdown by question, and time spent
8. WHEN an invigilator approves exam results, THE System SHALL mark them as finalized and prevent further modifications
9. WHEN an invigilator views result analytics, THE System SHALL display performance distribution, question difficulty analysis, and student performance trends
10. WHEN an invigilator searches results by student name or exam, THE System SHALL retrieve and display matching results

### Requirement 5: Security Settings and Access Control

**User Story:** As an invigilator, I want to configure comprehensive security settings for exams, so that exam integrity is maintained and unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN an invigilator configures security settings for an exam, THE System SHALL persist all settings to the database
2. WHEN an invigilator enables proctoring, THE System SHALL activate camera monitoring and record proctoring events during the exam
3. WHEN an invigilator enables copy/paste prevention, THE System SHALL prevent students from copying exam content during the exam
4. WHEN an invigilator enables right-click prevention, THE System SHALL disable context menu access during the exam
5. WHEN an invigilator requires a camera, THE System SHALL verify camera access before allowing exam start and record camera status
6. WHEN an invigilator enables question randomization, THE System SHALL randomize question order for each student
7. WHEN an invigilator enables option randomization, THE System SHALL randomize answer options for each student
8. WHEN an invigilator sets an IP whitelist, THE System SHALL validate student IP addresses against the whitelist before allowing exam access
9. WHEN an invigilator sets an exam password, THE System SHALL require students to enter the password before accessing the exam
10. WHEN an invigilator saves security settings, THE System SHALL apply them to the specified exam and record the configuration with timestamp
11. WHEN an invigilator enables cheating detection, THE System SHALL monitor for suspicious patterns (rapid answers, tab switching, copy attempts)
12. WHEN suspicious activity is detected, THE System SHALL log the event with details and alert the invigilator

### Requirement 6: Offline CBT Sync Capabilities

**User Story:** As a student or invigilator, I want the CBT system to work offline with automatic synchronization when connectivity is restored, so that exams can proceed uninterrupted even with network issues.

#### Acceptance Criteria

1. WHEN a student starts an exam, THE System SHALL cache exam questions and settings locally for offline access
2. WHEN a student answers questions offline, THE System SHALL store answers locally with timestamps
3. WHEN connectivity is restored, THE System SHALL automatically synchronize cached answers with the server
4. WHEN an offline sync occurs, THE System SHALL validate that no answers were lost or corrupted
5. WHEN a conflict occurs during sync (e.g., answer modified on server), THE System SHALL resolve it using server-as-authoritative strategy
6. WHEN an invigilator views monitoring data, THE System SHALL indicate which students are currently offline
7. WHEN a student goes offline during an exam, THE System SHALL continue the timer and allow answer submissions locally
8. WHEN offline sync fails, THE System SHALL queue the data and retry with exponential backoff
9. WHEN a student's session expires while offline, THE System SHALL preserve their answers and allow resumption when connectivity returns
10. WHEN offline data is synced, THE System SHALL record the sync timestamp and mark answers as verified

### Requirement 7: Comprehensive Audit Logging

**User Story:** As a system administrator, I want comprehensive audit logs of all CBT system activities, so that I can ensure compliance, investigate issues, and maintain security.

#### Acceptance Criteria

1. WHEN any exam is created, edited, or deleted, THE System SHALL log the action with user identifier, timestamp, and details
2. WHEN any question is created, edited, or deleted, THE System SHALL log the action with user identifier, timestamp, and details
3. WHEN a student starts, pauses, resumes, or completes an exam, THE System SHALL log the action with student identifier, exam identifier, and timestamp
4. WHEN a student submits an answer, THE System SHALL log the submission with question identifier, answer, and timestamp
5. WHEN security settings are configured, THE System SHALL log the configuration with user identifier, settings details, and timestamp
6. WHEN a student is flagged for suspicious activity, THE System SHALL log the flag with reason, invigilator identifier, and timestamp
7. WHEN results are approved or modified, THE System SHALL log the action with user identifier, changes, and timestamp
8. WHEN offline sync occurs, THE System SHALL log the sync event with student identifier, number of answers synced, and timestamp
9. WHEN an error occurs, THE System SHALL log the error with stack trace, context, and timestamp for debugging
10. WHEN audit logs are accessed, THE System SHALL record who accessed them, when, and what data was retrieved

### Requirement 8: Backend API Integration

**User Story:** As a developer, I want the CBT system to have fully functional backend APIs with proper validation and error handling, so that all data operations are properly persisted and retrievable.

#### Acceptance Criteria

1. THE System SHALL have API endpoints for question bank CRUD operations (Create, Read, Update, Delete) with proper validation
2. THE System SHALL have API endpoints for exam management (create, schedule, update, retrieve, delete) with proper validation
3. THE System SHALL have API endpoints for live monitoring data retrieval and student progress updates with real-time capabilities
4. THE System SHALL have API endpoints for exam results retrieval, analytics, and export functionality
5. THE System SHALL have API endpoints for security settings configuration, retrieval, and proctoring log access
6. THE System SHALL have API endpoints for offline sync with conflict resolution and data validation
7. WHEN an API call fails, THE System SHALL return appropriate HTTP status codes (400, 401, 403, 404, 500) with descriptive error messages
8. WHEN data is submitted, THE System SHALL validate it on both client and server before persistence
9. WHEN an API endpoint receives invalid data, THE System SHALL return validation errors with specific field information
10. WHEN an API endpoint receives unauthorized requests, THE System SHALL return 401/403 status with appropriate error message

### Requirement 9: Error Handling and Data Validation

**User Story:** As an invigilator, I want proper error handling and validation throughout the CBT system, so that data integrity is maintained and I receive clear feedback on issues.

#### Acceptance Criteria

1. WHEN invalid data is submitted in any form, THE System SHALL display validation errors and prevent submission
2. WHEN a database operation fails, THE System SHALL log the error and display a user-friendly message
3. WHEN a network error occurs, THE System SHALL allow the user to retry the operation with exponential backoff
4. WHEN required fields are missing, THE System SHALL highlight them and prevent form submission
5. WHEN duplicate questions are detected, THE System SHALL warn the user before adding to the bank
6. WHEN an exam has no questions, THE System SHALL prevent scheduling until questions are added
7. WHEN a student attempts to access an exam they're not enrolled in, THE System SHALL deny access and log the attempt
8. WHEN an exam's scheduled time has passed, THE System SHALL prevent new students from starting the exam
9. WHEN a student's session expires, THE System SHALL save their progress and allow resumption within a grace period
10. WHEN a critical error occurs, THE System SHALL display an error code and provide support contact information

### Requirement 10: Component Architecture and Code Quality

**User Story:** As a developer, I want the CBT system to have clean, maintainable component architecture, so that future enhancements and bug fixes are straightforward.

#### Acceptance Criteria

1. WHEN the codebase is reviewed, THE System SHALL have separate, focused components for each major feature (Question Bank, Exam Creation, Live Monitoring, Results, Security)
2. WHEN components are examined, THE System SHALL have clear separation of concerns between UI, business logic, and API calls
3. WHEN the codebase is analyzed, THE System SHALL avoid React error #306 issues through proper component lifecycle management
4. WHEN components are tested, THE System SHALL have unit tests for critical business logic and integration tests for API interactions
5. WHEN the codebase is maintained, THE System SHALL follow consistent naming conventions and code style
6. WHEN new features are added, THE System SHALL maintain backward compatibility with existing data structures
7. WHEN components are rendered, THE System SHALL properly handle loading, error, and empty states
8. WHEN data is fetched, THE System SHALL implement proper caching and memoization to avoid unnecessary re-renders
9. WHEN components unmount, THE System SHALL properly clean up subscriptions, timers, and event listeners
10. WHEN the system scales, THE System SHALL support pagination and lazy loading for large datasets

### Requirement 11: Real-Time Data Synchronization

**User Story:** As an invigilator, I want real-time data synchronization across the dashboard, so that I always see current exam and student information without manual refresh.

#### Acceptance Criteria

1. WHEN student data changes during an exam, THE System SHALL update the Live Monitoring tab in real-time (within 1 second) without requiring page refresh
2. WHEN exam results are submitted, THE System SHALL immediately update the Exam Results tab with new data
3. WHEN questions are added or deleted, THE System SHALL update the Question Bank tab immediately
4. WHEN security settings are changed, THE System SHALL apply changes to active exams where applicable
5. WHEN multiple invigilators access the same exam, THE System SHALL ensure data consistency across all sessions
6. WHEN a WebSocket connection is unavailable, THE System SHALL fall back to polling with exponential backoff
7. WHEN a WebSocket connection is restored, THE System SHALL resume real-time updates
8. WHEN the system detects data conflicts, THE System SHALL resolve them using server-as-authoritative strategy
9. WHEN a user's session expires, THE System SHALL gracefully disconnect and prompt for re-authentication
10. WHEN the system is under high load, THE System SHALL maintain real-time updates with acceptable latency (< 2 seconds)

### Requirement 12: Database Schema and Data Persistence

**User Story:** As a developer, I want a comprehensive database schema for the CBT system, so that all data is properly persisted, indexed, and retrievable.

#### Acceptance Criteria

1. THE System SHALL have a questions_bank table with fields for question text, type, options, correct answer, difficulty, subject, and metadata
2. THE System SHALL have an exams table with fields for title, subject, class, duration, pass mark, total marks, status, and scheduling information
3. THE System SHALL have an exam_questions table linking exams to questions with ordering and marks information
4. THE System SHALL have a student_exam_progress table tracking real-time student progress during exams
5. THE System SHALL have an exam_results table storing final results with score, pass/fail status, and submission timestamp
6. THE System SHALL have a student_answers table storing individual student answers with correctness and marks
7. THE System SHALL have a security_settings table storing security configuration per exam
8. THE System SHALL have a proctoring_logs table recording all proctoring events and suspicious activities
9. THE System SHALL have an audit_logs table recording all system actions for compliance
10. THE System SHALL have appropriate indexes on frequently queried columns for performance
11. THE System SHALL have foreign key constraints to maintain referential integrity
12. THE System SHALL support soft deletes for questions and exams to maintain historical data

