import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  buildArtifacts,
  builds,
  deployments,
  events,
  gitCommitFiles,
  gitCommits,
  machineEnvVars,
  machineHealthSamples,
  machinePackages,
  machines,
  oracleSamples,
  repositories,
  serviceStatusSamples,
  teamcityAgents,
  testOccurrences
} from "@/server/db/schema";
import type {
  DeploymentFact,
  GitCommitFact,
  MachineFact,
  OracleSampleFact,
  ServiceStatusFact,
  TeamCitySnapshot
} from "@/shared/types/domain";
import { toJson } from "@/shared/utils/json";

export function ingestMachines(records: MachineFact[]): number {
  db.transaction((tx) => {
    for (const machine of records) {
      const row = {
        id: machine.id,
        hostname: machine.hostname,
        role: machine.role,
        environment: machine.environment,
        enabled: machine.enabled,
        lastSeenAt: machine.lastSeenAt,
        referenceMachineId: machine.referenceMachineId,
        metadataJson: toJson(machine.metadata),
        updatedAt: new Date()
      };
      tx.insert(machines).values(row).onConflictDoUpdate({ target: machines.id, set: row }).run();

      tx.insert(machineHealthSamples).values({
        id: machine.health.id,
        machineId: machine.id,
        timestamp: machine.health.timestamp,
        reachable: machine.health.reachable,
        cpuPercent: machine.health.cpuPercent,
        memoryPercent: machine.health.memoryPercent,
        diskFreePercent: machine.health.diskFreePercent,
        uptimeSeconds: machine.health.uptimeSeconds,
        teamcityAgentOk: machine.health.teamcityAgentOk,
        metadataJson: toJson({ services: machine.health.services })
      }).onConflictDoUpdate({ target: machineHealthSamples.id, set: {
        reachable: machine.health.reachable,
        cpuPercent: machine.health.cpuPercent,
        memoryPercent: machine.health.memoryPercent,
        diskFreePercent: machine.health.diskFreePercent,
        teamcityAgentOk: machine.health.teamcityAgentOk,
        metadataJson: toJson({ services: machine.health.services })
      } }).run();

      tx.delete(machinePackages).where(eq(machinePackages.machineId, machine.id)).run();
      if (machine.packages.length) {
        tx.insert(machinePackages).values(machine.packages.map((item) => ({
          machineId: machine.id,
          packageName: item.name,
          version: item.version,
          capturedAt: item.capturedAt
        }))).run();
      }

      tx.delete(machineEnvVars).where(eq(machineEnvVars.machineId, machine.id)).run();
      if (machine.environmentVariables.length) {
        tx.insert(machineEnvVars).values(machine.environmentVariables.map((item) => ({
          machineId: machine.id,
          variableName: item.name,
          valueHash: item.valueHash,
          displayValue: item.displayValue,
          sensitive: item.sensitive,
          capturedAt: item.capturedAt
        }))).run();
      }

      if (!machine.health.reachable) {
        tx.insert(events).values({
          id: `machine-unreachable-${machine.health.id}`,
          timestamp: machine.health.timestamp,
          source: "machines",
          type: "AGENT_DISCONNECTED",
          severity: "HIGH",
          environment: machine.environment,
          machineId: machine.id,
          summary: `${machine.hostname} is unreachable`
        }).onConflictDoNothing().run();
      }
    }
  });
  return records.length;
}

