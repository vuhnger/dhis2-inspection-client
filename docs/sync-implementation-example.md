# Sync Implementation Example

This is a complete working example of how to implement DHIS2 sync for inspections.

## File Structure

```
src/
├── services/
│   ├── sync/
│   │   ├── useSyncInspection.ts      # Main sync hook
│   │   ├── buildEventPayload.ts       # Build DHIS2 payload
│   │   └── transformFormData.ts       # Data transformations
│   └── db/
│       └── inspections.ts             # IndexedDB operations
└── shared/
    └── types/
        └── inspection.ts              # TypeScript types
```

---

## 1. Main Sync Hook

**File**: `src/services/sync/useSyncInspection.ts`

```typescript
import { useDataMutation } from '@dhis2/app-runtime';
import { Inspection } from '../../shared/types/inspection';
import { buildEventPayload } from './buildEventPayload';
import { updateInspection } from '../db/inspections';

/**
 * Hook to sync inspection data to DHIS2
 */
export function useSyncInspection() {
  const [mutate, { loading, error }] = useDataMutation({
    resource: 'events',
    type: 'create'
  });

  /**
   * Sync a single inspection to DHIS2
   * Returns the DHIS2 event ID on success
   */
  const syncInspection = async (inspection: Inspection): Promise<string> => {
    try {
      // Build DHIS2 event payload from inspection data
      const payload = buildEventPayload(inspection);

      // Send to DHIS2
      const response = await mutate(payload);

      // Extract event ID from response
      const eventId = response.response.importSummaries[0].reference;

      // Update local database with sync status
      await updateInspection(inspection.id, {
        dhis2EventId: eventId,
        syncStatus: 'synced',
        updatedAt: new Date().toISOString()
      });

      return eventId;
    } catch (err) {
      // Mark as failed in local database
      await updateInspection(inspection.id, {
        syncStatus: 'sync_failed',
        updatedAt: new Date().toISOString()
      });

      throw err;
    }
  };

  /**
   * Sync all pending inspections
   */
  const syncAllPending = async () => {
    const { getAllInspections } = await import('../db/inspections');
    const inspections = await getAllInspections();

    const pending = inspections.filter(
      i => i.syncStatus === 'not_synced' || i.syncStatus === 'sync_failed'
    );

    const results = {
      total: pending.length,
      synced: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: Error }>
    };

    for (const inspection of pending) {
      try {
        await syncInspection(inspection);
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: inspection.id,
          error: error as Error
        });
      }
    }

    return results;
  };

  return {
    syncInspection,
    syncAllPending,
    loading,
    error
  };
}
```

---

## 2. Build Event Payload

**File**: `src/services/sync/buildEventPayload.ts`

```typescript
import { Inspection } from '../../shared/types/inspection';
import { transformFormData } from './transformFormData';
import dataMappings from '../../../docs/data-mappings.json';

interface DataValue {
  dataElement: string;
  value: string | number;
}

interface DHIS2EventPayload {
  program: string;
  programStage: string;
  orgUnit: string;
  eventDate: string;
  status: 'COMPLETED';
  dataValues: DataValue[];
}

/**
 * Build DHIS2 event payload from inspection data
 */
export function buildEventPayload(inspection: Inspection): DHIS2EventPayload {
  // Transform form data (convert strings to numbers where needed)
  const transformed = transformFormData(inspection.formData);

  // Get mapping configuration
  const { programs, dataElements } = dataMappings;

  // Build data values array
  const dataValues: DataValue[] = [];

  // Resources
  if (transformed.textbooks !== undefined && transformed.textbooks !== null) {
    dataValues.push({
      dataElement: dataElements.resources.textbooks.dhis2Id,
      value: transformed.textbooks
    });
  }

  if (transformed.chairs !== undefined && transformed.chairs !== null) {
    dataValues.push({
      dataElement: dataElements.resources.chairs.dhis2Id,
      value: transformed.chairs
    });
  }

  if (transformed.testFieldNotes) {
    dataValues.push({
      dataElement: dataElements.resources.testFieldNotes.dhis2Id,
      value: transformed.testFieldNotes
    });
  }

  // Note: desks are NOT included (not found in DHIS2)

  // Students
  dataValues.push({
    dataElement: dataElements.students.totalStudents.dhis2Id,
    value: transformed.totalStudents
  });

  dataValues.push({
    dataElement: dataElements.students.maleStudents.dhis2Id,
    value: transformed.maleStudents
  });

  dataValues.push({
    dataElement: dataElements.students.femaleStudents.dhis2Id,
    value: transformed.femaleStudents
  });

  // Staff
  dataValues.push({
    dataElement: dataElements.staff.staffCount.dhis2Id,
    value: transformed.staffCount
  });

  // Facilities
  dataValues.push({
    dataElement: dataElements.facilities.classroomCount.dhis2Id,
    value: transformed.classroomCount
  });

  // Build final payload
  return {
    program: programs.schoolInspection.programId,
    programStage: programs.schoolInspection.programStageId,
    orgUnit: inspection.orgUnit,
    eventDate: inspection.eventDate.split('T')[0], // YYYY-MM-DD format
    status: 'COMPLETED',
    dataValues
  };
}
```

---

## 3. Transform Form Data

**File**: `src/services/sync/transformFormData.ts`

