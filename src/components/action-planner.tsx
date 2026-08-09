"use client";

import { useState, type ElementType, type FormEvent } from "react";
import {
  RiArchiveStackLine,
  RiCheckboxCircleLine,
  RiComputerLine,
  RiErrorWarningLine,
  RiExchangeBoxLine,
  RiForbidLine,
  RiGitBranchLine,
  RiInstallLine,
  RiKey2Line,
  RiLoader4Line,
  RiPlayCircleLine,
  RiRefreshLine,
  RiRestartLine,
  RiShieldCheckLine,
  RiToolsLine
} from "@remixicon/react";
import type { ActionType } from "@/shared/schemas/actions";
import { cn } from "@/shared/utils/cn";

export interface ActionOption {
  value: ActionType;
  label: string;
  description: string;
  executable: boolean;
  icon: ElementType;
}

export const machineActionOptions: ActionOption[] = [
  {
    value: "REFRESH_MACHINE",
    label: "Refresh machine",
    description: "Pull a fresh health snapshot from the inventory source.",
    executable: true,
    icon: RiRefreshLine
  },
  {
    value: "REFRESH_PACKAGE_INVENTORY",
    label: "Refresh packages",
    description: "Read the latest Chocolatey package inventory.",
    executable: true,
    icon: RiArchiveStackLine
  },
  {
    value: "REFRESH_ENV_INVENTORY",
    label: "Refresh environment",
    description: "Read the allow-listed environment inventory.",
    executable: true,
    icon: RiKey2Line
  },
  {
    value: "ENABLE_AGENT",
    label: "Enable agent",
    description: "Prepare an audited TeamCity agent enablement plan.",
    executable: false,
    icon: RiPlayCircleLine
  },
  {
    value: "DISABLE_AGENT",
    label: "Disable agent",
    description: "Prepare an audited TeamCity agent disablement plan.",
    executable: false,
    icon: RiForbidLine
  },
  {
    value: "RESTART_SERVICE",
    label: "Restart service",
    description: "Prepare a canary-ready Windows service restart plan.",
    executable: false,
    icon: RiRestartLine
  },
  {
    value: "CHOCO_UPGRADE",
    label: "Upgrade package",
    description: "Prepare a Chocolatey package upgrade plan.",
    executable: false,
    icon: RiInstallLine
  },
  {
    value: "SYNC_PACKAGES_FROM_REFERENCE",
    label: "Sync packages",
    description: "Plan convergence with this machine's package reference.",
    executable: false,
    icon: RiExchangeBoxLine
  },
  {
    value: "SYNC_ENV_FROM_REFERENCE",
    label: "Sync environment",
    description: "Plan allow-listed environment convergence.",
    executable: false,
    icon: RiGitBranchLine
  }
];

export function getMachineActionOption(type: string): ActionOption {
  return machineActionOptions.find((option) => option.value === type) ?? {
    value: "REFRESH_MACHINE",
    label: type.replaceAll("_", " ").toLowerCase(),
    description: "Audited operational action.",
    executable: false,
    icon: RiToolsLine
  };
}

