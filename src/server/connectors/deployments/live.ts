import type { AppConfig } from "@/server/config";
import type { DeploymentConnector } from "@/server/connectors/contracts";
import { bearerHeaders, requestJson } from "@/server/connectors/http";
import type { DeploymentFact } from "@/shared/types/domain";

function date(value: unknown): Date | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class LiveDeploymentConnector implements DeploymentConnector {
  constructor(private readonly config: AppConfig) {
    if (!config.env.DEPLOYMENTS_API_URL) throw new Error("Live deployments connector requires DEPLOYMENTS_API_URL");
  }

  async getDeployments(since: Date): Promise<DeploymentFact[]> {
    const url = new URL(this.config.env.DEPLOYMENTS_API_URL!);
    url.searchParams.set("since", since.toISOString());
    const response = await requestJson<unknown>(url.toString(), {
      headers: bearerHeaders(this.config.env.DEPLOYMENTS_API_TOKEN)
    });
    const records = Array.isArray(response)
      ? response
      : typeof response === "object" && response && "deployments" in response && Array.isArray(response.deployments)
        ? response.deployments
        : [];

    return records.map((raw, index) => {
      const item = raw as Record<string, unknown>;
      return {
        id: String(item.id ?? `deployment-${index}`),
        environment: String(item.environment ?? this.config.environment),
        application: String(item.application ?? item.app ?? "Unknown"),
        service: item.service ? String(item.service) : undefined,
        artifactName: item.artifactName ? String(item.artifactName) : undefined,
        artifactVersion: item.artifactVersion ? String(item.artifactVersion) : undefined,
        buildId: item.buildId ? String(item.buildId) : undefined,
        commitSha: item.commitSha ? String(item.commitSha) : undefined,
        status: item.status === "SUCCESS" || item.status === "FAILED" || item.status === "RUNNING" ? item.status : "PENDING",
        requestedAt: date(item.requestedAt) ?? date(item.startedAt) ?? new Date(),
        startedAt: date(item.startedAt),
        finishedAt: date(item.finishedAt),
        targetMachine: item.targetMachine ? String(item.targetMachine) : undefined,
        raw: item
      };
    });
  }
}
