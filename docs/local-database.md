# Local Database Implementation

This document describes the local database implementation for offline-first inspection data storage.

## Overview

The app uses **IndexedDB** for local data persistence, enabling offline functionality and data synchronization. All inspection data is stored locally and can be synced to DHIS2 when online.

## Database Structure

### Database Name
`InspectionDB`

### Object Stores

#### `inspections`
Primary store for inspection records.

**Indexes:**
- `orgUnit` - Organization unit ID
- `eventDate` - ISO 8601 date string
- `status` - Inspection status (scheduled, in_progress, completed)
- `syncStatus` - Sync status (synced, not_synced, sync_failed)
- `dhis2EventId` - DHIS2 event ID (if synced)

## Data Types

### Inspection
```typescript
interface Inspection {
    id: string                    // UUID (auto-generated)
    orgUnit: string               // Organization unit ID
    orgUnitName: string           // Organization unit name
    eventDate: string             // ISO 8601 date
    scheduledStartTime?: string   // e.g., "16:00"
    scheduledEndTime?: string     // e.g., "17:30"
    status: InspectionStatus      // scheduled | in_progress | completed
    syncStatus: SyncStatus        // synced | not_synced | sync_failed
    formData: InspectionFormData  // Form field values
    createdAt: string             // ISO 8601 timestamp
    updatedAt: string             // ISO 8601 timestamp
    dhis2EventId?: string         // DHIS2 event ID after sync
}
```

### InspectionFormData
```typescript
interface InspectionFormData {
    // Resources
    textbooks: number
    desks: number
    chairs: number
    testFieldNotes: string

    // Students
    totalStudents: string
    maleStudents: string
    femaleStudents: string

    // Staff
    staffCount: string

    // Facilities
    classroomCount: string
}
```

## API Functions

### Database Operations

Located in `src/shared/db/indexedDB.ts`:

```typescript
// Get all inspections
await getAllInspections(): Promise<Inspection[]>

// Get a single inspection by ID
await getInspectionById(id: string): Promise<Inspection | null>

// Create a new inspection
await createInspection(input: CreateInspectionInput): Promise<Inspection>

// Update an existing inspection
await updateInspection(id: string, updates: UpdateInspectionInput): Promise<Inspection>

// Delete an inspection
await deleteInspection(id: string): Promise<void>

// Get inspections by status
await getInspectionsByStatus(status: string): Promise<Inspection[]>

// Get inspections by sync status
await getInspectionsBySyncStatus(syncStatus: string): Promise<Inspection[]>
```

### React Hooks

Located in `src/shared/hooks/useInspections.ts`:

#### `useInspections()`
Manages all inspections with automatic state updates.

```typescript
const {
    inspections,      // Array of all inspections
    loading,          // Loading state
    error,            // Error state
    createInspection, // Create function
    updateInspection, // Update function
    deleteInspection, // Delete function
    getInspection,    // Get by ID function
    refetch,          // Reload all inspections
} = useInspections()
```

#### `useInspection(id)`
Manages a single inspection by ID.

```typescript
const {
    inspection,       // Single inspection object
    loading,          // Loading state
    error,            // Error state
    updateInspection, // Update function
} = useInspection(inspectionId)
```

## Usage Examples

### Creating an Inspection

```typescript
import { useInspections } from '../shared/hooks/useInspections'

const { createInspection } = useInspections()

await createInspection({
    orgUnit: 'school-123',
    orgUnitName: 'Demo Primary School',
    eventDate: '2025-11-20T16:00:00',
    scheduledStartTime: '16:00',
    scheduledEndTime: '17:30',
    status: 'scheduled',
    formData: {
        textbooks: 0,
        desks: 0,
        chairs: 0,
        totalStudents: '',
        maleStudents: '',
        femaleStudents: '',
        staffCount: '',
        classroomCount: '',
        testFieldNotes: '',
    },
})
```

### Loading and Displaying Inspections

```typescript
import { useInspections } from '../shared/hooks/useInspections'

function InspectionList() {
    const { inspections, loading, error } = useInspections()

    if (loading) return <div>Loading...</div>
    if (error) return <div>Error: {error.message}</div>

    return (
        <ul>
            {inspections.map(inspection => (
                <li key={inspection.id}>
                    {inspection.orgUnitName} - {inspection.eventDate}
                    {inspection.syncStatus !== 'synced' && ' (Not synced)'}
                </li>
            ))}
        </ul>
    )
}
```

### Updating an Inspection

```typescript
import { useInspection } from '../shared/hooks/useInspections'

function InspectionForm({ inspectionId }) {
    const { inspection, updateInspection } = useInspection(inspectionId)

    const handleSave = async (formData) => {
        await updateInspection({
            formData,
            status: 'completed',
            syncStatus: 'not_synced',
        })
    }
}
```

## Auto-Save

The `InspectionOverview` component implements auto-save functionality. Any changes to form fields are automatically saved to IndexedDB:

```typescript
const updateForm = useCallback((updater) => {
    setForm(prev => {
        const next = updater(prev)

        // Auto-save to database
        if (inspection) {
            updateInspection({
                formData: next,
                status: 'in_progress',
            }).catch(console.error)
        }

        return next
    })
}, [inspection, updateInspection])
```

## Sync Status

Inspections track their sync status:

- **`synced`** - Data is synchronized with DHIS2
- **`not_synced`** - Local changes not yet pushed to DHIS2
- **`sync_failed`** - Sync attempt failed (future implementation)

The sync status is displayed in the UI:
- Home page inspection cards show sync status
- Inspection detail page shows sync badge

## Test Data

For development and testing, use the provided test data utilities:

```javascript
// In browser console:
await window.createSampleInspection('School A', '2025-11-20T16:00:00', 'scheduled')

// Create multiple sample inspections:
await window.createSampleInspections()
```

Located in `src/shared/utils/testData.ts`.

## Future Enhancements

1. **Sync Implementation** - Push local changes to DHIS2 when online
2. **Conflict Resolution** - Handle conflicts when syncing
3. **Offline Queue** - Queue failed sync operations for retry
4. **Data Export** - Export inspection data for reporting
5. **Image Storage** - Store inspection photos locally
6. **Search & Filter** - Advanced search and filtering capabilities
