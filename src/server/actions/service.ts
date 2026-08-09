import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { actions, actionTargets, machines, teamcityAgents } from "@/server/db/schema";
import { syncSource } from "@/server/polling/sync";
import type { Identity } from "@/server/auth";
import type { ActionPlanInput, ActionType } from "@/shared/schemas/actions";
import { fromJson, toJson } from "@/shared/utils/json";

const executableV1Actions = new Set<ActionType>([
  "REFRESH_MACHINE",
  "RUN_ORACLE_PROBE",
  "RUN_SERVICE_PROBE",
  "REFRESH_PACKAGE_INVENTORY",
  "REFRESH_ENV_INVENTORY"
]);

function previousState(type: ActionType, target: string) {
  if (["ENABLE_AGENT", "DISABLE_AGENT"].includes(type)) {
    return db.select().from(teamcityAgents).where(eq(teamcityAgents.id, target)).get();
  }
  return db.select().from(machines).where(eq(machines.id, target)).get();
}

export function createActionPlan(input: ActionPlanInput, identity: Identity) {
  const id = `act_${crypto.randomUUID()}`;
  const now = new Date();
  const risk = executableV1Actions.has(input.type) ? "LOW" : input.targets.length > 1 ? "HIGH" : "MEDIUM";
  const preview = input.targets.map((target) => ({
    target,
    previousState: previousState(input.type, target) ?? null,
    proposed: { type: input.type, parameters: input.parameters }
  }));

  db.transaction((tx) => {
    tx.insert(actions).values({
      id,
      type: input.type,
      requestedBy: identity.id,
      requestedAt: now,
      status: "PLANNED",
      parametersJson: toJson(input.parameters) ?? "{}",
      incidentId: input.incidentId,
      reason: input.reason,
      plannedOnly: true
    }).run();
    tx.insert(actionTargets).values(input.targets.map((target) => ({
      actionId: id,
      machineId: target,
      status: "PLANNED",
      previousStateJson: toJson(previousState(input.type, target))
    }))).run();
  });

  return {
    actionId: id,
    type: input.type,
    risk,
    executableInV1: executableV1Actions.has(input.type),
    requiresCanary: input.targets.length > 3,
    preview
  };
}

export async function executeAction(actionId: string, identity: Identity) {
  const action = db.select().from(actions).where(eq(actions.id, actionId)).get();
  if (!action) throw new Error("Action plan not found");
  const type = action.type as ActionType;
  if (!executableV1Actions.has(type)) {
    throw new Error(`${type} is plan-only in V1; enable the trusted executor workflow before execution`);
  }

  const targets = db.select().from(actionTargets).where(eq(actionTargets.actionId, actionId)).all();
  const startedAt = new Date();
  db.update(actions).set({ status: "RUNNING", plannedOnly: false, startedAt }).where(eq(actions.id, actionId)).run();

  try {
    const source = type === "RUN_ORACLE_PROBE" ? "oracle" : type === "RUN_SERVICE_PROBE" ? "services" : "machines";
    const result = await syncSource(source);
    if (!result.ok) throw new Error(result.error ?? `${source} synchronization failed`);
    const finishedAt = new Date();
    db.transaction((tx) => {
      tx.update(actions).set({ status: "SUCCESS", finishedAt }).where(eq(actions.id, actionId)).run();
      for (const target of targets) {
        tx.update(actionTargets).set({
          status: "SUCCESS",
          startedAt,
          finishedAt,
          resultJson: toJson({ records: result.records, executedBy: identity.id })
        }).where(and(eq(actionTargets.actionId, actionId), eq(actionTargets.machineId, target.machineId))).run();
      }
    });
    return { actionId, status: "SUCCESS", result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();
    db.update(actions).set({ status: "FAILED", finishedAt }).where(eq(actions.id, actionId)).run();
    for (const target of targets) {
      db.update(actionTargets).set({ status: "FAILED", finishedAt, resultJson: toJson({ error: message }) })
        .where(and(eq(actionTargets.actionId, actionId), eq(actionTargets.machineId, target.machineId))).run();
    }
    throw error;
  }
}

export function getActionDetail(id: string) {
  const action = db.select().from(actions).where(eq(actions.id, id)).get();
  if (!action) return undefined;
  return {
    ...action,
    parameters: fromJson<Record<string, unknown>>(action.parametersJson, {}),
    targets: db.select().from(actionTargets).where(eq(actionTargets.actionId, id)).all().map((target) => ({
      ...target,
      previousState: fromJson(target.previousStateJson),
      result: fromJson(target.resultJson)
    }))
  };
}
