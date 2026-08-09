import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

const createdAt = () => integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);
const updatedAt = () => integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`);

export const connectorHealth = sqliteTable("connector_health", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  mode: text("mode").notNull(),
  status: text("status").notNull().default("IDLE"),
  lastStartedAt: integer("last_started_at", { mode: "timestamp_ms" }),
  lastFinishedAt: integer("last_finished_at", { mode: "timestamp_ms" }),
  lastSuccessAt: integer("last_success_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  recordsSynced: integer("records_synced").notNull().default(0),
  updatedAt: updatedAt()
});

export const repositories = sqliteTable("repositories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  remoteUrl: text("remote_url"),
  defaultBranch: text("default_branch").notNull().default("main"),
  lastFetchAt: integer("last_fetch_at", { mode: "timestamp_ms" }),
  lastSeenCommit: text("last_seen_commit"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const gitCommits = sqliteTable("git_commits", {
  sha: text("sha").primaryKey(),
  repositoryId: text("repository_id").notNull().references(() => repositories.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email"),
  authorDate: integer("author_date", { mode: "timestamp_ms" }).notNull(),
  committerDate: integer("committer_date", { mode: "timestamp_ms" }).notNull(),
  subject: text("subject").notNull(),
  body: text("body"),
  parentSha: text("parent_sha"),
  firstSeenAt: createdAt()
}, (table) => [index("git_commits_repository_date_idx").on(table.repositoryId, table.committerDate)]);

export const gitCommitFiles = sqliteTable("git_commit_files", {
  commitSha: text("commit_sha").notNull().references(() => gitCommits.sha, { onDelete: "cascade" }),
  path: text("path").notNull(),
  changeType: text("change_type").notNull(),
  additions: integer("additions"),
  deletions: integer("deletions")
}, (table) => [primaryKey({ columns: [table.commitSha, table.path] }), index("git_commit_files_path_idx").on(table.path)]);

export const builds = sqliteTable("builds", {
  id: text("id").primaryKey(),
  buildType: text("build_type").notNull(),
  branch: text("branch").notNull(),
  status: text("status").notNull(),
  state: text("state").notNull(),
  queuedAt: integer("queued_at", { mode: "timestamp_ms" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  durationMs: integer("duration_ms"),
  queueDurationMs: integer("queue_duration_ms"),
  agentId: text("agent_id"),
  buildNumber: text("build_number").notNull(),
  commitSha: text("commit_sha"),
  environment: text("environment").notNull(),
  parametersJson: text("parameters_json"),
  artifactCount: integer("artifact_count").notNull().default(0),
  testAnomalyCount: integer("test_anomaly_count").notNull().default(0),
  updatedAt: updatedAt()
}, (table) => [
  index("builds_started_at_idx").on(table.startedAt),
  index("builds_agent_idx").on(table.agentId),
  index("builds_commit_idx").on(table.commitSha),
  uniqueIndex("builds_number_type_idx").on(table.buildNumber, table.buildType)
]);

export const buildArtifacts = sqliteTable("build_artifacts", {
  id: text("id").primaryKey(),
  buildId: text("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  version: text("version"),
  sizeBytes: integer("size_bytes"),
  checksum: text("checksum"),
  createdAt: createdAt()
}, (table) => [index("artifacts_build_idx").on(table.buildId)]);

export const machines = sqliteTable("machines", {
  id: text("id").primaryKey(),
  hostname: text("hostname").notNull().unique(),
  role: text("role").notNull(),
  environment: text("environment").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  referenceMachineId: text("reference_machine_id"),
  metadataJson: text("metadata_json"),
  createdAt: createdAt(),
  updatedAt: updatedAt()
}, (table) => [index("machines_environment_role_idx").on(table.environment, table.role)]);

export const teamcityAgents = sqliteTable("teamcity_agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  machineId: text("machine_id").references(() => machines.id, { onDelete: "set null" }),
  connected: integer("connected", { mode: "boolean" }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  authorized: integer("authorized", { mode: "boolean" }).notNull(),
  currentBuildId: text("current_build_id"),
  pool: text("pool"),
  version: text("version"),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  lastStatusChangeAt: integer("last_status_change_at", { mode: "timestamp_ms" }),
  updatedAt: updatedAt()
}, (table) => [index("agents_machine_idx").on(table.machineId)]);

export const testOccurrences = sqliteTable("test_occurrences", {
  id: text("id").primaryKey(),
  teamcityTestId: text("teamcity_test_id").notNull(),
  buildId: text("build_id").notNull().references(() => builds.id, { onDelete: "cascade" }),
  testName: text("test_name").notNull(),
  testSuite: text("test_suite"),
  testType: text("test_type").notNull(),
  status: text("status").notNull(),
  durationMs: integer("duration_ms").notNull(),
  machineId: text("machine_id").references(() => machines.id, { onDelete: "set null" }),
  workerId: text("worker_id"),
  environment: text("environment").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }).notNull(),
  failureMessage: text("failure_message"),
  testCount: integer("test_count"),
  passedCount: integer("passed_count"),
  failedCount: integer("failed_count"),
  skippedCount: integer("skipped_count"),
  anomalyType: text("anomaly_type").notNull().default("NONE"),
  anomalySeverity: text("anomaly_severity").notNull().default("INFO"),
  anomalyScore: real("anomaly_score").notNull().default(0),
  probableCause: text("probable_cause"),
  evidenceJson: text("evidence_json"),
  createdAt: createdAt()
}, (table) => [
  index("tests_name_idx").on(table.testName),
  index("tests_type_idx").on(table.testType),
  index("tests_build_idx").on(table.buildId),
  index("tests_started_idx").on(table.startedAt),
  index("tests_machine_idx").on(table.machineId),
  index("tests_anomaly_idx").on(table.anomalyType, table.anomalySeverity)
]);

export const testBaselines = sqliteTable("test_baselines", {
  testKey: text("test_key").primaryKey(),
  sampleCount: integer("sample_count").notNull(),
  medianMs: integer("median_ms").notNull(),
  p25Ms: integer("p25_ms").notNull(),
  p75Ms: integer("p75_ms").notNull(),
  p90Ms: integer("p90_ms").notNull(),
  p95Ms: integer("p95_ms").notNull(),
  madMs: integer("mad_ms").notNull(),
  medianTestCount: integer("median_test_count"),
  updatedAt: updatedAt()
});

export const deployments = sqliteTable("deployments", {
  id: text("id").primaryKey(),
  environment: text("environment").notNull(),
  application: text("application").notNull(),
  service: text("service"),
  artifactName: text("artifact_name"),
  artifactVersion: text("artifact_version"),
  buildId: text("build_id"),
  commitSha: text("commit_sha"),
  status: text("status").notNull(),
  requestedAt: integer("requested_at", { mode: "timestamp_ms" }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  targetMachine: text("target_machine"),
  stagesJson: text("stages_json"),
  rawJson: text("raw_json"),
  updatedAt: updatedAt()
}, (table) => [
  index("deployments_environment_time_idx").on(table.environment, table.startedAt),
  index("deployments_build_idx").on(table.buildId),
  index("deployments_commit_idx").on(table.commitSha)
]);

export const serviceStatusSamples = sqliteTable("service_status_samples", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  environment: text("environment").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  status: text("status").notNull(),
  latencyMs: integer("latency_ms"),
  errorCount: integer("error_count").notNull().default(0),
  warningCount: integer("warning_count").notNull().default(0),
  instanceCount: integer("instance_count").notNull().default(0),
  lastRestartAt: integer("last_restart_at", { mode: "timestamp_ms" }),
  grafanaUrl: text("grafana_url"),
  metadataJson: text("metadata_json")
}, (table) => [
  index("services_id_time_idx").on(table.serviceId, table.timestamp),
  index("services_environment_time_idx").on(table.environment, table.timestamp)
]);

export const oracleSamples = sqliteTable("oracle_samples", {
  id: text("id").primaryKey(),
  databaseName: text("database_name").notNull(),
  environment: text("environment").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  connectionOk: integer("connection_ok", { mode: "boolean" }).notNull(),
  connectMs: integer("connect_ms"),
  queryOk: integer("query_ok", { mode: "boolean" }).notNull(),
  queryMs: integer("query_ms"),
  applicationProbeMs: integer("application_probe_ms"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  metadataJson: text("metadata_json")
}, (table) => [index("oracle_environment_time_idx").on(table.environment, table.timestamp)]);

export const machineHealthSamples = sqliteTable("machine_health_samples", {
  id: text("id").primaryKey(),
  machineId: text("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  reachable: integer("reachable", { mode: "boolean" }).notNull(),
  cpuPercent: real("cpu_percent"),
  memoryPercent: real("memory_percent"),
  diskFreePercent: real("disk_free_percent"),
  uptimeSeconds: integer("uptime_seconds"),
  teamcityAgentOk: integer("teamcity_agent_ok", { mode: "boolean" }),
  metadataJson: text("metadata_json")
}, (table) => [index("machine_health_machine_time_idx").on(table.machineId, table.timestamp)]);

export const machinePackages = sqliteTable("machine_packages", {
  machineId: text("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
  packageName: text("package_name").notNull(),
  version: text("version").notNull(),
  capturedAt: integer("captured_at", { mode: "timestamp_ms" }).notNull()
}, (table) => [primaryKey({ columns: [table.machineId, table.packageName] }), index("machine_packages_name_idx").on(table.packageName)]);

export const machineEnvVars = sqliteTable("machine_env_vars", {
  machineId: text("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
  variableName: text("variable_name").notNull(),
  valueHash: text("value_hash").notNull(),
  displayValue: text("display_value").notNull(),
  sensitive: integer("sensitive", { mode: "boolean" }).notNull().default(false),
  capturedAt: integer("captured_at", { mode: "timestamp_ms" }).notNull()
}, (table) => [primaryKey({ columns: [table.machineId, table.variableName] })]);

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  timestamp: integer("timestamp", { mode: "timestamp_ms" }).notNull(),
  source: text("source").notNull(),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  environment: text("environment").notNull(),
  serviceId: text("service_id"),
  machineId: text("machine_id"),
  buildId: text("build_id"),
  deploymentId: text("deployment_id"),
  commitSha: text("commit_sha"),
  testOccurrenceId: text("test_occurrence_id"),
  summary: text("summary").notNull(),
  metadataJson: text("metadata_json")
}, (table) => [
  index("events_time_idx").on(table.timestamp),
  index("events_environment_time_idx").on(table.environment, table.timestamp),
  index("events_build_idx").on(table.buildId),
  index("events_machine_idx").on(table.machineId),
  index("events_service_idx").on(table.serviceId)
]);

export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("OPEN"),
  title: text("title").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  primaryEntityType: text("primary_entity_type").notNull(),
  primaryEntityId: text("primary_entity_id").notNull(),
  explanationJson: text("explanation_json")
}, (table) => [index("incidents_status_severity_idx").on(table.status, table.severity)]);

export const actions = sqliteTable("actions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  requestedBy: text("requested_by").notNull(),
  requestedAt: integer("requested_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status").notNull(),
  parametersJson: text("parameters_json").notNull(),
  incidentId: text("incident_id"),
  reason: text("reason").notNull(),
  plannedOnly: integer("planned_only", { mode: "boolean" }).notNull().default(true),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" })
}, (table) => [index("actions_status_time_idx").on(table.status, table.requestedAt)]);

export const actionTargets = sqliteTable("action_targets", {
  actionId: text("action_id").notNull().references(() => actions.id, { onDelete: "cascade" }),
  machineId: text("machine_id").notNull(),
  status: text("status").notNull(),
  previousStateJson: text("previous_state_json"),
  resultJson: text("result_json"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" })
}, (table) => [primaryKey({ columns: [table.actionId, table.machineId] })]);

export type BuildRow = typeof builds.$inferSelect;
export type TestOccurrenceRow = typeof testOccurrences.$inferSelect;
export type ServiceSampleRow = typeof serviceStatusSamples.$inferSelect;
export type MachineRow = typeof machines.$inferSelect;