export function ActionPlanner({
  target,
  onPlanCreated
}: {
  target: {
    id: string;
    label: string;
    detail: string;
    hasReference: boolean;
    agentEnabled?: boolean;
  };
  onPlanCreated?: (actionId: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [selectedType, setSelectedType] = useState<ActionType>("REFRESH_MACHINE");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string; actionId?: string }>();
  const selectedOption = getMachineActionOption(selectedType);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(undefined);
    try {
      const response = await fetch("/api/actions/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          targets: [target.id],
          parameters: {},
          reason
        })
      });
      const body = await response.json() as { actionId?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not create action plan");
      setResult({
        ok: true,
        actionId: body.actionId,
        message: `${selectedOption.label} plan recorded for ${target.label}. Review is required before execution.`
      });
      setReason("");
      if (body.actionId) onPlanCreated?.(body.actionId);
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
          <RiComputerLine aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-white">{target.label}</p>
          <p className="truncate text-xs text-slate-500">{target.detail}</p>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-200">Choose an action</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">Green actions are diagnostic reads. Amber actions create a plan only.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {machineActionOptions.map((option) => {
            const Icon = option.icon;
            const selected = selectedType === option.value;
            const syncAction = ["SYNC_PACKAGES_FROM_REFERENCE", "SYNC_ENV_FROM_REFERENCE"].includes(option.value);
            const disabledReason = syncAction && !target.hasReference
              ? "No reference"
              : option.value === "ENABLE_AGENT" && target.agentEnabled === undefined
                ? "No agent"
                : option.value === "ENABLE_AGENT" && target.agentEnabled
                  ? "Already enabled"
                  : option.value === "DISABLE_AGENT" && target.agentEnabled === undefined
                    ? "No agent"
                    : option.value === "DISABLE_AGENT" && !target.agentEnabled
                      ? "Already disabled"
                      : undefined;
            return (
              <label key={option.value} title={disabledReason ?? option.description} className={cn("relative", disabledReason ? "cursor-not-allowed" : "cursor-pointer")}>
                <input
                  className="peer sr-only"
                  type="radio"
                  name="type"
                  value={option.value}
                  checked={selected}
                  disabled={Boolean(disabledReason)}
                  onChange={() => setSelectedType(option.value)}
                />
                <span className={cn(
                  "flex min-h-24 flex-col rounded-lg border p-3 text-left transition-[border-color,background-color,color] duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-950",
                  disabledReason
                    ? "border-slate-800 bg-slate-950/25 text-slate-600 opacity-70"
                    : selected
                    ? "border-emerald-400/60 bg-emerald-400/10 text-white"
                    : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500 hover:bg-slate-900"
                )}>
                  <span className="flex items-start justify-between gap-2">
                    <Icon aria-hidden="true" className={cn("h-5 w-5", disabledReason ? "text-slate-600" : option.executable ? "text-emerald-300" : "text-amber-300")} />
                    {selected ? <RiCheckboxCircleLine aria-hidden="true" className="h-4 w-4 text-emerald-300" /> : null}
                  </span>
                  <span className="mt-2 text-xs font-semibold leading-4">{option.label}</span>
                  <span className={cn("mt-auto pt-1 text-[10px] font-medium uppercase tracking-[0.12em]", disabledReason ? "text-slate-600" : option.executable ? "text-emerald-400" : "text-amber-300")}>
                    {disabledReason ?? (option.executable ? "Diagnostic" : "Plan only")}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3 text-xs leading-5 text-slate-400">
        <p className="font-medium text-slate-200">{selectedOption.label}</p>
        <p className="mt-1">{selectedOption.description}</p>
      </div>

      <div>
        <label htmlFor={`action-reason-${target.id}`} className="mb-2 block text-sm font-medium text-slate-200">Operational reason</label>
        <textarea
          id={`action-reason-${target.id}`}
          name="reason"
          rows={3}
          className="field min-h-24 py-3"
          minLength={8}
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Describe the anomaly or incident this plan addresses."
        />
        <p className="mt-2 text-xs text-slate-500">The reason is stored in the immutable audit record.</p>
      </div>

      <button className="button-primary w-full" disabled={pending} type="submit">
        {pending
          ? <RiLoader4Line aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          : <RiShieldCheckLine aria-hidden="true" className="h-4 w-4" />}
        {pending ? "Creating plan…" : "Review and create plan"}
      </button>

      {result ? (
        <div role="status" className={cn(
          "flex gap-3 rounded-lg border p-4 text-sm",
          result.ok
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-red-500/30 bg-red-500/10 text-red-200"
        )}>
          {result.ok
            ? <RiCheckboxCircleLine aria-hidden="true" className="h-5 w-5 shrink-0" />
            : <RiErrorWarningLine aria-hidden="true" className="h-5 w-5 shrink-0" />}
          <div className="min-w-0">
            <p>{result.message}</p>
            {result.actionId ? <p className="mt-1 break-all font-mono text-xs opacity-80">{result.actionId}</p> : null}
            {!result.ok ? <p className="mt-1 text-xs opacity-80">Set AUTH_DEFAULT_ROLE=OPERATOR for local planning, or provide trusted SSO headers.</p> : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
