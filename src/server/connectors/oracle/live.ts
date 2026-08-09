import { performance } from "node:perf_hooks";
import type { Connection } from "oracledb";
import type { AppConfig } from "@/server/config";
import type { OracleConnector } from "@/server/connectors/contracts";
import type { OracleSampleFact } from "@/shared/types/domain";

export class LiveOracleConnector implements OracleConnector {
  constructor(private readonly config: AppConfig) {
    if (!config.env.ORACLE_CONNECT_STRING || !config.env.ORACLE_USERNAME || !config.env.ORACLE_PASSWORD) {
      throw new Error("Live Oracle connector requires ORACLE_CONNECT_STRING, ORACLE_USERNAME, and ORACLE_PASSWORD");
    }
  }

  async runProbes(): Promise<OracleSampleFact[]> {
    const timestamp = new Date();
    const sample: OracleSampleFact = {
      id: `oracle-${this.config.environment}-${timestamp.getTime()}`,
      databaseName: this.config.environment,
      environment: this.config.environment,
      timestamp,
      connectionOk: false,
      queryOk: false
    };

    let connection: Connection | undefined;
    try {
      const oracledb = await import("oracledb");
      const connectStart = performance.now();
      connection = await oracledb.getConnection({
        user: this.config.env.ORACLE_USERNAME,
        password: this.config.env.ORACLE_PASSWORD,
        connectString: this.config.env.ORACLE_CONNECT_STRING
      });
      sample.connectMs = Math.round(performance.now() - connectStart);
      sample.connectionOk = true;

      const queryStart = performance.now();
      await connection.execute("SELECT 1 FROM dual");
      sample.queryMs = Math.round(performance.now() - queryStart);
      sample.queryOk = true;

      if (this.config.env.ORACLE_APPLICATION_QUERY) {
        const applicationStart = performance.now();
        await connection.execute(this.config.env.ORACLE_APPLICATION_QUERY);
        sample.applicationProbeMs = Math.round(performance.now() - applicationStart);
      }
    } catch (error) {
      const oracleError = error as { code?: string; message?: string };
      sample.errorCode = oracleError.code;
      sample.errorMessage = oracleError.message ?? String(error);
    } finally {
      await connection?.close();
    }

    return [sample];
  }
}
