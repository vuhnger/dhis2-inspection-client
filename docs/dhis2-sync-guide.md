# DHIS2 Sync Guide

This guide explains how to sync inspection data between the local app and DHIS2.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [DHIS2 Configuration](#dhis2-configuration)
- [Data Mapping](#data-mapping)
- [Sync Workflow](#sync-workflow)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)

---

## Architecture Overview

### Program Type: Event Program (WITHOUT_REGISTRATION)

Our inspection system uses a **simple event program** in DHIS2. This means:

- ✅ **No tracked entities needed** - Schools exist as organization units, not tracked entity instances
- ✅ **No enrollment required** - Events are created directly without enrolling schools
- ✅ **Simple workflow** - One API call to create an inspection event

### Key DHIS2 Resources

```json
{
  "programId": "UxK2o06ScIe",
  "programStageId": "eJiBjm9Rl7E",
  "programType": "WITHOUT_REGISTRATION"
}
```

> If the Tracker import API returns `Could not find Program: UxK2o06ScIe` or `Could not find ProgramStage: eJiBjm9Rl7E`, your backend is using different IDs. Query the API for actual values:
> ```
> GET /api/programs.json?fields=id,displayName,programStages[id,displayName]&paging=false
> ```
> Then set `VITE_DHIS2_PROGRAM_UID`, `VITE_DHIS2_PROGRAM_STAGE_UID`, and `VITE_DHIS2_ROOT_OU_UID` in your `.env` to match. Default root OU is `plNY03ITg7K` (Albion Cluster, Banjul) – a unit assigned to the program.

---

## DHIS2 Configuration

### Program Details

**Program**: School Inspection
- **ID**: `UxK2o06ScIe`
- **Type**: Event program (WITHOUT_REGISTRATION)
- **Stage**: School Inspection (`eJiBjm9Rl7E`)

### Data Elements

Our inspection form collects 8 data elements (9th - desks - not found in DHIS2):

| Local Field | DHIS2 ID | Type | Description |
|-------------|----------|------|-------------|
| `formData.textbooks` | `xiaOnejpgdY` | INTEGER | CHK English Textbooks |
| `formData.chairs` | `mAtab30vU5g` | INTEGER | Number of Chairs |
| `formData.testFieldNotes` | `KrijJzaqMAU` | TEXT | Inspection Notes |
| `formData.totalStudents` | `EaWxWo27lm3` | INTEGER | Total Students |
| `formData.maleStudents` | `h4XENZX2UMf` | INTEGER | Male Students |
| `formData.femaleStudents` | `DM707Od7el4` | INTEGER | Female Students |
| `formData.staffCount` | `ooYtEgJUuRM` | INTEGER | Staff Count |
| `formData.classroomCount` | `ya5SyA5hej4` | INTEGER | CHK number of classrooms |
| `formData.desks` | ⚠️ **NOT FOUND** | INTEGER | Number of desks (not synced) |

### Organization Units

Schools are represented as **organization units** in DHIS2. Each school has its own org unit ID.

#### How to Find School Org Unit IDs

**Method 1: From the Organization Unit Picker**
```typescript
// Use DHIS2 App Runtime's OrganisationUnitTree component
import { OrganisationUnitTree } from '@dhis2/ui';

function SchoolSelector({ onChange }) {
  return (
    <OrganisationUnitTree
      onChange={({ id, displayName }) => {
        onChange({ orgUnit: id, orgUnitName: displayName });
      }}
      selected={[]}
    />
  );
}
```

**Method 2: Query API for Schools**
```bash
GET /api/organisationUnits?fields=id,name,displayName&filter=level:eq:4
```

**Method 3: From User's Assigned Org Units**
```typescript
import { useDataQuery } from '@dhis2/app-runtime';

const query = {
  me: {
    resource: 'me',
    params: {
      fields: 'organisationUnits[id,displayName,level]'
    }
  }
};

function useUserOrgUnits() {
  const { data } = useDataQuery(query);
  return data?.me?.organisationUnits || [];
}
```

**Method 4: Search by School Name**
```bash
GET /api/organisationUnits?fields=id,displayName&filter=displayName:ilike:SchoolName
```

#### Example Org Unit IDs

Real examples from the DHIS2 instance:
- `l9Z5RQXMYGu` - Example Primary School
- Store the org unit ID with each inspection in the `orgUnit` field

---

## Data Mapping

All mappings are defined in [`docs/data-mappings.json`](./data-mappings.json).

### Local to DHIS2 Mapping Structure

```typescript
// Local inspection data
interface Inspection {
  id: string;
  orgUnit: string;              // DHIS2 org unit ID
  eventDate: string;             // ISO 8601 format
  formData: InspectionFormData;
  dhis2EventId?: string;         // Populated after sync
  syncStatus: 'synced' | 'not_synced' | 'sync_failed';
}

// DHIS2 event payload
interface DHIS2Event {
  program: string;               // UxK2o06ScIe
  programStage: string;          // eJiBjm9Rl7E
  orgUnit: string;
  eventDate: string;             // YYYY-MM-DD
  status: 'COMPLETED';
  dataValues: Array<{
    dataElement: string;
    value: string | number;
  }>;
}
```

### Data Transformations

Before syncing, apply these transformations:

```typescript
// String to number conversion (see data-mappings.json > transformations)
const transformations = [
  'formData.totalStudents',
  'formData.maleStudents',
  'formData.femaleStudents',
  'formData.staffCount',
  'formData.classroomCount'
];

// Transform function
function transformFormData(formData: InspectionFormData) {
  return {
    ...formData,
    totalStudents: parseInt(formData.totalStudents, 10),
    maleStudents: parseInt(formData.maleStudents, 10),
    femaleStudents: parseInt(formData.femaleStudents, 10),
    staffCount: parseInt(formData.staffCount, 10),
    classroomCount: parseInt(formData.classroomCount, 10)
  };
}
```

---

## Sync Workflow

### 1. Creating an Inspection Event

```typescript
import { useDataMutation } from '@dhis2/app-runtime';
import dataMappings from '../docs/data-mappings.json';

function useSyncInspection() {
  const [mutate] = useDataMutation({
    resource: 'events',
    type: 'create'
  });

  const syncInspection = async (inspection: Inspection) => {
    // Transform form data
    const transformed = transformFormData(inspection.formData);

    // Build data values array
    const dataValues = buildDataValues(transformed);

    // Create DHIS2 event
    const payload = {
      program: dataMappings.programs.schoolInspection.programId,
      programStage: dataMappings.programs.schoolInspection.programStageId,
      orgUnit: inspection.orgUnit,
      eventDate: inspection.eventDate,
      status: 'COMPLETED',
      dataValues
    };

    try {
      const response = await mutate(payload);
      return response.response.importSummaries[0].reference;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  };

  return { syncInspection };
}
```

### 2. Building Data Values

```typescript
function buildDataValues(formData: InspectionFormData) {
  const mappings = dataMappings.dataElements;
  const dataValues = [];

  // Resources
  if (formData.textbooks) {
    dataValues.push({
      dataElement: mappings.resources.textbooks.dhis2Id,
      value: formData.textbooks
    });
  }

  if (formData.chairs) {
    dataValues.push({
      dataElement: mappings.resources.chairs.dhis2Id,
      value: formData.chairs
    });
  }

  if (formData.testFieldNotes) {
    dataValues.push({
      dataElement: mappings.resources.testFieldNotes.dhis2Id,
      value: formData.testFieldNotes
    });
  }

  // Students
  dataValues.push({
    dataElement: mappings.students.totalStudents.dhis2Id,
    value: formData.totalStudents
  });

  dataValues.push({
    dataElement: mappings.students.maleStudents.dhis2Id,
    value: formData.maleStudents
  });

  dataValues.push({
    dataElement: mappings.students.femaleStudents.dhis2Id,
    value: formData.femaleStudents
  });

  // Staff
  dataValues.push({
    dataElement: mappings.staff.staffCount.dhis2Id,
    value: formData.staffCount
  });

  // Facilities
  dataValues.push({
    dataElement: mappings.facilities.classroomCount.dhis2Id,
    value: formData.classroomCount
  });

  // Note: desks are skipped as they don't exist in DHIS2

  return dataValues;
}
```

### 3. Updating Sync Status

After successful sync:

```typescript
// Update local inspection record
await updateInspection(inspection.id, {
  dhis2EventId: eventId,
  syncStatus: 'synced',
  updatedAt: new Date().toISOString()
});
```

---

## API Reference

### Create Event

**Endpoint**: `POST /api/events`

**Request Body**:
```json
{
  "program": "UxK2o06ScIe",
  "programStage": "eJiBjm9Rl7E",
  "orgUnit": "l9Z5RQXMYGu",
  "eventDate": "2025-01-15",
  "status": "COMPLETED",
  "dataValues": [
    { "dataElement": "xiaOnejpgdY", "value": 50 },
    { "dataElement": "mAtab30vU5g", "value": 30 },
    { "dataElement": "EaWxWo27lm3", "value": 120 },
    { "dataElement": "h4XENZX2UMf", "value": 60 },
    { "dataElement": "DM707Od7el4", "value": 60 },
    { "dataElement": "ooYtEgJUuRM", "value": 8 },
    { "dataElement": "ya5SyA5hej4", "value": 6 },
    { "dataElement": "KrijJzaqMAU", "value": "Good condition" }
  ]
}
```

**Response**:
```json
{
  "httpStatus": "OK",
  "httpStatusCode": 200,
  "status": "SUCCESS",
  "response": {
    "importSummaries": [
      {
        "responseType": "ImportSummary",
        "status": "SUCCESS",
        "reference": "abc123xyz",
        "importCount": {
          "imported": 1,
          "updated": 0,
          "ignored": 0,
          "deleted": 0
        }
      }
    ]
  }
}
```

### Update Event

**Endpoint**: `PUT /api/events/{eventId}`

**Request Body**: Same as create

### Query Events

**Get events for a school**:
```
GET /api/events?program=UxK2o06ScIe&orgUnit={orgUnitId}
```

**Get events by date range**:
```
GET /api/events?program=UxK2o06ScIe&startDate=2025-01-01&endDate=2025-12-31
```

---

## Error Handling

### Common Errors

#### 1. Authentication Error
```json
{
  "httpStatus": "Unauthorized",
  "httpStatusCode": 401,
  "message": "Unauthorized"
}
```

**Solution**: Check DHIS2 credentials

#### 2. Invalid Org Unit
```json
{
  "status": "ERROR",
  "message": "Organisation unit does not exist"
}
```

**Solution**: Verify the org unit ID exists in DHIS2

#### 3. Invalid Data Element
```json
{
  "status": "ERROR",
  "message": "Data element does not exist"
}
```

**Solution**: Check data element ID in `data-mappings.json`

### Retry Logic

```typescript
async function syncWithRetry(inspection: Inspection, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await syncInspection(inspection);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

### Offline Sync

```typescript
// Queue inspections for later sync
async function queueForSync(inspection: Inspection) {
  await updateInspection(inspection.id, {
    syncStatus: 'not_synced'
  });
}

// Sync all pending inspections when online
async function syncPendingInspections() {
  const pending = await db.inspections
    .where('syncStatus')
    .equals('not_synced')
    .toArray();

  for (const inspection of pending) {
    try {
      await syncInspection(inspection);
    } catch (error) {
      await updateInspection(inspection.id, {
        syncStatus: 'sync_failed'
      });
    }
  }
}
```

---

## Testing

### Manual Testing with Postman

1. **Set up authentication**:
   - Type: Basic Auth
   - Username: your DHIS2 username
   - Password: your DHIS2 password

2. **Create a test event**:
   ```
   POST https://research.im.dhis2.org/in5320g16/api/events
   Content-Type: application/json

   {
     "program": "UxK2o06ScIe",
     "programStage": "eJiBjm9Rl7E",
     "orgUnit": "l9Z5RQXMYGu",
     "eventDate": "2025-01-15",
     "status": "COMPLETED",
     "dataValues": [...]
   }
   ```

3. **Verify in DHIS2**:
   - Go to Event Reports app
   - Select "School Inspection" program
   - Check that your event appears

---

## Additional Resources

- [DHIS2 API Documentation](https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/event.html)
- [Data Mappings Reference](./data-mappings.json)
- [Data Elements Reference](./data-elements-reference.md)
- [Local Database Schema](./local-database.md)
