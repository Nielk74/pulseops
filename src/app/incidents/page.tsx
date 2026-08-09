import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/tremor/card";
import { getIncidents } from "@/server/queries";
import { formatRelativeTime } from "@/shared/utils/format";

export const metadata = { title: "Incidents" };

export default function IncidentsPage() {
  const rows = getIncidents();
  return (
    <div className="space-y-6"><PageHeader eyebrow="Meaningful conditions only" title="Incidents" description="Critical anomalies and dependency failures, kept intentionally sparse to avoid alert fatigue." /><div className="grid gap-3">{rows.map((incident) => <Card key={incident.id}><Link href={incident.primaryEntityType === "TEST_OCCURRENCE" ? `/tests/${incident.primaryEntityId}` : "#"} className="flex min-h-24 flex-col gap-4 p-5 hover:bg-slate-800/40 sm:flex-row sm:items-center"><StatusBadge status={incident.severity} /><div className="min-w-0 flex-1"><h2 className="font-medium text-white">{incident.title}</h2><p className="mt-1 text-xs text-slate-500">{incident.type.replaceAll("_", " ")} · opened {formatRelativeTime(incident.startedAt)}</p></div><StatusBadge status={incident.status} /></Link></Card>)}</div></div>
  );
}
