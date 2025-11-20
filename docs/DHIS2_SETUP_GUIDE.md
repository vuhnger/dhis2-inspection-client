# DHIS2 School Inspection Program Setup Guide

This guide will help you set up the School Inspection program in your DHIS2 instance (`https://research.im.dhis2.org/in5320g16`).

## Overview

The School Inspection program is an **Event Program (WITHOUT_REGISTRATION)** that collects inspection data for schools. Schools are represented as organization units, not tracked entities, so no enrollment is needed.

## Data Collected During Inspections

Our app collects the following data fields:

### 1. Resources
- **Textbooks** (Number) - `xiaOnejpgdY` - CHK English Textbooks
- **Chairs** (Number) - `mAtab30vU5g` - Number of Chairs
- **Desks** (Number) - ⚠️ NOT SYNCED (data element doesn't exist in DHIS2)
- **Notes** (Text) - `KrijJzaqMAU` - Inspection Notes

### 2. Students
- **Total Students** (Integer) - `EaWxWo27lm3` - Total Students
- **Male Students** (Integer) - `h4XENZX2UMf` - Male Students
- **Female Students** (Integer) - `DM707Od7el4` - Female Students

### 3. Staff
- **Staff Count** (Integer) - `ooYtEgJUuRM` - Staff Count

### 4. Facilities
- **Classroom Count** (Integer) - `ya5SyA5hej4` - CHK number of classrooms

## Required DHIS2 Configuration

### Step 1: Create/Verify the Program

1. **Log in to DHIS2**
   - URL: `https://research.im.dhis2.org/in5320g16`
   - Username: `in5320`
   - Password: `P1@tform`

2. **Navigate to Maintenance → Program → Program**

3. **Create or edit the "School Inspection" program** with these settings:
   - **Name**: School Inspection
   - **Short name**: School Inspection
   - **Program type**: Event program (WITHOUT_REGISTRATION)
   - **Category combination**: None (default)
   - **Description**: School inspection events for tracking facility conditions and resources

4. **Save the program** and note the UID (should be `UxK2o06ScIe`)

### Step 2: Create the Program Stage

1. **In the same program screen, scroll to "Program stages"**

2. **Add a new program stage** with these settings:
   - **Name**: School Inspection
   - **Description**: Main inspection stage
   - **Report date to use**: Incident date
   - **Generate event by enrollment**: No (not applicable for event programs)
   - **Block entry form after completed**: No
   - **Auto-generate event**: No

3. **Save the program stage** and note the UID (should be `eJiBjm9Rl7E`)

### Step 3: Add Data Elements to the Program Stage

For each data element below, add it to the program stage:

1. **Click "Assign data elements"** in the program stage section

2. **Add these data elements** (if they exist in your DHIS2 instance):

   | Data Element Name | UID | Value Type | Compulsory |
   |-------------------|-----|------------|------------|
   | CHK English Textbooks | `xiaOnejpgdY` | INTEGER | No |
   | Number of Chairs | `mAtab30vU5g` | INTEGER | No |
   | Total Students | `EaWxWo27lm3` | INTEGER | No |
   | Male Students | `h4XENZX2UMf` | INTEGER | No |
   | Female Students | `DM707Od7el4` | INTEGER | No |
   | Staff Count | `ooYtEgJUuRM` | INTEGER | No |
   | CHK number of classrooms | `ya5SyA5hej4` | INTEGER | No |
   | Inspection Notes | `KrijJzaqMAU` | TEXT/LONG_TEXT | No |

**Note**: If any of these data elements don't exist, you'll need to create them first:

#### Creating Missing Data Elements:

1. Go to **Maintenance → Data Element**
2. Click **Add new**
3. Fill in the details from the table above
4. Set the following:
   - **Domain type**: Tracker
   - **Value type**: (as per table)
   - **Aggregation type**: None
5. **Save**

### Step 4: Assign Organization Units to the Program

This is **CRITICAL** - the program must be assigned to the organization units where you want to create events.

1. **In the program configuration**, scroll to **"Assign organisation units"**

2. **Select the root organization unit**: `QGMu6bmPtkD` (Gambia)

3. **Make sure all child organization units are included** (districts, clusters, and schools)

4. **Save the program**

### Step 5: Configure Sharing/Access Permissions

1. **Click the "Sharing settings" button** (usually in the top right)

2. **Set permissions**:
   - **Public access**: "Can view and edit data" (or at minimum "Can view")
   - **OR** add user `in5320` or their user group with "Can view and edit data"

3. **Save**

### Step 6: Verify the Configuration

Run these checks in your browser console while logged into DHIS2:

```javascript
// Test 1: Check if the program exists and what access you have
fetch('/api/programs/UxK2o06ScIe.json?fields=id,name,access,organisationUnits[id,name],programStages[id,name,programStageDataElements[dataElement[id,name]]]')
  .then(r => r.json())
  .then(d => console.log('Program:', d))

// Test 2: Check your user's organization units
fetch('/api/me.json?fields=id,username,organisationUnits[id,name]')
  .then(r => r.json())
  .then(d => console.log('User:', d))

// Test 3: Try to create a test event
fetch('/api/tracker', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    events: [{
      program: 'UxK2o06ScIe',
      programStage: 'eJiBjm9Rl7E',
      orgUnit: 'YOUR_ORG_UNIT_ID', // Replace with an actual org unit ID
      eventDate: '2025-11-20',
      status: 'ACTIVE',
      dataValues: [
        { dataElement: 'xiaOnejpgdY', value: '10' },
        { dataElement: 'mAtab30vU5g', value: '20' }
      ]
    }]
  })
})
  .then(r => r.json())
  .then(d => console.log('Test event:', d))
```

## Common Issues and Solutions

### Issue 1: "Could not find Program: UxK2o06ScIe"

**Cause**: Program doesn't exist or user doesn't have access

**Solution**:
1. Verify the program UID is correct (`UxK2o06ScIe`)
2. Check sharing settings - make sure user `in5320` has access
3. Make sure you saved the program after creation

### Issue 2: "Could not find ProgramStage: eJiBjm9Rl7E"

**Cause**: Program stage doesn't exist or isn't linked to the program

**Solution**:
1. Verify the program stage UID is correct (`eJiBjm9Rl7E`)
2. Make sure the program stage is added to the program
3. Save the program after adding the stage

### Issue 3: "Organisation unit does not exist" or similar

**Cause**: The program is not assigned to the organization units where you're trying to create events

**Solution**:
1. Go to program configuration
2. Scroll to "Assign organisation units"
3. Select the root org unit `QGMu6bmPtkD` and all children
4. Save

### Issue 4: Data elements not found

**Cause**: The data elements with those specific UIDs don't exist in your instance

**Solution**:
1. Go to Maintenance → Data Element
2. Create each missing data element with the exact UID specified
3. Set domain type to "Tracker"
4. Add them to the program stage

## Testing the Setup

After completing the setup:

1. **Test in the app**:
   - Create a new inspection
   - Fill in all the fields
   - Try to sync

2. **Check DHIS2**:
   - Go to Event Reports or Event Visualizer
   - Select "School Inspection" program
   - Verify your synced events appear

3. **Check via API**:
   ```bash
   curl -u "in5320:P1@tform" \
     "https://research.im.dhis2.org/in5320g16/api/tracker/events?program=UxK2o06ScIe&ouMode=ALL&fields=*"
   ```

## Quick Reference

- **Program UID**: `UxK2o06ScIe`
- **Program Stage UID**: `eJiBjm9Rl7E`
- **Root Org Unit**: `QGMu6bmPtkD`
- **API Endpoint**: `/api/tracker` (POST for creating events)
- **Program Type**: WITHOUT_REGISTRATION (Event Program)

## Additional Resources

- [DHIS2 Tracker Documentation](https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/tracker.html)
- [Event Programs Guide](https://docs.dhis2.org/en/use/user-guides/dhis-core-version-master/configuring-the-system/programs.html)
- [Data Elements Guide](https://docs.dhis2.org/en/use/user-guides/dhis-core-version-master/configuring-the-system/metadata.html#manage_data_element)
