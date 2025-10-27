# Architecture Overview – Group 16 DHIS2 App

This document defines the intended solution architecture for the Group 16 school inspection app. Use it as the primary reference before introducing new dependencies, creating components, or modifying app behaviour. Always cross-check with the rest of the documentation under `docs/` to keep decisions aligned.

## 1. Scope & Requirements Alignment

- **Platform**: DHIS2 application running inside the App Platform using `@dhis2/app-runtime`.
- **Mode**: Offline-first progressive web app designed for tablet usage. Every critical workflow (inspection capture, resource recount review, dashboard summaries) must run without live connectivity; online mode only enhances the experience with fresher comparisons and sync.
- **Mandatory workflow**: Capture inspection event data for the DHIS2 School Inspection program with validation and immediate feedback.
- **Selected additional requirements**:  
  1. *Requirement 3 – School resource count*: fast data capture, comparison against previous values, highlight significant changes.  
  2. *Requirement 5 – Offline features*: allow end-to-end inspection work when the device is offline, then sync reliably.
- **Assumptions from the case**:
  - Inspectors operate on tablets/desktops with flaky connectivity.
  - DHIS2 already holds org unit, census, and inspection event metadata that the app will synchronise when network is available.
  - We must minimise the cognitive load for inspectors with varying digital literacy.
  - Inspectors typically lose connectivity during on-site inspections, so all comparisons must rely on cached data until a sync occurs.
  - The primary runtime environment is a tablet-like device running the app in fullscreen (installable PWA/“schema app” experience).

## 2. System Context

```
┌──────────────────────────────┐
│ DHIS2 Platform               │
│  • Authentication / user ctx │
│  • Metadata (org units, etc) │
│  • Event & DataStore APIs    │
└────────────┬─────────────────┘
             │ HTTPS / DHIS2 App Runtime
┌────────────▼─────────────────┐
│ Group 16 Inspection App      │
│  • App shell & routing       │
│  • Data layer (queries/muts) │
│  • Offline cache & sync      │
│  • Feature modules           │
└────────────┬─────────────────┘
             │
┌────────────▼─────────────────┐
│ Device capabilities          │
│  • IndexedDB (offline cache) │
│  • Local storage (prefs)     │
│  • Camera / file inputs      │
│  • Sync queue                │
└──────────────────────────────┘
```

All network traffic runs through the DHIS2 App Runtime data engine. Never call raw `fetch` against DHIS2 APIs; wrap read/write operations with runtime hooks to benefit from caching, offline queueing, and consistent error handling.

## 3. High-Level Application Structure

```
src/
  app/            → App shell, routes, layout, global providers
  features/
    inspection/   → Compulsory inspection capture workflow
    resources/    → Requirement 3 resource recount module
    offline/      → Sync centre, connectivity banner, conflict UI
    analytics/    → Lightweight dashboard & comparisons
  shared/
    components/   → Reusable UI (inputs, cards, tables)
    hooks/        → Data/query hooks, form helpers
    utils/        → Pure utilities (calculations, mappers)
    services/     → Domain services (e.g., change detection)
  test/           → Integration helpers & fixtures
```

- **Routing**: Use declarative routing via the App Shell (`HashRouter`). Each route loads a feature module lazily to keep the bundle small.
- **State**: Prefer component state + custom hooks. Use React Context sparingly (e.g., connectivity state, user orgUnit scope).
- **Forms**: Back complex forms with `react-hook-form` (planned dependency) to get validation, dirty state, and offline persistence hooks.

## 4. Data & Domain Model

- **Inspection events**: Map form sections to DHIS2 program stages. Use typed field descriptors to drive UI, validation, and payload generation that works entirely offline.
- **Resource inventory**: Store the latest recount in a custom DHIS2 DataStore namespace (`school-resource-recounts`) keyed by orgUnit + period. Cache the entire history locally so inspectors can review previous counts offline and continue comparisons without a connection.
- **Reference data**: Pull org units, option sets, and minimum-standard thresholds during an online session and cache them in IndexedDB for future offline use.
- **Change detection**: Provide utilities that compute ratios (seat-to-learner, textbook-to-learner, etc.) using whatever data is available locally. When newer server data arrives, reconcile and refresh highlights without blocking the user.

## 5. Offline & Synchronisation Strategy

- **Connectivity state**: Use the App Runtime `useOnlineStatus` hook (or a custom equivalent) to broadcast online/offline state to features.
- **Caching**: Enable the runtime offline cache (`d2.config.js → offline: { enabled: true }`). Use IndexedDB for query results; mirror critical user input in `localforage` if forms must survive full page reloads. The app must assume cached data is the only data available during an inspection and degrade gracefully if caches are empty.
- **Queueing writes**: Mutations performed via `useDataMutation` are queued automatically. Provide UX around pending items (e.g., toast + “Sync Centre” list).
- **Conflict handling**: When a mutation fails after reconnecting, surface the error with context (orgUnit, field, current server value) and let the user retry or discard.
- **Background sync**: On reconnect, trigger a refresh of inspection events, resource recount comparisons, and analytics to avoid showing stale ratios while preserving in-progress offline edits until they are safely uploaded.

## 6. Cross-Cutting Concerns

- **Validation**: Build shared validators (numeric ranges, ratio limits, required fields) so both the inspection and resource modules stay consistent. Validation runs client-side and server responses are handled centrally.
- **Error boundaries**: Wrap feature routes with an error boundary component to keep the app operational if one module fails.
- **Internationalisation**: Use DHIS2 i18n. All user-facing strings belong in `i18n/en.pot`. Keep copy simple for mixed literacy levels.
- **Accessibility**: Follow WAI-ARIA guidelines. Use keyboard-accessible components, especially for offline/online banners and data tables.

## 7. Technology Choices

- **Language**: TypeScript. The scaffolding currently uses `.jsx`; migrate files to `.tsx` when touched and enable `tsconfig.json` + updated `d2.config.js` entry points as part of the ongoing modernization.
- **UI**: React 18 with DHIS2 UI components (`@dhis2/ui`). Use CSS Modules for local styles (`Component.module.css`) to avoid leakage.
- **Data layer**: `@dhis2/app-runtime` hooks (`useDataQuery`, `useDataMutation`, `useConfig`). Compose feature-specific hooks to isolate query details.
- **Utilities**: Use `date-fns` for date arithmetic when necessary; favour native APIs otherwise to keep bundle size lean.
- **Mapping (optional)**: If we later visualise resource hotspots, prefer lightweight libraries such as `react-leaflet` and load them lazily.

## 8. Deployment & Environments

- **Configuration**: Keep environment-specific settings (e.g., DHIS2 base URL in development) in `.env` consumed by the app runtime.
- **Builds**: `yarn build` produces the bundle; never hand-edit `build/`.
- **Versioning**: Increment app version and document architectural changes in `docs/changelog.md` (to be created) when the data model or offline strategy evolves.

## 9. Decision Log Expectations

Material architectural decisions (new dependencies, API usage changes, offline behaviour updates) must be documented in a short ADR under `docs/adr/`. Include problem statement, considered options, final decision, and consequences. This keeps alignment with the platform ecosystem rationale required by the course.

By adhering to this architecture, developers ensure the app remains coherent, offline-resilient, and tailored to the Edutopia school inspection workflow.
