# Create Inspection Feature

## Overview

The Create Inspection feature allows users to schedule new inspections directly from the home page. This is accessible via the floating action button ("+") at the bottom right of the screen.

## User Flow

1. User clicks the "+" floating action button on the home page
2. A modal dialog appears with a form to create a new inspection
3. User fills in the required fields:
   - **School Name** (required) - The name of the school to inspect
   - **Inspection Date** (required) - The date of the inspection (cannot be in the past)
   - **Start Time** (required, defaults to 16:00) - When the inspection starts
   - **End Time** (required, defaults to 17:30) - When the inspection ends
4. Form validation ensures:
   - All required fields are filled
   - Date is not in the past
   - End time is after start time
5. User clicks "Create Inspection"
6. Inspection is saved to local IndexedDB with:
   - Status: `scheduled`
   - Sync status: `not_synced`
   - Empty form data (to be filled during inspection)
7. Modal closes and home page refreshes to show the new inspection

## Component Structure

### CreateInspectionModal

Location: `src/features/inspection/components/CreateInspectionModal.tsx`

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal is closed
- `onSuccess?: () => void` - Optional callback after successful creation

**Features:**
- Form validation with error messages
- Loading state during save operation
- Auto-reset form when modal closes
- Internationalized labels (i18n support)

## Database Storage

New inspections are created with the following structure:

```typescript
{
    id: 'generated-uuid',
    orgUnit: 'local-org-unit',  // Default value
    orgUnitName: schoolName,     // From form
    eventDate: 'YYYY-MM-DDTHH:MM:SS',  // Combined date + start time
    scheduledStartTime: '16:00', // From form
    scheduledEndTime: '17:30',   // From form
    status: 'scheduled',
    syncStatus: 'not_synced',
    formData: {
        // All fields initialized to empty/zero
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
    createdAt: 'ISO timestamp',
    updatedAt: 'ISO timestamp',
}
```

## Validation Rules

1. **School Name**
   - Required
   - Cannot be empty or whitespace only
   - Error: "School name is required"

2. **Inspection Date**
   - Required
   - Cannot be in the past
   - Error: "Inspection date is required" or "Inspection date cannot be in the past"

3. **Start Time**
   - Required
   - Error: "Start time is required"

4. **End Time**
   - Required
   - Must be after start time
   - Error: "End time is required" or "End time must be after start time"

## Integration with Home Page

The modal is integrated into [InspectionHomePage.tsx](src/features/inspection/InspectionHomePage.tsx):

```tsx
// State to control modal
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

// Open modal on FAB click
<button onClick={() => setIsCreateModalOpen(true)}>+</button>

// Render modal
<CreateInspectionModal
    isOpen={isCreateModalOpen}
    onClose={() => setIsCreateModalOpen(false)}
    onSuccess={() => refetchInspections()}
/>
```

## Accessibility

- Modal is accessible with keyboard navigation
- All form fields have proper labels
- Error messages are associated with their fields
- Focus management when modal opens/closes
- ARIA labels on buttons

## Future Enhancements

1. **Organization Unit Selection** - Allow users to select from a list of schools instead of free text
2. **Template Selection** - Pre-fill form data based on inspection templates
3. **Recurring Inspections** - Create multiple inspections at once
4. **Inspector Assignment** - Assign specific inspectors to the inspection
5. **Custom Time Slots** - Define custom time ranges or all-day inspections
6. **Notes Field** - Add optional notes/description when creating inspection
7. **Validation with DHIS2** - Validate school names against DHIS2 org units

## Testing

To test the feature:

1. Run the app: `npm start`
2. Click the "+" button in the bottom right
3. Fill out the form and click "Create Inspection"
4. Verify the new inspection appears in the "Upcoming inspections" section
5. Click the inspection card to verify it opens the detail page
6. Check that sync status shows "Not synced"

## Error Handling

The modal handles errors gracefully:

- **Validation errors** - Displayed inline with the affected field
- **Save errors** - Displayed in a notice box at the top of the modal
- **Network errors** - Caught and displayed to user (for future sync operations)

All errors are logged to console for debugging.
