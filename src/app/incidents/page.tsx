import Link from "next/link";
import {
  RiAlarmWarningLine,
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiShieldCheckLine,
  RiStackLine
} from "@remixicon/react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { BarList, type BarListTone } from "@/components/tremor/bar-list";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { getIncidents } from "@/server/queries";
import { formatRelativeTime } from "@/shared/utils/format";

const severityOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
const severityTones: Record<(typeof severityOrder)[number], BarListTone> = {
  CRITICAL: "danger",
  HIGH: "info",
  MEDIUM: "warning",
  LOW: "neutral",
  INFO: "neutral"
};

export const metadata = { title: "Incidents" };

export default function IncidentsPage() {
  const rows = getIncidents();
  const openCount = rows.filter((incident) => incident.status === "OPEN").length;
  const highPriorityCount = rows.filter((incident) => incident.severity === "CRITICAL" || incident.severity === "HIGH").length;
  const entityCount = new Set(rows.map((incident) => `${incident.primaryEntityType}:${incident.primaryEntityId}`)).size;
  const severityData = severityOrder.map((severity) => ({
    name: severity,
    value: rows.filter((incident) => incident.severity === severity).length,
    tone: severityTones[severity]
  })).filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Meaningful conditions only"
        title="Incidents"
        description="Critical anomalies and dependency failures, summarized without adding alert noise."
      />

      {rows.length ? (
        <>
          <Card>
            <CardHeader className="items-center">
              <div>
                <h2 className="font-semibold text-white">Incident pressure</h2>
                <p className="mt-1 text-xs text-slate-500">Current workload and severity composition</p>
              </div>
              <StatusBadge status={highPriorityCount ? "HIGH" : "HEALTHY"} label={highPriorityCount ? `${highPriorityCount} high priority` : "No high priority"} />
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(18rem,1.15fr)] lg:items-center">
              <dl className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-pulse-border/60 bg-slate-950/35 p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500"><RiAlarmWarningLine aria-hidden="true" className="h-4 w-4" />Open</dt>
                  <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white">{openCount}</dd>
                </div>
                <div className="rounded-lg border border-pulse-border/60 bg-slate-950/35 p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500"><RiShieldCheckLine aria-hidden="true" className="h-4 w-4" />Priority</dt>
                  <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white">{highPriorityCount}</dd>
                </div>
                <div className="rounded-lg border border-pulse-border/60 bg-slate-950/35 p-3">
                  <dt className="flex items-center gap-1.5 text-xs text-slate-500"><RiStackLine aria-hidden="true" className="h-4 w-4" />Entities</dt>
                  <dd className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white">{entityCount}</dd>
                </div>
              </dl>
              <div>
                <div className="mb-3 flex items-center justify-between gap-4 text-xs">
                  <span className="font-medium uppercase tracking-[0.12em] text-slate-500">By severity</span>
                  <span className="text-slate-600">{rows.length} total</span>
                </div>
                <BarList data={severityData} label="Incidents by severity" sortOrder="none" valueFormatter={(value) => String(value)} />
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="incident-list-title" className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 id="incident-list-title" className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Recent incidents</h2>
              <span className="text-xs text-slate-600">Newest first</span>
            </div>
            {rows.map((incident) => (
              <Card key={incident.id}>
                <Link
                  href={incident.primaryEntityType === "TEST_OCCURRENCE" ? `/tests/${incident.primaryEntityId}` : "#"}
                  className="group grid min-h-24 gap-4 p-5 transition-colors hover:bg-slate-800/40 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] sm:items-center"
                >
                  <div className="flex items-center justify-between gap-4 sm:contents">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-400/10 text-red-300">
                      {incident.status === "OPEN"
                        ? <RiAlarmWarningLine aria-hidden="true" className="h-5 w-5" />
                        : <RiCheckboxCircleLine aria-hidden="true" className="h-5 w-5" />}
                    </span>
                    <span className="shrink-0"><StatusBadge status={incident.severity} /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-white group-hover:text-emerald-300">{incident.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{incident.type.replaceAll("_", " ")} · opened {formatRelativeTime(incident.startedAt)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:contents">
                    <span className="shrink-0"><StatusBadge status={incident.status} /></span>
                    <RiArrowRightLine aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" />
                  </div>
                </Link>
              </Card>
            ))}
          </section>
        </>
      ) : (
        <EmptyState title="No incidents" description="PulseOps has not detected a meaningful operational condition." />
      )}
    </div>
  );
}
