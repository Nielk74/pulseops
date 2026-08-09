# Technical Implementation Plan — PulseOps

> Working name: **PulseOps**  
> Purpose: a simple internal web application that correlates builds, tests, deployments, services, source-code changes, machines, and Oracle health, then highlights anomalies and provides safe operational actions.

---

## 1. Executive summary

PulseOps is an internal engineering operations application designed to answer questions such as:

- Why did this test run take much longer than usual?
- Why did this test run finish suspiciously fast?
- Did a recent commit correlate with a test regression?
- Was a dependent service down or unhealthy during the run?
- Was Oracle unavailable or unusually slow?
- Was the TeamCity agent or underlying Windows machine unhealthy?
- Did a machine drift from the expected Chocolatey packages or environment variables?
- Can an operator safely fix the problem from the same application?

The system should remain intentionally simple.

The proposed first architecture uses:

- **Next.js + TypeScript**
- **Tremor Blocks** for the UI
- **SQLite** as the only application database
- **TeamCity REST API** for builds, tests, artifacts, and agents
- **Deployment Info API** for deployment history
- **Services Status API / Grafana-backed service information** for service health
- **A local Git clone**, updated periodically with `git fetch`, for commit history
- **Lightweight Oracle probes**
- **A dedicated Windows executor** for controlled machine actions
- **Polling**, not Kafka, RabbitMQ, or other event infrastructure
- **Server-Sent Events (SSE)** only where live UI updates are useful

The central design principle is:

> Every useful signal should be correlatable by time, environment, component, machine, build, deployment, artifact, test, or commit.

The product is not intended to copy TeamCity, Grafana, or Git.

Its value comes from **correlating them**.

---

# 2. Goals

## 2.1 Primary goals

PulseOps should provide:

1. A unified operational view of the CI/CD and test environment.
2. Historical test-duration baselines.
3. Detection of unusually slow tests.
4. Detection of suspiciously fast tests.
5. Correlation between test anomalies and:
   - source-code commits,
   - builds,
   - deployments,
   - service incidents,
   - TeamCity agents,
   - Windows machines,
   - Oracle availability or latency.
6. A human-readable explanation of anomalous runs.
7. Fleet visibility for test/build machines.
8. Machine drift detection:
   - Chocolatey packages,
   - environment variables,
   - relevant Windows services,
   - selected configuration.
9. Safe operational actions from the UI.
10. A complete audit trail of operational actions.

---

## 2.2 Secondary goals

Later versions may provide:

- automatic machine quarantine,
- automated preflight checks before expensive tests,
- safe self-healing,
- learned service/test dependencies,
- commit risk analysis,
- automated diagnostic reruns,
- richer Oracle monitoring,
- AI-generated summaries based only on structured evidence.

---

# 3. Non-goals

For the first versions, PulseOps should **not** become:

- a replacement for TeamCity,
- a replacement for Grafana,
- a replacement for Git,
- a full log aggregation platform,
- a full database-monitoring product,
- a generic remote shell,
- a generic orchestration system,
- a distributed microservices platform.

Avoid introducing infrastructure that is not necessary.

In particular:

- no PostgreSQL,
- no TimescaleDB,
- no Kafka,
- no RabbitMQ,
- no Elasticsearch,
- no Kubernetes requirement,
- no separate data lake,
- no arbitrary PowerShell execution from the browser.

---

# 4. High-level architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                         WEB APP                              │
│                                                              │
│              Next.js + TypeScript + Tremor                   │
│                                                              │
│  Overview | Tests | Builds | Timeline | Fleet | Actions      │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │ HTTP / SSE
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                      APPLICATION SERVER                      │
│                                                              │
│  API                                                         │
│  Polling scheduler                                           │
│  Correlation engine                                          │
│  Anomaly detection                                           │
│  Action planner                                              │
│  Authentication / authorization                              │
└───────────┬───────────────────────┬──────────────────────────┘
            │                       │
            │                       │
            ▼                       ▼
┌───────────────────────┐   ┌─────────────────────────────────┐
│        SQLite         │   │       Windows Executor          │
│                       │   │                                 │
│ events                │   │ PowerShell / WinRM              │
│ builds                │   │ Chocolatey                      │
│ tests                 │   │ Services                        │
│ deployments           │   │ Environment variables           │
│ machines              │   │ Diagnostics                     │
│ metrics               │   │ Optional RDP helper             │
│ actions               │   └─────────────────────────────────┘
└───────────────────────┘
            ▲
            │
            │ polling
            │
