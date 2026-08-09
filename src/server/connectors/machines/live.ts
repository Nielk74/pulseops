import type { AppConfig } from "@/server/config";
import type { MachineConnector } from "@/server/connectors/contracts";
import { bearerHeaders, requestJson } from "@/server/connectors/http";
import type { MachineFact, MachineRole } from "@/shared/types/domain";

const roles = new Set<MachineRole>(["BUILD_AGENT", "UNIT_TEST_AGENT", "UFT_AGENT", "SAS_AGENT", "DEPLOYMENT_TARGET", "OTHER"]);

export class LiveMachineConnector implements MachineConnector {
  constructor(private readonly config: AppConfig) {
    if (!config.env.WINDOWS_EXECUTOR_URL) throw new Error("Live machines connector requires WINDOWS_EXECUTOR_URL");
  }

  async getInventory(): Promise<MachineFact[]> {
    const url = `${this.config.env.WINDOWS_EXECUTOR_URL!.replace(/\/$/, "")}/inventory`;
    const response = await requestJson<unknown>(url, { headers: bearerHeaders(this.config.env.WINDOWS_EXECUTOR_TOKEN) });
    const records = Array.isArray(response)
      ? response
      : typeof response === "object" && response && "machines" in response && Array.isArray(response.machines)
        ? response.machines
        : [];

    return records.map((raw, index) => {
      const item = raw as Record<string, unknown>;
      const health = (item.health ?? {}) as Record<string, unknown>;
      const hostname = String(item.hostname ?? item.name ?? `machine-${index}`);
      const id = String(item.id ?? hostname.toLowerCase());
      const timestamp = health.timestamp ? new Date(String(health.timestamp)) : new Date();
      const roleCandidate = String(item.role ?? "OTHER") as MachineRole;
      return {
        id,
        hostname,
        role: roles.has(roleCandidate) ? roleCandidate : "OTHER",
        environment: String(item.environment ?? this.config.environment),
        enabled: item.enabled !== false,
        referenceMachineId: item.referenceMachineId ? String(item.referenceMachineId) : undefined,
        lastSeenAt: item.lastSeenAt ? new Date(String(item.lastSeenAt)) : timestamp,
        health: {
          id: String(health.id ?? `health-${id}-${timestamp.getTime()}`),
          timestamp,
          reachable: Boolean(health.reachable),
          cpuPercent: typeof health.cpuPercent === "number" ? health.cpuPercent : undefined,
          memoryPercent: typeof health.memoryPercent === "number" ? health.memoryPercent : undefined,
          diskFreePercent: typeof health.diskFreePercent === "number" ? health.diskFreePercent : undefined,
          uptimeSeconds: typeof health.uptimeSeconds === "number" ? health.uptimeSeconds : undefined,
          teamcityAgentOk: typeof health.teamcityAgentOk === "boolean" ? health.teamcityAgentOk : undefined,
          services: typeof health.services === "object" && health.services ? health.services as Record<string, string> : undefined
        },
        packages: Array.isArray(item.packages) ? item.packages.map((value) => {
          const packageItem = value as Record<string, unknown>;
          return { name: String(packageItem.name), version: String(packageItem.version), capturedAt: timestamp };
        }) : [],
        environmentVariables: Array.isArray(item.environmentVariables) ? item.environmentVariables.map((value) => {
          const variable = value as Record<string, unknown>;
          return {
            name: String(variable.name),
            valueHash: String(variable.valueHash),
            displayValue: String(variable.displayValue ?? "***"),
            sensitive: Boolean(variable.sensitive),
            capturedAt: timestamp
          };
        }) : [],
        metadata: typeof item.metadata === "object" && item.metadata ? item.metadata as Record<string, unknown> : undefined
      };
    });
  }
}
