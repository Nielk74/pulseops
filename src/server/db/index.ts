import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { loadConfig } from "@/server/config";
import * as schema from "@/server/db/schema";
import { resolveRuntimePath } from "@/server/runtime-paths";

function resolveDatabasePath(databaseUrl: string) {
  if (databaseUrl === ":memory:") return databaseUrl;
  const withoutScheme = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
  return resolveRuntimePath(withoutScheme);
}

function createDatabase() {
  const filename = resolveDatabasePath(loadConfig().databaseUrl);
  if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true });

  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  return {
    sqlite,
    db: drizzle(sqlite, { schema })
  };
}

type DatabaseBundle = ReturnType<typeof createDatabase>;
const globalDatabase = globalThis as typeof globalThis & { __pulseOpsDatabase?: DatabaseBundle };

export const database = globalDatabase.__pulseOpsDatabase ?? createDatabase();

if (process.env.NODE_ENV !== "production") globalDatabase.__pulseOpsDatabase = database;

export const db = database.db;
export const sqlite = database.sqlite;