export function ingestGit(records: GitCommitFact[], repositoryPath: string): number {
  db.transaction((tx) => {
    const latest = records.at(-1);
    tx.insert(repositories).values({
      id: "application",
      name: "application",
      path: repositoryPath,
      defaultBranch: "main",
      lastFetchAt: new Date(),
      lastSeenCommit: latest?.sha,
      updatedAt: new Date()
    }).onConflictDoUpdate({ target: repositories.id, set: {
      path: repositoryPath,
      lastFetchAt: new Date(),
      lastSeenCommit: latest?.sha,
      updatedAt: new Date()
    } }).run();

    for (const commit of records) {
      tx.insert(gitCommits).values({
        sha: commit.sha,
        repositoryId: commit.repositoryId,
        authorName: commit.authorName,
        authorEmail: commit.authorEmail,
        authorDate: commit.authorDate,
        committerDate: commit.committerDate,
        subject: commit.subject,
        body: commit.body,
        parentSha: commit.parentSha
      }).onConflictDoUpdate({ target: gitCommits.sha, set: {
        subject: commit.subject,
        body: commit.body,
        committerDate: commit.committerDate
      } }).run();

      for (const file of commit.changedFiles) {
        tx.insert(gitCommitFiles).values({
          commitSha: commit.sha,
          path: file.path,
          changeType: file.changeType,
          additions: file.additions,
          deletions: file.deletions
        }).onConflictDoUpdate({ target: [gitCommitFiles.commitSha, gitCommitFiles.path], set: {
          changeType: file.changeType,
          additions: file.additions,
          deletions: file.deletions
        } }).run();
      }

      tx.insert(events).values({
        id: `git-commit-${commit.sha}`,
        timestamp: commit.committerDate,
        source: "git",
        type: "GIT_COMMIT",
        severity: "INFO",
        environment: "source",
        commitSha: commit.sha,
        summary: `${commit.authorName}: ${commit.subject}`
      }).onConflictDoUpdate({ target: events.id, set: { summary: `${commit.authorName}: ${commit.subject}` } }).run();
    }
  });
  return records.length;
}

