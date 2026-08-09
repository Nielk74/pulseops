export type SourceId =
  | "teamcity"
  | "deployments"
  | "services"
  | "git"
  | "oracle"
  | "machines";

export type ConnectorMode = "mock" | "live";
export type ConnectorState = "IDLE" | "SYNCING" | "HEALTHY" | "ERROR" | "STALE" | "UNCONFIGURED";
export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type HealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN";
export type TestType = "UNIT" | "UFT" | "SAS" | "OTHER";
export type TestStatus = "PASSED" | "FAILED" | "IGNORED" | "UNKNOWN";
export type AnomalyType = "SLOW" | "FAST" | "NONE";

export interface BuildFact {
  id: string;
  buildType: string;
  branch: string;
  status: "SUCCESS" | "FAILURE" | "UNKNOWN";
  state: "QUEUED" | "RUNNING" | "FINISHED";
  queuedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  queueDurationMs?: number;
  agentId?: string;
  buildNumber: string;
  commitSha?: string;
  environment: string;
  parameters?: Record<string, string>;
}

export interface ArtifactFact {
  id: string;
  buildId: string;
  name: string;
  path: string;
  version?: string;
  sizeBytes?: number;
  checksum?: string;
}

export interface TestOccurrenceFact {
  id: string;
  externalId: string;
  buildId: string;
  testName: string;
  testSuite?: string;
  testType: TestType;
  status: TestStatus;
  durationMs: number;
  machineId?: string;
  workerId?: string;
  environment: string;
  startedAt: Date;
  finishedAt: Date;
  failureMessage?: string;
  testCount?: number;
  passedCount?: number;
  failedCount?: number;
  skippedCount?: number;
}

export interface AgentFact {
  id: string;
  name: string;
  machineId?: string;
  connected: boolean;
  enabled: boolean;
  authorized: boolean;
  currentBuildId?: string;
  pool?: string;
  version?: string;
  lastSeenAt: Date;
}

export interface TeamCitySnapshot {
  builds: BuildFact[];
  artifacts: ArtifactFact[];
  tests: TestOccurrenceFact[];
  agents: AgentFact[];
}

export interface DeploymentFact {
  id: string;
  environment: string;
  application: string;
  service?: string;
  artifactName?: string;
  artifactVersion?: string;
  buildId?: string;
  commitSha?: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  requestedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  targetMachine?: string;
  stages?: Array<{ type: string; timestamp: Date; status: string }>;
  raw?: unknown;
}

export interface ServiceStatusFact {
  id: string;
  serviceId: string;
  serviceName: string;
  environment: string;
  timestamp: Date;
  status: HealthStatus;
  latencyMs?: number;
  errorCount: number;
  warningCount: number;
  instanceCount: number;
  lastRestartAt?: Date;
  grafanaUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface GitCommitFact {
  sha: string;
  repositoryId: string;
  authorName: string;
  authorEmail?: string;
  authorDate: Date;
  committerDate: Date;
  subject: string;
  body?: string;
  parentSha?: string;
  changedFiles: Array<{
    path: string;
    changeType: "ADDED" | "MODIFIED" | "DELETED" | "RENAMED";
    additions?: number;
    deletions?: number;
  }>;
}

export interface OracleSampleFact {
  id: string;
  databaseName: string;
  environment: string;
  timestamp: Date;
  connectionOk: boolean;
  connectMs?: number;
  queryOk: boolean;
  queryMs?: number;
  applicationProbeMs?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export type MachineRole =
  | "BUILD_AGENT"
  | "UNIT_TEST_AGENT"
  | "UFT_AGENT"
  | "SAS_AGENT"
  | "DEPLOYMENT_TARGET"
  | "OTHER";

export interface MachineFact {
  id: string;
  hostname: string;
  role: MachineRole;
  environment: string;
  enabled: boolean;
  referenceMachineId?: string;
  lastSeenAt: Date;
  health: {
    id: string;
    timestamp: Date;
    reachable: boolean;
    cpuPercent?: number;
    memoryPercent?: number;
    diskFreePercent?: number;
    uptimeSeconds?: number;
    teamcityAgentOk?: boolean;
    services?: Record<string, string>;
  };
  packages: Array<{ name: string; version: string; capturedAt: Date }>;
  environmentVariables: Array<{
    name: string;
    valueHash: string;
    displayValue: string;
    sensitive: boolean;
    capturedAt: Date;
  }>;
  metadata?: Record<string, unknown>;
}

export interface ConnectorInfo {
  id: SourceId;
  label: string;
  mode: ConnectorMode;
  state: ConnectorState;
  lastStartedAt?: Date;
  lastFinishedAt?: Date;
  lastSuccessAt?: Date;
  lastError?: string;
  recordsSynced: number;
}

export interface Evidence {
  category: "SERVICE" | "ORACLE" | "AGENT" | "MACHINE" | "DEPLOYMENT" | "COMMIT" | "TEST_CONFIGURATION" | "UNKNOWN";
  entity?: string;
  score: number;
  observations: string[];
}

export interface TestExplanation {
  occurrenceId: string;
  anomaly: {
    type: AnomalyType;
    severity: Severity;
    score: number;
    currentDurationMs: number;
    medianDurationMs: number;
    deltaPercent: number;
  };
  evidence: Evidence[];
  probableCauses: Evidence[];
}
