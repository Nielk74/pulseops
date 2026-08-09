import type { AppConfig } from "@/server/config";
import type { TeamCityConnector } from "@/server/connectors/contracts";
import { bearerHeaders, requestJson } from "@/server/connectors/http";
import type { BuildFact, TestOccurrenceFact } from "@/shared/types/domain";

interface TeamCityBuildPayload {
  id: number;
  buildTypeId?: string;
  branchName?: string;
  status?: string;
  state?: string;
  queuedDate?: string;
  startDate?: string;
  finishDate?: string;
  number?: string;
  agent?: { id?: number; name?: string };
  revisions?: { revision?: Array<{ version?: string }> };
  properties?: { property?: Array<{ name?: string; value?: string }> };
}

interface TeamCityTestPayload {
  id?: string;
  name?: string;
  status?: string;
  duration?: number;
  details?: string;
}

function parseTeamCityDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})([+-]\d{4}|Z)$/);
  if (!match) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  const [, year, month, day, hours, minutes, seconds, rawOffset] = match;
  const offset = rawOffset === "Z" ? "Z" : `${rawOffset.slice(0, 3)}:${rawOffset.slice(3)}`;
  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`);
}

function testType(name: string): TestOccurrenceFact["testType"] {
  const upper = name.toUpperCase();
  if (upper.includes("UFT")) return "UFT";
  if (upper.includes("SAS")) return "SAS";
  if (upper.includes("UNIT")) return "UNIT";
  return "OTHER";
}

function mapStatus(status?: string): TestOccurrenceFact["status"] {
  if (status === "SUCCESS") return "PASSED";
  if (status === "FAILURE") return "FAILED";
  if (status === "IGNORED") return "IGNORED";
  return "UNKNOWN";
}

function formatTeamCityDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "+0000");
}

export class LiveTeamCityConnector implements TeamCityConnector {
  private readonly baseUrl: string;
  private readonly headers: HeadersInit;

  constructor(private readonly config: AppConfig) {
    if (!config.env.TEAMCITY_BASE_URL || !config.env.TEAMCITY_TOKEN) {
      throw new Error("Live TeamCity connector requires TEAMCITY_BASE_URL and TEAMCITY_TOKEN");
    }
    this.baseUrl = config.env.TEAMCITY_BASE_URL.replace(/\/$/, "");
    this.headers = bearerHeaders(config.env.TEAMCITY_TOKEN);
  }

  private api<T>(path: string) {
    return requestJson<T>(`${this.baseUrl}/app/rest/${path}`, { headers: this.headers });
  }

  async getSnapshot(since: Date) {
    const [buildResponse, agentResponse] = await Promise.all([
      this.api<{ build?: TeamCityBuildPayload[] }>(
        `builds?locator=count:50,sinceDate:${encodeURIComponent(formatTeamCityDate(since))}&fields=build(id,buildTypeId,branchName,status,state,queuedDate,startDate,finishDate,number,agent(id,name),revisions(revision(version)),properties(property(name,value)))`
      ),
      this.api<{ agent?: Array<Record<string, unknown>> }>(
        "agents?fields=agent(id,name,connected,enabled,authorized,pool(name),version,currentBuild(id))"
      )
    ]);

    const rawBuilds = buildResponse.build ?? [];
    const builds: BuildFact[] = rawBuilds.map((build) => {
      const queuedAt = parseTeamCityDate(build.queuedDate) ?? new Date();
      const startedAt = parseTeamCityDate(build.startDate);
      const finishedAt = parseTeamCityDate(build.finishDate);
      const parameters = Object.fromEntries(
        (build.properties?.property ?? [])
          .filter((property): property is { name: string; value: string } => Boolean(property.name && property.value))
          .map((property) => [property.name, property.value])
      );
      return {
        id: String(build.id),
        buildType: build.buildTypeId ?? "Unknown",
        branch: build.branchName ?? "default",
        status: build.status === "SUCCESS" ? "SUCCESS" : build.status === "FAILURE" ? "FAILURE" : "UNKNOWN",
        state: build.state === "running" ? "RUNNING" : build.state === "queued" ? "QUEUED" : "FINISHED",
        queuedAt,
        startedAt,
        finishedAt,
        durationMs: startedAt && finishedAt ? finishedAt.getTime() - startedAt.getTime() : undefined,
        queueDurationMs: startedAt ? startedAt.getTime() - queuedAt.getTime() : undefined,
        agentId: build.agent?.id ? String(build.agent.id) : undefined,
        buildNumber: build.number ?? String(build.id),
        commitSha: build.revisions?.revision?.[0]?.version,
        environment: parameters.PULSEOPS_ENVIRONMENT ?? this.config.environment,
        parameters
      };
    });

    const buildDetails = await Promise.all(
      builds.filter((build) => build.state === "FINISHED").map(async (build) => {
        const [testResponse, artifactResponse] = await Promise.all([
          this.api<{ testOccurrence?: TeamCityTestPayload[] }>(
            `testOccurrences?locator=build:(id:${encodeURIComponent(build.id)})&fields=testOccurrence(id,name,status,duration,details)`
          ),
          this.api<{ file?: Array<{ name?: string; fullName?: string; size?: number }> }>(
            `builds/id:${encodeURIComponent(build.id)}/artifacts/children`
          )
        ]);

        const fallbackStart = build.startedAt ?? build.queuedAt;
        const tests = (testResponse.testOccurrence ?? []).map((test, index): TestOccurrenceFact => {
          const durationMs = test.duration ?? 0;
          const startedAt = new Date(fallbackStart.getTime() + index * 1_000);
          return {
            id: `${build.id}:${test.id ?? index}`,
            externalId: test.id ?? `${build.id}:${index}`,
            buildId: build.id,
            testName: test.name ?? `Test ${index + 1}`,
            testType: testType(test.name ?? ""),
            status: mapStatus(test.status),
            durationMs,
            machineId: build.agentId,
            environment: build.environment,
            startedAt,
            finishedAt: new Date(startedAt.getTime() + durationMs),
            failureMessage: test.status === "FAILURE" ? test.details : undefined
          };
        });
        const artifacts = (artifactResponse.file ?? []).map((artifact, index) => ({
          id: `${build.id}:${artifact.fullName ?? artifact.name ?? index}`,
          buildId: build.id,
          name: artifact.name ?? `artifact-${index}`,
          path: artifact.fullName ?? artifact.name ?? "",
          sizeBytes: artifact.size
        }));
        return { tests, artifacts };
      })
    );

    const agents = (agentResponse.agent ?? []).map((agent) => ({
      id: String(agent.id),
      name: String(agent.name ?? agent.id),
      connected: Boolean(agent.connected),
      enabled: Boolean(agent.enabled),
      authorized: Boolean(agent.authorized),
      currentBuildId: typeof agent.currentBuild === "object" && agent.currentBuild && "id" in agent.currentBuild
        ? String((agent.currentBuild as { id: unknown }).id)
        : undefined,
      pool: typeof agent.pool === "object" && agent.pool && "name" in agent.pool
        ? String((agent.pool as { name: unknown }).name)
        : undefined,
      version: agent.version ? String(agent.version) : undefined,
      lastSeenAt: new Date()
    }));

    return {
      builds,
      tests: buildDetails.flatMap((detail) => detail.tests),
      artifacts: buildDetails.flatMap((detail) => detail.artifacts),
      agents
    };
  }
}