export function ingestTeamCity(snapshot: TeamCitySnapshot): number {
  const knownMachineIds = new Set(db.select({ id: machines.id }).from(machines).all().map((row) => row.id));
  db.transaction((tx) => {
    for (const build of snapshot.builds) {
      const row = {
        id: build.id,
        buildType: build.buildType,
        branch: build.branch,
        status: build.status,
        state: build.state,
        queuedAt: build.queuedAt,
        startedAt: build.startedAt,
        finishedAt: build.finishedAt,
        durationMs: build.durationMs,
        queueDurationMs: build.queueDurationMs,
        agentId: build.agentId,
        buildNumber: build.buildNumber,
        commitSha: build.commitSha,
        environment: build.environment,
        parametersJson: toJson(build.parameters),
        updatedAt: new Date()
      };
      tx.insert(builds).values(row).onConflictDoUpdate({ target: builds.id, set: row }).run();
      tx.insert(events).values({
        id: `build-${build.id}-${build.state.toLowerCase()}`,
        timestamp: build.finishedAt ?? build.startedAt ?? build.queuedAt,
        source: "teamcity",
        type: build.state === "FINISHED" ? "BUILD_FINISHED" : build.state === "RUNNING" ? "BUILD_STARTED" : "BUILD_QUEUED",
        severity: build.status === "FAILURE" ? "HIGH" : "INFO",
        environment: build.environment,
        buildId: build.id,
        commitSha: build.commitSha,
        summary: `${build.buildType} #${build.buildNumber} ${build.status.toLowerCase()}`
      }).onConflictDoUpdate({ target: events.id, set: {
        timestamp: build.finishedAt ?? build.startedAt ?? build.queuedAt,
        severity: build.status === "FAILURE" ? "HIGH" : "INFO",
        summary: `${build.buildType} #${build.buildNumber} ${build.status.toLowerCase()}`
      } }).run();
    }

    for (const artifact of snapshot.artifacts) {
      tx.insert(buildArtifacts).values(artifact).onConflictDoUpdate({ target: buildArtifacts.id, set: {
        name: artifact.name,
        path: artifact.path,
        version: artifact.version,
        sizeBytes: artifact.sizeBytes,
        checksum: artifact.checksum
      } }).run();
    }

    for (const occurrence of snapshot.tests) {
      const row = {
        id: occurrence.id,
        teamcityTestId: occurrence.externalId,
        buildId: occurrence.buildId,
        testName: occurrence.testName,
        testSuite: occurrence.testSuite,
        testType: occurrence.testType,
        status: occurrence.status,
        durationMs: occurrence.durationMs,
        machineId: occurrence.machineId && knownMachineIds.has(occurrence.machineId) ? occurrence.machineId : null,
        workerId: occurrence.workerId,
        environment: occurrence.environment,
        startedAt: occurrence.startedAt,
        finishedAt: occurrence.finishedAt,
        failureMessage: occurrence.failureMessage,
        testCount: occurrence.testCount,
        passedCount: occurrence.passedCount,
        failedCount: occurrence.failedCount,
        skippedCount: occurrence.skippedCount
      };
      tx.insert(testOccurrences).values(row).onConflictDoUpdate({ target: testOccurrences.id, set: row }).run();
      tx.insert(events).values({
        id: `test-finished-${occurrence.id}`,
        timestamp: occurrence.finishedAt,
        source: "teamcity",
        type: "TEST_FINISHED",
        severity: occurrence.status === "FAILED" ? "HIGH" : "INFO",
        environment: occurrence.environment,
        machineId: row.machineId,
        buildId: occurrence.buildId,
        testOccurrenceId: occurrence.id,
        summary: `${occurrence.testName} ${occurrence.status.toLowerCase()}`
      }).onConflictDoUpdate({ target: events.id, set: {
        timestamp: occurrence.finishedAt,
        severity: occurrence.status === "FAILED" ? "HIGH" : "INFO",
        summary: `${occurrence.testName} ${occurrence.status.toLowerCase()}`
      } }).run();
    }

    for (const agent of snapshot.agents) {
      const previous = tx.select({ connected: teamcityAgents.connected }).from(teamcityAgents).where(eq(teamcityAgents.id, agent.id)).get();
      const row = {
        id: agent.id,
        name: agent.name,
        machineId: agent.machineId && knownMachineIds.has(agent.machineId) ? agent.machineId : null,
        connected: agent.connected,
        enabled: agent.enabled,
        authorized: agent.authorized,
        currentBuildId: agent.currentBuildId,
        pool: agent.pool,
        version: agent.version,
        lastSeenAt: agent.lastSeenAt,
        lastStatusChangeAt: previous && previous.connected !== agent.connected ? new Date() : undefined,
        updatedAt: new Date()
      };
      tx.insert(teamcityAgents).values(row).onConflictDoUpdate({ target: teamcityAgents.id, set: row }).run();
    }
  });

  db.update(builds).set({
    artifactCount: 0
  }).run();
  for (const build of snapshot.builds) {
    const count = snapshot.artifacts.filter((artifact) => artifact.buildId === build.id).length;
    db.update(builds).set({ artifactCount: count }).where(eq(builds.id, build.id)).run();
  }

  return snapshot.builds.length + snapshot.tests.length + snapshot.agents.length + snapshot.artifacts.length;
}

export function ingestDeployments(records: DeploymentFact[]): number {
  db.transaction((tx) => {
    for (const deployment of records) {
      const row = {
        id: deployment.id,
        environment: deployment.environment,
        application: deployment.application,
        service: deployment.service,
        artifactName: deployment.artifactName,
        artifactVersion: deployment.artifactVersion,
        buildId: deployment.buildId,
        commitSha: deployment.commitSha,
        status: deployment.status,
        requestedAt: deployment.requestedAt,
        startedAt: deployment.startedAt,
        finishedAt: deployment.finishedAt,
        targetMachine: deployment.targetMachine,
        stagesJson: toJson(deployment.stages),
        rawJson: toJson(deployment.raw),
        updatedAt: new Date()
      };
      tx.insert(deployments).values(row).onConflictDoUpdate({ target: deployments.id, set: row }).run();
      tx.insert(events).values({
        id: `deployment-${deployment.id}-${deployment.status.toLowerCase()}`,
        timestamp: deployment.finishedAt ?? deployment.startedAt ?? deployment.requestedAt,
        source: "deployments",
        type: deployment.status === "FAILED" ? "DEPLOYMENT_FAILED" : deployment.status === "SUCCESS" ? "DEPLOYMENT_FINISHED" : "DEPLOYMENT_STARTED",
        severity: deployment.status === "FAILED" ? "HIGH" : "INFO",
        environment: deployment.environment,
        serviceId: deployment.service,
        buildId: deployment.buildId,
        deploymentId: deployment.id,
        commitSha: deployment.commitSha,
        summary: `${deployment.application} ${deployment.status.toLowerCase()} in ${deployment.environment}`
      }).onConflictDoUpdate({ target: events.id, set: { summary: `${deployment.application} ${deployment.status.toLowerCase()} in ${deployment.environment}` } }).run();
    }
  });
  return records.length;
}

