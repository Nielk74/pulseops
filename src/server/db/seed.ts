import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

loadEnvConfig(process.cwd());

async function main() {
  const { db, sqlite } = await import("@/server/db");
  const { actions, actionTargets } = await import("@/server/db/schema");
  const { syncAll } = await import("@/server/polling/sync");
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  const results = await syncAll(new Date());
  const completedAt = new Date();
  const requestedAt = new Date(completedAt.getTime() - 4 * 60_000);
  db.insert(actions).values({
    id: "act_demo_health_check",
    type: "REFRESH_MACHINE",
    requestedBy: "demo.operator",
    requestedAt,
    status: "SUCCESS",
    parametersJson: "{}",
    reason: "Refresh UFT-03 inventory after anomaly triage",
    plannedOnly: false,
    startedAt: new Date(requestedAt.getTime() + 30_000),
    finishedAt: completedAt
  }).onConflictDoUpdate({ target: actions.id, set: { status: "SUCCESS", finishedAt: completedAt } }).run();
  db.insert(actionTargets).values({
    actionId: "act_demo_health_check",
    machineId: "machine-uft-03",
    status: "SUCCESS",
    previousStateJson: JSON.stringify({ lastSeenAt: requestedAt.toISOString() }),
    resultJson: JSON.stringify({ message: "Inventory refreshed", validated: true }),
    startedAt: new Date(requestedAt.getTime() + 30_000),
    finishedAt: completedAt
  }).onConflictDoUpdate({ target: [actionTargets.actionId, actionTargets.machineId], set: { status: "SUCCESS", finishedAt: completedAt } }).run();
  const failures = results.filter((result) => !result.ok);
  process.stdout.write(`Seeded PulseOps from ${results.length} connectors (${failures.length} failed).\n`);
  sqlite.close();
  if (failures.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
