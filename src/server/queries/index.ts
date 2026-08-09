import { and, asc, desc, eq } from "drizzle-orm";
import { explainTestOccurrence } from "@/server/correlation/service";
import { db } from "@/server/db";
import {
  actionTargets,
  actions,
  buildArtifacts,
  builds,
  connectorHealth,
  deployments,
  events,
  gitCommitFiles,
  gitCommits,
  incidents,
  machineEnvVars,
  machineHealthSamples,
  machinePackages,
  machines,
  oracleSamples,
  serviceStatusSamples,
  teamcityAgents,
  testBaselines,
  testOccurrences
} from "@/server/db/schema";
import { getMachineDrift } from "@/server/machines/drift";
import { testKey } from "@/server/anomaly/service";
import { fromJson } from "@/shared/utils/json";

function uniqueLatest<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const value = key(row);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function getOverviewData() {
  const recentBuilds = db.select().from(builds).orderBy(desc(builds.finishedAt)).limit(20).all();
  const anomalousTests = db.select().from(testOccurrences).orderBy(desc(testOccurrences.finishedAt)).all()
    .filter((test) => test.anomalyType !== "NONE");
  const latestServices = uniqueLatest(
    db.select().from(serviceStatusSamples).orderBy(desc(serviceStatusSamples.timestamp)).all(),
    (sample) => `${sample.serviceId}:${sample.environment}`
  );
  const agentRows = db.select().from(teamcityAgents).all();
  const oracle = db.select().from(oracleSamples).orderBy(desc(oracleSamples.timestamp)).limit(1).get();
  const incidentRows = db.select().from(incidents).orderBy(desc(incidents.startedAt)).limit(6).all();
  const successCount = recentBuilds.filter((build) => build.status === "SUCCESS").length;

  return {
    metrics: {
      buildSuccessPercent: recentBuilds.length ? Math.round((successCount / recentBuilds.length) * 100) : 0,
      testAnomalies: anomalousTests.filter((test) => test.anomalySeverity === "HIGH" || test.anomalySeverity === "CRITICAL").length,
      healthyServices: latestServices.filter((sample) => sample.status === "HEALTHY").length,
      totalServices: latestServices.length,
      onlineAgents: agentRows.filter((agent) => agent.connected && agent.enabled).length,
      totalAgents: agentRows.length,
      oracleQueryMs: oracle?.queryMs ?? null,
      oracleHealthy: Boolean(oracle?.connectionOk && oracle?.queryOk)
    },
    buildTrend: [...recentBuilds].reverse().map((build) => ({
      build: `#${build.buildNumber}`,
      durationMinutes: Math.round((build.durationMs ?? 0) / 60_000),
      status: build.status
    })),
    testComparison: uniqueLatest(
      db.select().from(testOccurrences).orderBy(desc(testOccurrences.finishedAt)).all(),
      (test) => `${test.testName}:${test.testType}:${test.environment}`
    ).slice(0, 6).map((test) => {
      const baseline = db.select().from(testBaselines).where(eq(testBaselines.testKey, testKey(test.testName, test.testType, test.environment))).get();
      return {
        name: test.testName,
        currentMinutes: Math.round(test.durationMs / 60_000),
        medianMinutes: Math.round((baseline?.medianMs ?? test.durationMs) / 60_000),
        anomaly: test.anomalyType
      };
    }),
    serviceDistribution: ["HEALTHY", "DEGRADED", "UNHEALTHY", "UNKNOWN"].map((status) => ({
      name: status,
      value: latestServices.filter((sample) => sample.status === status).length
    })).filter((item) => item.value > 0),
    incidents: incidentRows,
    timeline: getTimeline(8),
    connectors: getConnectorHealth()
  };
}

export function getConnectorHealth() {
  return db.select().from(connectorHealth).orderBy(asc(connectorHealth.label)).all();
}

export function getTimeline(limit = 100) {
  return db.select().from(events).orderBy(desc(events.timestamp)).limit(limit).all();
}

export function getIncidents(limit = 100) {
  return db.select().from(incidents).orderBy(desc(incidents.startedAt)).limit(limit).all();
}

export function getBuilds() {
  const rows = db.select().from(builds).orderBy(desc(builds.finishedAt)).all();
  const commitRows = new Map(db.select().from(gitCommits).all().map((commit) => [commit.sha, commit]));
  const agentRows = new Map(db.select().from(teamcityAgents).all().map((agent) => [agent.id, agent]));
  const deploymentRows = new Map(db.select().from(deployments).all().filter((deployment) => deployment.buildId).map((deployment) => [deployment.buildId!, deployment]));
  return rows.map((build) => ({
    ...build,
    commit: build.commitSha ? commitRows.get(build.commitSha) : undefined,
    agent: build.agentId ? agentRows.get(build.agentId) : undefined,
    deployment: deploymentRows.get(build.id)
  }));
}

export function getBuildDetail(id: string) {
  const build = db.select().from(builds).where(eq(builds.id, id)).get();
  if (!build) return undefined;
  return {
    ...build,
    parameters: fromJson<Record<string, string>>(build.parametersJson, {}),
    agent: build.agentId ? db.select().from(teamcityAgents).where(eq(teamcityAgents.id, build.agentId)).get() : undefined,
    commit: build.commitSha ? db.select().from(gitCommits).where(eq(gitCommits.sha, build.commitSha)).get() : undefined,
    artifacts: db.select().from(buildArtifacts).where(eq(buildArtifacts.buildId, id)).all(),
    tests: db.select().from(testOccurrences).where(eq(testOccurrences.buildId, id)).orderBy(desc(testOccurrences.durationMs)).all(),
    deployments: db.select().from(deployments).where(eq(deployments.buildId, id)).orderBy(desc(deployments.startedAt)).all()
  };
}

