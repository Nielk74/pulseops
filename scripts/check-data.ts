import { loadEnvConfig } from "@next/env";
import Database from "better-sqlite3";
import path from "node:path";

loadEnvConfig(process.cwd());

const filename = path.resolve(process.cwd(), process.env.DATABASE_URL ?? "./data/pulseops.db");
const database = new Database(filename, { readonly: true });
const scalar = (sql: string) => (database.prepare(sql).get() as { count: number }).count;
const summary = {
  builds: scalar("select count(*) as count from builds"),
  tests: scalar("select count(*) as count from test_occurrences"),
  anomalies: database.prepare(
    "select test_name, anomaly_type, anomaly_severity, round(anomaly_score, 1) as score, probable_cause from test_occurrences where anomaly_type != 'NONE' order by finished_at desc"
  ).all(),
  services: scalar("select count(distinct service_id) as count from service_status_samples"),
  machines: scalar("select count(*) as count from machines"),
  events: scalar("select count(*) as count from events")
};

database.close();
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

if (summary.builds === 0 || summary.tests === 0 || summary.services === 0 || summary.machines === 0) {
  process.stderr.write("Seed smoke check failed: one or more core datasets are empty.\n");
  process.exitCode = 1;
}
