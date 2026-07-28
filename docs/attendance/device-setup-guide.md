# Biometric Device Setup Guide

## Overview

This guide provides step-by-step instructions for setting up and configuring biometric devices for the Attendance Logging System. It covers device registration, network configuration, enrollment, and troubleshooting.

## Table of Contents

1. [Supported Device Types](#supported-device-types)
2. [Pre-Setup Requirements](#pre-setup-requirements)
3. [Device Registration](#device-registration)
4. [Network Configuration](#network-configuration)
5. [Testing Connection](#testing-connection)
6. [Student Enrollment](#student-enrollment)
7. [Sync Configuration](#sync-configuration)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Supported Device Types

The Attendance Logging System supports four types of biometric devices:

### 1. Fingerprint Scanners

**Best For**: General attendance tracking, cost-effective solution

**Advantages**:
- Fast scanning (< 1 second)
- Reliable identification
- Low cost
- Widely available

**Disadvantages**:
- Requires clean fingers
- May fail with dirty or wet hands
- Not suitable for very young children

**Popular Models**:
- ZKTeco MB360
- Suprema BioStation
- Anviz Global

### 2. Face Recognition

**Best For**: Contactless attendance, high security

**Advantages**:
- Contactless (no touch required)
- Fast scanning
- Works with masks (some models)
- High accuracy

**Disadvantages**:
- Higher cost
- Requires good lighting
- May have privacy concerns
- Slower than fingerprint

**Popular Models**:
- ZKTeco FacePass
- Hikvision DS-K1T671TM
- Dahua DHI-ASI1222E

### 3. Iris Scanner

**Best For**: High-security environments, maximum accuracy

**Advantages**:
- Highest accuracy
- Difficult to spoof
- Works in various lighting
- No contact required

**Disadvantages**:
- Most expensive
- Slower scanning
- Requires user cooperation
- Limited availability

**Popular Models**:
- Iris ID iCAM
- Neurotechnology VeriEye

### 4. Palm Scanner

**Best For**: Hygienic attendance, high accuracy

**Advantages**:
- Hygienic (no contact with device)
- High accuracy
- Difficult to spoof
- Works in various conditions

**Disadvantages**:
- Expensive
- Slower scanning
- Requires enrollment
- Limited availability

**Popular Models**:
- Fujitsu PalmSecure
- Daon IdentityX

---

## Pre-Setup Requirements

### Hardware Requirements

Before setting up a device, ensure you have:

1. **Biometric Device**
   - Device is powered on and functioning
   - Device manual and documentation
   - Device IP address (if network-connected)
   - Device credentials (username/password if required)

2. **Network Infrastructure**
   - Network connectivity (Ethernet or WiFi)
   - Available network port
   - Firewall rules allowing device communication
   - Static IP address (recommended)

3. **Computer/Laptop**
   - Access to the Attendance System
   - Administrator credentials
   - Network access to device

### Software Requirements

1. **Attendance System Access**
   - Administrator login credentials
   - Access to Device Management interface
   - Latest browser (Chrome, Firefox, Safari, Edge)

2. **Device Software**
   - Latest device firmware
   - Device management software (if required)
   - Device API documentation

### Information to Gather

Before starting setup, gather:

| Information | Example | Where to Find |
|-------------|---------|---------------|
| Device Name | Main Gate Scanner | Choose a descriptive name |
| Device Type | Fingerprint | Device documentation |
| Manufacturer | ZKTeco | Device label |
| Model | MB360 | Device label |
| Serial Number | ZK123456 | Device label or documentation |
| Location | Main Gate | Physical location |
| IP Address | 192.168.1.100 | Device settings or DHCP |
| Port | 8080 | Device documentation |
| Protocol | HTTPS | Device documentation |
| Device Credentials | username/password | Device documentation |

---

## Device Registration

### Step 1: Access Device Management

1. Log in to the Attendance System as administrator
2. Navigate to **Attendance** → **Devices**
3. Click **Register Device** button

### Step 2: Fill in Device Information

Complete the registration form with the following information:

#### Basic Information

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Device Name** | Yes | Unique name for the device | Main Gate Scanner |
| **Device Type** | Yes | Select: Fingerprint, Face, Iris, or Palm | Fingerprint |
| **Manufacturer** | Yes | Device manufacturer | ZKTeco |
| **Model** | Yes | Device model number | MB360 |
| **Serial Number** | Yes | Unique serial number | ZK123456 |
| **Location** | Yes | Physical location | Main Gate |

#### Network Configuration (Optional)

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **IP Address** | No | Device IP address | 192.168.1.100 |
| **Port** | No | Device port number | 8080 |
| **Connection Protocol** | No | HTTP, HTTPS, or custom | HTTPS |

#### Sync Configuration

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **Sync Frequency** | Yes | How often to sync: Hourly, Every 4 Hours, Daily, Manual | Hourly |

### Step 3: Review Information

Before submitting:
- Verify all information is correct
- Double-check IP address and port
- Confirm device location
- Verify sync frequency

### Step 4: Submit Registration

1. Click **Register Device**
2. Device is created with status "Inactive"
3. You'll see a confirmation message
4. Device appears in the device list

### Step 5: Next Steps

After registration:
1. Configure network settings (if not done during registration)
2. Test device connection
3. Enroll students
4. Configure sync schedule

---

## Network Configuration

### Understanding Network Configuration

Network configuration allows the system to communicate with the device:

- **IP Address**: Device's network address
- **Port**: Network port for communication
- **Protocol**: Communication protocol (HTTP/HTTPS)

### Configuring Network Settings

#### 1. Access Device Configuration

1. Go to **Attendance** → **Devices**
2. Click on the device you want to configure
3. Click **Edit Configuration**

#### 2. Update Network Settings

| Setting | Description | Example |
|---------|-------------|---------|
| **IP Address** | Device's IP address on network | 192.168.1.100 |
| **Port** | Port for communication | 8080 |
| **Protocol** | Communication protocol | HTTPS |

#### 3. Save Configuration

1. Click **Save**
2. System validates the configuration
3. Configuration is saved

### Finding Device IP Address

#### Method 1: Device Display Panel

1. Access device's display panel or menu
2. Look for "Network Settings" or "IP Address"
3. Note the IP address displayed

#### Method 2: Device Management Software

1. Install device manufacturer's management software
2. Launch the software
3. Scan for devices on network
4. Note the IP address of your device

#### Method 3: Network Router

1. Access your network router's admin panel
2. Look for "Connected Devices" or "DHCP Clients"
3. Find your device by name or MAC address
4. Note the assigned IP address

#### Method 4: Network Scan

1. Use network scanning tool (e.g., Angry IP Scanner)
2. Scan your network range (e.g., 192.168.1.0/24)
3. Look for device by MAC address or name
4. Note the IP address

### Setting Static IP Address

To prevent IP address changes:

1. Access device's network settings
2. Change from DHCP to Static IP
3. Assign a fixed IP address (e.g., 192.168.1.100)
4. Save settings
5. Restart device

**Recommended Static IPs**:
- Main Gate: 192.168.1.100
- Classroom: 192.168.1.101
- Office: 192.168.1.102

### Network Firewall Configuration

If devices are on different networks:

1. Configure firewall rules to allow communication
2. Open required ports (default: 8080)
3. Allow both incoming and outgoing traffic
4. Test connectivity after firewall changes

---

## Testing Connection

### Why Test Connection?

Testing connection verifies:
- Device is reachable on network
- Device is properly configured
- Device is responding correctly
- System can communicate with device

### Running Connection Test

#### 1. Access Device Details

1. Go to **Attendance** → **Devices**
2. Click on the device
3. Click **Test Connection**

#### 2. Review Test Results

The system attempts to connect and displays:

**Success Result**:
```
✓ Connection Successful

Device Information:
- Model: MB360
- Firmware Version: 1.2.3
- Enrolled Users: 450
- Status: Ready for sync
```

**Failed Result**:
```
✗ Connection Failed

Error: Connection timeout
Troubleshooting:
1. Verify device is powered on
2. Check IP address is correct
3. Verify network connectivity
4. Check firewall rules
```

### Interpreting Test Results

| Result | Meaning | Action |
|--------|---------|--------|
| **Connection Successful** | Device is reachable and responding | Proceed with enrollment |
| **Connection Timeout** | Device not responding | Check IP address, network, power |
| **Authentication Failed** | Device credentials incorrect | Verify username/password |
| **Invalid Response** | Device returned unexpected data | Check device configuration |
| **Network Unreachable** | Cannot reach device network | Check network connectivity |

### Troubleshooting Failed Connection

If connection test fails:

1. **Verify Device Power**
   - Ensure device is powered on
   - Check power indicator light
   - Try power cycling device

2. **Verify Network Connectivity**
   - Ping device IP address from computer
   - Check network cable connection
   - Verify WiFi connection (if wireless)

3. **Verify IP Address**
   - Confirm IP address is correct
   - Check device hasn't changed IP
   - Verify IP is on same network

4. **Check Firewall**
   - Verify firewall allows communication
   - Check port is not blocked
   - Temporarily disable firewall to test

5. **Verify Device Configuration**
   - Check device is configured for network communication
   - Verify device protocol matches (HTTP/HTTPS)
   - Check device port matches configuration

6. **Contact Device Vendor**
   - If all above steps fail
   - Provide error message and device details
   - Request technical support

---

## Student Enrollment

### Understanding Enrollment

Enrollment maps students to their biometric data:
- **Student ID**: System identifier for student
- **Biometric ID**: Device identifier for student's biometric data

### Why Enrollment is Important

Enrollment is required for:
- Device to identify students
- Attendance records to be created
- Biometric data to be matched to students

### Enrollment Methods

#### Method 1: Manual Enrollment (Recommended)

1. Go to **Attendance** → **Devices**
2. Click on the device
3. Click **Enroll Students**
4. For each student:
   - Select student from list
   - Scan student's biometric on device
   - Note the biometric ID assigned by device
   - Enter biometric ID in system
   - Click **Enroll**

#### Method 2: Bulk Enrollment

1. Go to **Attendance** → **Devices**
2. Click on the device
3. Click **Bulk Enroll**
4. Upload CSV file with format:
   ```
   studentId,biometricId
   STU001,12345
   STU002,12346
   STU003,12347
   ```
5. System validates and enrolls students

#### Method 3: Device-Based Enrollment

1. Use device's management software
2. Enroll students directly on device
3. Export enrollment list from device
4. Upload to system using bulk enrollment

### Step-by-Step Manual Enrollment

#### 1. Prepare for Enrollment

1. Gather all students who need enrollment
2. Ensure device is powered on and ready
3. Have student list available
4. Allocate time for enrollment (5-10 minutes per student)

#### 2. Enroll Each Student

For each student:

1. **Select Student**
   - Go to **Enroll Students**
   - Search for student by name or ID
   - Click to select student

2. **Capture Biometric**
   - Instruct student to scan biometric on device
   - For fingerprint: Place finger on scanner
   - For face: Look at camera
   - For iris: Look at iris scanner
   - For palm: Place palm on scanner

3. **Record Biometric ID**
   - Device displays biometric ID (e.g., "12345")
   - Note the ID
   - Enter ID in system field

4. **Confirm Enrollment**
   - Click **Enroll**
   - System confirms enrollment
   - Student is now enrolled

#### 3. Verify Enrollment

1. Go to **Enrolled Students**
2. Verify student appears in list
3. Confirm biometric ID is correct

### Enrollment Best Practices

1. **Enroll All Students**: Enroll all students who will use the device
2. **Quality Scans**: Ensure good quality biometric scans
3. **Multiple Enrollments**: Consider enrolling each student 2-3 times for better accuracy
4. **Verify Enrollment**: Test enrollment by having student scan again
5. **Keep Records**: Maintain list of enrolled students
6. **Update Regularly**: Add new students as they join

### Unenrolling Students

To remove a student from device:

1. Go to **Attendance** → **Devices**
2. Click on the device
3. Click **Enrolled Students**
4. Find the student
5. Click **Unenroll**
6. Confirm the action
7. Student is removed from device

---

## Sync Configuration

### Understanding Sync

Sync transfers attendance data from device to system:
- Device captures attendance
- System periodically syncs data
- Attendance records are created in system

### Sync Frequency Options

| Frequency | Interval | Best For |
|-----------|----------|----------|
| **Hourly** | Every hour | High-traffic locations, real-time needs |
| **Every 4 Hours** | Every 4 hours | Medium-traffic locations |
| **Daily** | Once per day | Low-traffic locations, end-of-day sync |
| **Manual** | On-demand | Testing, troubleshooting |

### Configuring Sync Frequency

#### 1. Access Device Configuration

1. Go to **Attendance** → **Devices**
2. Click on the device
3. Click **Edit Configuration**

#### 2. Set Sync Frequency

1. Find **Sync Frequency** setting
2. Select desired frequency:
   - Hourly
   - Every 4 Hours
   - Daily
   - Manual

3. Click **Save**

#### 3. Verify Configuration

1. Device configuration is updated
2. Sync schedule is activated
3. First sync occurs at next scheduled time

### Manual Sync

To manually sync a device:

1. Go to **Attendance** → **Devices**
2. Click on the device
3. Click **Sync Now**
4. System initiates sync
5. Sync status is displayed
6. Attendance records are created

### Monitoring Sync Status

#### Viewing Sync Status

1. Go to **Attendance** → **Devices**
2. Look at **Sync Status** column:
   - **Synced**: Last sync was successful
   - **Pending**: Sync is scheduled or in progress
   - **Failed**: Last sync failed

#### Viewing Sync History

1. Click on the device
2. Click **Sync History**
3. View recent syncs with:
   - Sync timestamp
   - Status (Success/Failed)
   - Records synced
   - Errors (if any)

#### Viewing Sync Logs

1. Click on the device
2. Click **Sync Logs**
3. View detailed sync information:
   - Sync duration
   - Records processed
   - Error details

---

## Monitoring & Maintenance

### Daily Monitoring

#### Check Device Status

1. Go to **Attendance** → **Devices**
2. Verify device status is "Active"
3. Verify sync status is "Synced"
4. Check last sync timestamp is recent

#### Monitor Sync Results

1. Click on device
2. View **Sync History**
3. Verify recent syncs were successful
4. Check for any errors

### Weekly Maintenance

#### Test Device Connection

1. Click on device
2. Click **Test Connection**
3. Verify connection is successful
4. Note any issues

#### Review Error Logs

1. Click on device
2. Click **Error Logs**
3. Review recent errors
4. Address any issues

#### Verify Enrollment

1. Click on device
2. Click **Enrolled Students**
3. Verify all students are enrolled
4. Add any new students

### Monthly Maintenance

#### Device Inspection

1. Physically inspect device
2. Check for damage or wear
3. Clean device (if needed)
4. Verify all connections are secure

#### Performance Review

1. Review sync history for the month
2. Check for patterns in failures
3. Verify attendance accuracy
4. Address any recurring issues

#### Firmware Updates

1. Check device manufacturer for firmware updates
2. Review update release notes
3. Test update in non-production environment
4. Deploy update if appropriate

### Troubleshooting Common Issues

#### Device Status Shows "Error"

**Cause**: Device has failed multiple syncs

**Solution**:
1. Click **Test Connection**
2. Review error logs
3. Address underlying issue
4. Click **Sync Now** to retry
5. Device status changes to "Active" if successful

#### Sync Status Shows "Failed"

**Cause**: Sync encountered an error

**Solution**:
1. Click **Sync History** to view error
2. Address error (see troubleshooting section)
3. Click **Sync Now** to retry
4. Verify sync succeeds

#### No Attendance Records After Sync

**Cause**: Sync completed but no records created

**Possible causes**:
- No attendance data on device
- Students not enrolled
- Biometric IDs don't match

**Solution**:
1. Verify students scanned on device
2. Check device enrollment
3. Verify biometric ID mapping
4. Contact device vendor if issue persists

---

## Troubleshooting

### Connection Issues

#### Issue: "Connection Timeout"

**Cause**: Device not responding to connection request

**Solutions**:
1. Verify device is powered on
2. Check IP address is correct
3. Verify network connectivity
4. Check firewall rules
5. Try power cycling device
6. Verify device is on same network

#### Issue: "Network Unreachable"

**Cause**: Cannot reach device's network

**Solutions**:
1. Verify network connectivity
2. Check IP address is on correct network
3. Verify network cable is connected
4. Check WiFi connection (if wireless)
5. Verify firewall allows communication

#### Issue: "Authentication Failed"

**Cause**: Device credentials are incorrect

**Solutions**:
1. Verify username and password
2. Check device documentation for default credentials
3. Reset device to factory settings if needed
4. Contact device vendor for support

### Sync Issues

#### Issue: "Sync Failed - Invalid Data"

**Cause**: Device returned data in unexpected format

**Solutions**:
1. Verify device firmware is up to date
2. Check device configuration
3. Contact device vendor
4. Try manual sync again

#### Issue: "Sync Failed - Connection Lost"

**Cause**: Connection dropped during sync

**Solutions**:
1. Check network stability
2. Verify device is still powered on
3. Check firewall rules
4. Try sync again

#### Issue: "No Records Synced"

**Cause**: Device has no new attendance data

**Solutions**:
1. Verify students have scanned on device
2. Check device has attendance data
3. Verify device time is correct
4. Try manual sync again

### Enrollment Issues

#### Issue: "Student Not Found"

**Cause**: Student ID doesn't exist in system

**Solutions**:
1. Verify student ID is correct
2. Check student exists in system
3. Verify student is assigned to correct class
4. Contact administrator if student is missing

#### Issue: "Biometric ID Already Enrolled"

**Cause**: Biometric ID is already mapped to another student

**Solutions**:
1. Verify correct biometric ID
2. Unenroll previous student if incorrect
3. Re-scan student to get correct ID
4. Try enrollment again

#### Issue: "Enrollment Failed"

**Cause**: System error during enrollment

**Solutions**:
1. Verify student and biometric ID are correct
2. Try enrollment again
3. Check system logs for errors
4. Contact administrator if issue persists

### Device Issues

#### Issue: "Device Status Shows Inactive"

**Cause**: Device has never synced successfully

**Solutions**:
1. Verify device is configured correctly
2. Test device connection
3. Verify students are enrolled
4. Manually trigger sync
5. Device status changes to "Active" after successful sync

#### Issue: "Device Status Shows Maintenance"

**Cause**: Device has been manually set to maintenance

**Solutions**:
1. Perform required maintenance
2. Test device connection
3. Click **Change Status** to set back to "Active"
4. Verify device is working

#### Issue: "Consecutive Failures - Device Set to Error"

**Cause**: Device has failed 3+ consecutive syncs

**Solutions**:
1. Review error logs to identify issue
2. Address underlying problem
3. Test device connection
4. Manually trigger sync
5. If successful, device status changes to "Active"

### Performance Issues

#### Issue: "Sync Takes Too Long"

**Cause**: Large number of records or slow network

**Solutions**:
1. Check network speed
2. Verify device is not overloaded
3. Consider increasing sync frequency
4. Contact device vendor for optimization

#### Issue: "System Slow During Sync"

**Cause**: Sync is consuming system resources

**Solutions**:
1. Schedule syncs during off-peak hours
2. Reduce sync frequency
3. Contact system administrator
4. Verify system has adequate resources

---

## Device Specifications Reference

### Fingerprint Scanner Specifications

| Specification | Typical Value |
|---------------|---------------|
| Scanning Time | < 1 second |
| Accuracy | 99.9% |
| Enrollment Time | 5-10 seconds |
| Capacity | 1,000-10,000 users |
| Interface | USB, Ethernet, WiFi |
| Power | 5V DC or AC adapter |

### Face Recognition Specifications

| Specification | Typical Value |
|---------------|---------------|
| Scanning Time | 1-2 seconds |
| Accuracy | 99% |
| Enrollment Time | 10-20 seconds |
| Capacity | 1,000-100,000 users |
| Interface | Ethernet, WiFi |
| Power | AC adapter |
| Lighting | 50-500 lux |

### Iris Scanner Specifications

| Specification | Typical Value |
|---------------|---------------|
| Scanning Time | 1-3 seconds |
| Accuracy | 99.99% |
| Enrollment Time | 30-60 seconds |
| Capacity | 1,000-10,000 users |
| Interface | Ethernet |
| Power | AC adapter |
| Distance | 10-35 cm |

### Palm Scanner Specifications

| Specification | Typical Value |
|---------------|---------------|
| Scanning Time | 1-2 seconds |
| Accuracy | 99.8% |
| Enrollment Time | 10-20 seconds |
| Capacity | 1,000-10,000 users |
| Interface | Ethernet, USB |
| Power | AC adapter |
| Hygiene | Contactless |

---

## Getting Help

### Support Resources

- **Device Documentation**: Refer to device manufacturer's manual
- **System Help**: Click **?** icon in interface
- **Contact Administrator**: Reach out to IT administrator
- **Device Vendor Support**: Contact device manufacturer

### Providing Feedback

We'd love to hear your feedback:
- What's working well?
- What could be improved?
- What features would help?

Submit feedback through the **Feedback** button in your dashboard.

---

## Summary

To set up a biometric device:

1. ✅ Register device in system
2. ✅ Configure network settings
3. ✅ Test device connection
4. ✅ Enroll students
5. ✅ Configure sync frequency
6. ✅ Monitor device status
7. ✅ Perform regular maintenance

For more information, contact your system administrator or device vendor.

---

**Last Updated**: May 2024  
**Version**: 1.0
