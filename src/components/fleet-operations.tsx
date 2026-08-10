"use client";

import { useEffect, useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import {
  RiArchiveStackLine,
  RiCheckboxCircleFill,
  RiCheckboxMultipleLine,
  RiCloseCircleLine,
  RiComputerLine,
  RiCpuLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiFocus3Line,
  RiGitBranchLine,
  RiHardDrive3Line,
  RiHistoryLine,
  RiKey2Line,
  RiLock2Line,
  RiPulseLine,
  RiRam2Line,
  RiShieldCheckLine,
  RiTimeLine,
  RiWindowsLine
} from "@remixicon/react";
import { ActionPlanner, getMachineActionOption } from "@/components/action-planner";
import { AppModal } from "@/components/app-modal";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { ProgressBar } from "@/components/tremor/progress-bar";
import { cn } from "@/shared/utils/cn";
import { formatRelativeTime } from "@/shared/utils/format";

interface HealthSample {
  id: string;
  timestamp: Date;
  reachable: boolean;
  cpuPercent: number | null;
  memoryPercent: number | null;
  diskFreePercent: number | null;
  uptimeSeconds: number | null;
  teamcityAgentOk: boolean | null;
}

interface MachinePackage {
  packageName: string;
  version: string;
  capturedAt: Date;
}

interface MachineEnvironmentVariable {
  variableName: string;
  displayValue: string;
  sensitive: boolean;
  capturedAt: Date;
}

interface TeamCityAgent {
  id: string;
  name: string;
  connected: boolean;
  enabled: boolean;
  authorized: boolean;
  pool: string | null;
  version: string | null;
  lastSeenAt: Date;
}

interface DriftItem {
  type: "PACKAGE_VERSION" | "PACKAGE_MISSING" | "PACKAGE_EXTRA" | "ENV_VALUE" | "ENV_MISSING";
  name: string;
  current?: string;
  expected?: string;
}

export interface FleetMachineData {
  id: string;
  hostname: string;
  role: string;
  environment: string;
  enabled: boolean;
  lastSeenAt: Date;
  referenceMachineId: string | null;
  os: string;
  health: HealthSample[];
  packages: MachinePackage[];
  environmentVariables: MachineEnvironmentVariable[];
  agent?: TeamCityAgent;
  drift: DriftItem[];
}

interface FleetActionData {
  id: string;
  type: string;
  requestedBy: string;
  requestedAt: Date;
  status: string;
  reason: string;
  plannedOnly: boolean;
  targets: Array<{ machineId: string; status: string }>;
}

const toneClasses = {
  green: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
  amber: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  red: "bg-red-400/10 text-red-300 ring-red-400/20",
  blue: "bg-blue-400/10 text-blue-300 ring-blue-400/20"
} as const;

function percent(value?: number | null) {
  return value === null || value === undefined ? "—" : `${Math.round(value)}%`;
}

function formatUptime(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "Unknown uptime";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  if (days > 0) return `${days}d ${hours}h uptime`;
  return `${hours}h uptime`;
}

function roleLabel(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function machineStatus(machine: FleetMachineData) {
  const latest = machine.health[0];
  if (!latest?.reachable) return { status: "OFFLINE", label: "Offline", tone: "red" as const };
  if (!machine.agent?.connected || machine.drift.length > 0) {
    return { status: "DEGRADED", label: "Needs attention", tone: "amber" as const };
  }
  return { status: "HEALTHY", label: "Healthy", tone: "green" as const };
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  detail,
  tone
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  detail: string;
  tone: keyof typeof toneClasses;
}) {
  return (
    <Card className="flex min-h-28 items-center gap-4 p-4">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1", toneClasses[tone])}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 font-mono text-2xl font-semibold text-white tabular-nums">{value}</p>
        <p className="truncate text-xs text-slate-500">{detail}</p>
      </div>
    </Card>
  );
}

function TelemetryCell({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <span className="rounded-lg bg-slate-950/55 p-2.5 transition-colors duration-200 group-hover:bg-slate-950/80 group-focus-within:bg-slate-950/80">
      <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-600">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="mt-1 block font-mono text-sm font-semibold text-slate-200 tabular-nums">{value}</span>
    </span>
  );
}

function HealthMetric({
  icon: Icon,
  label,
  value,
  progress,
  tone = "green"
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  progress?: number | null;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-700/70 bg-slate-950/45 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <Icon aria-hidden="true" className={cn("h-4 w-4", toneClasses[tone].split(" ")[1])} />
      </div>
      <p className="mt-2 font-mono text-xl font-semibold text-white tabular-nums">{value}</p>
      {progress !== null && progress !== undefined ? (
        <ProgressBar className="mt-2" value={progress} label={`${label}: ${Math.round(progress)} percent`} />
      ) : null}
    </div>
  );
}

export function FleetOperations({
  machines,
  actions,
  initialMachineId,
  initialSelectedIds,
  initialDetailOpen,
  generatedAt
}: {
  machines: FleetMachineData[];
  actions: FleetActionData[];
  initialMachineId?: string;
  initialSelectedIds?: string[];
  initialDetailOpen?: boolean;
  generatedAt: Date;
}) {
  const router = useRouter();
  const [focusedId, setFocusedId] = useState(initialMachineId ?? machines[0]?.id ?? "");
  const [detailsOpen, setDetailsOpen] = useState(Boolean(initialDetailOpen));
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const validIds = new Set(machines.map((machine) => machine.id));
    const requestedIds = initialSelectedIds ?? (initialMachineId ? [initialMachineId] : []);
    return [...new Set(requestedIds)].filter((id) => validIds.has(id));
  });
  const selectedMachine = machines.find((machine) => machine.id === focusedId) ?? machines[0];
  const selectedIdSet = new Set(selectedIds);
  const selectedMachines = machines.filter((machine) => selectedIdSet.has(machine.id));
  const onlineCount = machines.filter((machine) => machine.health[0]?.reachable).length;
  const attentionCount = machines.filter((machine) => machineStatus(machine).status !== "HEALTHY").length;
  const driftCount = machines.reduce((total, machine) => total + machine.drift.length, 0);
  const openPlans = actions.filter((action) => ["PLANNED", "RUNNING"].includes(action.status)).length;

  useEffect(() => {
    if (window.location.hash === "#machine-detail") window.requestAnimationFrame(() => setDetailsOpen(true));
    if (window.location.hash !== "#machine-actions") return;
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>("#machine-actions")?.scrollIntoView({ behavior: "auto", block: "start" }));
  }, []);

  function updateFleetUrl(nextFocusedId: string, nextSelectedIds: string[], nextDetailsOpen = detailsOpen) {
    const url = new URL(window.location.href);
    url.pathname = "/fleet";
    url.searchParams.set("machine", nextFocusedId);
    url.searchParams.set("targets", nextSelectedIds.join(","));
    if (nextDetailsOpen) url.searchParams.set("detail", "machine");
    else url.searchParams.delete("detail");
    url.hash = "";
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function toggleMachine(id: string) {
    const nextSelectedIds = selectedIdSet.has(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];
    setSelectedIds(nextSelectedIds);
    updateFleetUrl(focusedId, nextSelectedIds);
  }

  function selectAllMachines() {
    const nextSelectedIds = machines.map((machine) => machine.id);
    setSelectedIds(nextSelectedIds);
    updateFleetUrl(focusedId, nextSelectedIds);
  }

  function clearSelection() {
    setSelectedIds([]);
    updateFleetUrl(focusedId, []);
  }

  function openMachineDetails(id: string) {
    setFocusedId(id);
    setDetailsOpen(true);
    updateFleetUrl(id, selectedIds, true);
  }

  function closeMachineDetails() {
    setDetailsOpen(false);
    updateFleetUrl(focusedId, selectedIds, false);
  }

  if (!selectedMachine) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6">
        <PageHeader eyebrow="Machines · actions · audit" title="Fleet operations" description="Select machines to inspect health, configuration, and safe operational actions in one workspace." />
        <EmptyState title="No machines available" description="Run the machine connector or enable MOCK_MACHINES to populate this workspace." />
      </div>
    );
  }

  const latest = selectedMachine.health[0];
  const selectedStatus = machineStatus(selectedMachine);
  const selectedActions = actions.filter((action) => action.targets.some((target) => selectedIdSet.has(target.machineId)));
  const selectionLabel = selectedMachines.length === 0
    ? "No machines selected"
    : selectedMachines.length === 1
      ? selectedMachines[0].hostname
      : `${selectedMachines.length} machines`;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        eyebrow="Machines · actions · audit"
        title="Fleet operations"
        description="Select multiple machines, open focused detail in a modal, and create one audited bulk action plan without leaving this workspace."
        actions={<StatusBadge status={attentionCount ? "DEGRADED" : "HEALTHY"} label={attentionCount ? `${attentionCount} need attention` : "Fleet healthy"} />}
      />

      <section aria-label="Fleet summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryStat icon={RiComputerLine} label="Machines" value={machines.length} detail="Inventory" tone="blue" />
        <SummaryStat icon={RiCheckboxCircleFill} label="Reachable" value={`${onlineCount}/${machines.length}`} detail="Latest check" tone="green" />
        <SummaryStat icon={RiGitBranchLine} label="Drift findings" value={driftCount} detail="Allow-listed" tone={driftCount ? "amber" : "green"} />
        <SummaryStat icon={RiShieldCheckLine} label="Open plans" value={openPlans} detail="Pending/running" tone={openPlans ? "amber" : "blue"} />
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.42fr)] xl:items-start">
      <section aria-labelledby="machine-grid-title" className="min-w-0">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="machine-grid-title" className="font-semibold text-white">Choose machines</h2>
            <p className="mt-1 text-sm text-slate-500">Select any number of cards for bulk actions. Open machine and agent details in a modal without losing your selection.</p>
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <RiEyeLine aria-hidden="true" className="h-4 w-4" /> Telemetry stays visible on touch
          </p>
        </div>

        <div aria-label="Fleet selection controls" className="mb-3 flex flex-col gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
              <RiCheckboxMultipleLine aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white"><span className="font-mono tabular-nums">{selectedMachines.length}</span> {selectedMachines.length === 1 ? "machine" : "machines"} selected</p>
              <p className="mt-0.5 text-xs text-slate-500">The action planner applies to this whole selection.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={selectAllMachines} disabled={selectedMachines.length === machines.length} className="button-secondary min-h-11 flex-1 px-3 sm:flex-none">
              <RiCheckboxMultipleLine aria-hidden="true" className="h-4 w-4" /> Select all
            </button>
            <button type="button" onClick={clearSelection} disabled={selectedMachines.length === 0} className="button-secondary min-h-11 flex-1 px-3 sm:flex-none">
              <RiCloseCircleLine aria-hidden="true" className="h-4 w-4" /> Clear
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {machines.map((machine) => {
            const machineLatest = machine.health[0];
            const status = machineStatus(machine);
            const selected = selectedIdSet.has(machine.id);
            const focused = detailsOpen && machine.id === selectedMachine.id;
            return (
              <article
                key={machine.id}
                className={cn(
                  "group relative flex min-h-[236px] w-full flex-col overflow-hidden rounded-xl border text-left shadow-dark-tremor-card transition-[transform,border-color,background-color,box-shadow] duration-200 motion-reduce:transform-none",
                  selected
                    ? "border-emerald-400/70 bg-emerald-400/[0.07] shadow-[0_0_28px_rgba(74,222,128,0.08)]"
                    : "border-pulse-border/80 bg-pulse-surface/80 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-900/95 hover:shadow-lg",
                  focused && "ring-1 ring-inset ring-blue-400/60"
                )}
              >
                <button
                  type="button"
                  aria-label={`${selected ? "Deselect" : "Select"} ${machine.hostname}, ${status.label}, CPU ${percent(machineLatest?.cpuPercent)}, memory ${percent(machineLatest?.memoryPercent)}, disk free ${percent(machineLatest?.diskFreePercent)}.`}
                  aria-pressed={selected}
                  onClick={() => toggleMachine(machine.id)}
                  className="w-full flex-1 cursor-pointer p-4 pb-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 sm:p-5 sm:pb-4"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1", toneClasses[status.tone])}>
                        <RiWindowsLine aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-base font-semibold text-white">{machine.hostname}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{roleLabel(machine.role)} · {machine.environment}</span>
                      </span>
                    </span>
                    {selected
                      ? <RiCheckboxCircleFill aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-300" />
                      : <span aria-hidden="true" className={cn("mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-slate-700", status.tone === "green" ? "bg-emerald-400" : status.tone === "amber" ? "bg-amber-400" : "bg-red-400")} />}
                  </span>

                  <span className="mt-4 grid grid-cols-3 gap-2">
                    <TelemetryCell icon={RiCpuLine} label="CPU" value={percent(machineLatest?.cpuPercent)} />
                    <TelemetryCell icon={RiRam2Line} label="RAM" value={percent(machineLatest?.memoryPercent)} />
                    <TelemetryCell icon={RiHardDrive3Line} label="Disk" value={percent(machineLatest?.diskFreePercent)} />
                  </span>
                </button>

                <div className="flex min-w-0 items-center justify-between gap-2 border-t border-slate-700/60 px-4 py-1.5 text-xs sm:px-5">
                  <span className="min-w-0 truncate text-slate-400">{machine.agent?.pool ?? "No pool"} · {formatUptime(machineLatest?.uptimeSeconds)}</span>
                  <button
                    type="button"
                    aria-label={`View details for ${machine.hostname}`}
                    aria-pressed={focused}
                    aria-haspopup="dialog"
                    onClick={() => openMachineDetails(machine.id)}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                      focused ? "bg-blue-400/10 text-blue-300" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <RiFocus3Line aria-hidden="true" className="h-4 w-4" /> {focused ? "Viewing" : "Details"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside id="machine-actions" className="min-w-0 space-y-4 scroll-mt-24" aria-label="Actions and history for the current selection">
        <Card className="border-emerald-400/20 xl:shadow-[0_18px_50px_rgba(2,6,23,0.35)]">
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <RiShieldCheckLine aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-300" />
              <div className="min-w-0"><h3 className="truncate font-semibold text-white">Actions for {selectionLabel}</h3><p className="mt-1 text-xs text-slate-500">Bulk-ready · plan first · audit always</p></div>
            </div>
          </CardHeader>
          <CardContent>
            <ActionPlanner
              targets={selectedMachines.map((machine) => ({
                id: machine.id,
                label: machine.hostname,
                detail: `${roleLabel(machine.role)} · ${machine.environment}`,
                hasReference: Boolean(machine.referenceMachineId),
                agentEnabled: machine.agent?.enabled
              }))}
              onPlanCreated={() => router.refresh()}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <RiHistoryLine aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-300" />
              <div className="min-w-0"><h3 className="font-semibold text-white">Selection audit trail</h3><p className="mt-1 truncate text-xs text-slate-500">Actions touching {selectionLabel.toLowerCase()}</p></div>
            </div>
            <span className="font-mono text-xs text-slate-500">{selectedActions.length}</span>
          </CardHeader>
          {selectedActions.length ? (
            <ol className="divide-y divide-pulse-border/60">
              {selectedActions.slice(0, 8).map((action) => {
                const option = getMachineActionOption(action.type);
                const Icon = option.icon;
                return (
                  <li key={action.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1", action.status === "SUCCESS" ? toneClasses.green : action.status === "FAILED" ? toneClasses.red : toneClasses.amber)}>
                        <Icon aria-hidden="true" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-slate-200">{option.label}</p><StatusBadge status={action.status} /></div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{action.reason}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600"><span>{action.requestedBy}</span><span aria-hidden="true">·</span><span>{action.targets.length} {action.targets.length === 1 ? "target" : "targets"}</span><span aria-hidden="true">·</span><time dateTime={action.requestedAt.toISOString()}>{formatRelativeTime(action.requestedAt, generatedAt)}</time></p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <CardContent className="text-center">
              <RiHistoryLine aria-hidden="true" className="mx-auto h-7 w-7 text-slate-600" />
              <p className="mt-2 text-sm font-medium text-slate-300">No actions for this selection</p>
              <p className="mt-1 text-xs text-slate-500">New bulk plans will appear here with their audit status.</p>
            </CardContent>
          )}
        </Card>
      </aside>
      </div>

      <p className="sr-only" aria-live="polite">{selectedMachines.length} machines selected. {detailsOpen ? `Details open for ${selectedMachine.hostname}.` : "Machine details closed."}</p>

      {detailsOpen ? (
      <AppModal label={`${selectedMachine.hostname} details`} context="Machine & agent" onClose={closeMachineDetails}>
      <section id="machine-detail" aria-labelledby="focused-machine-title" className="space-y-4">
        <Card className="overflow-hidden border-slate-600/80">
          <div className="border-b border-pulse-border/60 bg-gradient-to-r from-emerald-400/[0.08] to-transparent p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1", toneClasses[selectedStatus.tone])}>
                  <RiWindowsLine aria-hidden="true" className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">Focused machine</p>
                  <h2 id="focused-machine-title" className="mt-1 break-words font-mono text-xl font-semibold text-white sm:text-2xl">{selectedMachine.hostname}</h2>
                  <p className="mt-1 text-sm text-slate-400">{roleLabel(selectedMachine.role)} · {selectedMachine.environment} · {selectedMachine.os}</p>
                </div>
              </div>
              <StatusBadge status={selectedStatus.status} label={selectedStatus.label} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <HealthMetric icon={RiCpuLine} label="CPU" value={percent(latest?.cpuPercent)} progress={latest?.cpuPercent} tone={(latest?.cpuPercent ?? 0) >= 80 ? "red" : "green"} />
              <HealthMetric icon={RiRam2Line} label="Memory" value={percent(latest?.memoryPercent)} progress={latest?.memoryPercent} tone={(latest?.memoryPercent ?? 0) >= 85 ? "red" : "blue"} />
              <HealthMetric icon={RiHardDrive3Line} label="Disk free" value={percent(latest?.diskFreePercent)} progress={latest?.diskFreePercent} tone={(latest?.diskFreePercent ?? 100) <= 15 ? "red" : "green"} />
              <HealthMetric icon={RiGitBranchLine} label="Drift" value={selectedMachine.drift.length} tone={selectedMachine.drift.length ? "amber" : "green"} />
            </div>
          </div>
          <div className="grid gap-3 p-5 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
            <p className="flex min-w-0 items-center gap-2"><RiTimeLine aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /><span className="truncate">Checked {formatRelativeTime(latest?.timestamp, generatedAt)}</span></p>
            <p className="flex min-w-0 items-center gap-2"><RiPulseLine aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /><span className="truncate">{formatUptime(latest?.uptimeSeconds)}</span></p>
            <p className="flex min-w-0 items-center gap-2"><RiComputerLine aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /><span className="truncate">Agent {selectedMachine.agent?.name ?? "unmapped"}</span></p>
            <p className="flex min-w-0 items-center gap-2"><RiGitBranchLine aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /><span className="truncate">Reference {selectedMachine.referenceMachineId ? machines.find((machine) => machine.id === selectedMachine.referenceMachineId)?.hostname ?? selectedMachine.referenceMachineId : "not configured"}</span></p>
          </div>
        </Card>

        <div className="min-w-0">
          <div className="min-w-0 space-y-4">
            <div className="grid min-w-0 gap-4 2xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-3">
                    <RiGitBranchLine aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-300" />
                    <div className="min-w-0"><h3 className="font-semibold text-white">Configuration drift</h3><p className="mt-1 text-xs text-slate-500">Allow-listed comparison only</p></div>
                  </div>
                  <StatusBadge status={selectedMachine.drift.length ? "MEDIUM" : "HEALTHY"} label={selectedMachine.drift.length ? `${selectedMachine.drift.length} found` : "Aligned"} />
                </CardHeader>
                {selectedMachine.drift.length ? (
                  <div className="divide-y divide-pulse-border/60">
                    {selectedMachine.drift.map((item) => (
                      <div key={`${item.type}-${item.name}`} className="p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="min-w-0 break-words font-medium text-white">{item.name}</p>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-300">{item.type.replaceAll("_", " ")}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="min-w-0 rounded-lg bg-slate-950/60 p-3"><p className="text-slate-600">Current</p><p className="mt-1 break-all font-mono text-red-300">{item.current ?? "Missing"}</p></div>
                          <div className="min-w-0 rounded-lg bg-slate-950/60 p-3"><p className="text-slate-600">Expected</p><p className="mt-1 break-all font-mono text-emerald-300">{item.expected ?? "Absent"}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <CardContent className="flex min-h-44 items-center justify-center text-center">
                    <div><RiCheckboxCircleFill aria-hidden="true" className="mx-auto h-7 w-7 text-emerald-300" /><p className="mt-2 text-sm font-medium text-slate-200">No drift detected</p><p className="mt-1 text-xs text-slate-500">This machine matches its configured reference.</p></div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-3">
                    <RiPulseLine aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-300" />
                    <div className="min-w-0"><h3 className="font-semibold text-white">Agent & health</h3><p className="mt-1 text-xs text-slate-500">Recent sparse snapshots</p></div>
                  </div>
                  <StatusBadge status={selectedMachine.agent?.connected ? "CONNECTED" : "DISCONNECTED"} label={selectedMachine.agent?.connected ? "Connected" : "Disconnected"} />
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-950/50 p-3 text-xs">
                    <div><dt className="text-slate-600">TeamCity agent</dt><dd className="mt-1 truncate font-mono text-slate-200">{selectedMachine.agent?.name ?? "Unmapped"}</dd></div>
                    <div><dt className="text-slate-600">Pool</dt><dd className="mt-1 truncate text-slate-200">{selectedMachine.agent?.pool ?? "None"}</dd></div>
                    <div><dt className="text-slate-600">Version</dt><dd className="mt-1 truncate font-mono text-slate-200">{selectedMachine.agent?.version ?? "Unknown"}</dd></div>
                    <div><dt className="text-slate-600">Last seen</dt><dd className="mt-1 truncate text-slate-200">{formatRelativeTime(selectedMachine.agent?.lastSeenAt, generatedAt)}</dd></div>
                  </dl>
                  <div className="mt-5 space-y-4">
                    {selectedMachine.health.slice(0, 5).map((sample) => (
                      <div key={sample.id}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                          <time dateTime={sample.timestamp.toISOString()} className="truncate text-slate-500">{formatRelativeTime(sample.timestamp, generatedAt)}</time>
                          <span className="shrink-0 font-mono text-slate-300">CPU {percent(sample.cpuPercent)}</span>
                        </div>
                        <ProgressBar value={sample.cpuPercent ?? 0} label={`CPU ${percent(sample.cpuPercent)} ${formatRelativeTime(sample.timestamp, generatedAt)}`} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-3"><RiArchiveStackLine aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-300" /><div><h3 className="font-semibold text-white">Packages</h3><p className="mt-1 text-xs text-slate-500">Chocolatey inventory</p></div></div>
                  <span className="font-mono text-xs text-slate-500">{selectedMachine.packages.length}</span>
                </CardHeader>
                <ul aria-label={`${selectedMachine.hostname} packages`} className="divide-y divide-pulse-border/60">
                  {selectedMachine.packages.map((item) => (
                    <li key={item.packageName} className="flex min-w-0 items-center justify-between gap-3 p-4">
                      <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-200">{item.packageName}</span><span className="mt-1 block text-xs text-slate-600">Captured {formatRelativeTime(item.capturedAt, generatedAt)}</span></span>
                      <code className="max-w-[45%] shrink-0 break-all rounded bg-slate-950/70 px-2 py-1 text-right text-xs text-blue-300">{item.version}</code>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-3"><RiKey2Line aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-300" /><div><h3 className="font-semibold text-white">Environment</h3><p className="mt-1 text-xs text-slate-500">Sensitive values stay masked</p></div></div>
                  <span className="font-mono text-xs text-slate-500">{selectedMachine.environmentVariables.length}</span>
                </CardHeader>
                <ul aria-label={`${selectedMachine.hostname} environment variables`} className="divide-y divide-pulse-border/60">
                  {selectedMachine.environmentVariables.map((item) => (
                    <li key={item.variableName} className="flex min-w-0 items-center justify-between gap-3 p-4">
                      <span className="min-w-0"><span className="flex items-center gap-1.5 truncate font-mono text-sm text-slate-200">{item.sensitive ? <RiLock2Line aria-label="Masked" className="h-3.5 w-3.5 shrink-0 text-amber-300" /> : null}{item.variableName}</span><span className="mt-1 block text-xs text-slate-600">Captured {formatRelativeTime(item.capturedAt, generatedAt)}</span></span>
                      <code className="max-w-[50%] break-all text-right text-xs text-emerald-300">{item.displayValue}</code>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

        </div>
      </section>
      </AppModal>
      ) : null}

      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.07] p-4 text-sm text-blue-200">
        <RiErrorWarningLine aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <p><span className="font-semibold">Safety boundary:</span> diagnostic refreshes are executable in V1; mutation-heavy actions remain plan-only until the trusted Windows executor is enabled.</p>
      </div>
    </div>
  );
}
