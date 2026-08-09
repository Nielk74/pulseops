import { asc, eq } from "drizzle-orm";
import { calculateBaseline } from "@/server/anomaly/statistics";
import { detectAnomaly } from "@/server/anomaly/detector";
import { db } from "@/server/db";
import { builds, events, incidents, testBaselines, testOccurrences } from "@/server/db/schema";
import { toJson } from "@/shared/utils/json";

export function testKey(testName: string, testType: string, environment: string) {
  return `${testName}::${testType}::${environment}`;
}

export function recomputeTestAnomalies() {
  const occurrences = db.select().from(testOccurrences).orderBy(asc(testOccurrences.startedAt)).all();
  const histories = new Map<string, { durations: number[]; testCounts: number[] }>();
  const anomalyCounts = new Map<string, number>();

  db.transaction((tx) => {
    for (const occurrence of occurrences) {
      const key = testKey(occurrence.testName, occurrence.testType, occurrence.environment);
      const history = histories.get(key) ?? { durations: [], testCounts: [] };
      const baseline = calculateBaseline(history.durations, history.testCounts);
      const result = detectAnomaly(occurrence.durationMs, baseline, occurrence.testCount ?? undefined);

      tx.update(testOccurrences).set({
        anomalyType: result.type,
        anomalySeverity: result.severity,
        anomalyScore: result.score,
        evidenceJson: toJson(result.reasons)
      }).where(eq(testOccurrences.id, occurrence.id)).run();

      if (result.type !== "NONE") {
        anomalyCounts.set(occurrence.buildId, (anomalyCounts.get(occurrence.buildId) ?? 0) + 1);
        const summary = result.type === "SLOW"
          ? `${occurrence.testName} is ${Math.round(result.deltaPercent)}% slower than normal`
          : `${occurrence.testName} is suspiciously fast (${Math.round(Math.abs(result.deltaPercent))}% below normal)`;
        tx.insert(events).values({
          id: `test-anomaly-${occurrence.id}`,
          timestamp: occurrence.finishedAt,
          source: "anomaly",
          type: "TEST_ANOMALY",
          severity: result.severity,
          environment: occurrence.environment,
          machineId: occurrence.machineId,
          buildId: occurrence.buildId,
          testOccurrenceId: occurrence.id,
          summary,
          metadataJson: toJson({ anomalyType: result.type, score: result.score, deltaPercent: result.deltaPercent })
        }).onConflictDoUpdate({ target: events.id, set: { severity: result.severity, summary } }).run();
        tx.insert(incidents).values({
          id: `incident-test-${occurrence.id}`,
          type: result.type === "SLOW" ? "SLOW_TEST" : "FAST_TEST",
          severity: result.severity,
          status: "OPEN",
          title: summary,
          startedAt: occurrence.finishedAt,
          primaryEntityType: "TEST_OCCURRENCE",
          primaryEntityId: occurrence.id,
          explanationJson: toJson({ anomaly: result, baseline })
        }).onConflictDoUpdate({ target: incidents.id, set: {
          severity: result.severity,
          title: summary,
          explanationJson: toJson({ anomaly: result, baseline })
        } }).run();
      }

      if (occurrence.status === "PASSED" && result.type === "NONE") {
        history.durations.push(occurrence.durationMs);
        if (occurrence.testCount) history.testCounts.push(occurrence.testCount);
      }
      histories.set(key, history);
    }

    for (const [key, history] of histories) {
      if (!history.durations.length) continue;
      const baseline = calculateBaseline(history.durations, history.testCounts);
      tx.insert(testBaselines).values({
        testKey: key,
        ...baseline,
        updatedAt: new Date()
      }).onConflictDoUpdate({ target: testBaselines.testKey, set: { ...baseline, updatedAt: new Date() } }).run();
    }

    for (const build of tx.select({ id: builds.id }).from(builds).all()) {
      tx.update(builds).set({ testAnomalyCount: anomalyCounts.get(build.id) ?? 0 }).where(eq(builds.id, build.id)).run();
    }
  });

  return [...anomalyCounts.values()].reduce((total, count) => total + count, 0);
}