┌───────────┴──────────────────────────────────────────────────┐
│                     DATA SOURCES                             │
│                                                              │
│ TeamCity API                                                 │
│ Deployment Info API                                          │
│ Services Status API                                          │
│ Local Git clone                                              │
│ Oracle                                                       │
│ Windows / TeamCity agents                                    │
└──────────────────────────────────────────────────────────────┘
```

---

# 5. Simplicity principles

The implementation should follow these rules.

## 5.1 One main application

Start with one deployable Next.js application containing:

- frontend,
- API routes,
- polling jobs,
- anomaly computation,
- correlation logic.

Only the privileged Windows executor should be separated.

---

## 5.2 SQLite first

Use SQLite until it becomes a demonstrated limitation.

SQLite is sufficient for:

- thousands of builds,
- hundreds of thousands or millions of test occurrences,
- machine inventories,
- deployment events,
- calculated baselines,
- action history.

Use:

- WAL mode,
- indexes,
- batched inserts,
- periodic cleanup or retention where needed.

If scale eventually becomes a problem, migrate later.

Do not optimize for hypothetical future scale.

---

## 5.3 Poll instead of introducing messaging infrastructure

Use regular polling loops.

Examples:

```text
TeamCity builds        every 30 seconds
TeamCity agents        every 30 seconds
Deployments            every 30 seconds
Services health        every 15 seconds
Git                    every 60 seconds
Oracle                 every 30 seconds
Machine inventory      every 5–15 minutes
```

Intervals must be configurable.

---

## 5.4 Store structured facts, not entire external systems

Do not mirror Grafana logs.

Do not copy the whole Git repository into the database.

Do not store every Oracle metric available.

Only persist information needed for:

- history,
- anomaly detection,
- correlation,
- explanations,
- audit.

---

# 6. Technology stack

## 6.1 Frontend

```text
Next.js
TypeScript
React
Tremor Blocks
Tailwind CSS
TanStack Table
Recharts / Tremor charts
```

Tremor should be used for:

- KPI cards,
- status indicators,
- charts,
- tables,
- dialogs,
- filters,
- badges,
- progress indicators.

---

## 6.2 Backend

Prefer keeping the backend inside Next.js initially.

Possible stack:

```text
Next.js Route Handlers
TypeScript
Zod
Drizzle ORM
better-sqlite3
```

Recommended database layer:

- **Drizzle ORM**
- **better-sqlite3**

Reasons:

- simple,
- fast,
- typed,
- easy migrations,
- easy access to raw SQL when needed.

---

## 6.3 Local Git integration

Use the native `git` executable.

No Git provider API is required.

The server maintains a local clone:

```text
/data/repositories/application
```

Periodic operation:

```bash
git fetch --all --prune
```

Then inspect commits:

```bash
git log
git show
git diff
```

The source-code model is commit-based only.

No PR model is required.

---

## 6.4 Windows executor

A separate small service running in the trusted Windows network.

Suggested implementation:

```text
.NET
or
Node.js + TypeScript
```

.NET is attractive for Windows-native integration.

The executor receives strongly typed actions from PulseOps.

Examples:

```text
GET_MACHINE_INFO
LIST_CHOCO_PACKAGES
INSTALL_CHOCO_PACKAGE
UPGRADE_CHOCO_PACKAGE
SET_ENV_VARIABLE
RESTART_SERVICE
START_SERVICE
STOP_SERVICE
RUN_HEALTH_CHECK
```

It must **not** expose a generic remote-shell endpoint.

---

# 7. Application modules

```text
src/
├── app/
│   ├── overview/
│   ├── tests/
│   ├── builds/
│   ├── timeline/
│   ├── services/
│   ├── fleet/
│   ├── actions/
│   └── settings/
│
├── server/
│   ├── db/
│   ├── teamcity/
│   ├── deployments/
│   ├── services/
│   ├── git/
│   ├── oracle/
│   ├── machines/
│   ├── polling/
│   ├── anomaly/
│   ├── correlation/
│   ├── actions/
│   └── auth/
│
├── components/
│   ├── charts/
│   ├── tables/
│   ├── status/
│   └── timeline/
│
└── shared/
    ├── types/
    ├── schemas/
    └── utils/
```

---

# 8. Data model

The schema should stay explicit rather than attempting to model everything as generic JSON events.

Some raw payloads may also be retained for debugging.

---

## 8.1 Repositories

```text
repositories

id
name
path
remote_url
default_branch
last_fetch_at
last_seen_commit
created_at
updated_at
```

---

## 8.2 Git commits

```text
git_commits

sha
repository_id
author_name
author_email
author_date
committer_date
subject
body
parent_sha
first_seen_at
```

Optional derived table:

```text
git_commit_files

commit_sha
path
change_type
additions
deletions
```

This makes future component-impact analysis possible.

---

# 9. Git polling

Every configured interval:

```text
1. acquire repository lock
2. git fetch --all --prune
3. determine latest remote commit
4. compare with last_seen_commit
5. load new commits
6. load changed files
7. store commits
8. update last_seen_commit
9. release lock
```

Example:

```bash
git log <old-sha>..origin/main \
  --format=...
```

For each new commit:

```bash
git diff-tree --no-commit-id --name-status -r <sha>
```

The application does not need to check out every commit.

---

# 10. TeamCity integration

TeamCity remains the main CI source.

PulseOps should collect:

## Builds

- build ID,
- build type/configuration,
- branch,
- status,
- state,
- queued time,
- start time,
- finish time,
- duration,
- agent ID,
- build number,
- source revision / commit SHA,
- relevant build parameters.

## Build artifacts

Store metadata only:

- build ID,
- artifact name,
- artifact path,
- artifact version,
- size if available,
- checksum if available.

Do not store binaries.

## Tests

For each test occurrence:

- test ID,
- test name,
- test suite,
- test category,
- build ID,
- status,
- duration,
- failure message,
- agent,
- timestamp.

Normalize test types:

```text
UNIT
UFT
SAS
OTHER
```

The TeamCity build configuration can provide the default category.

---

# 11. Parallel unit-test analysis

Unit tests are parallelized.

Therefore total duration alone is not enough.

For each build or test group calculate:

```text
wall_clock_duration
test_count
sum_test_duration
median_test_duration
p95_test_duration
slowest_test
worker_count
slowest_worker
fastest_worker
worker_imbalance
```

Where worker information is available, calculate:

```text
worker imbalance =
slowest worker duration / median worker duration
```

This helps distinguish:

```text
application slowdown
```

from:

```text
one slow TeamCity agent
```

---

# 12. TeamCity agents

Track:

```text
teamcity_agents

id
name
machine_id
connected
enabled
authorized
current_build_id
last_seen_at
last_status_change_at
```

Where useful, also retain:

- agent version,
- compatibility information,
- pool.

---

# 13. Deployment integration

The Deployment Info API should be normalized into:

```text
deployments

id
environment
application
service
artifact_name
artifact_version
build_id
commit_sha
status
requested_at
started_at
finished_at
target_machine
raw_json
```

If the API emits multiple deployment stages, retain them as events.

Examples:

```text
ARTIFACT_DOWNLOAD_STARTED
ARTIFACT_DOWNLOAD_FINISHED
BINARY_COPY_STARTED
BINARY_COPY_FINISHED
SERVICE_START_STARTED
SERVICE_START_FINISHED
DEPLOYMENT_COMPLETED
DEPLOYMENT_FAILED
```

---

# 14. Service monitoring

PulseOps should consume the existing Services Status API.

Store snapshots rather than full logs.

```text
service_status_samples

