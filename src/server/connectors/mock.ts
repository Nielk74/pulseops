import type {
  ConnectorRegistry,
  DeploymentConnector,
  GitConnector,
  MachineConnector,
  OracleConnector,
  ServiceStatusConnector,
  TeamCityConnector
} from "@/server/connectors/contracts";
import {
  createMockCommits,
  createMockDeployments,
  createMockMachines,
  createMockOracleSamples,
  createMockServiceStatuses,
  createMockTeamCitySnapshot
} from "@/server/connectors/mock-data";

export class MockTeamCityConnector implements TeamCityConnector {
  constructor(private readonly anchor = new Date()) {}
  async getSnapshot() { return createMockTeamCitySnapshot(this.anchor); }
}

export class MockDeploymentConnector implements DeploymentConnector {
  constructor(private readonly anchor = new Date()) {}
  async getDeployments() { return createMockDeployments(this.anchor); }
}

export class MockServiceStatusConnector implements ServiceStatusConnector {
  constructor(private readonly anchor = new Date()) {}
  async getStatuses() { return createMockServiceStatuses(this.anchor); }
}

export class MockGitConnector implements GitConnector {
  constructor(private readonly anchor = new Date()) {}
  async fetch() {}
  async getCommitsSince(sha?: string) {
    const commits = createMockCommits(this.anchor);
    if (!sha) return commits;
    const index = commits.findIndex((commit) => commit.sha === sha);
    return index === -1 ? commits : commits.slice(index + 1);
  }
  async getCommit(sha: string) { return createMockCommits(this.anchor).find((commit) => commit.sha === sha); }
}

export class MockOracleConnector implements OracleConnector {
  constructor(private readonly anchor = new Date()) {}
  async runProbes() { return createMockOracleSamples(this.anchor); }
}

export class MockMachineConnector implements MachineConnector {
  constructor(private readonly anchor = new Date()) {}
  async getInventory() { return createMockMachines(this.anchor); }
}

export function createMockRegistry(anchor = new Date()): ConnectorRegistry {
  return {
    teamcity: new MockTeamCityConnector(anchor),
    deployments: new MockDeploymentConnector(anchor),
    services: new MockServiceStatusConnector(anchor),
    git: new MockGitConnector(anchor),
    oracle: new MockOracleConnector(anchor),
    machines: new MockMachineConnector(anchor)
  };
}
