import { createHash } from "node:crypto";
import type {
  DeploymentFact,
  GitCommitFact,
  MachineFact,
  OracleSampleFact,
  ServiceStatusFact,
  TeamCitySnapshot,
  TestOccurrenceFact
} from "@/shared/types/domain";

const minute = 60_000;
const hour = 60 * minute;

function ago(anchor: Date, milliseconds: number) {
  return new Date(anchor.getTime() - milliseconds);
}

function shaFor(index: number) {
  return createHash("sha1").update(`pulseops-mock-commit-${index}`).digest("hex");
}

const pricingDurations = [1_835, 1_879, 1_844, 1_918, 1_866, 1_821, 1_902, 1_858, 1_891, 1_875, 1_927, 1_849, 1_884, 2_832].map((value) => value * 1_000);
const loginDurations = [531, 552, 545, 529, 566, 541, 538, 559, 550, 536, 548, 543, 557, 181].map((value) => value * 1_000);
const coreDurations = [421, 438, 429, 447, 415, 433, 440, 426, 452, 431, 423, 446, 435, 468].map((value) => value * 1_000);
const sasDurations = [1_192, 1_225, 1_211, 1_184, 1_239, 1_205, 1_198, 1_217, 1_228, 1_201, 1_194, 1_232, 1_209, 1_263].map((value) => value * 1_000);

function testFact(
  buildId: string,
  index: number,
  name: string,
  type: TestOccurrenceFact["testType"],
  durationMs: number,
  startedAt: Date,
  machineId: string,
  testCount: number
): TestOccurrenceFact {
  return {
    id: `${buildId}-${name.toLowerCase().replaceAll(" ", "-")}`,
    externalId: `tc-${buildId}-${name}`,
    buildId,
    testName: name,
    testSuite: type === "UNIT" ? "Core" : `${type} acceptance`,
    testType: type,
    status: index === 10 && name === "SAS Monthly" ? "FAILED" : "PASSED",
    durationMs,
    machineId,
    workerId: type === "UNIT" ? `worker-${(index % 4) + 1}` : machineId,
    environment: "DEV2",
    startedAt,
    finishedAt: new Date(startedAt.getTime() + durationMs),
    failureMessage: index === 10 && name === "SAS Monthly" ? "Report validation timed out" : undefined,
    testCount,
    passedCount: index === 10 && name === "SAS Monthly" ? testCount - 1 : testCount,
    failedCount: index === 10 && name === "SAS Monthly" ? 1 : 0,
    skippedCount: 0
  };
}

export function createMockTeamCitySnapshot(anchor = new Date()): TeamCitySnapshot {
  const builds: TeamCitySnapshot["builds"] = [];
  const artifacts: TeamCitySnapshot["artifacts"] = [];
  const tests: TeamCitySnapshot["tests"] = [];

  for (let index = 0; index < pricingDurations.length; index += 1) {
    const buildId = `build-${91809 + index}`;
    const finishedAt = ago(anchor, (pricingDurations.length - 1 - index) * 6 * hour + 5 * minute);
    const longestDuration = Math.max(pricingDurations[index], sasDurations[index]);
    const startedAt = new Date(finishedAt.getTime() - longestDuration - 18 * minute);
    const queuedAt = new Date(startedAt.getTime() - (2 + (index % 4)) * minute);
    const machineId = index === pricingDurations.length - 1 ? "machine-uft-03" : `machine-uft-0${(index % 2) + 1}`;
    const commitSha = shaFor(Math.max(0, index - 9));

    builds.push({
      id: buildId,
      buildType: index % 3 === 0 ? "Acceptance / Full" : "Acceptance / Continuous",
      branch: index % 5 === 0 ? "release/4.18" : "main",
      status: index === 10 ? "FAILURE" : "SUCCESS",
      state: "FINISHED",
      queuedAt,
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      queueDurationMs: startedAt.getTime() - queuedAt.getTime(),
      agentId: machineId.replace("machine-", "agent-"),
      buildNumber: `${91809 + index}`,
      commitSha,
      environment: "DEV2",
      parameters: { artifactVersion: `4.18.${index + 1}`, testPool: "acceptance" }
    });

    artifacts.push({
      id: `artifact-${buildId}`,
      buildId,
      name: "pricing-suite.zip",
      path: `artifacts/4.18.${index + 1}/pricing-suite.zip`,
      version: `4.18.${index + 1}`,
      sizeBytes: 8_400_000 + index * 32_000,
      checksum: createHash("sha256").update(buildId).digest("hex")
    });

    const testStart = new Date(startedAt.getTime() + 10 * minute);
    tests.push(
      testFact(buildId, index, "UFT Pricing", "UFT", pricingDurations[index], testStart, machineId, 124),
      testFact(buildId, index, "UFT Login", "UFT", loginDurations[index], testStart, machineId, index === 13 ? 38 : 143),
      testFact(buildId, index, "Unit Core", "UNIT", coreDurations[index], testStart, "machine-build-01", 2_486),
      testFact(buildId, index, "SAS Monthly", "SAS", sasDurations[index], testStart, "machine-sas-01", 61)
    );
  }

  return {
    builds,
    artifacts,
    tests,
    agents: [
      { id: "agent-uft-01", name: "UFT-01", machineId: "machine-uft-01", connected: true, enabled: true, authorized: true, pool: "UFT", version: "2025.11.2", lastSeenAt: ago(anchor, 12_000) },
      { id: "agent-uft-02", name: "UFT-02", machineId: "machine-uft-02", connected: true, enabled: true, authorized: true, pool: "UFT", version: "2025.11.2", lastSeenAt: ago(anchor, 18_000) },
      { id: "agent-uft-03", name: "UFT-03", machineId: "machine-uft-03", connected: true, enabled: true, authorized: true, pool: "UFT", version: "2025.11.2", lastSeenAt: ago(anchor, 9_000) },
      { id: "agent-build-01", name: "BUILD-01", machineId: "machine-build-01", connected: true, enabled: true, authorized: true, pool: "Build", version: "2025.11.2", lastSeenAt: ago(anchor, 22_000) },
      { id: "agent-sas-01", name: "SAS-01", machineId: "machine-sas-01", connected: false, enabled: true, authorized: true, pool: "SAS", version: "2025.11.2", lastSeenAt: ago(anchor, 14 * minute) }
    ]
  };
}

