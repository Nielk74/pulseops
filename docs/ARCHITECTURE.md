# PulseOps architecture

## System boundary

PulseOps is one Next.js application containing the UI, route handlers, polling,
ingestion, anomaly detection, and correlation logic. SQLite is its only
application database. Privileged Windows mutations are deliberately kept behind
a separate executor boundary.

```text
browser -> PulseOps -> typed action -> trusted Windows executor -> machine
```

No browser route accepts arbitrary PowerShell, shell commands, or executable
script content.

## Connector model

Each external source implements a narrow contract under
`src/server/connectors/`. Live and mock implementations return the same domain
facts.

| Connector | Core operation |
|---|---|
| TeamCity | recent builds, tests, artifacts, and agents |
| Deployments | deployments since a timestamp |
| Services | current or recent service status samples |
| Git | fetch, commits since SHA, commit detail, changed files |
| Oracle | connectivity, minimal SQL, optional application probe |
| Machines | health, Chocolatey, and allow-listed environment inventory |

The Git adapter invokes `git` with `execFile` and argument arrays. It never
constructs a shell command string.

## Ingestion

Polling follows this sequence:

1. mark connector `SYNCING` and retain the previous successful timestamp;
2. fetch the external source;
3. enqueue a short SQLite write transaction;
4. upsert by stable external identifier;
5. emit normalized operational events;
6. update connector state and freshness;
7. recompute baselines and explanations after a full synchronization.

Machine facts are ingested before TeamCity facts so agent and test-machine
references can be resolved. External fetches are concurrent where their data
dependencies permit it; writes are serialized.

## Storage

The schema is explicit rather than generic. Its 20 tables cover:

- repositories, commits, and changed files;
- builds, artifacts, agents, test occurrences, and baselines;
- deployments, service samples, and Oracle samples;
- machines, health samples, packages, and environment variables;
- normalized events, incidents, connector health, actions, and action targets.

SQLite starts with `journal_mode=WAL`, `foreign_keys=ON`, and a busy timeout.
Indexes cover time, environment, build, commit, service, machine, and anomaly
lookups. Large log bodies and artifact binaries are outside the storage scope.

## Anomaly detection

Each baseline is keyed by:

```text
test name + test type + environment
```

PulseOps stores median, quartiles, p90/p95, median absolute deviation (MAD), and
median test count. A run needs at least ten prior clean samples before alerting.

Slow-run rules require all of:

- duration at least 20% above median;
- duration at least 30 seconds above median;
- robust deviation at least 3 MAD (warning/high) or 6 MAD (critical).

Fast-run rules compare both duration and test count. A very short run with a
large discovery-count reduction is treated as suspicious rather than successful.

## Correlation

For an anomalous test, the engine considers a five-minute service/Oracle window,
the build revision, recent deployment, TeamCity agent, machine health, and drift.
Candidate evidence is scored deterministically across:

```text
SERVICE | ORACLE | AGENT | MACHINE | DEPLOYMENT | COMMIT |
TEST_CONFIGURATION | UNKNOWN
```

The UI says “most likely cause” and exposes every supporting observation. It
does not claim certainty unless the evidence provides it. No LLM is required.

## Actions

All action input passes a Zod allow-list. An action record contains requester,
time, type, parameters, reason, incident, lifecycle status, target, previous
state, and result.

V1 executable actions are read-only refresh/probe operations. The remaining
action types can be planned so the protocol and audit shape are stable, but
execution fails closed until the trusted executor is enabled.

The operator experience keeps machine selection, health, drift, inventory,
action planning, and audit history on the canonical `/fleet` route. Legacy
machine-detail and Actions URLs redirect into that in-page context.

## Runtime model

- optional in-process polling with configurable intervals;
- optional Server-Sent Events for newest operational facts;
- dynamic server-rendered pages backed directly by SQLite;
- standalone Next.js container output;
- automatic migrations when `AUTO_MIGRATE=true`;
- persistent `/app/data` volume in the provided Compose profile.

## Testing

- Vitest covers statistics, slow/fast anomaly rules, and evidence ranking.
- `db:check` confirms the mock ingestion pipeline populated core datasets.
- Playwright covers desktop/mobile overview, navigation, explanations, the API,
  and 390px horizontal-overflow protection.
- CI runs migrations, seed, lint, strict types, unit tests, production build,
  and browser smoke tests.