```typescript
import { InspectionFormData } from '../../shared/types/inspection';

interface TransformedFormData {
  textbooks: number;
  desks: number;
  chairs: number;
  testFieldNotes: string;
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  staffCount: number;
  classroomCount: number;
}

/**
 * Transform form data for DHIS2 submission
 * Converts string numbers to actual numbers
 */
export function transformFormData(formData: InspectionFormData): TransformedFormData {
  return {
    // Resources (already numbers)
    textbooks: formData.textbooks,
    desks: formData.desks,
    chairs: formData.chairs,
    testFieldNotes: formData.testFieldNotes,

    // Students (convert from string to number)
    totalStudents: parseInt(formData.totalStudents, 10),
    maleStudents: parseInt(formData.maleStudents, 10),
    femaleStudents: parseInt(formData.femaleStudents, 10),

    // Staff (convert from string to number)
    staffCount: parseInt(formData.staffCount, 10),

    // Facilities (convert from string to number)
    classroomCount: parseInt(formData.classroomCount, 10)
  };
}
```

---

## 4. Usage in Components

### Example: Sync Button Component

```typescript
import React from 'react';
import { Button, CircularLoader } from '@dhis2/ui';
import { useSyncInspection } from '../services/sync/useSyncInspection';
import { Inspection } from '../shared/types/inspection';

interface SyncButtonProps {
  inspection: Inspection;
  onSyncComplete?: () => void;
}

export function SyncButton({ inspection, onSyncComplete }: SyncButtonProps) {
  const { syncInspection, loading, error } = useSyncInspection();

  const handleSync = async () => {
    try {
      await syncInspection(inspection);
      onSyncComplete?.();
    } catch (err) {
      console.error('Sync failed:', err);
    }
  };

  if (inspection.syncStatus === 'synced') {
    return <span>✓ Synced</span>;
  }

  return (
    <div>
      <Button
        onClick={handleSync}
        disabled={loading}
        small
      >
        {loading ? <CircularLoader small /> : 'Sync to DHIS2'}
      </Button>
      {error && <span style={{ color: 'red' }}>Sync failed</span>}
    </div>
  );
}
```

### Example: Sync All Pending

```typescript
import React from 'react';
import { Button } from '@dhis2/ui';
import { useSyncInspection } from '../services/sync/useSyncInspection';

export function SyncAllButton() {
  const { syncAllPending, loading } = useSyncInspection();
  const [results, setResults] = React.useState<any>(null);

  const handleSyncAll = async () => {
    const res = await syncAllPending();
    setResults(res);
  };

  return (
    <div>
      <Button onClick={handleSyncAll} disabled={loading}>
        Sync All Pending Inspections
      </Button>

      {results && (
        <div>
          <p>Synced: {results.synced}</p>
          <p>Failed: {results.failed}</p>
          {results.errors.map((e: any) => (
            <p key={e.id} style={{ color: 'red' }}>
              Error syncing {e.id}: {e.error.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 5. Testing

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildEventPayload } from '../buildEventPayload';
import { Inspection } from '../../shared/types/inspection';

describe('buildEventPayload', () => {
  it('should build correct DHIS2 event payload', () => {
    const inspection: Inspection = {
      id: 'test-id',
      orgUnit: 'l9Z5RQXMYGu',
      orgUnitName: 'Test School',
      eventDate: '2025-01-15T10:00:00.000Z',
      status: 'completed',
      syncStatus: 'not_synced',
      formData: {
        textbooks: 50,
        desks: 40,
        chairs: 30,
        testFieldNotes: 'Good condition',
        totalStudents: '120',
        maleStudents: '60',
        femaleStudents: '60',
        staffCount: '8',
        classroomCount: '6'
      },
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T10:00:00.000Z'
    };

    const payload = buildEventPayload(inspection);

    expect(payload).toEqual({
      program: 'UxK2o06ScIe',
      programStage: 'eJiBjm9Rl7E',
      orgUnit: 'l9Z5RQXMYGu',
      eventDate: '2025-01-15',
      status: 'COMPLETED',
      dataValues: expect.arrayContaining([
        { dataElement: 'xiaOnejpgdY', value: 50 },
        { dataElement: 'mAtab30vU5g', value: 30 },
        { dataElement: 'EaWxWo27lm3', value: 120 },
        { dataElement: 'h4XENZX2UMf', value: 60 },
        { dataElement: 'DM707Od7el4', value: 60 },
        { dataElement: 'ooYtEgJUuRM', value: 8 },
        { dataElement: 'ya5SyA5hej4', value: 6 }
      ])
    });

    // Desks should NOT be included
    const deskDataValue = payload.dataValues.find(
      dv => dv.value === 40
    );
    expect(deskDataValue).toBeUndefined();
  });
});
```

---

## 6. Error Handling

### Retry Logic

```typescript
export async function syncWithRetry(
  inspection: Inspection,
  maxRetries = 3
): Promise<string> {
  const { syncInspection } = useSyncInspection();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await syncInspection(inspection);
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Network Detection

```typescript
export function useNetworkSync() {
  const { syncAllPending } = useSyncInspection();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncAllPending();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncAllPending]);

  return { isOnline };
}
```

---

## Summary

This implementation provides:

✅ Type-safe sync operations
✅ Automatic data transformations
✅ Error handling and retry logic
✅ Support for batch syncing
✅ Network status detection
✅ IndexedDB integration
✅ Unit testable code

For more details, see [dhis2-sync-guide.md](./dhis2-sync-guide.md).