export function createMockDeployments(anchor = new Date()): DeploymentFact[] {
  return [0, 1, 2, 3, 4].map((index) => {
    const startedAt = ago(anchor, index * 12 * hour + (index === 0 ? 58 : 30) * minute);
    const buildNumber = 91822 - index;
    return {
      id: `deployment-${buildNumber}`,
      environment: "DEV2",
      application: "Commerce Platform",
      service: index % 2 === 0 ? "PricingApi" : "AuthApi",
      artifactName: "commerce-services",
      artifactVersion: `4.18.${14 - index}`,
      buildId: `build-${buildNumber}`,
      commitSha: shaFor(Math.max(0, 4 - index)),
      status: index === 3 ? "FAILED" : "SUCCESS",
      requestedAt: new Date(startedAt.getTime() - 2 * minute),
      startedAt,
      finishedAt: new Date(startedAt.getTime() + 4 * minute),
      targetMachine: `DEV2-APP-0${(index % 2) + 1}`,
      stages: [
        { type: "ARTIFACT_DOWNLOAD_FINISHED", timestamp: new Date(startedAt.getTime() + minute), status: "SUCCESS" },
        { type: "SERVICE_START_FINISHED", timestamp: new Date(startedAt.getTime() + 3 * minute), status: index === 3 ? "FAILED" : "SUCCESS" },
        { type: index === 3 ? "DEPLOYMENT_FAILED" : "DEPLOYMENT_COMPLETED", timestamp: new Date(startedAt.getTime() + 4 * minute), status: index === 3 ? "FAILED" : "SUCCESS" }
      ]
    };
  });
}

export function createMockServiceStatuses(anchor = new Date()): ServiceStatusFact[] {
  const services = [
    { id: "pricing-api", name: "PricingApi", base: 84 },
    { id: "auth-api", name: "AuthApi", base: 48 },
    { id: "catalog-api", name: "CatalogApi", base: 62 },
    { id: "reporting-api", name: "ReportingApi", base: 115 }
  ];

  return services.flatMap((service) =>
    Array.from({ length: 10 }, (_, reverseIndex) => {
      const index = 9 - reverseIndex;
      const timestamp = ago(anchor, index * 8 * minute + 2 * minute);
      const pricingIncident = service.id === "pricing-api" && index >= 2 && index <= 7;
      const reportingWarning = service.id === "reporting-api" && index === 0;
      return {
        id: `service-${service.id}-${timestamp.getTime()}`,
        serviceId: service.id,
        serviceName: service.name,
        environment: "DEV2",
        timestamp,
        status: pricingIncident ? "DEGRADED" : reportingWarning ? "DEGRADED" : "HEALTHY",
        latencyMs: pricingIncident ? service.base * 5 + index * 7 : service.base + (index % 3) * 4,
        errorCount: pricingIncident ? 42 + index * 9 : reportingWarning ? 8 : 0,
        warningCount: pricingIncident ? 18 : reportingWarning ? 14 : 1,
        instanceCount: 3,
        lastRestartAt: service.id === "pricing-api" ? ago(anchor, 52 * minute) : undefined,
        grafanaUrl: `https://grafana.example.test/d/${service.id}`,
        metadata: pricingIncident ? { signature: "UPSTREAM_TIMEOUT", timeoutCount: 74 } : undefined
      } satisfies ServiceStatusFact;
    })
  );
}

