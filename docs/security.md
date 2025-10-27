## Security & Privacy Guidelines – Group 16 DHIS2 App

This document summarises how we protect inspection data within the DHIS2 ecosystem. Apply these practices during design, development, and deployment. When in doubt, prefer the most restrictive option that still allows inspectors to work effectively. The application is offline-first, so client-side storage is unavoidable—treat cached data with the same care as server data.

### 1. Threat Model Overview

- **Authentication & transport**: Delegated to DHIS2. Users authenticate against the host instance; all requests go through HTTPS enforced by the platform.
- **Primary risks**: Data leakage on shared devices, unauthorised event edits, stale/offline data overwriting newer server data, and exposing sensitive findings through logs or analytics.
- **Non-goals**: We do not manage user passwords, nor do we store long-lived tokens on the client.

### 2. Data Classification

- **Inspection events**: Treat as *confidential*. They may include observations about staff performance or resource shortages.
- **Resource recounts**: *Internal* but sensitive. Aggregated metrics (ratios, trends) should avoid exposing personally identifiable information.
- **Offline cache**: Mirrors confidential data. Assume devices can be lost; limit what we persist.

### 3. Access Control

- Honour DHIS2 user authorities. Never hard-code org unit IDs; request the current user’s accessible hierarchy via `useConfig`.
- Before mutating events or data store entries, confirm the user has `F_EVENT_*` or relevant custom authorities. Display a permission error if missing.
- For UI, hide navigation to features the user cannot access. Do not rely solely on front-end checks—server will enforce permissions, but preventing accidental attempts improves UX.

### 4. Data Handling & Storage

- Use the App Runtime data engine for all API calls. It attaches auth headers securely and keeps tokens refreshed.
- Encrypt-at-rest is handled by DHIS2 servers. On the client, prefer IndexedDB over `localStorage`; never persist secrets or credentials.
- Limit offline persistence to the minimum fields needed to resume work. Use redaction when storing notes (e.g., drop personally identifiable comments).
- Before an inspector travels, provide a “pre-sync” flow so the device stores the latest data required for comparisons without needing live connectivity.
- When storing photos (new school registration), convert to compressed formats and clear them from memory once uploaded.

### 5. Offline & Sync Safety Nets

- Queue mutations via `useDataMutation` only. Do not build custom fetch queues.
- Stamp each offline record with a `lastUpdated` timestamp (UTC) and compare against the server version on sync. If the server is newer, prompt the user to resolve the conflict rather than overwriting silently.
- Provide a “clear local cache” command in the Sync Centre so inspectors can purge data before handing devices to others.
- Detect extended offline periods and surface a reminder that cached data might be out of date, without blocking ongoing work.

### 6. Device & Session Hygiene

- Advise inspectors (in user training materials) to sign out of DHIS2 when a device leaves their possession.
- Keep sessions short-lived: respect DHIS2 session expiry and handle 401 responses by redirecting to the login screen.
- Store minimal user preferences (e.g., last org unit) and never store credentials.
- Ensure camera/file inputs request permission only when needed and revoke object URLs after use to avoid lingering sensitive images in memory.

### 7. Logging & Observability

- Avoid logging raw inspection payloads in the browser console. Use structured logs with event IDs only during development; strip debug logging from production builds.
- Surface sync problems to the user with meaningful messages, but exclude sensitive details (e.g., do not show teacher names in error snackbars).
- Rely on DHIS2 server logs for audit trails. When we create/update events, include descriptive `comment` fields so administrators can track why changes were performed.

### 8. Third-Party Dependencies

- Vet all dependencies for active maintenance and acceptable licence. Prefer DHIS2-provided libraries and first-party React ecosystem packages.
- Keep dependencies patched. Run `yarn audit` before releases and address high/critical issues immediately.
- Do not add analytics trackers or external scripts without an explicit ADR and course supervisor approval.

### 9. Development Practices

- Never commit real DHIS2 credentials, URLs, or API keys. Use `.env.local` (ignored) for developer-specific configuration.
- Use mock data during local development; anonymise any real datasets used for testing.
- Run security-focused tests (e.g., verifying offline cache redaction) before tagging a release candidate.

Following these guidelines ensures we protect sensitive school inspection data while still delivering offline-first functionality required by the Edutopia case.
