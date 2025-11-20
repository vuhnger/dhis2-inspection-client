# Documentation

This folder contains all technical documentation for the School Inspection app.

## Quick Start for Developers

### DHIS2 Sync Implementation

If you're implementing DHIS2 sync, start here:

1. **[DHIS2 Sync Guide](./dhis2-sync-guide.md)** - Complete guide for syncing inspection data
2. **[data-mappings.json](./data-mappings.json)** - JSON mapping file (use this in your code)

### Key Concepts

**Program Type**: Event Program (WITHOUT_REGISTRATION)
- No tracked entities needed
- No enrollment required
- Create events directly

**Required IDs**:
```json
{
  "programId": "UxK2o06ScIe",
  "programStageId": "eJiBjm9Rl7E"
}
```
> Override via env if your backend uses different IDs: set `VITE_DHIS2_PROGRAM_UID`, `VITE_DHIS2_PROGRAM_STAGE_UID`, and `VITE_DHIS2_ROOT_OU_UID` (default root: `QGMu6bmPtkD`, Gambia) in your `.env`. Dev auth defaults are hardcoded: `REACT_APP_DHIS2_USERNAME=in5320`, `REACT_APP_DHIS2_PASSWORD=P1@tform`, `REACT_APP_DHIS2_BASE_URL=https://research.im.dhis2.org/in5320g16` (change/remove for production).

**Quick Example**:
```typescript
// Create inspection event in DHIS2
const payload = {
  program: "UxK2o06ScIe",      // or import.meta.env.VITE_DHIS2_PROGRAM_UID
  programStage: "eJiBjm9Rl7E",  // or import.meta.env.VITE_DHIS2_PROGRAM_STAGE_UID
  orgUnit: "SCHOOL_ORG_UNIT_ID",
  eventDate: "2025-01-15",
  status: "COMPLETED",
  dataValues: [
    { dataElement: "xiaOnejpgdY", value: 50 },  // textbooks
    { dataElement: "mAtab30vU5g", value: 30 },  // chairs
    // ... see data-mappings.json for all fields
  ]
};

await engine.mutate({ resource: 'events', type: 'create', data: payload });
```

---

## All Documentation

### Core Architecture
- **[architecture.md](./architecture.md)** - Overall app architecture
- **[local-database.md](./local-database.md)** - IndexedDB schema and offline storage
- **[design.md](./design.md)** - UI/UX design decisions

### DHIS2 Integration
- **[dhis2-sync-guide.md](./dhis2-sync-guide.md)** - ⭐ Complete DHIS2 sync guide
- **[data-mappings.json](./data-mappings.json)** - ⭐ Data mapping configuration
- **[data-elements-reference.md](./data-elements-reference.md)** - Full DHIS2 data elements catalog
- **[api-docs.md](./api-docs.md)** - API documentation

### Features
- **[create-inspection-feature.md](./create-inspection-feature.md)** - Create inspection implementation
- **[homepage-implementation.md](./homepage-implementation.md)** - Homepage implementation

### Other
- **[case.md](./case.md)** - Project case description
- **[security.md](./security.md)** - Security considerations
- **[styleguide.md](./styleguide.md)** - Code style guide

---

## Data Mappings Quick Reference

### Local Form Fields → DHIS2 Data Elements

| Local Field | DHIS2 ID | Type |
|-------------|----------|------|
| `formData.textbooks` | `xiaOnejpgdY` | INTEGER |
| `formData.chairs` | `mAtab30vU5g` | INTEGER |
| `formData.testFieldNotes` | `KrijJzaqMAU` | TEXT |
| `formData.totalStudents` | `EaWxWo27lm3` | INTEGER |
| `formData.maleStudents` | `h4XENZX2UMf` | INTEGER |
| `formData.femaleStudents` | `DM707Od7el4` | INTEGER |
| `formData.staffCount` | `ooYtEgJUuRM` | INTEGER |
| `formData.classroomCount` | `ya5SyA5hej4` | INTEGER |
| ~~`formData.desks`~~ | ❌ Not found | - |

### How to Get Organization Unit ID (School ID)

```typescript
// Method 1: Use UI component
import { OrganisationUnitTree } from '@dhis2/ui';

<OrganisationUnitTree
  onChange={({ id }) => setOrgUnit(id)}
/>

// Method 2: Query API
const { data } = useDataQuery({
  orgUnits: {
    resource: 'me',
    params: {
      fields: 'organisationUnits[id,displayName]'
    }
  }
});
```

---

## Common Tasks

### Adding a New Data Element

1. Add the data element to DHIS2 program stage
2. Update `docs/data-mappings.json`:
   ```json
   {
     "dataElements": {
       "category": {
         "newField": {
           "localField": "formData.newField",
           "dhis2Id": "NEW_DHIS2_ID",
           "dhis2ValueType": "INTEGER",
           "description": "Description",
           "required": true
         }
       }
     }
   }
   ```
3. Update `src/shared/types/inspection.ts` to add the field to `InspectionFormData`
4. Update sync logic to include the new field
5. Update the form UI to collect the new field

### Testing Sync

```bash
# Using curl
curl -u "username:password" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "program": "UxK2o06ScIe",
    "programStage": "eJiBjm9Rl7E",
    "orgUnit": "l9Z5RQXMYGu",
    "eventDate": "2025-01-15",
    "status": "COMPLETED",
    "dataValues": [...]
  }' \
  "https://research.im.dhis2.org/in5320g16/api/events"
```

---

## Need Help?

- Check [dhis2-sync-guide.md](./dhis2-sync-guide.md) for detailed DHIS2 integration
- Check [data-mappings.json](./data-mappings.json) for exact IDs and mappings
- Check [DHIS2 API Docs](https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/event.html)