export function createMockCommits(anchor = new Date()): GitCommitFact[] {
  const details = [
    ["Change pricing cache strategy", "A. Rivera", "services/pricing/PriceEngine.cs"],
    ["Harden authentication token refresh", "M. Chen", "services/auth/TokenRefresh.cs"],
    ["Tune monthly reporting query", "S. Dubois", "services/reporting/MonthlyReport.sql"],
    ["Update acceptance test fixtures", "J. Singh", "tests/uft/pricing-fixtures.json"],
    ["Reduce catalog response allocations", "K. Taylor", "services/catalog/CatalogMapper.cs"]
  ] as const;

  return details.map(([subject, authorName, file], index) => ({
    sha: shaFor(index),
    repositoryId: "application",
    authorName,
    authorEmail: `${authorName.toLowerCase().replaceAll(" ", ".")}@example.test`,
    authorDate: ago(anchor, (details.length - index) * 8 * hour),
    committerDate: ago(anchor, (details.length - index) * 8 * hour),
    subject,
    body: `${subject}. Includes targeted validation and rollout notes.`,
    parentSha: index === 0 ? undefined : shaFor(index - 1),
    changedFiles: [
      { path: file, changeType: "MODIFIED", additions: 24 + index * 3, deletions: 8 + index },
      { path: "CHANGELOG.md", changeType: "MODIFIED", additions: 2, deletions: 0 }
    ]
  }));
}

export function createMockOracleSamples(anchor = new Date()): OracleSampleFact[] {
  return Array.from({ length: 16 }, (_, reverseIndex) => {
    const index = 15 - reverseIndex;
    const timestamp = ago(anchor, index * 6 * minute + minute);
    return {
      id: `oracle-dev2-${timestamp.getTime()}`,
      databaseName: "DEV2",
      environment: "DEV2",
      timestamp,
      connectionOk: true,
      connectMs: 18 + (index % 4) * 2,
      queryOk: true,
      queryMs: 38 + (index % 5) * 3,
      applicationProbeMs: 65 + (index % 3) * 6,
      metadata: { probe: "SELECT 1 FROM dual" }
    };
  });
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createMockMachines(anchor = new Date()): MachineFact[] {
  const machineDefinitions: Array<[string, MachineFact["role"], string | undefined]> = [
    ["UFT-01", "UFT_AGENT", undefined],
    ["UFT-02", "UFT_AGENT", "machine-uft-01"],
    ["UFT-03", "UFT_AGENT", "machine-uft-01"],
    ["BUILD-01", "BUILD_AGENT", undefined],
    ["SAS-01", "SAS_AGENT", undefined]
  ];

  return machineDefinitions.map(([hostname, role, referenceMachineId], index) => {
    const id = `machine-${hostname.toLowerCase()}`;
    const isDrifted = hostname === "UFT-03";
    const isOffline = hostname === "SAS-01";
    const capturedAt = ago(anchor, (index + 1) * 45_000);
    return {
      id,
      hostname,
      role,
      environment: "DEV2",
      enabled: true,
      referenceMachineId,
      lastSeenAt: isOffline ? ago(anchor, 14 * minute) : capturedAt,
      health: {
        id: `health-${id}-${capturedAt.getTime()}`,
        timestamp: capturedAt,
        reachable: !isOffline,
        cpuPercent: isDrifted ? 54 : 24 + index * 4,
        memoryPercent: isDrifted ? 66 : 48 + index * 3,
        diskFreePercent: 62 - index * 4,
        uptimeSeconds: 864_000 - index * 31_000,
        teamcityAgentOk: !isOffline,
        services: { TeamCityAgent: isOffline ? "STOPPED" : "RUNNING", ChromeDriver: "RUNNING" }
      },
      packages: [
        { name: "googlechrome", version: isDrifted ? "137.0.7151" : "138.0.7204", capturedAt },
        { name: "temurin21", version: "21.0.7", capturedAt },
        { name: "internal-tool", version: isDrifted ? "4.2.0" : "4.3.0", capturedAt }
      ],
      environmentVariables: [
        { name: "APP_ENV", valueHash: hashValue("DEV2"), displayValue: "DEV2", sensitive: false, capturedAt },
        { name: "API_URL", valueHash: hashValue(isDrifted ? "https://api-old.dev2" : "https://api.dev2"), displayValue: isDrifted ? "https://api-old.dev2" : "https://api.dev2", sensitive: false, capturedAt },
        { name: "SERVICE_TOKEN", valueHash: hashValue(`secret-${isDrifted ? "old" : "current"}`), displayValue: "***", sensitive: true, capturedAt }
      ],
      metadata: { os: "Windows Server 2025", group: role.replace("_AGENT", "") }
    } satisfies MachineFact;
  });
}
