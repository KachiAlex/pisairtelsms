# Parent Portal Admin Guide

**Version**: 1.0.0  
**Last Updated**: April 27, 2026

---

## Overview

The Parent Portal Admin Guide provides administrators with instructions for managing the parent portal, including user accounts, system configuration, monitoring, and troubleshooting.

---

## Table of Contents

1. [Admin Dashboard](#admin-dashboard)
2. [Parent Account Management](#parent-account-management)
3. [Parent-Child Relationships](#parent-child-relationships)
4. [Engagement Monitoring](#engagement-monitoring)
5. [System Configuration](#system-configuration)
6. [Reporting](#reporting)
7. [Troubleshooting](#troubleshooting)

---

## Admin Dashboard

### Accessing the Admin Dashboard

1. Log in with admin credentials
2. Click "Admin" in the main menu
3. Select "Dashboard"

### Dashboard Overview

The admin dashboard shows:

- **Active Users**: Number of parents currently logged in
- **Total Parents**: Total parent accounts created
- **Total Children**: Total children linked to parents
- **System Status**: Portal health and uptime
- **Recent Activity**: Latest user actions
- **Alerts**: System alerts and issues

### Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Active Users | Parents currently using portal | Varies |
| Daily Active Users | Parents using portal daily | 70%+ |
| Weekly Active Users | Parents using portal weekly | 90%+ |
| Average Session Duration | Average time spent in portal | 15+ min |
| Feature Usage | Most used features | Track trends |
| Error Rate | Percentage of failed requests | < 1% |
| Response Time | Average page load time | < 2 sec |
| Uptime | Portal availability | 99.5%+ |

---

## Parent Account Management

### Creating Parent Accounts

**Method 1: Manual Creation**

1. Go to Admin → Parent Accounts
2. Click "Create New Account"
3. Enter parent information:
   - Email address
   - Full name
   - Phone number
   - Address
4. Click "Create Account"
5. System generates temporary password
6. Send credentials to parent via email

**Method 2: Bulk Import**

1. Go to Admin → Parent Accounts
2. Click "Bulk Import"
3. Upload CSV file with parent data
4. Map columns to fields
5. Review and confirm
6. System creates accounts and sends credentials

**CSV Format**:
```
email,name,phone,address,city,state,zipcode
parent1@example.com,John Doe,555-1234,123 Main St,City,State,12345
parent2@example.com,Jane Smith,555-5678,456 Oak Ave,City,State,12345
```

### Resetting Parent Passwords

1. Go to Admin → Parent Accounts
2. Search for parent by email or name
3. Click the parent's name
4. Click "Reset Password"
5. System generates temporary password
6. Send to parent via email

### Deactivating Parent Accounts

1. Go to Admin → Parent Accounts
2. Search for parent
3. Click the parent's name
4. Click "Deactivate Account"
5. Confirm deactivation
6. Account is disabled (can be reactivated)

### Deleting Parent Accounts

1. Go to Admin → Parent Accounts
2. Search for parent
3. Click the parent's name
4. Click "Delete Account"
5. Confirm deletion
6. Account and all data are permanently deleted

**Warning**: Deletion is permanent and cannot be undone.

### Viewing Account Activity

1. Go to Admin → Parent Accounts
2. Search for parent
3. Click the parent's name
4. View activity log showing:
   - Login times
   - Features accessed
   - Data viewed
   - Changes made
   - Last activity

---

## Parent-Child Relationships

### Linking Children to Parents

**Method 1: Manual Linking**

1. Go to Admin → Parent-Child Relationships
2. Click "Link Child to Parent"
3. Select parent from dropdown
4. Select child from dropdown
5. Click "Link"
6. Relationship is created

**Method 2: Bulk Linking**

1. Go to Admin → Parent-Child Relationships
2. Click "Bulk Link"
3. Upload CSV file with relationships
4. Map columns to fields
5. Review and confirm
6. System creates relationships

**CSV Format**:
```
parent_email,child_id
parent1@example.com,child-001
parent1@example.com,child-002
parent2@example.com,child-003
```

### Unlinking Children from Parents

1. Go to Admin → Parent-Child Relationships
2. Search for relationship
3. Click "Unlink"
4. Confirm unlinking
5. Relationship is removed

### Viewing Relationships

1. Go to Admin → Parent-Child Relationships
2. View all parent-child relationships
3. Filter by parent or child
4. See relationship status and dates

### Verification Codes

**Generating Verification Codes**

1. Go to Admin → Verification Codes
2. Click "Generate Code"
3. Select child
4. System generates unique code
5. Share code with parent

**Code Format**: 6-character alphanumeric code (e.g., ABC123)

**Code Expiration**: Codes expire after 30 days

---

## Engagement Monitoring

### Viewing User Activity

1. Go to Admin → Engagement
2. Select "User Activity"
3. View:
   - Login frequency
   - Features accessed
   - Time spent in portal
   - Last activity date

### Generating Engagement Reports

1. Go to Admin → Engagement
2. Click "Generate Report"
3. Select report type:
   - Daily Active Users
   - Weekly Active Users
   - Monthly Active Users
   - Feature Usage
   - Time Spent
4. Select date range
5. Click "Generate"
6. Download report (PDF or Excel)

### Feature Usage Analytics

1. Go to Admin → Engagement
2. Select "Feature Usage"
3. View usage statistics for each feature:
   - Dashboard
   - Academic Progress
   - Attendance
   - Behavioral Reports
   - Communications
   - Messages
   - Fees
   - Timetable
   - Health
   - Notifications
   - Profile

### Identifying Inactive Users

1. Go to Admin → Engagement
2. Select "Inactive Users"
3. View parents who haven't logged in for:
   - 30 days
   - 60 days
   - 90 days
4. Send reminder emails
5. Track re-engagement

### Engagement Trends

1. Go to Admin → Engagement
2. Select "Trends"
3. View charts showing:
   - Daily active users over time
   - Feature usage trends
   - Peak usage times
   - Seasonal patterns

---

## System Configuration

### Email Configuration

1. Go to Admin → Settings
2. Select "Email Configuration"
3. Configure:
   - SMTP server
   - SMTP port
   - Username
   - Password
   - From address
   - From name
4. Click "Test Email" to verify
5. Click "Save"

### SMS Configuration

1. Go to Admin → Settings
2. Select "SMS Configuration"
3. Configure:
   - SMS provider (Twilio, AWS SNS, etc.)
   - API key
   - API secret
   - From number
4. Click "Test SMS" to verify
5. Click "Save"

### Notification Settings

1. Go to Admin → Settings
2. Select "Notification Settings"
3. Configure:
   - Email notifications (enabled/disabled)
   - SMS notifications (enabled/disabled)
   - In-app notifications (enabled/disabled)
   - Notification frequency
   - Quiet hours
4. Click "Save"

### Feature Toggles

1. Go to Admin → Settings
2. Select "Feature Toggles"
3. Enable/disable features:
   - Academic Progress
   - Attendance Tracking
   - Behavioral Reports
   - Communications
   - Messages
   - Fee Management
   - Timetable
   - Health & Wellness
   - Notifications
   - Profile Management
4. Click "Save"

### System Maintenance

1. Go to Admin → Settings
2. Select "Maintenance"
3. Schedule maintenance:
   - Select date and time
   - Enter maintenance message
   - Select duration
4. Click "Schedule"
5. Portal shows maintenance message during scheduled time

---

## Reporting

### Available Reports

1. **Parent Engagement Report**
   - Active users
   - Login frequency
   - Feature usage
   - Time spent

2. **Feature Usage Report**
   - Usage by feature
   - Usage trends
   - Peak usage times
   - Feature adoption

3. **Performance Report**
   - Page load times
   - Error rates
   - Uptime
   - Response times

4. **Security Report**
   - Failed login attempts
   - Account lockouts
   - Suspicious activity
   - Security incidents

5. **Data Report**
   - Total parents
   - Total children
   - Total relationships
   - Data growth

### Generating Reports

1. Go to Admin → Reports
2. Select report type
3. Select date range
4. Configure filters (optional)
5. Click "Generate"
6. Download report (PDF or Excel)

### Scheduling Reports

1. Go to Admin → Reports
2. Click "Schedule Report"
3. Select report type
4. Select frequency (daily, weekly, monthly)
5. Select recipients
6. Click "Schedule"
7. Reports are automatically generated and emailed

### Exporting Data

1. Go to Admin → Data Export
2. Select data to export:
   - Parent accounts
   - Parent-child relationships
   - Activity logs
   - All data
3. Select format (CSV or Excel)
4. Click "Export"
5. Download file

---

## Troubleshooting

### Common Issues

#### Issue: Parent Can't Log In

**Symptoms**: Parent reports login failure

**Solutions**:
1. Verify parent account exists
2. Check account is not deactivated
3. Reset parent password
4. Check email for credentials
5. Verify email address is correct

#### Issue: Child Data Not Visible

**Symptoms**: Parent can't see child's data

**Solutions**:
1. Verify parent-child relationship exists
2. Check relationship is active
3. Verify child account is activated
4. Check data exists for child
5. Verify data sync is complete

#### Issue: Notifications Not Sending

**Symptoms**: Parents not receiving notifications

**Solutions**:
1. Check email configuration
2. Check SMS configuration
3. Verify notification settings are enabled
4. Check parent notification preferences
5. Review email/SMS logs

#### Issue: Portal Performance Slow

**Symptoms**: Portal is loading slowly

**Solutions**:
1. Check server resources (CPU, memory, disk)
2. Check database performance
3. Review error logs
4. Check for database locks
5. Optimize database queries
6. Scale infrastructure if needed

#### Issue: Data Sync Issues

**Symptoms**: Data not updating in portal

**Solutions**:
1. Check data sync service is running
2. Review sync logs
3. Check for sync errors
4. Manually trigger sync
5. Check database connectivity

### Monitoring System Health

1. Go to Admin → System Health
2. View:
   - Server status
   - Database status
   - Email service status
   - SMS service status
   - API status
   - Uptime percentage
   - Error rate
   - Response time

### Viewing Logs

1. Go to Admin → Logs
2. Select log type:
   - Application logs
   - Error logs
   - Access logs
   - Audit logs
3. Filter by date range
4. Search for specific entries
5. Download logs

### Alerts & Notifications

1. Go to Admin → Alerts
2. View active alerts:
   - High error rate
   - Slow response time
   - Service down
   - Database issues
   - Disk space low
3. Configure alert thresholds
4. Configure alert recipients
5. Test alerts

---

## Best Practices

### Account Management
- Regularly review inactive accounts
- Deactivate accounts for withdrawn students
- Use bulk import for efficiency
- Maintain accurate contact information
- Regularly backup account data

### Security
- Change admin passwords regularly
- Use strong passwords
- Enable two-factor authentication
- Monitor suspicious activity
- Review access logs regularly
- Keep system updated

### Performance
- Monitor system metrics
- Optimize database queries
- Scale infrastructure as needed
- Clear old logs regularly
- Monitor error rates
- Test system regularly

### User Support
- Respond to support requests promptly
- Document common issues
- Provide clear instructions
- Maintain FAQ documentation
- Gather user feedback
- Implement improvements

---

## Support & Resources

### Admin Support

- **Email**: admin-support@scholarx.app
- **Phone**: +1-XXX-XXX-XXXX
- **Documentation**: See admin documentation
- **Training**: Available upon request

### System Requirements

- Modern web browser
- Stable internet connection
- JavaScript enabled
- Cookies enabled
- Pop-ups allowed

### Backup & Recovery

- Daily automated backups
- Backup retention: 30 days
- Recovery time objective: 1 hour
- Recovery point objective: 1 hour
- Test backups regularly

---

**Document Version**: 1.0.0  
**Last Updated**: April 27, 2026  
**Status**: Complete
