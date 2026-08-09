import type { Evidence, HealthStatus } from "@/shared/types/domain";

export interface CorrelationContext {
  anomalyType: "SLOW" | "FAST" | "NONE";
  currentTestCount?: number | null;
  medianTestCount?: number | null;
  services: Array<{ serviceName: string; status: HealthStatus; latencyMs?: number | null; errorCount: number; overlapPercent: number }>;
  oracle?: { connectionOk: boolean; queryOk: boolean; queryMs?: number | null; baselineQueryMs?: number | null };
  machine?: { hostname: string; reachable: boolean; cpuPercent?: number | null; driftCount: number };
  deployment?: { service?: string | null; status: string; minutesBeforeRun: number };
  commit?: { sha: string; subject: string; changedFiles: string[] };
}

export function scoreEvidence(context: CorrelationContext): Evidence[] {
  const evidence: Evidence[] = [];

  for (const service of context.services) {
    if (service.status === "HEALTHY" || service.overlapPercent <= 0) continue;
    let score = service.status === "UNHEALTHY" ? 62 : 42;
    score += Math.min(25, Math.round(service.overlapPercent / 4));
    score += Math.min(12, service.errorCount > 0 ? 8 : 0);
    evidence.push({
      category: "SERVICE",
      entity: service.serviceName,
      score: Math.min(100, score),
      observations: [
        `${service.status.toLowerCase()} during ${Math.round(service.overlapPercent)}% of the run`,
        `${service.errorCount} errors observed in the correlation window`,
        service.latencyMs ? `latency reached ${service.latencyMs} ms` : "latency unavailable"
      ]
    });
  }

  if (context.oracle && (!context.oracle.connectionOk || !context.oracle.queryOk)) {
    evidence.push({ category: "ORACLE", entity: "Oracle", score: 92, observations: ["Oracle connectivity or minimal query probe failed during the run"] });
  } else if (context.oracle?.queryMs && context.oracle.baselineQueryMs && context.oracle.queryMs >= context.oracle.baselineQueryMs * 3) {
    evidence.push({
      category: "ORACLE",
      entity: "Oracle",
      score: 78,
      observations: [`query latency was ${(context.oracle.queryMs / context.oracle.baselineQueryMs).toFixed(1)}× its baseline`]
    });
  }

  if (context.machine) {
    let score = 0;
    const observations: string[] = [];
    if (!context.machine.reachable) { score += 80; observations.push("machine was unreachable"); }
    if ((context.machine.cpuPercent ?? 0) >= 80) { score += 38; observations.push(`CPU reached ${Math.round(context.machine.cpuPercent!)}%`); }
    if (context.machine.driftCount > 0) { score += Math.min(42, context.machine.driftCount * 16); observations.push(`${context.machine.driftCount} configuration drift items detected`); }
    if (score > 0) evidence.push({ category: "MACHINE", entity: context.machine.hostname, score: Math.min(100, score), observations });
  }

  if (context.deployment && context.deployment.minutesBeforeRun <= 120) {
    evidence.push({
      category: "DEPLOYMENT",
      entity: context.deployment.service ?? "recent deployment",
      score: context.deployment.status === "FAILED" ? 76 : 34,
      observations: [`deployment ${context.deployment.status.toLowerCase()} ${Math.round(context.deployment.minutesBeforeRun)} minutes before the run`]
    });
  }

  if (context.commit) {
    const componentFiles = context.commit.changedFiles.filter((path) => path.includes("services/") || path.includes("tests/"));
    evidence.push({
      category: "COMMIT",
      entity: context.commit.sha.slice(0, 8),
      score: componentFiles.length ? 38 : 18,
      observations: [`build uses “${context.commit.subject}”`, `${componentFiles.length} component or test files changed`]
    });
  }

  if (context.anomalyType === "FAST" && context.currentTestCount && context.medianTestCount) {
    const reduction = 1 - context.currentTestCount / context.medianTestCount;
    if (reduction >= 0.25) {
      evidence.push({
        category: "TEST_CONFIGURATION",
        entity: "Test discovery",
        score: Math.min(98, 65 + Math.round(reduction * 35)),
        observations: [`test count fell ${Math.round(reduction * 100)}% below its baseline`, "services and dependencies should be checked before treating the run as successful"]
      });
    }
  }

  return evidence.sort((left, right) => right.score - left.score);
}
