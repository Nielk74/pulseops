import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { machineEnvVars, machinePackages, machines } from "@/server/db/schema";

export interface DriftItem {
  type: "PACKAGE_VERSION" | "PACKAGE_MISSING" | "PACKAGE_EXTRA" | "ENV_VALUE" | "ENV_MISSING";
  name: string;
  current?: string;
  expected?: string;
}

export function getMachineDrift(machineId: string): DriftItem[] {
  const machine = db.select().from(machines).where(eq(machines.id, machineId)).get();
  if (!machine?.referenceMachineId) return [];

  const currentPackages = new Map(db.select().from(machinePackages).where(eq(machinePackages.machineId, machineId)).all().map((item) => [item.packageName, item.version]));
  const referencePackages = new Map(db.select().from(machinePackages).where(eq(machinePackages.machineId, machine.referenceMachineId!)).all().map((item) => [item.packageName, item.version]));
  const currentEnv = new Map(db.select().from(machineEnvVars).where(eq(machineEnvVars.machineId, machineId)).all().map((item) => [item.variableName, item]));
  const referenceEnv = new Map(db.select().from(machineEnvVars).where(eq(machineEnvVars.machineId, machine.referenceMachineId!)).all().map((item) => [item.variableName, item]));
  const drift: DriftItem[] = [];

  for (const [name, expected] of referencePackages) {
    const current = currentPackages.get(name);
    if (!current) drift.push({ type: "PACKAGE_MISSING", name, expected });
    else if (current !== expected) drift.push({ type: "PACKAGE_VERSION", name, current, expected });
  }
  for (const [name, current] of currentPackages) {
    if (!referencePackages.has(name)) drift.push({ type: "PACKAGE_EXTRA", name, current });
  }
  for (const [name, expected] of referenceEnv) {
    const current = currentEnv.get(name);
    if (!current) drift.push({ type: "ENV_MISSING", name, expected: expected.displayValue });
    else if (current.valueHash !== expected.valueHash) {
      drift.push({ type: "ENV_VALUE", name, current: current.displayValue, expected: expected.displayValue });
    }
  }
  return drift;
}