export function ingestServices(records: ServiceStatusFact[]): number {
  db.transaction((tx) => {
    for (const sample of records) {
      const row = {
        id: sample.id,
        serviceId: sample.serviceId,
        serviceName: sample.serviceName,
        environment: sample.environment,
        timestamp: sample.timestamp,
        status: sample.status,
        latencyMs: sample.latencyMs,
        errorCount: sample.errorCount,
        warningCount: sample.warningCount,
        instanceCount: sample.instanceCount,
        lastRestartAt: sample.lastRestartAt,
        grafanaUrl: sample.grafanaUrl,
        metadataJson: toJson(sample.metadata)
      };
      tx.insert(serviceStatusSamples).values(row).onConflictDoUpdate({ target: serviceStatusSamples.id, set: row }).run();
      if (sample.status !== "HEALTHY") {
        tx.insert(events).values({
          id: `service-${sample.id}-${sample.status.toLowerCase()}`,
          timestamp: sample.timestamp,
          source: "services",
          type: sample.status === "DEGRADED" ? "SERVICE_DEGRADED" : "SERVICE_UNHEALTHY",
          severity: sample.status === "UNHEALTHY" ? "CRITICAL" : "HIGH",
          environment: sample.environment,
          serviceId: sample.serviceId,
          summary: `${sample.serviceName} is ${sample.status.toLowerCase()}`,
          metadataJson: toJson({ latencyMs: sample.latencyMs, errorCount: sample.errorCount })
        }).onConflictDoNothing().run();
      }
    }
  });
  return records.length;
}

export function ingestOracle(records: OracleSampleFact[]): number {
  db.transaction((tx) => {
    for (const sample of records) {
      const row = {
        id: sample.id,
        databaseName: sample.databaseName,
        environment: sample.environment,
        timestamp: sample.timestamp,
        connectionOk: sample.connectionOk,
        connectMs: sample.connectMs,
        queryOk: sample.queryOk,
        queryMs: sample.queryMs,
        applicationProbeMs: sample.applicationProbeMs,
        errorCode: sample.errorCode,
        errorMessage: sample.errorMessage,
        metadataJson: toJson(sample.metadata)
      };
      tx.insert(oracleSamples).values(row).onConflictDoUpdate({ target: oracleSamples.id, set: row }).run();
      if (!sample.connectionOk || !sample.queryOk || (sample.queryMs ?? 0) > 500) {
        tx.insert(events).values({
          id: `oracle-${sample.id}`,
          timestamp: sample.timestamp,
          source: "oracle",
          type: !sample.connectionOk ? "ORACLE_UNREACHABLE" : "ORACLE_SLOW",
          severity: !sample.connectionOk ? "CRITICAL" : "HIGH",
          environment: sample.environment,
          summary: !sample.connectionOk ? `${sample.databaseName} is unreachable` : `${sample.databaseName} query latency is ${sample.queryMs} ms`
        }).onConflictDoNothing().run();
      }
    }
  });
  return records.length;
}
