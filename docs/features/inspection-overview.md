# Inspection Overview Component

## Overview

The `InspectionOverview` component provides a comprehensive inspection form for school inspectors to capture data across multiple categories. It features a mobile-first design matching the DHIS2 mobile UI aesthetics.

**Location**: `src/features/inspection/overview/InspectionOverview.tsx`
**Route**: `/inspection-overview`

## Features

### Multi-Category Form

The component organizes inspection data into four categories:

1. **Resources**: Books, desks, and other educational materials
2. **Staff**: Teacher and staff counts
3. **Students**: Student enrollment and gender distribution
4. **Facilities**: Classrooms and infrastructure

### Category Selection

- 2x2 grid layout on mobile (< 640px)
- 4-column horizontal layout on tablet/desktop (≥ 641px)
- Visual feedback:
  - **Active category**: Teal background (`teal-100`)
  - **Completed category**: Green background (`green-100`) with reduced opacity
  - **Incomplete category**: White background with grey border

### Dynamic Form Rendering

The form displays only the fields for the currently selected category. This prevents overwhelming the user and maintains focus on one section at a time.

### Validation

- **Field-level validation**: All fields are required and must be non-negative numbers
- **Category-level validation**: Checks that all fields in a category are filled and valid
- **Cross-category validation**: Submit button is only enabled when ALL categories are complete
- **Custom validation rules**:
  - Students category: Total students must equal male + female students

### Submit Behavior

- **Fixed bottom bar** on mobile for easy access
- **Disabled state** until all categories are validated
- **Full-width button** (max 480px) for touch-friendly interaction
- Validates all categories on submit and shows appropriate feedback

## Technical Implementation

### State Management

```typescript
type FormState = {
    numberOfBooks: string
    numberOfDesks: string
    totalStudents: string
    maleStudents: string
    femaleStudents: string
    staffCount: string
    classroomCount: string
}
```

### Category Field Mapping

The component uses a `CATEGORY_FIELDS` constant to dynamically determine which fields belong to each category:

```typescript
const CATEGORY_FIELDS: Record<Category, Array<keyof FormState>> = {
    resources: ['numberOfBooks', 'numberOfDesks'],
    students: ['totalStudents', 'maleStudents', 'femaleStudents'],
    staff: ['staffCount'],
    facilities: ['classroomCount'],
}
```

This makes it easy to add new fields - simply add them to the `FormState` type and update the `CATEGORY_FIELDS` mapping.

### Validation Functions

- `isCategoryComplete()`: Checks if all fields in a category are filled and valid
- `validateCategory()`: Returns validation errors for a specific category
- `validateAll()`: Validates all categories and returns combined errors

### Styling

The component uses DHIS2 design tokens defined in `InspectionOverview.module.css`:

- Colors from official DHIS2 palette
- 8-point grid spacing system
- Mobile-first responsive design
- CSS custom properties for consistency

## Future Enhancements

1. **Data Persistence**: Connect to DHIS2 DataStore or local storage
2. **Offline Support**: Cache form data and sync when online
3. **Additional Fields**: Expand each category with more detailed fields
4. **File Uploads**: Add photo capture for facility conditions
5. **Comparison View**: Show previous inspection data for context
6. **Analytics**: Display trends and compliance indicators

## Dependencies

- `@dhis2/ui`: Button, InputField, NoticeBox components
- `@dhis2/d2-i18n`: Internationalization
- React 18: Hooks and functional components

## Testing Considerations

- Test category switching preserves form data
- Verify validation triggers correctly
- Check completed state visual indicators
- Ensure submit button enables/disables properly
- Test responsive breakpoints
- Verify accessibility (keyboard navigation, screen readers)

## Related Documentation

- [Design System](../design.md)
- [Architecture Overview](../architecture.md)
- [Style Guide](../styleguide.md)
