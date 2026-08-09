import { z } from "zod";

export const actionTypes = [
  "RERUN_BUILD",
  "ENABLE_AGENT",
  "DISABLE_AGENT",
  "REFRESH_MACHINE",
  "RESTART_SERVICE",
  "START_SERVICE",
  "STOP_SERVICE",
  "CHOCO_INSTALL",
  "CHOCO_UPGRADE",
  "CHOCO_UNINSTALL",
  "SET_ENV_VARIABLE",
  "REMOVE_ENV_VARIABLE",
  "SYNC_PACKAGES_FROM_REFERENCE",
  "SYNC_ENV_FROM_REFERENCE",
  "RUN_ORACLE_PROBE",
  "RUN_SERVICE_PROBE",
  "REFRESH_PACKAGE_INVENTORY",
  "REFRESH_ENV_INVENTORY"
] as const;

export const actionPlanSchema = z.object({
  type: z.enum(actionTypes),
  targets: z.array(z.string().min(1)).min(1).max(50),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  incidentId: z.string().optional(),
  reason: z.string().trim().min(8).max(500)
});

export const executeActionSchema = z.object({ actionId: z.string().min(1) });

export type ActionPlanInput = z.infer<typeof actionPlanSchema>;
export type ActionType = (typeof actionTypes)[number];
