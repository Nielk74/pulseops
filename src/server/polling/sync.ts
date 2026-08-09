import { eq } from "drizzle-orm";
import { loadConfig, sourceConfigurationIssue } from "@/server/config";
import { createConnectorRegistry } from "@/server/connectors";
import { db } from "@/server/db";
import { connectorHealth, repositories } from "@/server/db/schema";
import { recomputeTestAnomalies } from "@/server/anomaly/service";
import { enrichAnomalyExplanations } from "@/server/correlation/service";
import {
  ingestDeployments,
  ingestGit,
  ingestMachines,
  ingestOracle,
  ingestServices,
  ingestTeamCity
} from "@/server/polling/ingest";
import { enqueueWrite } from "@/server/polling/write-queue";
import type { SourceId } from "@/shared/types/domain";

const sourceLabels: Record<SourceId, string> = {
  teamcity: "TeamCity",
  deployments: "Deployment Info API",
  services: "Services Status API",
  git: "Local Git repository",
  oracle: "Oracle probes",
  machines: "Windows executor"
};

export interface SyncResult {
  source: SourceId;
  ok: boolean;
  records: number;
  error?: string;
  durationMs: number;
}

function setHealth(source: SourceId, values: Partial<typeof connectorHealth.$inferInsert>) {
  const config = loadConfig();
  const base = {
    id: source,
    label: sourceLabels[source],
    mode: config.connectorMode(source),
    status: "IDLE",
    recordsSynced: 0,
    updatedAt: new Date()
  };
  db.insert(connectorHealth).values({ ...base, ...values }).onConflictDoUpdate({
    target: connectorHealth.id,
    set: { ...values, mode: base.mode, label: base.label, updatedAt: new Date() }
  }).run();
}

export function initializeConnectorHealth() {
  const config = loadConfig();
  for (const source of Object.keys(sourceLabels) as SourceId[]) {
    const issue = sourceConfigurationIssue(source, config);
    setHealth(source, {
      status: issue ? "UNCONFIGURED" : "IDLE",
      lastError: issue
    });
  }
}

export async function syncSource(source: SourceId, anchor = new Date()): Promise<SyncResult> {
  const started = Date.now();
  const config = loadConfig();
  const issue = sourceConfigurationIssue(source, config);
  if (issue) {
    setHealth(source, { status: "UNCONFIGURED", lastError: issue, lastFinishedAt: new Date() });
    return { source, ok: false, records: 0, error: issue, durationMs: Date.now() - started };
  }

  setHealth(source, { status: "SYNCING", lastStartedAt: new Date(), lastError: null });
  try {
    const connectors = createConnectorRegistry(anchor);
    let records = 0;
    if (source === "machines") {
      const facts = await connectors.machines.getInventory();
      records = await enqueueWrite(() => ingestMachines(facts));
    } else if (source === "git") {
      await connectors.git.fetch();
      const lastSeen = db.select({ sha: repositories.lastSeenCommit }).from(repositories).where(eq(repositories.id, "application")).get()?.sha;
      const facts = await connectors.git.getCommitsSince(lastSeen ?? undefined);
      records = await enqueueWrite(() => ingestGit(facts, config.env.GIT_REPOSITORY_PATH ?? "mock://application"));
    } else if (source === "teamcity") {
      const facts = await connectors.teamcity.getSnapshot(new Date(anchor.getTime() - 24 * 60 * 60_000));
      records = await enqueueWrite(() => ingestTeamCity(facts));
    } else if (source === "deployments") {
      const facts = await connectors.deployments.getDeployments(new Date(anchor.getTime() - 24 * 60 * 60_000));
      records = await enqueueWrite(() => ingestDeployments(facts));
    } else if (source === "services") {
      const facts = await connectors.services.getStatuses();
      records = await enqueueWrite(() => ingestServices(facts));
    } else if (source === "oracle") {
      const facts = await connectors.oracle.runProbes();
      records = await enqueueWrite(() => ingestOracle(facts));
    }

    setHealth(source, {
      status: "HEALTHY",
      lastFinishedAt: new Date(),
      lastSuccessAt: new Date(),
      lastError: null,
      recordsSynced: records
    });
    return { source, ok: true, records, durationMs: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setHealth(source, { status: "ERROR", lastFinishedAt: new Date(), lastError: message });
    return { source, ok: false, records: 0, error: message, durationMs: Date.now() - started };
  }
}

export async function syncAll(anchor = new Date()) {
  initializeConnectorHealth();
  // Machines must be written before TeamCity so agent/test foreign keys can be resolved.
  const foundations = await Promise.all([syncSource("machines", anchor), syncSource("git", anchor)]);
  const telemetry = await Promise.all([
    syncSource("teamcity", anchor),
    syncSource("deployments", anchor),
    syncSource("services", anchor),
    syncSource("oracle", anchor)
  ]);
  await enqueueWrite(() => {
    recomputeTestAnomalies();
    enrichAnomalyExplanations();
  });
  return [...foundations, ...telemetry];
}
