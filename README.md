# School Inspection App

An offline-first DHIS2 application for school inspectors using tablets. The app works completely offline and syncs data when internet is available.

## How to Run the App

1. Install dependencies:
   ```
   yarn install
   ```

2. Build the app:
   ```
   yarn build
   ```

3. Start the development server:
   ```
   yarn start
   ```

4. Open your browser and go to the link provided (usually [http://localhost:3000](http://localhost:3000))

5. Login with these credentials:
   - **Username**: `in5320`
   - **Password**: `P1@tform`

## Functionality

We chose to implement **Requirement 3** and **Requirement 5** from the project specification.

### Requirement 3: School Resource Count
Schools need to count their actual resources each year and update DHIS2 records. Our app lets inspectors quickly capture resource counts (books, chairs, teachers) and compare them with previous data to spot significant changes.

### Requirement 5: Offline Features  
School inspectors work in areas with poor internet connection. Our app works completely offline - you can create and edit inspections without internet, then sync everything to DHIS2 when connectivity returns.

## How this is implemented

Our app uses a **feature-based architecture** with React TypeScript:

- **`src/features/`** - Self-contained modules (`inspection/`, `summary/`) with their own components and logic
- **`src/shared/`** - Concerns overlapping with more than one component. Including database layer, sync services, and React hooks
- **IndexedDB wrapper** (`shared/db/indexedDB.ts`) - Handles offline data persistence with automatic schema versioning
- **Sync service** (`shared/services/syncService.ts`) - Maps local data to DHIS2's Tracker API and handles push/pull operations

The offline-first approach stores all inspections locally in IndexedDB, then syncs to DHIS2 when online using the new Tracker API with proper data element mapping.

## Future work/missing functionality
In the future, being able to capture more data would improve functionality. Additionally, we would like to implement React cross-platform solutions (React Native) to create a dedicated mobile app, which would be more suitable for tablet based inspections in the field.

### Quick Start for Developers

- Run `yarn start`, log in (`in5320 / P1@tform`), and create inspections offline; they are stored in IndexedDB.
- Hit the sync badge to push unsynced locals to DHIS2; the app then automatically pulls remote events and stores them locally (`source: server`), so the home lists show both your and others’ synced inspections. You can also tap “Refresh from server” to pull without pushing.
- See [docs/sync-implementation-example.md](./docs/sync-implementation-example.md) for code details, and `scripts/sync-check.js` for a console helper to compare local vs remote.

## On our DHIS2 instance

**Deployed App**: [https://research.im.dhis2.org/in5320g16/apps/in5320-group-16](https://research.im.dhis2.org/in5320g16/apps/in5320-group-16)

Login with these credentials:
- **Username**: `in5320`
- **Password**: `P1@tform`

## Technical Details

More detailed documentation is available in the [`docs/`](./docs/) folder for developers who want to understand the technical implementation.
