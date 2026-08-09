import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

loadEnvConfig(process.cwd());

async function main() {
  const { db, sqlite } = await import("@/server/db");
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  sqlite.close();
  process.stdout.write("PulseOps database migrations applied.\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
