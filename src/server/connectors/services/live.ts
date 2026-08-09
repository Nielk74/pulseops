import type { AppConfig } from "@/server/config";
import type { ServiceStatusConnector } from "@/server/connectors/contracts";
import { bearerHeaders, requestJson } from "@/server/connectors/http";
import type { HealthStatus, ServiceStatusFact } from "@/shared/types/domain";

function normalizeStatus(value: unknown): HealthStatus {
  const status = String(value ?? "UNKNOWN").toUpperCase();
  if (status === "UP" || status === "OK" || status === "HEALTHY") return "HEALTHY";
  if (status === "WARN" || status === "WARNING" || status === "DEGRADED") return "DEGRADED";
  if (status === "DOWN" || status === "ERROR" || status === "UNHEALTHY") return "UNHEALTHY";
  return "UNKNOWN";
}

export class LiveServiceStatusConnector implements ServiceStatusConnector {
  constructor(private readonly config: AppConfig) {
    if (!config.env.SERVICES_API_URL) throw new Error("Live services connector requires SERVICES_API_URL");
  }

  async getStatuses(): Promise<ServiceStatusFact[]> {
    const response = await requestJson<unknown>(this.config.env.SERVICES_API_URL!, {
      headers: bearerHeaders(this.config.env.SERVICES_API_TOKEN)
    });
    const records = Array.isArray(response)
      ? response
      : typeof response === "object" && response && "services" in response && Array.isArray(response.services)
        ? response.services
        : [];
    const timestamp = new Date();

    return records.map((raw, index) => {
      const item = raw as Record<string, unknown>;
      const serviceId = String(item.id ?? item.serviceId ?? item.name ?? `service-${index}`);
      return {
        id: `${serviceId}-${timestamp.getTime()}`,
        serviceId,
        serviceName: String(item.name ?? item.serviceName ?? serviceId),
        environment: String(item.environment ?? this.config.environment),
        timestamp: item.timestamp ? new Date(String(item.timestamp)) : timestamp,
        status: normalizeStatus(item.status),
        latencyMs: typeof item.latencyMs === "number" ? item.latencyMs : undefined,
        errorCount: Number(item.errorCount ?? 0),
        warningCount: Number(item.warningCount ?? 0),
        instanceCount: Number(item.instanceCount ?? item.instances ?? 1),
        lastRestartAt: item.lastRestartAt ? new Date(String(item.lastRestartAt)) : undefined,
        grafanaUrl: item.grafanaUrl ? String(item.grafanaUrl) : undefined,
        metadata: typeof item.metadata === "object" && item.metadata ? item.metadata as Record<string, unknown> : undefined
      };
    });
  }
}
