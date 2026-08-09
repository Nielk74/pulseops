import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { syncAll } = await import("@/server/polling/sync");
  const results = await syncAll();
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
