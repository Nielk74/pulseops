export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadConfig } = await import("@/server/config");
    if (loadConfig().autoMigrate) {
      const [{ migrate }, { db }, { resolveRuntimePath }] = await Promise.all([
        import("drizzle-orm/better-sqlite3/migrator"),
        import("@/server/db"),
        import("@/server/runtime-paths")
      ]);
      migrate(db, { migrationsFolder: resolveRuntimePath("drizzle") });
    }
    const { startPollingScheduler } = await import("@/server/polling/scheduler");
    startPollingScheduler();
  }
}
