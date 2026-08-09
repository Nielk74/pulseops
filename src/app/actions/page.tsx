import { ActionPlanner } from "@/components/action-planner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { getActions, getFleet } from "@/server/queries";
import { fromJson } from "@/shared/utils/json";

export const metadata = { title: "Actions" };

export default function ActionsPage() {
  const rows = getActions();
  const fleet = getFleet();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Plan first · audit always" title="Operational actions" description="Strongly typed actions with explicit targets, previous state, role checks, and a complete audit trail. No arbitrary PowerShell." />
      <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <Card><CardHeader><div><h2 className="font-semibold text-white">New plan</h2><p className="mt-1 text-xs text-slate-500">Planning never mutates the target</p></div></CardHeader><CardContent><ActionPlanner targets={fleet.map((machine) => ({ id: machine.id, label: `${machine.hostname} · ${machine.role.replaceAll("_", " ")}` }))} /></CardContent></Card>
        <Card><CardHeader><div><h2 className="font-semibold text-white">Action history</h2><p className="mt-1 text-xs text-slate-500">Pending, running, completed, and failed</p></div></CardHeader>{rows.length ? <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Action</th><th>Status</th><th>Requested by</th><th>Reason</th><th>Parameters</th><th>Requested</th></tr></thead><tbody>{rows.map((action) => <tr key={action.id}><td><p className="font-medium text-white">{action.type.replaceAll("_", " ")}</p><p className="mt-1 font-mono text-[10px] text-slate-600">{action.id}</p></td><td><StatusBadge status={action.status} /></td><td>{action.requestedBy}</td><td className="max-w-xs"><p className="line-clamp-2">{action.reason}</p></td><td><code className="text-xs text-slate-500">{JSON.stringify(fromJson(action.parametersJson, {}))}</code></td><td>{action.requestedAt.toLocaleString()}</td></tr>)}</tbody></table></div> : <CardContent><EmptyState title="No actions recorded" description="Create a plan to begin the audited workflow." /></CardContent>}</Card>
      </section>
    </div>
  );
}
