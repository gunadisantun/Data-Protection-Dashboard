# RoPA Flow Release

## Scope

Route: `/ropa/data-flow`, linked from RoPA Registry.
Explicit user-declared connections only; this is not an infrastructure scanner or a verified legal assessment.
Asset types: source, system, storage and recipient. Existing RoPA activities remain the source of activity data.
Recorded upstream/downstream relationships are not proof that every data category traverses the entire path.
Data-category filtering uses explicitly labelled links, not inferred transfers.

## Deployment

1. Configure a unique production `BETTER_AUTH_SECRET` (at least 32 characters).
2. Run the existing `npm run db:push` migration runner. This release needs migrations 0018-0020 if production is on 0017. Do not run reset/seed commands against production.
3. Deploy the tested branch through the existing Vercel Git integration.
4. Confirm login, online demo, RoPA Registry and `/ropa/data-flow` at the production domain.
5. Publish desktop installers separately. `desktop:prepare` is not an installer publication.

New flow tables enable RLS without public policies. Queries use the existing trusted server database connection and enforce unit/demo boundaries on both link endpoints.
Deleting a user preserves ordinary flow records; deleting a demo session removes its temporary flow records.

## QA

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run desktop:prepare`.
- `scripts/smoke-ropa-flow.mjs` uses a local isolated account via `FLOW_QA_USER`, `FLOW_QA_PASSWORD`, and optionally `FLOW_QA_URL`, `PLAYWRIGHT_MODULE`, `QA_BROWSER_CHANNEL`. It refuses non-local hosts.
- `node scripts/smoke-desktop.mjs node_modules/electron/dist/electron.exe . --self-assessment` checks offline setup/auth/persistence and declaration-only finalization/PDF.

## Current Limits

- Per scoped graph: 500 activities, 500 assets, 2,000 links; truncation is explicitly reported.
- Canvas dragging changes the current layout, not persisted shared positions.
- Relationships can be created/removed; versioned relationship editing and approval remain a future increment.
- Activity storage text remains visible as a reference until users explicitly connect catalog assets.
