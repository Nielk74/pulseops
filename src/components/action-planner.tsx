"use client";

import { useState, type FormEvent } from "react";
import { RiCheckboxCircleLine, RiErrorWarningLine, RiLoader4Line } from "@remixicon/react";

const actionOptions = [
  { value: "REFRESH_MACHINE", label: "Refresh machine", note: "V1 executable" },
  { value: "RUN_ORACLE_PROBE", label: "Run Oracle probe", note: "V1 executable" },
  { value: "RUN_SERVICE_PROBE", label: "Run service probe", note: "V1 executable" },
  { value: "REFRESH_PACKAGE_INVENTORY", label: "Refresh package inventory", note: "V1 executable" },
  { value: "REFRESH_ENV_INVENTORY", label: "Refresh environment inventory", note: "V1 executable" },
  { value: "RERUN_BUILD", label: "Rerun build", note: "Plan only" },
  { value: "DISABLE_AGENT", label: "Disable agent", note: "Plan only" },
  { value: "RESTART_SERVICE", label: "Restart Windows service", note: "Plan only" },
  { value: "CHOCO_UPGRADE", label: "Upgrade Chocolatey package", note: "Plan only" }
];

export function ActionPlanner({ targets }: { targets: Array<{ id: string; label: string }> }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; actionId?: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(undefined);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/actions/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: form.get("type"),
          targets: [form.get("target")],
          parameters: {},
          reason: form.get("reason")
        })
      });
      const body = await response.json() as { actionId?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not create action plan");
      setResult({ ok: true, actionId: body.actionId, message: "Plan recorded. Review its target and previous state before execution." });
      event.currentTarget.reset();
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div><label htmlFor="action-type" className="mb-2 block text-sm font-medium text-slate-200">Action type</label><select id="action-type" name="type" className="field" required>{actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.note}</option>)}</select><p className="mt-2 text-xs text-slate-500">Mutation-heavy actions remain plan-only until a trusted executor is enabled.</p></div>
      <div><label htmlFor="action-target" className="mb-2 block text-sm font-medium text-slate-200">Target</label><select id="action-target" name="target" className="field" required>{targets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select></div>
      <div><label htmlFor="action-reason" className="mb-2 block text-sm font-medium text-slate-200">Operational reason</label><textarea id="action-reason" name="reason" rows={3} className="field min-h-24 py-3" minLength={8} required placeholder="Describe the anomaly or incident this plan addresses." /><p className="mt-2 text-xs text-slate-500">This explanation becomes part of the immutable audit record.</p></div>
      <button className="button-primary w-full sm:w-auto" disabled={pending} type="submit">{pending ? <RiLoader4Line aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}{pending ? "Planning…" : "Create action plan"}</button>
      {result ? <div role="status" className={`flex gap-3 rounded-lg border p-4 text-sm ${result.ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>{result.ok ? <RiCheckboxCircleLine className="h-5 w-5 shrink-0" /> : <RiErrorWarningLine className="h-5 w-5 shrink-0" />}<div><p>{result.message}</p>{result.actionId ? <p className="mt-1 font-mono text-xs opacity-80">{result.actionId}</p> : result.ok ? null : <p className="mt-1 text-xs opacity-80">Set AUTH_DEFAULT_ROLE=OPERATOR for local planning, or provide trusted SSO headers.</p>}</div></div> : null}
    </form>
  );
}