export function getTests() {
  const rows = uniqueLatest(
    db.select().from(testOccurrences).orderBy(desc(testOccurrences.finishedAt)).all(),
    (test) => `${test.testName}:${test.testType}:${test.environment}`
  );
  return rows.map((test) => {
    const baseline = db.select().from(testBaselines).where(eq(testBaselines.testKey, testKey(test.testName, test.testType, test.environment))).get();
    const deltaPercent = baseline?.medianMs ? ((test.durationMs - baseline.medianMs) / baseline.medianMs) * 100 : 0;
    return { ...test, baseline, deltaPercent };
  });
}

export function getTestDetail(id: string) {
  const occurrence = db.select().from(testOccurrences).where(eq(testOccurrences.id, id)).get();
  if (!occurrence) return undefined;
  const baseline = db.select().from(testBaselines).where(eq(testBaselines.testKey, testKey(occurrence.testName, occurrence.testType, occurrence.environment))).get();
  const history = db.select().from(testOccurrences).where(and(
    eq(testOccurrences.testName, occurrence.testName),
    eq(testOccurrences.testType, occurrence.testType),
    eq(testOccurrences.environment, occurrence.environment)
  )).orderBy(asc(testOccurrences.startedAt)).all();
  const build = db.select().from(builds).where(eq(builds.id, occurrence.buildId)).get();
  const machine = occurrence.machineId ? db.select().from(machines).where(eq(machines.id, occurrence.machineId)).get() : undefined;
  return {
    occurrence,
    baseline,
    history,
    build,
    machine,
    explanation: explainTestOccurrence(id)
  };
}

export function getServices() {
  const latest = uniqueLatest(
    db.select().from(serviceStatusSamples).orderBy(desc(serviceStatusSamples.timestamp)).all(),
    (sample) => `${sample.serviceId}:${sample.environment}`
  );
  const anomalies = db.select().from(testOccurrences).all().filter((test) => test.anomalyType !== "NONE");
  return latest.map((service) => ({
    ...service,
    relatedAnomalyCount: anomalies.filter((test) => test.probableCause === service.serviceName).length
  }));
}

export function getServiceDetail(id: string) {
  const history = db.select().from(serviceStatusSamples).where(eq(serviceStatusSamples.serviceId, id)).orderBy(asc(serviceStatusSamples.timestamp)).all();
  if (!history.length) return undefined;
  const current = history.at(-1)!;
  return {
    current,
    history,
    deployments: db.select().from(deployments).where(eq(deployments.service, current.serviceName)).orderBy(desc(deployments.startedAt)).limit(10).all(),
    anomalies: db.select().from(testOccurrences).where(eq(testOccurrences.probableCause, current.serviceName)).orderBy(desc(testOccurrences.finishedAt)).limit(10).all()
  };
}

export function getFleet() {
  const machineRows = db.select().from(machines).orderBy(asc(machines.hostname)).all();
  const agentRows = db.select().from(teamcityAgents).all();
  return machineRows.map((machine) => ({
    ...machine,
    health: db.select().from(machineHealthSamples).where(eq(machineHealthSamples.machineId, machine.id)).orderBy(desc(machineHealthSamples.timestamp)).limit(1).get(),
    agent: agentRows.find((agent) => agent.machineId === machine.id),
    drift: getMachineDrift(machine.id)
  }));
}

export function getMachineDetail(id: string) {
  const machine = db.select().from(machines).where(eq(machines.id, id)).get();
  if (!machine) return undefined;
  return {
    machine,
    health: db.select().from(machineHealthSamples).where(eq(machineHealthSamples.machineId, id)).orderBy(desc(machineHealthSamples.timestamp)).all(),
    packages: db.select().from(machinePackages).where(eq(machinePackages.machineId, id)).orderBy(asc(machinePackages.packageName)).all(),
    environment: db.select().from(machineEnvVars).where(eq(machineEnvVars.machineId, id)).orderBy(asc(machineEnvVars.variableName)).all(),
    agent: db.select().from(teamcityAgents).where(eq(teamcityAgents.machineId, id)).get(),
    drift: getMachineDrift(id)
  };
}

export function getCommits() {
  return db.select().from(gitCommits).orderBy(desc(gitCommits.committerDate)).all().map((commit) => ({
    ...commit,
    changedFileCount: db.select({ path: gitCommitFiles.path }).from(gitCommitFiles).where(eq(gitCommitFiles.commitSha, commit.sha)).all().length,
    buildCount: db.select({ id: builds.id }).from(builds).where(eq(builds.commitSha, commit.sha)).all().length
  }));
}

export function getCommitDetail(sha: string) {
  const commit = db.select().from(gitCommits).where(eq(gitCommits.sha, sha)).get();
  if (!commit) return undefined;
  return {
    commit,
    files: db.select().from(gitCommitFiles).where(eq(gitCommitFiles.commitSha, sha)).orderBy(asc(gitCommitFiles.path)).all(),
    builds: db.select().from(builds).where(eq(builds.commitSha, sha)).orderBy(desc(builds.startedAt)).all(),
    deployments: db.select().from(deployments).where(eq(deployments.commitSha, sha)).orderBy(desc(deployments.startedAt)).all()
  };
}

export function getActions() {
  return db.select().from(actions).orderBy(desc(actions.requestedAt)).all().map((action) => ({
    ...action,
    targets: db.select({
      machineId: actionTargets.machineId,
      status: actionTargets.status
    }).from(actionTargets).where(eq(actionTargets.actionId, action.id)).all()
  }));
}
