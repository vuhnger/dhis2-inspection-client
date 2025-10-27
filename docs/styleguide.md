# Front-End Style Guide – Group 16

This style guide complements `docs/architecture.md` by translating architectural decisions into day-to-day coding conventions. Follow it for all new code and when refactoring existing modules. Everything is offline-first: never assume a live network call will succeed while the inspector is working.

## 1. General Principles

- Prioritise readability and maintainability over cleverness. Small, focused components and hooks are easier to review and test.
- Keep modules pure: UI components render data; domain logic lives in services or hooks.
- Write TypeScript for all new files. When touching legacy `.jsx`, migrate the file to `.tsx` and introduce proper types as part of the change.
- Fail fast: validate props, parameters, and user input as close to the source as possible.
- Design features to operate entirely on cached data; defer network-dependent enhancements to post-sync flows.

## 2. Project Structure Conventions

- Respect the structure described in the architecture document (`src/app`, `src/features`, `src/shared`). Never place code at `src/` root.
- One React component per file, named `ComponentName.tsx`. Co-locate tests (`ComponentName.test.tsx`) and styles (`ComponentName.module.css`) next to the component.
- Prefer feature-level barrel files (`index.ts`) only for public exports; avoid deep nested re-exports that hide dependencies.

## 3. Naming & Syntax

- Use **PascalCase** for components, **camelCase** for variables/functions, and **SCREAMING_SNAKE_CASE** for constants.
- Name hooks with a `use` prefix and ensure they follow React’s hook rules.
- Keep JSX expressive: extract complex conditional rendering or mapping logic into small helper components/functions.
- Destructure props at the top of functional components; avoid `props.` reads within JSX.

## 4. Styling & Layout

- Use CSS Modules (`.module.css`). Scope class names to the component (e.g., `.container`, `.metricValue`). Do not use global CSS.
- For layout, leverage DHIS2 UI primitives (`Box`, `Stack`, `Table`, etc.) before introducing custom flexbox utilities.
- Keep colour usage aligned with DHIS2 palettes; custom colours require design rationale recorded in the PR.
- Responsive adjustments should be implemented with CSS media queries inside the module or via DHIS2 layout props.

## 5. Data Fetching & State

- Encapsulate DHIS2 API access inside custom hooks inside `src/shared/hooks/` or feature folders (e.g., `useResourceRecount.ts`). Expose typed return values.
- Every hook must handle an offline cache miss gracefully (e.g., return sensible defaults or placeholders instead of throwing).
- Use `useDataQuery` for reads, `useDataMutation` for writes. Always handle loading, error, and offline-queued states explicitly in the UI.
- Derive view state from query results whenever possible. Use `useState` for transient UI concerns only (expanded panels, modal visibility, etc.).
- For cross-feature state (e.g., connectivity), create a provider under `src/app/providers`.
- Never block the UI on a network call; if fresh data is needed, surface the stale cached version with a “Sync when online” affordance.

## 6. Forms & Validation

- Implement forms using `react-hook-form`. Define a `zod` schema (or equivalent) for validation; never rely solely on HTML attributes.
- Display validation feedback inline, close to the triggering field. Disable submit buttons while the form is invalid or awaiting sync.
- Persist draft form state offline when it represents significant work (e.g., inspection capture). Provide users with an explicit “Clear draft” action.
- Form submission must enqueue mutations and present clear status for “awaiting sync” so inspectors know their work is safe offline.

## 7. Accessibility & UX

- All interactive elements must be reachable via keyboard and include discernible labels.
- Use semantic HTML first (`<button>`, `<label>`, `<table>`). When using custom components, ensure ARIA roles/attributes mirror the semantic expectation.
- Provide meaningful empty/loading states instead of blank screens. Communicate connectivity changes via toast + persistent banner.
- Write copy in plain language suited to varying digital literacy levels; avoid jargon.

## 8. Testing Standards

- Use React Testing Library for component tests. Focus on user-facing behaviour, not implementation details.
- For hooks and pure utilities, add dedicated unit tests under the same folder (`hookName.test.ts`).
- Mock DHIS2 data engine responses via the runtime testing helpers; avoid `jest.spyOn(window.fetch)`.
- Every bug fix needs a regression test covering the root cause.

## 9. Tooling & Formatting

- Run `yarn test` and `yarn lint` (once configured) before opening a PR. The CI pipeline will enforce both.
- Apply Prettier formatting with the shared configuration. Do not disable lint rules without an ADR or reviewer agreement.
- Keep imports ordered: external libraries first, absolute app imports second, relative imports last. Use eslint-plugin-import to enforce once added.

## 10. Documentation Expectations

- Update `docs/adr/` when the change represents a notable architectural decision.
- Provide storybooks or Markdown usage notes for reusable components if their API is non-trivial.
- Inline comments are reserved for explaining *why* (not *what*). Keep them short and tied to logic that is not obvious from the code.

Following this guide keeps the codebase approachable for both human developers and code agents, while ensuring the app meets the usability and reliability expectations of Edutopia’s school inspectors.
