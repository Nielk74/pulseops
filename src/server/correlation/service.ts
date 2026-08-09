import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { calculateBaseline, median } from "@/server/anomaly/statistics";
import { testKey } from "@/server/anomaly/service";
import { scoreEvidence } from "@/server/correlation/scoring";
import { db } from "@/server/db";
import {
  builds,
  deployments,
  gitCommitFiles,
  gitCommits,
  incidents,
  machineHealthSamples,
  machines,
  oracleSamples,
  serviceStatusSamples,
  testBaselines,
  testOccurrences
} from "@/server/db/schema";
import { getMachineDrift } from "@/server/machines/drift";
import type { HealthStatus, TestExplanation } from "@/shared/types/domain";
import { toJson } from "@/shared/utils/json";

export function explainTestOccurrence(occurrenceId: string): TestExplanation | undefined {
  const occurrence = db.select().from(testOccurrences).where(eq(testOccurrences.id, occurrenceId)).get();
  if (!occurrence) return undefined;

  const baseline = db.select().from(testBaselines).where(eq(
    testBaselines.testKey,
    testKey(occurrence.testName, occurrence.testType, occurrence.environment)
  )).get();
  const fallbackBaseline = calculateBaseline([occurrence.durationMs]);
  const medianDuration = baseline?.medianMs ?? fallbackBaseline.medianMs;
  const windowStart = new Date(occurrence.startedAt.getTime() - 5 * 60_000);
  const windowEnd = new Date(occurrence.finishedAt.getTime() + 5 * 60_000);

  const samples = db.select().from(serviceStatusSamples).where(and(
    eq(serviceStatusSamples.environment, occurrence.environment),
    gte(serviceStatusSamples.timestamp, windowStart),
    lte(serviceStatusSamples.timestamp, windowEnd)
  )).orderBy(asc(serviceStatusSamples.timestamp)).all();
  const groupedServices = new Map<string, typeof samples>();
  for (const sample of samples) groupedServices.set(sample.serviceId, [...(groupedServices.get(sample.serviceId) ?? []), sample]);
  const serviceContext = [...groupedServices.values()].map((group) => {
    const abnormal = group.filter((sample) => sample.status !== "HEALTHY");
    const worst = abnormal.find((sample) => sample.status === "UNHEALTHY") ?? abnormal[0] ?? group.at(-1)!;
    return {
      serviceName: worst.serviceName,
      status: worst.status as HealthStatus,
      latencyMs: Math.max(...group.map((sample) => sample.latencyMs ?? 0)),
      errorCount: group.reduce((total, sample) => total + sample.errorCount, 0),
      overlapPercent: group.length ? (abnormal.length / group.length) * 100 : 0
    };
  });

  const oracleWindow = db.select().from(oracleSamples).where(and(
    eq(oracleSamples.environment, occurrence.environment),
    gte(oracleSamples.timestamp, windowStart),
    lte(oracleSamples.timestamp, windowEnd)
  )).orderBy(desc(oracleSamples.timestamp)).all();
  const allOracle = db.select({ queryMs: oracleSamples.queryMs }).from(oracleSamples).where(eq(oracleSamples.environment, occurrence.environment)).all();
  const oracleLatest = oracleWindow[0];

  const machine = occurrence.machineId ? db.select().from(machines).where(eq(machines.id, occurrence.machineId)).get() : undefined;
  const machineHealth = machine ? db.select().from(machineHealthSamples).where(and(
    eq(machineHealthSamples.machineId, machine.id),
    lte(machineHealthSamples.timestamp, new Date(occurrence.finishedAt.getTime() + 15 * 60_000))
  )).orderBy(desc(machineHealthSamples.timestamp)).limit(1).get() : undefined;

  const deployment = db.select().from(deployments).where(and(
    eq(deployments.environment, occurrence.environment),
    lte(deployments.requestedAt, occurrence.finishedAt)
  )).orderBy(desc(deployments.requestedAt)).limit(1).get();
  const build = db.select().from(builds).where(eq(builds.id, occurrence.buildId)).get();
  const commit = build?.commitSha ? db.select().from(gitCommits).where(eq(gitCommits.sha, build.commitSha)).get() : undefined;
  const changedFiles = commit ? db.select({ path: gitCommitFiles.path }).from(gitCommitFiles).where(eq(gitCommitFiles.commitSha, commit.sha)).all().map((item) => item.path) : [];

  const evidence = scoreEvidence({
    anomalyType: occurrence.anomalyType as "SLOW" | "FAST" | "NONE",
    currentTestCount: occurrence.testCount,
    medianTestCount: baseline?.medianTestCount,
    services: serviceContext,
    oracle: oracleLatest ? {
      connectionOk: oracleLatest.connectionOk,
      queryOk: oracleLatest.queryOk,
      queryMs: oracleLatest.queryMs,
      baselineQueryMs: median(allOracle.map((sample) => sample.queryMs).filter((value): value is number => value !== null))
    } : undefined,
    machine: machine && machineHealth ? {
      hostname: machine.hostname,
      reachable: machineHealth.reachable,
      cpuPercent: machineHealth.cpuPercent,
      driftCount: getMachineDrift(machine.id).length
    } : undefined,
    deployment: deployment ? {
      service: deployment.service,
      status: deployment.status,
      minutesBeforeRun: Math.max(0, (occurrence.startedAt.getTime() - deployment.requestedAt.getTime()) / 60_000)
    } : undefined,
    commit: commit ? { sha: commit.sha, subject: commit.subject, changedFiles } : undefined
  });

  const deltaPercent = medianDuration === 0 ? 0 : ((occurrence.durationMs - medianDuration) / medianDuration) * 100;
  return {
    occurrenceId,
    anomaly: {
      type: occurrence.anomalyType as TestExplanation["anomaly"]["type"],
      severity: occurrence.anomalySeverity as TestExplanation["anomaly"]["severity"],
      score: occurrence.anomalyScore,
      currentDurationMs: occurrence.durationMs,
      medianDurationMs: medianDuration,
      deltaPercent
    },
    evidence,
    probableCauses: evidence.slice(0, 3)
  };
}

export function enrichAnomalyExplanations() {
  const anomalous = db.select({ id: testOccurrences.id }).from(testOccurrences).where(
    // SQLite string enums keep this deliberately explicit and index-friendly.
    // Drizzle's `ne` is avoided here so the query remains portable across driver versions.
    eq(testOccurrences.anomalyType, "SLOW")
  ).all().concat(db.select({ id: testOccurrences.id }).from(testOccurrences).where(eq(testOccurrences.anomalyType, "FAST")).all());

  for (const item of anomalous) {
    const explanation = explainTestOccurrence(item.id);
    if (!explanation) continue;
    const cause = explanation.probableCauses[0];
    db.update(testOccurrences).set({
      probableCause: cause?.entity ?? cause?.category ?? "Unknown",
      evidenceJson: toJson(explanation.evidence)
    }).where(eq(testOccurrences.id, item.id)).run();
    db.update(incidents).set({ explanationJson: toJson(explanation) }).where(eq(incidents.primaryEntityId, item.id)).run();
  }
  return anomalous.length;
}
