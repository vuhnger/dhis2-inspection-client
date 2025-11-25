This project was bootstrapped with [DHIS2 Application Platform](https://github.com/dhis2/app-platform).

## Project Focus

We are building an **offline-first** DHIS2 web application aimed at tablet usage by school inspectors. All inspection workflows must function without connectivity; when online, the app will synchronise cached inspections and pull the latest DHIS2 events so multiple inspectors see each other’s work.

## 📚 Documentation

All technical documentation is in the [`docs/`](./docs/) folder:

- **[DHIS2 Sync Guide](./docs/dhis2-sync-guide.md)** - Complete guide for implementing DHIS2 sync
- **[Sync Implementation Example](./docs/sync-implementation-example.md)** - Working code examples
- **[Data Mappings](./docs/data-mappings.json)** - JSON configuration for local↔DHIS2 mapping
- **[Architecture](./docs/architecture.md)** - App architecture overview
- **[All Docs](./docs/README.md)** - Full documentation index

### Quick Start for Developers

- Run `yarn start`, log in (`in5320 / P1@tform`), and create inspections offline; they are stored in IndexedDB.
- Hit the sync badge to push unsynced locals to DHIS2; the app then automatically pulls remote events and stores them locally (`source: server`), so the home lists show both your and others’ synced inspections. You can also tap “Refresh from server” to pull without pushing.
- See [docs/sync-implementation-example.md](./docs/sync-implementation-example.md) for code details, and `scripts/sync-check.js` for a console helper to compare local vs remote.

## On our DHIS2 instance

**Deployed App**: [https://research.im.dhis2.org/in5320g16/apps/in5320-group-16](https://research.im.dhis2.org/in5320g16/apps/in5320-group-16)

Login with these credentials:
- **Username**: `in5320`
- **Password**: `P1@tform`

## DHIS2 Instance Credentials

**Development/Testing Instance**: `https://research.im.dhis2.org/in5320g16/`

**API Credentials:**
- **Username**: `in5320`
- **Password**: `P1@tform`

These credentials are used for:
- Logging into the DHIS2 instance during development
- API requests to create/update inspection events
- Fetching organization units (schools) for the inspection form

**Note**: The DHIS2 App Platform automatically handles authentication when you run `yarn start` and log in. All API calls made through `useDataEngine()` will use your logged-in session.

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

**Login with these credentials:**
- **Username**: `in5320`
- **Password**: `P1@tform`

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner and runs all available tests found in `/src`.<br />

See the section about [running tests](https://platform.dhis2.nu/#/scripts/test) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
A deployable `.zip` file can be found in `build/bundle`!

See the section about [building](https://platform.dhis2.nu/#/scripts/build) for more information.

### `yarn deploy`

Deploys the built app in the `build` folder to a running DHIS2 instance.<br />
This command will prompt you to enter a server URL as well as the username and password of a DHIS2 user with the App Management authority.<br/>
You must run `yarn build` before running `yarn deploy`.<br />

See the section about [deploying](https://platform.dhis2.nu/#/scripts/deploy) for more information.

## Learn More

You can learn more about the platform in the [DHIS2 Application Platform Documentation](https://platform.dhis2.nu/).

You can learn more about the runtime in the [DHIS2 Application Runtime Documentation](https://runtime.dhis2.nu/).

To learn React, check out the [React documentation](https://reactjs.org/).

## Selected requirements 

We selected requirement 3 (school resource count) and requirement 5 (offline features). All design and development decisions must support inspectors who operate with no connectivity during school visits.