id
service_id
environment
timestamp
status
latency_ms
error_count
warning_count
instance_count
metadata_json
```

Recommended status normalization:

```text
HEALTHY
DEGRADED
UNHEALTHY
UNKNOWN
```

If the API exposes Grafana log summaries, store only:

- error counts,
- timeout counts,
- notable error signatures,
- restart information,
- links to Grafana.

---

# 15. Grafana/log integration

PulseOps should not be another log viewer.

For incidents:

```text
1. identify anomaly window
2. identify related services
3. request service/log summary for that time window
4. display important signals
5. provide link to Grafana for full investigation
```

Example window:

```text
test start - 5 minutes
to
test finish + 5 minutes
```

---

# 16. Oracle monitoring

Keep Oracle monitoring lightweight.

The goal is not to replace DBA tooling.

## Probe 1 — Connectivity

Measure:

```text
TCP/connect success
database login success
connection duration
```

---

## Probe 2 — Minimal SQL

Example:

```sql
SELECT 1 FROM dual;
```

Measure:

```text
query duration
success/failure
Oracle error code
```

---

## Probe 3 — Application representative query

If possible, define one safe read-only query that is representative of what UFT/SAS depends on.

Measure:

```text
connect_ms
query_ms
total_ms
success
```

This is often more meaningful than `SELECT 1`.

---

## Optional Oracle metrics

Later:

- active sessions,
- session utilization,
- DB CPU,
- wait events,
- logical reads,
- physical reads,
- selected `V$SYSMETRIC` values.

Do not include these until basic probes prove insufficient.

---

# 17. Oracle storage

```text
oracle_samples

id
database_name
environment
timestamp
connection_ok
connect_ms
query_ok
query_ms
application_probe_ms
error_code
error_message
metadata_json
```

---

# 18. Windows machine inventory

Track each machine:

```text
machines

id
hostname
role
environment
enabled
last_seen_at
reference_machine
metadata_json
```

Possible roles:

```text
BUILD_AGENT
UNIT_TEST_AGENT
UFT_AGENT
SAS_AGENT
DEPLOYMENT_TARGET
OTHER
```

---

# 19. Machine health samples

Do not store second-by-second telemetry.

A lightweight snapshot is enough:

```text
machine_health_samples

id
machine_id
timestamp
reachable
cpu_percent
memory_percent
disk_free_percent
uptime_seconds
teamcity_agent_ok
metadata_json
```

Optional checks:

- required Windows service status,
- required process,
- port availability,
- file existence,
- registry key,
- machine reboot pending.

---

# 20. Chocolatey inventory

```text
machine_packages

machine_id
package_name
version
captured_at
```

The fleet page compares machines.

Example:

| Package | UFT-01 | UFT-02 | UFT-03 |
|---|---:|---:|---:|
| Chrome | 138 | 138 | 137 |
| Java | 21 | 21 | 21 |
| InternalTool | 4.3 | 4.2 | 4.3 |

Reference machines can be configured per machine group.

---

# 21. Environment-variable inventory

Only explicitly allow-listed variables should be collected.

Do not copy every environment variable.

Example configuration:

```yaml
environmentVariables:
  - API_URL
  - APP_ENV
  - JAVA_HOME
  - TOOL_HOME
```

Store:

```text
machine_env_vars

machine_id
variable_name
value_hash
display_value
captured_at
```

Sensitive values should not be stored as plaintext.

For secrets:

```text
display_value = "***"
value_hash = SHA-256(...)
```

This still permits drift detection.

---

# 22. Machine drift

Drift compares a machine with:

- a designated reference machine,
- or a desired configuration.

Possible drift types:

```text
PACKAGE_VERSION
PACKAGE_MISSING
PACKAGE_EXTRA
ENV_VALUE
ENV_MISSING
WINDOWS_SERVICE
TEAMCITY_AGENT
```

Example:

```text
UFT-03

Chrome
  current: 137
  expected: 138

INTERNAL_TOOL
  current: 4.2
  expected: 4.3

API_URL
  current: differs from reference
```

---

# 23. Test-duration history

Store every relevant test occurrence.

```text
test_occurrences

id
teamcity_test_id
build_id
test_name
test_suite
test_type
status
duration_ms
machine_id
started_at
finished_at
failure_message
```

Indexes:

```text
test_name
test_type
build_id
started_at
machine_id
```

---

# 24. Test baselines

Do not calculate the baseline from every record on every page request.

Maintain a derived table:

```text
test_baselines

test_key
sample_count
median_ms
p25_ms
p75_ms
p90_ms
p95_ms
mad_ms
updated_at
```

A `test_key` may initially be:

```text
test name + test type + environment
```

Later it can include:

```text
branch
agent pool
configuration
```

---

# 25. Slow anomaly detection

Start with a simple robust statistical method.

Use:

- median,
- MAD — Median Absolute Deviation.

For a test duration `x`:

```text
deviation = abs(x - median)

score =
deviation / MAD
```

If MAD is zero, use a percentage threshold or minimum absolute difference.

Initial example rules:

```text
minimum historical samples: 10

warning:
duration > median + 3 * MAD

critical:
duration > median + 6 * MAD
```

Also require a minimum absolute difference to avoid noise:

```text
duration at least 20% slower
AND
at least 30 seconds slower
```

Thresholds should be configurable.

---

# 26. Suspiciously fast tests

Fast runs need equal attention.

Example:

```text
historical median: 30 min
current run: 8 min
```

Possible causes:

- tests skipped,
- discovery failure,
- immediate dependency failure,
- configuration error,
- data missing,
- reduced test count,
- changed parallelism.

Detection should compare:

```text
duration
test count
passed count
failed count
ignored/skipped count
```

Example alert:

```text
UFT Authentication

Duration
-72%

Test count
-68%

Conclusion
Likely incomplete test execution
```

---

# 27. Build-level anomalies

The same mechanism can be used for:

- build duration,
- artifact upload duration,
- queue duration,
- deployment duration,
- service startup duration.

The first priority remains test duration.

---

# 28. Unified operational events

For the timeline, normalize external facts into one lightweight event table.

```text
events

