# CBT & Examinations User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Question Bank Management](#question-bank-management)
3. [Exam Creation](#exam-creation)
4. [Live Monitoring](#live-monitoring)
5. [Exam Results](#exam-results)
6. [Security Settings](#security-settings)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## Getting Started

### Accessing the System

1. Open your web browser and navigate to `https://example.com/cbt`
2. Log in with your credentials
3. You'll see the CBT Management Dashboard

### Dashboard Overview

The CBT Management Dashboard has five main tabs:

- **Question Bank** - Manage questions
- **Exam Creation** - Create and schedule exams
- **Live Monitoring** - Monitor ongoing exams in real-time
- **Exam Results** - View and analyze exam results
- **Security Settings** - Configure exam security

---

## Question Bank Management

### Viewing Questions

1. Click the **Question Bank** tab
2. You'll see a list of all questions with:
   - Question text
   - Question type (Objective, True/False, Essay)
   - Difficulty level (Easy, Medium, Hard)
   - Subject area
   - Creation date

### Filtering Questions

Use the filter options to find specific questions:

- **Subject**: Filter by subject area
- **Difficulty**: Filter by difficulty level
- **Type**: Filter by question type
- **Search**: Search by question text

### Creating a New Question

1. Click the **+ New Question** button
2. Fill in the question details:
   - **Question Text**: Enter the question (required)
   - **Question Type**: Select from Objective, True/False, or Essay
   - **Subject**: Select the subject area
   - **Difficulty**: Select Easy, Medium, or Hard
   - **Tags**: Add tags for categorization (optional)

3. For **Objective** questions:
   - Enter option A, B, C, D
   - Select the correct answer
   - Assign marks for the question

4. For **True/False** questions:
   - Select True or False as correct answer
   - Assign marks for the question

5. For **Essay** questions:
   - Provide marking guidelines
   - Assign marks for the question

6. Click **Save Question**

### Editing Questions

1. Find the question in the list
2. Click the **Edit** button (pencil icon)
3. Modify the question details
4. Click **Save Changes**

### Deleting Questions

1. Find the question in the list
2. Click the **Delete** button (trash icon)
3. Confirm deletion
4. The question is soft-deleted (archived, not permanently removed)

### Importing Questions

1. Click the **Import** button
2. Select a CSV file with questions
3. The system will validate the file format
4. Review the import preview
5. Click **Import Questions**

**CSV Format**:
```
Question Text,Type,Subject,Difficulty,Option A,Option B,Option C,Option D,Correct Answer,Marks
"What is 2+2?",Objective,Math,Easy,3,4,5,6,B,1
"The Earth is flat",TrueFalse,Science,Easy,True,False,,,,1
```

### Exporting Questions

1. Click the **Export** button
2. Select questions to export (or export all)
3. Choose export format (CSV or PDF)
4. Click **Export**
5. The file will download to your computer

---

## Exam Creation

### Creating a New Exam

1. Click the **Exam Creation** tab
2. Click the **+ New Exam** button
3. Fill in exam details:
   - **Exam Title**: Enter exam name (required)
   - **Subject**: Select subject area (required)
   - **Class**: Select class/grade level (required)
   - **Description**: Add exam description (optional)
   - **Duration**: Enter exam duration in minutes (15-480 minutes)
   - **Total Marks**: Enter total marks for exam
   - **Pass Mark**: Enter passing score threshold

4. Click **Next** to select questions

### Selecting Questions

1. You'll see the question bank with all available questions
2. Use filters to find specific questions
3. Select questions by clicking the checkbox
4. Drag to reorder questions (optional)
5. For each question, you can adjust the marks allocated
6. Click **Add Selected Questions** to add to exam

### Reviewing Exam

1. Review the exam summary:
   - Total questions
   - Total marks
   - Exam duration
   - Questions list with marks

2. Click **Create Exam** to save

### Scheduling an Exam

1. Find the exam in the exam list
2. Click the **Schedule** button
3. Select the exam date and time
4. Click **Schedule Exam**
5. The exam status changes to "Scheduled"

### Editing an Exam

1. Find the exam in the list
2. Click the **Edit** button
3. Modify exam details
4. Click **Save Changes**

**Note**: You can only edit exams in "Draft" status

### Deleting an Exam

1. Find the exam in the list
2. Click the **Delete** button
3. Confirm deletion
4. The exam is soft-deleted (archived)

### Exam Status Workflow

```
Draft → Scheduled → Ongoing → Completed
  ↓
  └─→ Deleted (soft delete)
```

---

## Live Monitoring

### Starting Live Monitoring

1. Click the **Live Monitoring** tab
2. Select an exam from the dropdown
3. Click **Start Monitoring**
4. You'll see real-time student progress

### Monitoring Dashboard

The monitoring dashboard shows:

- **Student Name**: Student taking the exam
- **Questions Answered**: Number of questions completed
- **Time Remaining**: Time left in the exam
- **Completion %**: Percentage of exam completed
- **Status**: Current status (Active, Completed, Paused, Flagged)

### Filtering Students

Use the filter options to view specific students:

- **Status**: Filter by Active, Completed, Paused, or Flagged
- **Search**: Search by student name or ID

### Flagging a Student

If you suspect suspicious activity:

1. Find the student in the monitoring list
2. Click the **Flag** button
3. Enter the reason for flagging (e.g., "Tab switching detected")
4. Click **Flag Student**
5. The student's status changes to "Flagged"
6. A proctoring log entry is created

### Pausing an Exam

To pause an exam for all students:

1. Click the **Pause Exam** button
2. Confirm the pause action
3. All students' exams are paused
4. Students see a "Exam Paused" message

### Resuming an Exam

To resume a paused exam:

1. Click the **Resume Exam** button
2. Confirm the resume action
3. All students can continue their exams

### Ending an Exam

To end an exam for all students:

1. Click the **End Exam** button
2. Confirm the end action
3. All students' exams are submitted
4. Results are calculated automatically

### Real-Time Updates

The monitoring dashboard updates in real-time:

- Student progress updates within 1 second
- New completions appear immediately
- Flagged students highlighted in red
- Time remaining updates every second

---

## Exam Results

### Viewing Results Summary

1. Click the **Exam Results** tab
2. Select an exam from the dropdown
3. You'll see the results summary:
   - Total students who took the exam
   - Average score
   - Pass rate (percentage)
   - Highest score
   - Lowest score

### Viewing Results List

1. The results list shows all students with:
   - Student name
   - Score obtained
   - Total marks
   - Percentage
   - Pass/Fail status
   - Time spent

2. Click on a student to view detailed results

### Viewing Detailed Results

1. Click on a student in the results list
2. You'll see:
   - Student information
   - Overall score and percentage
   - Question-by-question breakdown:
     - Question text
     - Student's answer
     - Correct answer
     - Marks obtained
     - Whether answer was correct

3. Use the navigation arrows to view other students' results

### Filtering Results

Use the filter options:

- **Status**: Filter by Passed or Failed
- **Date Range**: Filter by submission date
- **Score Range**: Filter by score range

### Exporting Results

1. Click the **Export** button
2. Select export format (CSV or PDF)
3. Choose which students to export (or export all)
4. Click **Export**
5. The file will download to your computer

### Analytics

View exam analytics:

- **Average Score**: Mean score across all students
- **Pass Rate**: Percentage of students who passed
- **Score Distribution**: Chart showing score distribution
- **Question Analysis**: Which questions were most difficult
- **Time Analysis**: Average time spent on exam

---

## Security Settings

### Accessing Security Settings

1. Click the **Security Settings** tab
2. Select an exam from the dropdown
3. You'll see the security configuration options

### Proctoring

**Enable Proctoring**:
- Toggle to enable/disable proctoring
- When enabled, the system monitors for suspicious activities:
  - Tab switching
  - Copy/paste attempts
  - Right-click attempts
  - Camera off events

**Camera Requirement**:
- Toggle to require camera access
- Students must allow camera access to take the exam
- Camera feed is monitored for suspicious activity

### Copy/Paste Prevention

**Disable Copy/Paste**:
- Toggle to prevent students from copying and pasting
- Keyboard shortcuts (Ctrl+C, Ctrl+V) are disabled
- Right-click context menu is disabled

### Question Randomization

**Randomize Questions**:
- Toggle to randomize question order for each student
- Each student sees questions in different order
- Helps prevent cheating

**Randomize Options**:
- Toggle to randomize answer options for each student
- Each student sees options in different order
- Applies to objective and true/false questions

### IP Whitelist

**Add Allowed IPs**:
1. Click **Add IP**
2. Enter IP address or CIDR range (e.g., 192.168.1.0/24)
3. Click **Add**
4. Only students from whitelisted IPs can take the exam

**Remove IP**:
1. Find the IP in the list
2. Click the **Remove** button

### Exam Password

**Set Exam Password**:
1. Enter a password (optional)
2. Students must enter this password to start the exam
3. Click **Save**

**Change Password**:
1. Enter new password
2. Click **Update**

### Saving Settings

1. After making changes, click **Save Settings**
2. A confirmation message appears
3. Settings are applied to the exam

---

## Troubleshooting

### Student Can't Access Exam

**Problem**: Student sees "Access Denied" message

**Solutions**:
1. Check if exam is scheduled and started
2. Verify student's IP is whitelisted (if IP whitelist enabled)
3. Check if exam password is required and correct
4. Verify student has proper permissions

### Exam Timer Not Working

**Problem**: Exam timer shows incorrect time

**Solutions**:
1. Refresh the page
2. Check system clock is synchronized
3. Check browser console for errors
4. Try a different browser

### WebSocket Connection Failed

**Problem**: Real-time monitoring not updating

**Solutions**:
1. Check internet connection
2. Verify WebSocket server is running
3. Check firewall settings
4. Try refreshing the page
5. Check browser console for errors

### Questions Not Displaying

**Problem**: Questions appear blank or don't load

**Solutions**:
1. Refresh the page
2. Clear browser cache
3. Try a different browser
4. Check if questions were properly imported
5. Verify question data in database

### Results Not Calculating

**Problem**: Exam results show 0 score

**Solutions**:
1. Verify exam has questions with marks
2. Check if student answered questions
3. Verify correct answers are set
4. Check database for answer records
5. Run manual score calculation

### Export Not Working

**Problem**: Export button doesn't work or file doesn't download

**Solutions**:
1. Check browser download settings
2. Verify you have permission to export
3. Try a different export format
4. Check browser console for errors
5. Try a different browser

---

## FAQ

### General Questions

**Q: How many questions can an exam have?**
A: There's no limit on the number of questions. However, for performance reasons, we recommend keeping exams under 100 questions.

**Q: Can I edit an exam after it's started?**
A: No, you can only edit exams in "Draft" status. Once an exam is scheduled or ongoing, it's locked.

**Q: How long are exam results stored?**
A: Exam results are stored indefinitely. You can archive old results if needed.

**Q: Can students retake an exam?**
A: Yes, you can create multiple instances of the same exam or allow students to retake by creating a new exam session.

### Question Bank Questions

**Q: Can I reuse questions across multiple exams?**
A: Yes, questions in the question bank can be used in multiple exams.

**Q: What's the maximum question text length?**
A: Question text can be up to 5000 characters.

**Q: Can I import questions from Excel?**
A: Currently, we support CSV format. You can export Excel to CSV and import.

**Q: Can I delete a question that's used in an exam?**
A: Yes, you can soft-delete questions. The exam will still have the question, but it won't appear in the question bank.

### Exam Questions

**Q: Can I change exam duration after scheduling?**
A: No, exam duration is locked once scheduled. You must create a new exam.

**Q: What happens if a student's time runs out?**
A: The exam is automatically submitted when time runs out.

**Q: Can students see their score immediately after exam?**
A: Yes, scores are calculated immediately and shown to students.

**Q: Can I manually adjust a student's score?**
A: Currently, scores are calculated automatically. Contact support for manual adjustments.

### Monitoring Questions

**Q: How often does the monitoring dashboard update?**
A: The dashboard updates in real-time (within 1 second).

**Q: Can I see what students are typing?**
A: No, we don't capture keystroke data. We only monitor for suspicious activities like tab switching.

**Q: What happens if a student's internet disconnects?**
A: The student's progress is saved. When they reconnect, they can resume the exam.

**Q: Can I see proctoring logs?**
A: Yes, click on a student to view their proctoring logs.

### Results Questions

**Q: How are scores calculated?**
A: Score = (Correct Answers × Marks) / Total Marks × 100

**Q: Can I export results in different formats?**
A: Yes, we support CSV and PDF formats.

**Q: How do I generate a report?**
A: Use the analytics section to view charts and statistics. You can export the data.

**Q: Can I compare results across exams?**
A: Yes, you can view analytics for each exam and compare pass rates and average scores.

### Security Questions

**Q: Is student data encrypted?**
A: Yes, all data is encrypted in transit (SSL/TLS) and at rest.

**Q: Can I see student answers after exam?**
A: Yes, you can view detailed answers in the results section.

**Q: How are proctoring logs stored?**
A: Proctoring logs are stored in the database and can be exported for review.

**Q: Can I disable proctoring for specific students?**
A: No, security settings apply to all students taking the exam.

---

## Support

For additional help:

- **Email**: support@example.com
- **Phone**: +1-800-XXX-XXXX
- **Documentation**: https://docs.example.com
- **Status Page**: https://status.example.com

---

## Version History

- **v1.0.0** (May 4, 2026) - Initial release
  - Question bank management
  - Exam creation and scheduling
  - Live monitoring
  - Results and analytics
  - Security settings
  - Offline sync support
