import { FleetOperations, type FleetMachineData } from "@/components/fleet-operations";
import { getActions, getFleet, getMachineDetail } from "@/server/queries";
import { fromJson } from "@/shared/utils/json";

export const metadata = { title: "Fleet operations" };

export default async function FleetPage({
  searchParams
}: {
  searchParams: Promise<{ machine?: string | string[]; targets?: string | string[] }>;
}) {
  const params = await searchParams;
  const machines = getFleet().flatMap((row): FleetMachineData[] => {
    const detail = getMachineDetail(row.id);
    if (!detail) return [];
    const metadata = fromJson<{ os?: string }>(detail.machine.metadataJson, {});
    return [{
      id: detail.machine.id,
      hostname: detail.machine.hostname,
      role: detail.machine.role,
      environment: detail.machine.environment,
      enabled: detail.machine.enabled,
      lastSeenAt: detail.machine.lastSeenAt,
      referenceMachineId: detail.machine.referenceMachineId,
      os: metadata?.os ?? "Windows",
      health: detail.health,
      packages: detail.packages,
      environmentVariables: detail.environment,
      agent: detail.agent,
      drift: detail.drift
    }];
  });
  const requestedMachine = Array.isArray(params.machine) ? params.machine[0] : params.machine;
  const initialMachineId = machines.some((machine) => machine.id === requestedMachine)
    ? requestedMachine
    : machines[0]?.id;
  const requestedTargets = Array.isArray(params.targets) ? params.targets[0] : params.targets;
  const validMachineIds = new Set(machines.map((machine) => machine.id));
  const initialSelectedIds = requestedTargets === undefined
    ? initialMachineId ? [initialMachineId] : []
    : [...new Set(requestedTargets.split(",").filter((id) => validMachineIds.has(id)))];

  return (
    <FleetOperations
      machines={machines}
      actions={getActions()}
      initialMachineId={initialMachineId}
      initialSelectedIds={initialSelectedIds}
      generatedAt={new Date()}
    />
  );
}
