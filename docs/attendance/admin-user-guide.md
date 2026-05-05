# Administrator Attendance User Guide

## Overview

This guide helps school administrators manage the Attendance Logging System, including monitoring attendance data, managing biometric devices, analyzing attendance patterns, and generating reports. Administrators have full access to all attendance records and system configuration.

## Table of Contents

1. [Dashboard Overview](#dashboard-overview)
2. [Attendance Management](#attendance-management)
3. [Device Management](#device-management)
4. [Analytics & Reporting](#analytics--reporting)
5. [At-Risk Student Management](#at-risk-student-management)
6. [Batch Upload](#batch-upload)
7. [Audit Trail](#audit-trail)
8. [Configuration](#configuration)
9. [Troubleshooting](#troubleshooting)

---

## Dashboard Overview

### Accessing the Admin Dashboard

1. Log in with your administrator credentials
2. Navigate to **Attendance** in the main menu
3. Click **Dashboard** to view the attendance overview

### Dashboard Components

The attendance dashboard displays:

#### Summary Statistics Cards

| Metric | Description |
|--------|-------------|
| **Present Rate** | Percentage of students marked present today |
| **Absent Rate** | Percentage of students marked absent today |
| **Late Rate** | Percentage of students marked late today |
| **Total Records** | Total attendance records for the current term |

#### Weekly Attendance Heatmap

- Shows attendance percentage by week
- Color coding: Green (≥95%), Yellow (85-94%), Red (<85%)
- Displays last 4 weeks of data
- Click on a week to drill down to daily details

#### At-Risk Students Section

- Lists students with attendance below 85% in the last 30 days
- Shows student name, class, current attendance percentage
- Displays number of absences and late arrivals
- Allows filtering by class and reason

#### Homeroom Leaderboard

- Ranks classes by attendance percentage
- Shows top 5 performing homerooms
- Displays class name and attendance percentage
- Click on a class to view detailed breakdown

---

## Attendance Management

### Viewing All Attendance Records

1. Go to **Attendance** → **Records**
2. You'll see a table of all attendance records in the system

### Filtering Attendance Records

Use the filter panel to narrow down records:

| Filter | Options |
|--------|---------|
| **Date Range** | Select start and end dates |
| **Class** | Filter by specific class |
| **Student** | Search by student name or ID |
| **Status** | Present, Absent, or Late |
| **Source** | Teacher Entry, Biometric Device, Batch Upload, API Entry |
| **Term** | Filter by academic term |

**Example**: To view all absences in JSS 1 for May 2024:
1. Set Date Range: May 1 - May 31, 2024
2. Select Class: JSS 1
3. Select Status: Absent
4. Click **Apply Filters**

### Viewing Individual Records

Click on any attendance record to see:
- Student details (name, ID, class)
- Attendance status and date
- Absence reason (if applicable)
- Source of entry (who recorded it)
- Timestamp of entry
- Change history (all modifications)

### Editing Attendance Records

To correct an attendance record:

1. Find the record in the list
2. Click the **Edit** button
3. Change the status or absence reason
4. Click **Save**
5. The system creates an audit trail entry

**Note**: All changes are tracked for compliance.

### Deleting Attendance Records

To delete a record (use with caution):

1. Find the record in the list
2. Click the **Delete** button
3. Confirm the deletion
4. The system creates an audit trail entry showing the deletion

**Warning**: Deleted records cannot be recovered. Use only for erroneous entries.

### Bulk Actions on Attendance

#### Bulk Edit

To edit multiple records at once:

1. Select records using checkboxes
2. Click **Bulk Edit**
3. Choose what to change (status, absence reason, etc.)
4. Click **Apply**

#### Bulk Delete

To delete multiple records:

1. Select records using checkboxes
2. Click **Bulk Delete**
3. Confirm the deletion
4. Records are deleted and audit trail entries are created

---

## Device Management

### Accessing Device Management

1. Go to **Attendance** → **Devices**
2. You'll see a list of all registered biometric devices

### Device List Overview

The device list shows:

| Column | Information |
|--------|-------------|
| **Device Name** | Name of the device |
| **Type** | Fingerprint, Face, Iris, or Palm |
| **Location** | Physical location of device |
| **Status** | Active, Inactive, Maintenance, or Error |
| **Sync Status** | Synced, Pending, or Failed |
| **Last Sync** | Timestamp of last successful sync |
| **Enrolled Students** | Number of students enrolled |

### Registering a New Device

To add a new biometric device:

1. Click **Register Device** button
2. Fill in the device information:

| Field | Required | Description |
|-------|----------|-------------|
| **Device Name** | Yes | Unique name for the device (e.g., "Main Gate Scanner") |
| **Device Type** | Yes | Select: Fingerprint, Face, Iris, or Palm |
| **Manufacturer** | Yes | Device manufacturer (e.g., ZKTeco) |
| **Model** | Yes | Device model number |
| **Serial Number** | Yes | Unique serial number |
| **Location** | Yes | Physical location (e.g., "Main Gate") |
| **IP Address** | No | Network IP address (e.g., 192.168.1.100) |
| **Port** | No | Network port (1-65535, default: 8080) |
| **Connection Protocol** | No | HTTP, HTTPS, or custom protocol |
| **Sync Frequency** | Yes | Hourly, Every 4 Hours, Daily, or Manual |

3. Click **Register**
4. Device status is set to "Inactive" until first successful sync

### Configuring Device Settings

To update device configuration:

1. Click on the device in the list
2. Click **Edit Configuration**
3. Update settings:
   - IP address and port
   - Connection protocol
   - Sync frequency
   - Device location
4. Click **Test Connection** to verify settings
5. Click **Save** if test succeeds

### Testing Device Connection

To verify a device is properly configured:

1. Click on the device
2. Click **Test Connection**
3. The system attempts to connect and displays:
   - Connection status (Success/Failed)
   - Device information (model, firmware version)
   - Number of enrolled users
   - Troubleshooting suggestions if failed

### Monitoring Device Status

#### Understanding Device Status

| Status | Meaning | Action |
|--------|---------|--------|
| **Active** | Device is working and syncing normally | No action needed |
| **Inactive** | Device has never synced successfully | Configure and test connection |
| **Maintenance** | Device is temporarily offline | Perform maintenance, then change status |
| **Error** | Device has failed 3+ consecutive syncs | Troubleshoot and test connection |

#### Changing Device Status

To manually change a device's status:

1. Click on the device
2. Click **Change Status**
3. Select new status:
   - **Active**: Device is operational
   - **Inactive**: Device is not in use
   - **Maintenance**: Device is being serviced
   - **Error**: Device has issues (auto-set after failures)
4. Click **Save**

### Viewing Sync History

To see device sync history:

1. Click on the device
2. Click **Sync History**
3. You'll see a table of recent syncs showing:
   - Sync timestamp
   - Status (Success, Failed, Partial)
   - Records synced
   - Records failed
   - Sync duration
   - Error details (if failed)

### Triggering Manual Sync

To manually sync a device:

1. Click on the device
2. Click **Sync Now**
3. The system initiates a sync and displays:
   - Sync status (In Progress, Success, Failed)
   - Records synced
   - Any errors encountered

### Managing Device Enrollment

#### Viewing Enrolled Students

To see which students are enrolled in a device:

1. Click on the device
2. Click **Enrolled Students**
3. You'll see a list of students with their biometric IDs

#### Enrolling a Student

To enroll a student in a device:

1. Click on the device
2. Click **Enroll Student**
3. Select the student from the list
4. Enter the biometric ID (from the device)
5. Click **Enroll**

#### Unenrolling a Student

To remove a student from a device:

1. Click on the device
2. Click **Enrolled Students**
3. Find the student
4. Click **Unenroll**
5. Confirm the action

### Viewing Device Error Logs

To troubleshoot device issues:

1. Click on the device
2. Click **Error Logs**
3. You'll see recent errors with:
   - Error timestamp
   - Error message
   - Suggested resolution

---

## Analytics & Reporting

### Accessing Analytics

1. Go to **Attendance** → **Analytics**
2. Choose from available views:
   - Dashboard (summary statistics)
   - Heatmap (weekly patterns)
   - At-Risk Students (low attendance)
   - Leaderboard (class performance)

### Weekly Attendance Heatmap

The heatmap shows attendance patterns by week:

- **Green (≥95%)**: Excellent attendance
- **Yellow (85-94%)**: Good attendance
- **Red (<85%)**: At-risk attendance

#### Using the Heatmap

1. View the last 4 weeks of data
2. Click on a week to drill down to daily details
3. Filter by class to see specific class performance
4. Identify trends and patterns

### At-Risk Students Analysis

#### Understanding At-Risk Flagging

Students are flagged as at-risk when:
- Attendance falls below 85% in the rolling 30-day period
- This includes both absences and late arrivals

#### Viewing At-Risk Students

1. Go to **Analytics** → **At-Risk Students**
2. You'll see a table with:
   - Student name and ID
   - Class
   - Current attendance percentage
   - Number of absences
   - Number of late arrivals
   - Intervention owner (class advisor)

#### Filtering At-Risk Students

Filter by:
- **Class**: View specific class's at-risk students
- **Reason**: Filter by Absence or Late
- **Attendance Range**: Show students below specific percentage

#### Taking Action on At-Risk Students

1. Click on a student to view details
2. Options available:
   - **View Attendance History**: See all attendance records
   - **Send Notification**: Notify guardian
   - **Assign Intervention**: Assign class advisor
   - **Add Note**: Add intervention notes

### Homeroom Leaderboard

The leaderboard ranks classes by attendance performance:

#### Understanding the Leaderboard

- Shows top 5 performing homerooms
- Displays class name and attendance percentage
- Updated daily
- Helps identify high-performing and struggling classes

#### Using the Leaderboard

1. Go to **Analytics** → **Leaderboard**
2. Click on a class to view:
   - Detailed attendance breakdown
   - Individual student attendance
   - Trends over time
3. Filter by term to compare performance across terms

### Generating Reports

#### Creating a Custom Report

1. Go to **Attendance** → **Reports**
2. Click **Generate Report**
3. Configure report parameters:

| Parameter | Options |
|-----------|---------|
| **Report Type** | Summary, Detailed, By Class, By Student |
| **Date Range** | Select start and end dates |
| **Class** | All or specific class |
| **Student** | All or specific student |
| **Term** | Select academic term |
| **Include** | Attendance records, Audit trail, Statistics |

4. Click **Generate**
5. Report is displayed and can be exported

#### Exporting Reports

To export a report:

1. Generate the report (see above)
2. Click **Export**
3. Choose format:
   - **CSV**: For spreadsheet analysis
   - **PDF**: For printing and sharing
4. File downloads to your computer

#### Report Contents

Reports include:
- Summary statistics (present/absent/late rates)
- Detailed attendance records
- Absence reason breakdown
- At-risk student list
- Class performance comparison
- Data freshness timestamp

---

## At-Risk Student Management

### Identifying At-Risk Students

At-risk students are automatically identified when:
- Attendance falls below 85% in the last 30 days
- System flags them in the dashboard and analytics

### Viewing At-Risk Students

1. Go to **Dashboard** → **At-Risk Students**
2. Or go to **Analytics** → **At-Risk Students**
3. View the list with attendance details

### Sending Notifications to Guardians

#### Sending Individual Notification

1. Click on an at-risk student
2. Click **Send Notification**
3. Review the notification message
4. Click **Send**
5. Notification is sent to student's guardian

#### Sending Bulk Notifications

To notify guardians of all at-risk students:

1. Go to **At-Risk Students**
2. Click **Send Bulk Notifications**
3. Review the list of students
4. Click **Confirm**
5. Notifications are sent to all guardians

#### Notification Content

Notifications include:
- Student name
- Current attendance percentage
- Number of absences and late arrivals
- Recommended actions
- Link to view detailed attendance

### Tracking Interventions

#### Assigning Intervention Owner

1. Click on an at-risk student
2. Click **Assign Intervention**
3. Select the class advisor or intervention owner
4. Click **Assign**

#### Adding Intervention Notes

1. Click on an at-risk student
2. Click **Add Note**
3. Enter intervention details
4. Click **Save**

#### Viewing Intervention History

1. Click on an at-risk student
2. Click **Intervention History**
3. View all notes and actions taken

---

## Batch Upload

### Uploading Attendance Records in Bulk

Batch upload is useful for:
- Importing historical data
- Handling cases where biometric devices are unavailable
- Correcting multiple records at once

### Step-by-Step Upload Process

#### 1. Prepare CSV File

Create a CSV file with the following columns:

```
studentId,class,date,status,academicSession,term,absenceReason
STU001,JSS 1,2024-05-04,present,2024/2025,1,
STU002,JSS 1,2024-05-04,absent,2024/2025,1,Sick
STU003,JSS 1,2024-05-04,late,2024/2025,1,
```

**Column Requirements:**

| Column | Required | Valid Values | Example |
|--------|----------|--------------|---------|
| **studentId** | Yes | Student ID | STU001 |
| **class** | Yes | Class name | JSS 1 |
| **date** | Yes | YYYY-MM-DD | 2024-05-04 |
| **status** | Yes | present, absent, late | present |
| **academicSession** | Yes | YYYY/YYYY | 2024/2025 |
| **term** | Yes | 1, 2, or 3 | 1 |
| **absenceReason** | No | Reason text | Sick |

#### 2. Upload File

1. Go to **Attendance** → **Batch Upload**
2. Click **Select File**
3. Choose your CSV file
4. Click **Upload**

#### 3. Validate Records

The system validates each record:
- Checks required fields are present
- Validates date is not in future
- Validates status is present/absent/late
- Validates student exists
- Validates class exists
- Validates academic session format

#### 4. Review Validation Results

You'll see:
- **Total Records**: Total records in file
- **Valid Records**: Records that passed validation
- **Invalid Records**: Records with errors
- **Error Details**: List of errors with row numbers

**Example**:
```
Total Records: 100
Valid Records: 98
Invalid Records: 2

Errors:
- Row 5: Invalid status 'maybe' (must be present, absent, or late)
- Row 42: Student STU999 not found
```

#### 5. Confirm Upload

1. Review the validation results
2. If errors are acceptable, click **Confirm Upload**
3. Valid records are inserted into the database
4. Audit trail entries are created for all records

#### 6. View Upload Summary

After upload completes, you'll see:
- Number of records inserted
- Number of records skipped (due to errors)
- List of any errors

### CSV File Best Practices

- **Use UTF-8 Encoding**: Ensure file is UTF-8 encoded
- **Validate Before Upload**: Check file in spreadsheet application first
- **Use Correct Date Format**: Always use YYYY-MM-DD format
- **Verify Student IDs**: Ensure all student IDs exist in system
- **Test with Small File**: Test with 10-20 records first
- **Keep Backup**: Keep a backup of your CSV file

### Common Upload Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid status | Status not present/absent/late | Check spelling and case |
| Student not found | Student ID doesn't exist | Verify student ID in system |
| Invalid date | Date in future or wrong format | Use YYYY-MM-DD format, past dates only |
| Missing required field | Required column is empty | Ensure all required columns have values |
| Duplicate record | Record already exists for student on date | Check for duplicates in file |

---

## Audit Trail

### Accessing Audit Trail

1. Go to **Attendance** → **Audit Trail**
2. You'll see a log of all attendance changes

### Understanding Audit Trail

The audit trail shows:
- **Timestamp**: When the change was made
- **User**: Who made the change
- **Action**: Create, Update, or Delete
- **Student**: Which student's record was changed
- **Old Value**: Previous value (for updates)
- **New Value**: New value (for updates)
- **Source**: How the change was made (teacher entry, device sync, batch upload, etc.)

### Filtering Audit Trail

Filter by:
- **Date Range**: Select start and end dates
- **User**: Filter by who made the change
- **Student**: Filter by student
- **Action**: Create, Update, or Delete
- **Source**: Teacher Entry, Biometric Device, Batch Upload, API Entry

### Viewing Change Details

Click on any audit trail entry to see:
- Complete change details
- Before and after values
- User who made the change
- Exact timestamp
- Source of change

### Exporting Audit Trail

To export audit trail data:

1. Apply desired filters
2. Click **Export**
3. Choose format (CSV or PDF)
4. File downloads to your computer

### Compliance & Accountability

The audit trail ensures:
- ✅ All changes are tracked
- ✅ User accountability
- ✅ Compliance with regulations
- ✅ Ability to investigate discrepancies
- ✅ Data integrity verification

---

## Configuration

### Absence Reasons

#### Viewing Absence Reasons

1. Go to **Attendance** → **Configuration** → **Absence Reasons**
2. You'll see a list of configured absence reasons

#### Adding Absence Reason

1. Click **Add Reason**
2. Enter reason name (e.g., "Sick")
3. Enter description (optional)
4. Click **Save**

#### Editing Absence Reason

1. Click on the reason
2. Click **Edit**
3. Update name or description
4. Click **Save**

#### Deactivating Absence Reason

1. Click on the reason
2. Click **Deactivate**
3. Reason is no longer available for new entries
4. Existing entries with this reason are preserved

### System Settings

#### Attendance Settings

1. Go to **Attendance** → **Configuration** → **Settings**
2. Configure:
   - **At-Risk Threshold**: Percentage below which students are flagged (default: 85%)
   - **At-Risk Period**: Days to consider for at-risk calculation (default: 30)
   - **Batch Upload Limit**: Maximum records per upload (default: 10,000)
   - **Cache TTL**: Analytics cache duration in hours (default: 1)

#### Device Settings

1. Go to **Attendance** → **Configuration** → **Device Settings**
2. Configure:
   - **Sync Timeout**: Maximum seconds to wait for device response (default: 30)
   - **Retry Attempts**: Maximum retry attempts for failed syncs (default: 5)
   - **Retry Backoff**: Exponential backoff strategy for retries

---

## Troubleshooting

### Issue: Device Status Shows "Error"

**Cause**: Device has failed 3 or more consecutive syncs.

**Solution**:
1. Click on the device
2. Click **View Error Logs** to see what went wrong
3. Troubleshoot based on error message:
   - **Connection Timeout**: Check network connectivity and IP address
   - **Authentication Failed**: Verify device credentials
   - **Invalid Data**: Check device configuration
4. Click **Test Connection** to verify fix
5. Click **Sync Now** to retry
6. If successful, device status changes to "Active"

### Issue: Sync Status Shows "Pending"

**Cause**: Device sync is scheduled but hasn't run yet, or sync is in progress.

**Solution**:
1. Wait for scheduled sync to complete
2. Or click **Sync Now** to trigger manual sync
3. Check sync history to see if sync completed

### Issue: Attendance Records Not Appearing After Device Sync

**Cause**: Device sync completed but records weren't created.

**Possible causes**:
- Students not enrolled in device
- Biometric IDs don't match enrollment
- Records already exist (duplicate prevention)

**Solution**:
1. Check device sync logs for errors
2. Verify students are enrolled in device
3. Check device enrollment mapping
4. Contact device vendor if issue persists

### Issue: Batch Upload Fails with "Student Not Found"

**Cause**: Student ID in CSV doesn't exist in system.

**Solution**:
1. Verify student ID is correct
2. Check student exists in system
3. Update CSV with correct student ID
4. Retry upload

### Issue: Cannot Edit Attendance from More Than 30 Days Ago

**Cause**: System restricts editing very old records for compliance.

**Solution**:
1. Contact your system administrator
2. Administrator can override restriction if needed
3. All changes are logged in audit trail

### Issue: At-Risk Notifications Not Sending

**Cause**: Notification system not configured or guardian contact info missing.

**Solution**:
1. Verify notification system is configured
2. Check guardian contact information is complete
3. Verify guardian has opted in to notifications
4. Check notification logs for errors

### Issue: Analytics Dashboard Shows No Data

**Cause**: No attendance records exist for selected date range.

**Solution**:
1. Verify attendance records exist
2. Check date range is correct
3. Verify class filter is not too restrictive
4. Try broader date range

### Issue: Device Connection Test Fails

**Cause**: Device is unreachable or misconfigured.

**Solution**:
1. Verify device is powered on
2. Check network connectivity
3. Verify IP address and port are correct
4. Check firewall rules allow connection
5. Verify device credentials if required
6. Contact device vendor if issue persists

---

## Best Practices

### Attendance Management

1. **Regular Monitoring**: Check dashboard daily for at-risk students
2. **Timely Interventions**: Send notifications promptly when students fall at-risk
3. **Accurate Recording**: Ensure teachers record attendance accurately
4. **Absence Reasons**: Encourage recording of absence reasons
5. **Regular Audits**: Review audit trail periodically for discrepancies

### Device Management

1. **Regular Testing**: Test device connections weekly
2. **Monitor Sync Status**: Check device sync status daily
3. **Maintenance Schedule**: Schedule regular device maintenance
4. **Enrollment Updates**: Keep device enrollment current
5. **Error Monitoring**: Review error logs regularly

### Data Quality

1. **Validate Uploads**: Always validate batch uploads before confirming
2. **Audit Trail Review**: Review audit trail for unusual changes
3. **Backup Data**: Regularly backup attendance data
4. **Compliance**: Maintain compliance with data protection regulations
5. **Documentation**: Document any manual corrections

---

## Getting Help

### Support Resources

- **This Guide**: Search for your question
- **System Help**: Click the **?** icon in the interface
- **Contact Administrator**: Reach out to your IT administrator
- **Submit Ticket**: Use the support ticket system

### Providing Feedback

We'd love to hear your feedback:
- What's working well?
- What could be improved?
- What features would help?

Submit feedback through the **Feedback** button in your dashboard.

---

## Summary

As an administrator, you can:
- ✅ Monitor all attendance records
- ✅ Manage biometric devices
- ✅ Analyze attendance patterns
- ✅ Identify and support at-risk students
- ✅ Generate comprehensive reports
- ✅ Maintain audit trail for compliance
- ✅ Configure system settings

For more information, contact your system administrator or visit the support center.

---

**Last Updated**: May 2024  
**Version**: 1.0