id
timestamp
source
type
severity
environment
service_id
machine_id
build_id
deployment_id
commit_sha
test_occurrence_id
summary
metadata_json
```

Example events:

```text
GIT_COMMIT
BUILD_QUEUED
BUILD_STARTED
BUILD_FINISHED
ARTIFACT_CREATED
DEPLOYMENT_STARTED
DEPLOYMENT_FINISHED
SERVICE_DEGRADED
SERVICE_RECOVERED
TEST_STARTED
TEST_FINISHED
TEST_ANOMALY
AGENT_DISCONNECTED
ORACLE_SLOW
ACTION_STARTED
ACTION_FINISHED
```

This table powers the timeline UI.

---

# 29. Correlation model

The correlation engine should be deterministic first.

Do not begin with an LLM.

For an anomalous test:

```text
Test anomaly
     │
     ├── build
     │     └── commit
     │
     ├── recent deployment
     │
     ├── TeamCity agent
     │     └── machine
     │
     ├── service status
     │
     └── Oracle samples
```

---

# 30. Time correlation

For a test running from:

```text
14:00 → 14:40
```

Evaluate:

```text
services:
13:55 → 14:45

Oracle:
13:55 → 14:45

machine:
13:55 → 14:45

deployments:
12:30 → 14:40

commits:
build source revision
+
recent commit history
```

---

# 31. Candidate root causes

Initial candidate categories:

```text
SERVICE
ORACLE
AGENT
MACHINE
DEPLOYMENT
COMMIT
TEST_CONFIGURATION
UNKNOWN
```

---

# 32. Evidence scoring

Each possible cause receives evidence.

Example:

```json
{
  "candidate": "SERVICE",
  "entity": "PricingApi",
  "score": 82,
  "evidence": [
    "service was degraded during 61% of test execution",
    "timeout count was 8x normal",
    "the slowdown began two minutes after service degradation",
    "Oracle latency was normal"
  ]
}
```

Possible scoring inputs:

```text
temporal overlap
severity
known dependency
historical correlation
peer-machine behavior
recent deployment
recent commit
error signatures
```

---

# 33. Start with rule-based correlation

Example rule:

```text
IF
  test is slow
AND
  service unhealthy overlap > 30%
AND
  same slowdown occurs on multiple machines
THEN
  service cause score += high
```

Example:

```text
IF
  only tests running on machine X are slow
AND
  machine X has high CPU or package drift
THEN
  machine cause score += high
```

Example:

```text
IF
  Oracle query latency > 3x baseline
AND
  anomaly overlaps Oracle slowdown
THEN
  Oracle cause score += high
```

---

# 34. Commit correlation

A TeamCity build should ideally expose its source revision.

This allows:

```text
commit SHA
   ↓
TeamCity build
   ↓
artifact
   ↓
deployment
   ↓
tests
```

Git polling enriches the SHA with:

- author,
- message,
- timestamp,
- changed files.

Example:

```text
Commit abc123
"Improve PricingService calculation"

Changed:
services/pricing/PriceEngine.cs
services/pricing/PricingRepository.cs

