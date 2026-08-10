# PulseOps implementation progress

Last updated: 2026-08-10

## Scope

This build implements the production-oriented V1 in
`pulseops-technical-plan.md`. Mutation-heavy V1.1/V2 work stays outside the
first release; typed action, authorization, planning, and executor boundaries
are present so those capabilities can be added safely.

## Milestones

- [x] Read and map the technical plan.
- [x] Verify GitHub CLI availability and authentication.
- [x] Create the local Git repository and public `Nielk74/pulseops` repository.
- [x] Generate and persist the PulseOps design system.
- [x] Scaffold the Next.js, React, TypeScript, and Tailwind application.
- [x] Add SQLite persistence, the 20-table Drizzle schema, migration, and seed flow.
- [x] Add independently selectable live/mock connectors for every source.
- [x] Add polling, a serialized write queue, source freshness, and SSE updates.
- [x] Add median/MAD anomaly detection, correlation scoring, and incidents.
- [x] Add the overview, builds, tests, timeline, services, fleet, commits,
      incidents, actions, and settings experiences.
- [x] Add typed action plans, allow-listing, audit history, and a role boundary.
- [x] Consolidate fleet inventory, machine detail, action planning, and audit
      history into one selectable-card workspace.
- [x] Add true multi-machine selection, focused detail, and bulk action planning.
- [x] Standardize entity drill-downs as accessible, URL-backed detail modals and
      place Fleet actions beside the machine grid.
- [x] Add unit/browser tests, CI, Docker packaging, and developer documentation.
- [x] Validate lint, types, tests, migration, seed, production build, and audit.
- [x] Push the implementation and open a draft pull request.

## Source mocking matrix

Each source can run live or mocked independently. If no mock flags are supplied,
development defaults to all mocked and production defaults to all live.

| Source | Environment switch | Live connector | Mock connector | Status |
|---|---|---|---|---|
| All sources | `MOCK_ALL` | N/A | Enables every mock | Validated |
| TeamCity builds, tests, artifacts, and agents | `MOCK_TEAMCITY` | TeamCity REST | Deterministic CI history | Validated |
| Deployment Info API | `MOCK_DEPLOYMENTS` | Generic REST | Deployment/change events | Validated |
| Services Status API | `MOCK_SERVICES` | Generic REST | Health and latency samples | Validated |
| Local Git repository | `MOCK_GIT` | Native Git argument arrays | Commits and file changes | Validated |
| Oracle probes | `MOCK_ORACLE` | `oracledb` probes | Probe health and latency | Validated |
| Windows machine inventory | `MOCK_MACHINES` | Inventory executor REST | Machines, packages, and drift | Validated |

## Verified baseline

- Six connectors completed with zero failures.
- Seed data: 14 builds, 56 test executions, 4 services, 5 machines, and 114
  normalized events.
- Designed anomalies: slow `UFT Pricing` correlated to `PricingApi`; suspiciously
  fast `UFT Login` correlated to test discovery.
- Seven unit tests passed across anomaly statistics, detection, and correlation.
- Eleven Playwright checks passed across desktop and 390 px mobile; one
  desktop duplicate of the mobile-only overflow check is intentionally skipped.
- Production build, TypeScript, ESLint, migration, data integrity check, and
  production dependency audit passed. Production dependency findings: zero.

## Decisions

- The first release follows the plan's Suggested V1 scope.
- Next.js App Router is the application shell; Tremor Raw-style checked-in
  primitives, Recharts, and TanStack Table accelerate the operations UI without
  constraining domain-specific workflows.
- SQLite is the only application database and runs with WAL mode, foreign keys,
  a busy timeout, and a single serialized writer.
- Connectors return domain-shaped snapshots, making their live and mock
  implementations interchangeable.
- Destructive machine operations are outside V1. Actions are allow-listed,
  plan-first, role-checked, and audited; only the diagnostic refresh is executable.
- The UI uses a responsive, dark, high-contrast operations design system with
  semantic labels, keyboard focus, reduced motion, and non-color status cues.
- Fleet is the canonical machine workspace. Legacy `/actions` and `/fleet/:id`
  URLs preserve bookmarks by redirecting into the selected in-page context.

## Work log

### 2026-08-10

- Confirmed `gh` authentication as `Nielk74` and created the public repository.
- Created branch `agent/implement-pulseops` from the documented baseline.
- Persisted the generated design system under `design-system/pulseops/`.
- Implemented the Drizzle schema and migration, connector contracts, live/mock
  adapters, scheduler, write queue, freshness tracking, anomaly detection,
  correlations, incidents, actions, APIs, and application screens.
- Added production packaging, health checks, CI, security/architecture guidance,
  contribution guidance, and an overview screenshot.
- Corrected test discovery, TanStack Table v9 feature registration, and the
  browser-test origin boundary discovered during the final validation pass.
- Published `agent/implement-pulseops` and opened draft pull request
  [#1](https://github.com/Nielk74/pulseops/pull/1).
- Reproduced the first Linux Chromium CI failure, removed intrinsic card/chart
  minimum widths, made the repeated incident assertion semantic, and added
  overflow-offender diagnostics; the CI-style Chromium suite then passed.
- Replaced the Fleet table and separate Actions/detail screens with selectable
  machine cards, hover/focus telemetry, in-place configuration detail,
  icon-led action planning, and a machine-specific audit trail.
- Corrected Fleet card selection to be additive, separated focused detail from
  selection, added select-all/clear controls, and made action plans and history
  operate on the complete selected machine set.
- Moved machine and TeamCity agent details into a responsive modal, relocated
  Fleet actions and audit history beside the card grid, and introduced the same
  URL-backed modal drill-down pattern for builds, tests, services, and commits.
- Added coordinated scrim and surface transitions to every shared detail modal,
  including a faster animated exit and a no-displacement reduced-motion path.
