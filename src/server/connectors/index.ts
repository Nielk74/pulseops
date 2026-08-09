import { loadConfig } from "@/server/config";
import type { ConnectorRegistry } from "@/server/connectors/contracts";
import { LiveDeploymentConnector } from "@/server/connectors/deployments/live";
import { LiveGitConnector } from "@/server/connectors/git/live";
import { LiveMachineConnector } from "@/server/connectors/machines/live";
import {
  MockDeploymentConnector,
  MockGitConnector,
  MockMachineConnector,
  MockOracleConnector,
  MockServiceStatusConnector,
  MockTeamCityConnector
} from "@/server/connectors/mock";
import { LiveOracleConnector } from "@/server/connectors/oracle/live";
import { LiveServiceStatusConnector } from "@/server/connectors/services/live";
import { LiveTeamCityConnector } from "@/server/connectors/teamcity/live";

export function createConnectorRegistry(anchor = new Date()): ConnectorRegistry {
  const config = loadConfig();
  return {
    teamcity: config.connectorMode("teamcity") === "mock" ? new MockTeamCityConnector(anchor) : new LiveTeamCityConnector(config),
    deployments: config.connectorMode("deployments") === "mock" ? new MockDeploymentConnector(anchor) : new LiveDeploymentConnector(config),
    services: config.connectorMode("services") === "mock" ? new MockServiceStatusConnector(anchor) : new LiveServiceStatusConnector(config),
    git: config.connectorMode("git") === "mock" ? new MockGitConnector(anchor) : new LiveGitConnector(config),
    oracle: config.connectorMode("oracle") === "mock" ? new MockOracleConnector(anchor) : new LiveOracleConnector(config),
    machines: config.connectorMode("machines") === "mock" ? new MockMachineConnector(anchor) : new LiveMachineConnector(config)
  };
}
