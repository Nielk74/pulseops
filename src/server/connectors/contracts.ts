import type {
  DeploymentFact,
  GitCommitFact,
  MachineFact,
  OracleSampleFact,
  ServiceStatusFact,
  TeamCitySnapshot
} from "@/shared/types/domain";

export interface TeamCityConnector {
  getSnapshot(since: Date): Promise<TeamCitySnapshot>;
}

export interface DeploymentConnector {
  getDeployments(since: Date): Promise<DeploymentFact[]>;
}

export interface ServiceStatusConnector {
  getStatuses(): Promise<ServiceStatusFact[]>;
}

export interface GitConnector {
  fetch(): Promise<void>;
  getCommitsSince(sha?: string): Promise<GitCommitFact[]>;
  getCommit(sha: string): Promise<GitCommitFact | undefined>;
}

export interface OracleConnector {
  runProbes(): Promise<OracleSampleFact[]>;
}

export interface MachineConnector {
  getInventory(): Promise<MachineFact[]>;
}

export interface ConnectorRegistry {
  teamcity: TeamCityConnector;
  deployments: DeploymentConnector;
  services: ServiceStatusConnector;
  git: GitConnector;
  oracle: OracleConnector;
  machines: MachineConnector;
}