Build #9121
Artifact 4.18.2
Deployment DEV-2
UFT Pricing +58%
```

PulseOps can surface this correlation without needing pull-request data.

---

# 35. Component mapping

Later, map repository paths to components.

Configuration example:

```yaml
components:
  PricingService:
    paths:
      - services/pricing/**
    services:
      - PricingApi

  Authentication:
    paths:
      - services/auth/**
    services:
      - AuthApi
```

This allows stronger correlation:

```text
commit touched PricingService
+
PricingApi degraded
+
Pricing UFT slow
```

---

# 36. Learned dependency map

Later, PulseOps can build historical associations:

```text
UFT.Pricing.*
  ├─ PricingApi
  ├─ Oracle
  └─ TEST-UFT pool
```

A very simple first algorithm:

```text
count how often service incidents overlap
specific test failures or slowdowns
```

No machine learning framework is required.

---

# 37. "Explain this run"

This should be one of the central application features.

Example:

```text
UFT Pricing

Current duration
47m 12s

Historical median
31m 04s

Difference
+52%

Confidence
HIGH ANOMALY
```

Then:

```text
Observations

✓ Queue duration normal
✓ Test count normal
✓ Agent CPU normal
✓ Oracle probe normal

⚠ PricingApi degraded for 14 minutes
⚠ Service timeout rate elevated
⚠ PricingApi restarted during the run
```

Then:

```text
Source changes

Commit abc123
"Change pricing cache strategy"

Changed component:
PricingService
```

Then:

```text
Most likely cause

PricingApi degradation

Confidence: 82%
```

Actions:

```text
View Grafana
Compare previous run
Rerun tests
Inspect deployment
```

---

# 38. Counterfactual diagnostics

A later feature can suggest diagnostic experiments.

Example:

```text
Possible causes:
- UFT-03 machine
- current artifact

Suggested diagnostic:
rerun the same test on UFT-01
```

If UFT-01 is also slow:

```text
machine hypothesis decreases
artifact/service hypothesis increases
```

These actions should initially require manual operator approval.

---

# 39. Fleet page

The Fleet page should provide:

```text
Machine
Role
Reachable
TeamCity agent
Current build
CPU
Memory
Disk
Package drift
Environment drift
Last check
```

Example:

| Machine | Role | Agent | Health | Drift |
|---|---|---|---|---|
| UFT-01 | UFT | Online | Healthy | None |
| UFT-02 | UFT | Online | Healthy | 1 package |
| UFT-03 | UFT | Offline | Warning | 2 packages |
| SAS-01 | SAS | Online | Healthy | None |

---

# 40. Machine detail page

Show:

```text
Machine summary
Current TeamCity job
Health history
Chocolatey packages
Environment variables
Windows services
Recent anomalies
Recent actions
```

Provide comparison:

```text
Compare with:
[UFT-01 ▼]
```

---

# 41. Operational actions

Actions should be strongly typed.

Initial actions:

## TeamCity

```text
RERUN_BUILD
ENABLE_AGENT
DISABLE_AGENT
```

## Windows

```text
REFRESH_MACHINE
RESTART_SERVICE
START_SERVICE
STOP_SERVICE

CHOCO_INSTALL
CHOCO_UPGRADE
CHOCO_UNINSTALL

SET_ENV_VARIABLE
REMOVE_ENV_VARIABLE

SYNC_PACKAGES_FROM_REFERENCE
SYNC_ENV_FROM_REFERENCE
```

## Diagnostics

```text
RUN_ORACLE_PROBE
RUN_SERVICE_PROBE
REFRESH_PACKAGE_INVENTORY
REFRESH_ENV_INVENTORY
```

---

# 42. No arbitrary PowerShell

The browser must never expose:

```text
Run PowerShell
```

or:

```text
Execute command
```

Instead:

```json
{
  "action": "CHOCO_UPGRADE",
  "machine": "UFT-03",
  "parameters": {
    "package": "googlechrome",
    "version": "138.0.0"
  }
}
```

The Windows executor converts this internally into the required command.

---

# 43. Windows executor protocol

Example request:

```http
POST /actions
```

```json
{
  "actionId": "act_123",
  "type": "CHOCO_UPGRADE",
  "targets": ["UFT-03"],
  "parameters": {
    "package": "googlechrome",
    "version": "138.0.0"
  }
}
```

Example response:

```json
{
  "actionId": "act_123",
  "status": "SUCCESS",
  "targets": [
    {
      "machine": "UFT-03",
      "status": "SUCCESS",
      "message": "googlechrome upgraded to 138.0.0"
    }
  ]
}
```

Use HTTPS and authentication between PulseOps and the executor.

---

# 44. RDP

RDP may still be useful for specific cases where an interactive Windows session is required.

The design can reuse ideas from the existing `rats` repository.

However:

> RDP should be treated as a special remediation mechanism, not as the general command execution protocol.

Preferred order:

```text
PowerShell Remoting / WinRM
        ↓
Windows-native management
        ↓
RDP only when interactive session is required
```

---

# 45. Safe fleet changes

For multi-machine changes, use a plan-first workflow.

Example:

```text
Synchronize packages from UFT-01
to UFT-02, UFT-03, UFT-04
```

PulseOps first displays:

```text
UFT-02
Chrome 137 → 138

UFT-03
InternalTool 4.2 → 4.3

UFT-04
No differences
```

Operator chooses:

```text
Execute
Cancel
```

For larger changes:

```text
1. update one canary machine
2. run health checks
3. confirm success
4. update remaining machines
```

---

# 46. Action persistence

```text
actions

id
type
requested_by
requested_at
status
parameters_json
incident_id
reason
started_at
finished_at
```

```text
action_targets

action_id
machine_id
status
previous_state_json
result_json
started_at
finished_at
```

---

# 47. Audit requirements

Every mutating action must record:

- user,
- timestamp,
- target,
- action,
- parameters,
- previous state when available,
- resulting state,
- success/failure,
- error output,
- associated incident/anomaly if relevant.

---

# 48. Preflight checks

A valuable later integration is a test preflight.

Before a long UFT or SAS test:

```text
Check:
- required services
- Oracle
- TeamCity agent
- disk
- machine reachability
- required packages
```

Example:

```text
UFT preflight

PricingApi        HEALTHY
AuthApi           HEALTHY
Oracle            HEALTHY
UFT-02            HEALTHY
Chrome version    EXPECTED

READY
```

Or:

```text
BLOCKED

PricingApi        UNHEALTHY
```

The TeamCity job can optionally call:

```http
GET /api/preflight/uft?environment=DEV2
```

---

# 49. API design

Example application endpoints.

## Overview

```text
GET /api/overview
GET /api/incidents
GET /api/timeline
```

---

## Builds

```text
GET /api/builds
GET /api/builds/:id
GET /api/builds/:id/tests
GET /api/builds/:id/explanation
```

---

## Tests

```text
GET /api/tests
GET /api/tests/:testKey/history
GET /api/tests/:occurrenceId/explanation
```

---

## Services

```text
GET /api/services
GET /api/services/:id/history
```

---

## Fleet

```text
GET /api/machines
GET /api/machines/:id
GET /api/machines/:id/packages
GET /api/machines/:id/environment
GET /api/machines/:id/drift
```

---

## Git

```text
GET /api/commits
GET /api/commits/:sha
```

---

## Actions

```text
POST /api/actions/plan
POST /api/actions
GET /api/actions
GET /api/actions/:id
```

---

# 50. Overview UI

Use Tremor to build an operational cockpit.

Top cards:

```text
Build success
Test anomalies
Service health
Agent health
Oracle
```

Example:

```text
Build Success        94%
Test Anomalies       4
Services             19 / 20 healthy
Agents               27 / 29 online
Oracle               42 ms
```

---

# 51. Incident list

Example:

```text
HIGH
UFT Pricing unusually slow
+52% vs baseline
Likely PricingApi

MEDIUM
UFT-03 package drift
Chrome 137 vs expected 138

HIGH
Oracle latency
3.4x normal
```

---

# 52. Timeline UI

The unified timeline is important.

Example:

```text
12:04  Git commit abc123
12:07  TeamCity build queued
12:08  Build started
12:14  Artifact created
12:18  Deployment started
12:20  PricingApi restarted
12:21  PricingApi degraded
12:22  UFT started
12:31  UFT slowdown detected
12:37  PricingApi recovered
12:48  UFT completed
```

Filters:

```text
time range
environment
machine
service
build
test type
commit
severity
```

---

# 53. Tests UI

Main table:

| Test | Current | Median | Delta | Status | Probable cause |
|---|---:|---:|---:|---|---|
| UFT Pricing | 48m | 31m | +55% | Slow | PricingApi |
| SAS Monthly | 21m | 20m | +5% | Normal | — |
| Unit Core | 8m | 7m | +14% | Normal | — |
| UFT Login | 3m | 9m | -67% | Suspicious | Incomplete run |

Clicking an occurrence opens the explanation page.

---

# 54. Test-detail charts

Show:

1. duration history,
2. baseline band,
3. test-count history,
4. failure history,
5. machine distribution,
6. related service-health overlay,
7. Oracle latency overlay where relevant.

Avoid excessive chart density.

The first question should always remain:

> Is this run normal, and if not, why?

---

# 55. Builds page

Table:

```text
Build
Configuration
Commit
Status
Duration
Baseline delta
Agent
Artifacts
Test anomalies
Deployment
```

Clicking the commit opens the local Git-derived commit details.

---

# 56. Commit page

Display:

```text
SHA
author
date
message
changed files
related TeamCity builds
related deployments
test anomalies after build
```

No pull-request UI is needed.

---

# 57. Services page

Show:

```text
Service
Environment
Status
Latency
Errors
Last restart
Related test anomalies
```

Click through to:

- recent state history,
- recent deployments,
- related test anomalies,
- Grafana link.

---

# 58. Actions page

Sections:

```text
Pending plans
Running actions
Completed actions
Failed actions
```

Each action should expose full audit information.

---

# 59. SQLite schema considerations

Enable WAL:

```sql
PRAGMA journal_mode=WAL;
```

Enable foreign keys:

```sql
PRAGMA foreign_keys=ON;
```

Use indexes on:

```text
timestamp
build_id
test_name
machine_id
service_id
commit_sha
deployment_id
```

Avoid storing huge log bodies.

---

# 60. Retention

Suggested initial retention:

```text
builds                 indefinite
deployments            indefinite
commits                indefinite
test occurrences       1–2 years
service samples        90 days
machine health         90 days
Oracle samples         90 days
actions                indefinite
```

These values should be configuration-driven.

A nightly cleanup job can remove old samples.

---

# 61. Polling scheduler

A lightweight in-process scheduler is sufficient.

Example:

```ts
polling.register("teamcity-builds", "30s", syncBuilds)
polling.register("teamcity-agents", "30s", syncAgents)
polling.register("deployments", "30s", syncDeployments)
polling.register("services", "15s", syncServices)
polling.register("git", "60s", syncGit)
polling.register("oracle", "30s", syncOracle)
polling.register("machines", "5m", syncMachines)
```

Every task should have:

```text
last_started_at
last_finished_at
last_success_at
last_error
status
```

Display connector status on an administration page.

---

# 62. Concurrency and locking

Because SQLite allows limited concurrent writes, serialize or limit ingestion writes.

Recommended:

```text
one write queue inside the application
```

Pollers may fetch external data concurrently, but write batches should be short.

Use transactions.

Example:

```text
fetch TeamCity
fetch services
fetch Git

          ↓

short SQLite write transactions
```

---

# 63. Polling idempotency

Every connector must be safe to execute repeatedly.

Use external IDs as unique keys.

Examples:

```text
TeamCity build ID
test occurrence ID
deployment ID
commit SHA
```

Prefer:

```sql
INSERT ... ON CONFLICT DO UPDATE
```

where appropriate.

---

# 64. Realtime updates

Most pages can refresh normally.

For the operational overview and actions, optional SSE can push:

```text
new anomaly
service changed
agent changed
action progress
```

Do not introduce WebSockets unless needed.

---

# 65. Authentication

Use the simplest authentication compatible with the internal environment.

Preferred:

```text
corporate OIDC / SSO
```

Roles:

```text
VIEWER
OPERATOR
ADMIN
```

Permissions:

| Capability | Viewer | Operator | Admin |
|---|---|---|---|
| View telemetry | Yes | Yes | Yes |
| Explain runs | Yes | Yes | Yes |
| Rerun build | No | Yes | Yes |
| Disable agent | No | Yes | Yes |
| Machine mutation | No | Yes | Yes |
| Configuration | No | No | Yes |

---

# 66. Security boundaries

The main application should not contain unrestricted remote administrative credentials where avoidable.

Preferred:

```text
Browser
   ↓
PulseOps
   ↓
signed/authorized action
   ↓
Windows Executor
   ↓
target machine
```

The Windows executor lives on the trusted internal network.

---

# 67. Secrets

Store credentials using the environment's existing secret-management mechanism.

Do not store credentials directly in SQLite.

Configuration may reference:

```text
TEAMCITY_TOKEN
DEPLOYMENT_API_TOKEN
SERVICE_STATUS_API_TOKEN
ORACLE_USERNAME
ORACLE_PASSWORD
WINDOWS_EXECUTOR_TOKEN
```

---

# 68. Failure handling

PulseOps should distinguish:

```text
source system unhealthy
```

from:

```text
PulseOps connector broken
```

Example:

```text
Services API
Last successful sync: 2 minutes ago
Current connector state: ERROR
```

Never interpret stale data as current healthy data.

---

# 69. Data freshness

Every external status displayed in the UI should expose freshness.

Example:

```text
PricingApi
HEALTHY
checked 8 seconds ago
```

If stale:

```text
PricingApi
UNKNOWN
last successful check 14 minutes ago
```

---

# 70. Configuration

Example configuration:

```yaml
app:
  environment: production

polling:
  teamcityBuildsSeconds: 30
  teamcityAgentsSeconds: 30
  deploymentSeconds: 30
  servicesSeconds: 15
  gitSeconds: 60
  oracleSeconds: 30
  machineInventorySeconds: 600

git:
  repositories:
    - name: application
      path: /data/repos/application
      remote: ssh://git/internal/application.git
      branch: main

teamcity:
  baseUrl: https://teamcity.internal

oracle:
  probes:
    - name: DEV1
      connection: DEV1_DB
    - name: DEV2
      connection: DEV2_DB

machines:
  groups:
    UFT:
      reference: UFT-01
      members:
        - UFT-01
        - UFT-02
        - UFT-03

environmentVariables:
  monitored:
    - API_URL
    - JAVA_HOME
    - TOOL_HOME
```

---

# 71. Deployment model

The simplest production deployment:

```text
Linux or Windows host

PulseOps Next.js application
SQLite file
local Git clone
```

Separately:

```text
Windows Executor
on a trusted Windows host
```

Persistent files:

```text
/data/pulseops.db
/data/repos/application/
```

Backup the SQLite file regularly.

---

# 72. SQLite backup

Use SQLite-safe backup.

Examples:

```bash
sqlite3 pulseops.db ".backup '/backup/pulseops.db'"
```

or the SQLite backup API.

Do not simply copy the active file without considering WAL state.

---

# 73. Development environment

A developer should be able to run:

```bash
npm install
npm run db:migrate
npm run dev
```

Optional local mocked connectors:

```text
MOCK_TEAMCITY=true
MOCK_DEPLOYMENTS=true
MOCK_SERVICES=true
MOCK_ORACLE=true
MOCK_MACHINES=true
```

This is important because not every developer will have access to all internal systems.

---

# 74. Connector abstraction

Each external integration should implement a small adapter.

Example:

```ts
interface TeamCityConnector {
  getRecentBuilds(since: Date): Promise<Build[]>
  getBuildTests(buildId: string): Promise<TestOccurrence[]>
  getAgents(): Promise<Agent[]>
}
```

```ts
interface ServiceStatusConnector {
  getStatuses(): Promise<ServiceStatus[]>
}
```

```ts
interface DeploymentConnector {
  getDeployments(since: Date): Promise<Deployment[]>
}
```

This keeps internal API formats away from the domain layer.

---

# 75. Git connector

Example:

```ts
interface GitConnector {
  fetch(): Promise<void>
  getCommitsSince(sha?: string): Promise<GitCommit[]>
  getCommit(sha: string): Promise<GitCommit>
  getChangedFiles(sha: string): Promise<ChangedFile[]>
}
```

Implementation uses `child_process` or `execa`.

Arguments must be passed safely.

Avoid shell-string concatenation.

---

# 76. Correlation service

Example interface:

```ts
interface CorrelationService {
  explainTestOccurrence(
    occurrenceId: string
  ): Promise<TestExplanation>
}
```

Output:

```ts
interface TestExplanation {
  anomaly: {
    type: "SLOW" | "FAST"
    score: number
    currentDurationMs: number
    medianDurationMs: number
  }

  evidence: Evidence[]

  probableCauses: {
    category: string
    entity?: string
    confidence: number
    evidence: string[]
  }[]
}
```

---

# 77. Incidents

An anomaly does not necessarily need a full incident-management workflow initially.

A simple table is enough:

```text
incidents

id
type
severity
status
title
started_at
resolved_at
primary_entity_type
primary_entity_id
explanation_json
```

Status:

```text
OPEN
ACKNOWLEDGED
RESOLVED
```

---

# 78. Automatic incident creation

Initially create incidents only for meaningful conditions:

```text
critical slow test
critical fast test
service unhealthy
Oracle unreachable
TeamCity agent unexpectedly disconnected
```

Avoid alert spam.

---

# 79. Explainability

Never present a root cause as certain unless it is actually known.

Prefer:

```text
Most likely cause
PricingApi

Confidence
82%
```

with evidence.

Do not display:

```text
Root cause: PricingApi
```

unless there is direct proof.

---

# 80. Optional AI layer

AI should come late.

If added, the LLM receives structured evidence:

```json
{
  "anomaly": "...",
  "serviceEvidence": [...],
  "oracleEvidence": [...],
  "machineEvidence": [...],
  "commitEvidence": [...]
}
```

The LLM's role is:

- summarize,
- explain,
- suggest safe investigation steps.

It should not independently decide remote actions.

---

# 81. Implementation milestones

## Milestone 0 — Skeleton

Deliver:

- Next.js application,
- Tremor,
- SQLite,
- Drizzle migrations,
- base navigation,
- settings/configuration,
- connector health page.

Exit criterion:

> Application runs and can persist data.

---

# 82. Milestone 1 — TeamCity + Git

Deliver:

- TeamCity builds,
- TeamCity tests,
- TeamCity agents,
- local Git clone,
- periodic Git fetch,
- commit ingestion,
- build → commit correlation.

UI:

```text
Builds
Tests
Agents
Commits
```

Exit criterion:

> Selecting a TeamCity build shows the exact source commit and test results.

---

# 83. Milestone 2 — Deployments + services

Deliver:

- Deployment Info API integration,
- Services Status API integration,
- deployment timeline,
- service health history,
- build → deployment correlation.

Exit criterion:

> A build can be followed through artifact/deployment/service startup.

---

# 84. Milestone 3 — Test anomaly detection

Deliver:

- historical test baselines,
- slow-test detection,
- fast-test detection,
- test-count comparison,
- parallel-worker analysis where possible.

Exit criterion:

> PulseOps reliably highlights abnormal runs without fixed per-test thresholds.

---

# 85. Milestone 4 — Explain this run

Deliver:

- unified events,
- timeline,
- service overlap,
- deployment correlation,
- commit enrichment,
- initial rule-based evidence scoring.

Exit criterion:

> An anomalous test produces a useful ranked explanation.

---

# 86. Milestone 5 — Oracle

Deliver:

- connectivity probe,
- simple query probe,
- optional application query,
- Oracle baseline,
- Oracle/test overlap correlation.

Exit criterion:

> PulseOps can identify Oracle as a plausible cause of slow tests.

---

# 87. Milestone 6 — Fleet inventory

Deliver:

- machine health,
- TeamCity-machine mapping,
- Chocolatey package inventory,
- environment-variable inventory,
- reference machines,
- drift matrix.

Exit criterion:

> Operators can immediately see how one UFT/SAS/build agent differs from its peers.

---

# 88. Milestone 7 — Safe actions

Deliver:

- Windows executor,
- refresh machine,
- TeamCity enable/disable,
- rerun build,
- restart selected service,
- Chocolatey package operations,
- env-var changes,
- action planning,
- audit.

Exit criterion:

> A trusted operator can safely remediate common machine problems without opening RDP manually.

---

# 89. Milestone 8 — Fleet synchronization

Deliver:

```text
compare with reference
plan synchronization
canary execution
validation
batch execution
```

Support:

- Chocolatey sync,
- environment-variable sync.

Exit criterion:

> One machine can be safely reconciled against a known-good machine.

---

# 90. Milestone 9 — Preflight

Deliver test-environment readiness checks.

Example:

```text
Before UFT:

services healthy?
Oracle healthy?
machine healthy?
packages expected?
```

Exit criterion:

> Expensive tests can avoid starting in an obviously broken environment.

---

# 91. Suggested V1 scope

The first production-worthy release should contain:

```text
✓ Next.js + Tremor
✓ SQLite

✓ TeamCity builds
✓ TeamCity test occurrences
✓ TeamCity agents

✓ Local Git clone
✓ Periodic git fetch
✓ Commit ingestion
✓ Changed-file ingestion

✓ Deployment history
✓ Service health

✓ Unified timeline

✓ Slow-test detection
✓ Fast-test detection

✓ Service correlation
✓ machine/agent correlation
✓ deployment correlation
✓ commit correlation

✓ Explain this run

✓ Oracle basic probe

✓ read-only package inventory
✓ read-only environment drift
```

Do not initially include destructive fleet actions.

---

# 92. Suggested V1.1

Add only a few low-risk actions:

```text
TeamCity:
- rerun build
- enable agent
- disable agent

Windows:
- refresh inventory
- run health check
```

---

# 93. Suggested V2

Add controlled mutation:

```text
Chocolatey install/upgrade
environment-variable synchronization
Windows service restart
machine quarantine
canary fleet actions
preflight automation
```

---

# 94. What makes PulseOps different

PulseOps should not be judged by how many dashboards it has.

Its core workflow is:

```text
Something looks abnormal
        ↓
PulseOps detects it
        ↓
PulseOps reconstructs what happened
        ↓
PulseOps ranks likely causes
        ↓
Operator sees evidence
        ↓
PulseOps proposes safe actions
        ↓
Operator executes
        ↓
PulseOps validates the result
```

---

# 95. Example end-to-end scenario

A UFT test normally takes:

```text
31 minutes
```

Today:

```text
48 minutes
```

PulseOps creates an anomaly.

It correlates:

```text
Test
UFT Pricing

Build
#91822

Commit
abc123

Deployment
DEV2 / PricingService / 4.18.2

Machine
UFT-03

Service
PricingApi

Oracle
DEV2
```

Evidence:

```text
✓ test count normal
✓ build queue normal
✓ UFT-03 CPU normal
✓ Oracle latency normal

⚠ PricingApi degraded for 13 minutes
⚠ timeout count +700%
⚠ PricingApi was restarted shortly before test slowdown

Commit abc123 changed:
services/pricing/*
```

Result:

```text
Most likely cause:
PricingApi

Confidence:
HIGH
```

Available actions:

```text
View Grafana
Compare previous run
Rerun UFT Pricing
Inspect deployment
```

---

# 96. Second end-to-end scenario

Three UFT tests are slow, but only on UFT-04.

Other agents are normal.

PulseOps finds:

```text
Chrome

UFT-01  138
UFT-02  138
UFT-03  138
UFT-04  137
```

and:

```text
TeamCity agent UFT-04
recent reconnects: 5
```

Explanation:

```text
Most likely cause:
UFT-04 machine drift

Evidence:
- anomaly isolated to UFT-04
- Chrome differs from reference fleet
- agent reconnected repeatedly
- services and Oracle normal
```

Action:

```text
[Compare machine with UFT-01]
```

Later versions:

```text
[Plan synchronization]
```

---

# 97. Third end-to-end scenario

A UFT suite suddenly finishes in 6 minutes instead of 28.

PulseOps observes:

```text
duration: -79%
test count: -74%
services: healthy
Oracle: healthy
machine: healthy
```

Explanation:

```text
Suspiciously fast run

Likely incomplete test discovery/execution
```

This should be treated as an anomaly rather than a success.

---

# 98. Engineering rules

The following rules should be enforced throughout implementation.

1. Prefer polling over infrastructure complexity.
2. Prefer SQLite until proven insufficient.
3. Keep the Windows executor separate from the UI/API process.
4. Never expose arbitrary remote command execution.
5. Store structured evidence, not huge logs.
6. Always show data freshness.
7. Make connector failures visible.
8. Make mutations auditable.
9. Make fleet-wide changes plan-first.
10. Use Git commits, not PRs, as the source-change unit.
11. Keep correlation explainable.
12. Do not require AI for core functionality.
13. Start read-only and add actions gradually.
14. Optimize for operator usefulness, not dashboard count.

---

# 99. Initial technical decisions

| Area | Decision |
|---|---|
| UI | Next.js + Tremor |
| Language | TypeScript |
| Database | SQLite |
| ORM | Drizzle |
| Source control integration | local Git clone + periodic fetch |
| Source-change model | commits |
| CI | TeamCity REST API |
| Deployments | Deployment Info API |
| Services | Services Status API |
| Logs | query/link on demand, do not ingest all logs |
| Oracle | lightweight probes |
| Background work | in-process polling |
| Realtime UI | SSE if needed |
| Fleet actions | separate Windows executor |
| Windows management | PowerShell/WinRM first |
| RDP | fallback for interactive-session-specific cases |
| Auth | corporate SSO/OIDC |
| Action security | typed allow-list |
| AI | optional later layer |

---

# 100. Final recommended architecture

```text
                    ┌─────────────────────┐
                    │      Tremor UI      │
                    │      Next.js        │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   PulseOps Server   │
                    │                     │
                    │ Pollers             │
                    │ APIs                │
                    │ Anomaly engine      │
                    │ Correlation engine  │
                    │ Action planner      │
                    └──────┬───────┬──────┘
                           │       │
                           ▼       ▼
                     ┌────────┐  ┌─────────────────┐
                     │ SQLite │  │ Windows Executor│
                     └────────┘  └─────────────────┘
                           ▲
                           │
         ┌─────────────────┼──────────────────────────┐
         │                 │                          │
         ▼                 ▼                          ▼
   ┌──────────┐     ┌──────────────┐          ┌─────────────┐
   │ TeamCity │     │ Deployment   │          │ Services    │
   │          │     │ API          │          │ Status API  │
   └──────────┘     └──────────────┘          └─────────────┘

         │                 │                          │
         └─────────────────┼──────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                    ▼             ▼
                Local Git       Oracle
                 clone          probes
```

The system remains small enough to understand and operate, while still leaving room for sophisticated correlation and remediation later.

The most important technical investment is not infrastructure.

It is the **data relationships and correlation logic** connecting:

```text
commit
  → build
    → artifact
      → deployment
        → services
          → tests
            → agent
              → machine
                → Oracle/dependencies
```

Once those relationships exist, anomaly detection, explanations, drift detection, and safe remediation become straightforward incremental features.
