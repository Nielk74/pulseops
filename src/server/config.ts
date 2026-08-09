import { z } from "zod";
import type { ConnectorMode, SourceId } from "@/shared/types/domain";

const booleanValue = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((value) => value === true || (typeof value === "string" && ["1", "true", "yes", "on"].includes(value.toLowerCase())));

const positiveInteger = (fallback: number) =>
  z.coerce.number().int().positive().optional().default(fallback);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional().default("development"),
  DATABASE_URL: z.string().optional().default("./data/pulseops.db"),
  APP_ENVIRONMENT: z.string().optional().default("DEV2"),
  ENABLE_POLLING: booleanValue,
  AUTO_MIGRATE: booleanValue,
  MOCK_ALL: booleanValue,
  MOCK_TEAMCITY: booleanValue,
  MOCK_DEPLOYMENTS: booleanValue,
  MOCK_SERVICES: booleanValue,
  MOCK_GIT: booleanValue,
  MOCK_ORACLE: booleanValue,
  MOCK_MACHINES: booleanValue,
  POLL_TEAMCITY_SECONDS: positiveInteger(30),
  POLL_DEPLOYMENTS_SECONDS: positiveInteger(30),
  POLL_SERVICES_SECONDS: positiveInteger(15),
  POLL_GIT_SECONDS: positiveInteger(60),
  POLL_ORACLE_SECONDS: positiveInteger(30),
  POLL_MACHINES_SECONDS: positiveInteger(600),
  TEAMCITY_BASE_URL: z.string().url().optional().or(z.literal("")),
  TEAMCITY_TOKEN: z.string().optional(),
  DEPLOYMENTS_API_URL: z.string().url().optional().or(z.literal("")),
  DEPLOYMENTS_API_TOKEN: z.string().optional(),
  SERVICES_API_URL: z.string().url().optional().or(z.literal("")),
  SERVICES_API_TOKEN: z.string().optional(),
  GIT_REPOSITORY_PATH: z.string().optional(),
  GIT_REMOTE: z.string().optional().default("origin"),
  GIT_BRANCH: z.string().optional().default("main"),
  ORACLE_CONNECT_STRING: z.string().optional(),
  ORACLE_USERNAME: z.string().optional(),
  ORACLE_PASSWORD: z.string().optional(),
  ORACLE_APPLICATION_QUERY: z.string().optional(),
  WINDOWS_EXECUTOR_URL: z.string().url().optional().or(z.literal("")),
  WINDOWS_EXECUTOR_TOKEN: z.string().optional(),
  AUTH_TRUSTED_PROXY: booleanValue,
  AUTH_DEFAULT_ROLE: z.enum(["VIEWER", "OPERATOR", "ADMIN"]).optional().default("VIEWER")
});

const sourceMockKeys: Record<SourceId, keyof z.infer<typeof envSchema>> = {
  teamcity: "MOCK_TEAMCITY",
  deployments: "MOCK_DEPLOYMENTS",
  services: "MOCK_SERVICES",
  git: "MOCK_GIT",
  oracle: "MOCK_ORACLE",
  machines: "MOCK_MACHINES"
};

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(input: NodeJS.ProcessEnv = process.env) {
  const env = envSchema.parse(input);
  const mockSelectionProvided = [
    "MOCK_ALL",
    "MOCK_TEAMCITY",
    "MOCK_DEPLOYMENTS",
    "MOCK_SERVICES",
    "MOCK_GIT",
    "MOCK_ORACLE",
    "MOCK_MACHINES"
  ].some((key) => input[key] !== undefined);
  const mockAll = mockSelectionProvided ? env.MOCK_ALL : env.NODE_ENV !== "production";

  return {
    env,
    databaseUrl: env.DATABASE_URL,
    environment: env.APP_ENVIRONMENT,
    pollingEnabled: env.ENABLE_POLLING,
    autoMigrate: env.AUTO_MIGRATE,
    connectorMode(source: SourceId): ConnectorMode {
      return mockAll || Boolean(env[sourceMockKeys[source]]) ? "mock" : "live";
    },
    pollingSeconds: {
      teamcity: env.POLL_TEAMCITY_SECONDS,
      deployments: env.POLL_DEPLOYMENTS_SECONDS,
      services: env.POLL_SERVICES_SECONDS,
      git: env.POLL_GIT_SECONDS,
      oracle: env.POLL_ORACLE_SECONDS,
      machines: env.POLL_MACHINES_SECONDS
    } satisfies Record<SourceId, number>
  };
}

export function sourceConfigurationIssue(source: SourceId, config = loadConfig()): string | undefined {
  if (config.connectorMode(source) === "mock") return undefined;

  const required: Record<SourceId, Array<[string, string | undefined]>> = {
    teamcity: [["TEAMCITY_BASE_URL", config.env.TEAMCITY_BASE_URL], ["TEAMCITY_TOKEN", config.env.TEAMCITY_TOKEN]],
    deployments: [["DEPLOYMENTS_API_URL", config.env.DEPLOYMENTS_API_URL]],
    services: [["SERVICES_API_URL", config.env.SERVICES_API_URL]],
    git: [["GIT_REPOSITORY_PATH", config.env.GIT_REPOSITORY_PATH]],
    oracle: [
      ["ORACLE_CONNECT_STRING", config.env.ORACLE_CONNECT_STRING],
      ["ORACLE_USERNAME", config.env.ORACLE_USERNAME],
      ["ORACLE_PASSWORD", config.env.ORACLE_PASSWORD]
    ],
    machines: [["WINDOWS_EXECUTOR_URL", config.env.WINDOWS_EXECUTOR_URL]]
  };

  const missing = required[source].filter(([, value]) => !value).map(([name]) => name);
  return missing.length ? `Missing ${missing.join(", ")}` : undefined;
}
