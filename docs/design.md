# Design Documentation

## Target Devices

We are designing for a tablet device with a viewport of:

- Width: 768px
- Height: 1024px

However, the app is designed **mobile-first** and scales responsively to work on smaller mobile devices (320px+) and larger desktop screens.

## Design System

The app uses the **DHIS2 Mobile Design System** to provide a native mobile app experience within a web application.

### Colors

All colors are sourced from the official DHIS2 design system (`@dhis2/ui-constants`):

**Primary Colors:**
- Blue (Information): `#2196f3` (blue500)
- Teal (Active/Selected): `#00897b` (teal500)
- Green (Success): `#43a047` (green500)

**Neutral Colors:**
- Grey scale: `grey050` to `grey900`
- White: `#ffffff`

**Semantic Colors:**
- Error/Danger: Red palette
- Warning: Yellow palette

### Spacing

The app follows the **8-point grid system** from DHIS2:
- 4px, 8px, 12px, 16px, 24px, 32px, 48px

These are available as CSS custom properties:
- `--dhis2-space-4` through `--dhis2-space-48`

### Typography

Following DHIS2 mobile standards:
- Body text: 14px minimum (accessibility requirement)
- Headings: 16-20px
- Line height: 1.2 for headings, 1.4 for body text
- Font weight: 400 (regular), 500 (medium), 600 (semi-bold)

## Component Patterns

### Mobile-First Layout

Components are designed mobile-first with these patterns:

1. **Card-based UI**: White cards on light grey background
2. **Fixed bottom actions**: Primary actions fixed at bottom on mobile
3. **Touch-friendly targets**: Minimum 48px height for interactive elements
4. **Grid layouts**: Responsive grids that adapt from 2 columns (mobile) to 4 columns (desktop)

### Color Usage

- **Active states**: Teal background with darker teal text
- **Completed states**: Green background with darker green text
- **Borders**: Grey-300 for neutral, colored borders for states
- **Shadows**: Subtle elevation (0 1px 3px rgba(33, 41, 52, 0.08))

### Transitions

- Standard duration: 150ms
- Easing: `ease` for most transitions
- Touch feedback: Scale transform (0.98) on active press

## Responsive Breakpoints

- **Mobile**: < 640px (default)
- **Tablet/Desktop**: ≥ 641px
  - Max width: 640px centered
  - Relative positioning for actions
  - 4-column layouts where applicable

## Implementation Notes

All design tokens are defined in component CSS modules using CSS custom properties. This ensures consistency and makes it easy to update the design system globally.

Example usage:
```css
.button {
  background: var(--dhis2-teal-500);
  padding: var(--dhis2-space-12);
  color: var(--dhis2-white);
}
```
