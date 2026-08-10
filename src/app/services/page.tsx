import Link from "next/link";
import {
  RiBugLine,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiExternalLinkLine,
  RiEyeLine,
  RiPulseLine,
  RiServerLine,
  RiTimeLine
} from "@remixicon/react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Banner } from "@/components/tremor/banner";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { Tracker, type TrackerTone } from "@/components/tremor/tracker";
import { getServices } from "@/server/queries";
import { formatRelativeTime } from "@/shared/utils/format";

export const metadata = { title: "Services" };

function trackerTone(status: string): TrackerTone {
  if (status === "HEALTHY") return "success";
  if (status === "DEGRADED") return "warning";
  if (status === "UNHEALTHY") return "danger";
  return "neutral";
}

export default function ServicesPage() {
  const rows = getServices();
  const totalChecks = rows.reduce((total, service) => total + service.history.length, 0);
  const healthyChecks = rows.reduce((total, service) => total + service.healthyCheckCount, 0);
  const attention = rows.filter((service) => service.status !== "HEALTHY");
  const hasOutage = rows.some((service) => service.status === "UNHEALTHY");
  const latestSample = rows.length ? new Date(Math.max(...rows.map((service) => service.timestamp.getTime()))) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dependency health"
        title="Services"
        description="Current state and recent checks in one monitoring workspace, with detailed correlations one click away."
      />

      {rows.length ? (
        <>
          <Banner
            variant={attention.length ? (hasOutage ? "danger" : "warning") : "success"}
            icon={attention.length
              ? <RiErrorWarningFill aria-hidden="true" className="h-5 w-5" />
              : <RiCheckboxCircleFill aria-hidden="true" className="h-5 w-5" />}
            title={attention.length
              ? `${attention.length} of ${rows.length} monitored services need attention`
              : "All monitored services are operational"}
            description={`${healthyChecks} of ${totalChecks} recent checks were healthy. Latest sample ${formatRelativeTime(latestSample)}.`}
          />

          <Card className="overflow-visible">
            <CardHeader className="items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-400/10 text-blue-300">
                  <RiPulseLine aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-white">Platform status</h2>
                  <p className="mt-1 text-xs text-slate-500">Up to 30 real samples per service and environment</p>
                </div>
              </div>
              <StatusBadge
                status={attention.length ? (hasOutage ? "UNHEALTHY" : "DEGRADED") : "HEALTHY"}
                label={`${rows.length - attention.length}/${rows.length} operational`}
              />
            </CardHeader>

            <CardContent className="divide-y divide-pulse-border/60 p-0">
              {rows.map((service) => {
                const currentHealthy = service.status === "HEALTHY";
                const oldestCheck = service.history.at(0)?.timestamp;
                const trackerData = service.history.map((sample) => ({
                  key: sample.id,
                  tone: trackerTone(sample.status),
                  tooltip: `${sample.timestamp.toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${sample.status.toLowerCase()} · ${sample.latencyMs ?? "No latency"}${sample.latencyMs === null ? "" : " ms"} · ${sample.errorCount} ${sample.errorCount === 1 ? "error" : "errors"}`
                }));

                return (
                  <article
                    key={`${service.serviceId}-${service.environment}`}
                    className="grid gap-5 px-5 py-5 transition-colors duration-150 hover:bg-slate-900/35 xl:grid-cols-[minmax(10rem,0.7fr)_minmax(19rem,1.45fr)_minmax(16rem,1fr)_auto] xl:items-center"
                  >
                    <div className="min-w-0">
                      <Link href={`/services/${service.serviceId}`} className="group inline-flex min-h-11 items-center gap-2 font-semibold text-white hover:text-emerald-300">
                        {currentHealthy
                          ? <RiCheckboxCircleFill aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-400" />
                          : <RiErrorWarningFill aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-400" />}
                        <span className="truncate">{service.serviceName}</span>
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span className="font-mono text-slate-400">{service.environment}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatRelativeTime(service.timestamp)}</span>
                      </p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-slate-500">
                          <RiTimeLine aria-hidden="true" className="h-4 w-4" />
                          {service.history.length} recent checks
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-slate-200">{service.healthyPercent}% healthy</span>
                      </div>
                      <Tracker
                        data={trackerData}
                        label={`${service.serviceName} health history: ${service.healthyCheckCount} of ${service.history.length} checks healthy`}
                        className="mt-2"
                      />
                      <div className="mt-1 flex justify-between text-[11px] text-slate-600">
                        <span>{oldestCheck ? formatRelativeTime(oldestCheck) : "No history"}</span>
                        <span>Latest</span>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-pulse-border/60 bg-slate-950/35 p-2.5">
                        <dt className="flex items-center gap-1.5 text-slate-500"><RiPulseLine aria-hidden="true" className="h-4 w-4" />Latency</dt>
                        <dd className="mt-1 font-mono font-medium tabular-nums text-slate-200">{service.latencyMs === null ? "—" : `${service.latencyMs} ms`}</dd>
                      </div>
                      <div className="rounded-lg border border-pulse-border/60 bg-slate-950/35 p-2.5">
                        <dt className="flex items-center gap-1.5 text-slate-500"><RiErrorWarningFill aria-hidden="true" className="h-4 w-4" />Errors</dt>
                        <dd className="mt-1 font-mono font-medium tabular-nums text-slate-200">{service.errorCount}</dd>
                      </div>
                      <div className="rounded-lg border border-pulse-border/60 bg-slate-950/35 p-2.5">
                        <dt className="flex items-center gap-1.5 text-slate-500"><RiServerLine aria-hidden="true" className="h-4 w-4" />Instances</dt>
                        <dd className="mt-1 font-mono font-medium tabular-nums text-slate-200">{service.instanceCount}</dd>
                      </div>
                      <div className="rounded-lg border border-pulse-border/60 bg-slate-950/35 p-2.5">
                        <dt className="flex items-center gap-1.5 text-slate-500"><RiBugLine aria-hidden="true" className="h-4 w-4" />Anomalies</dt>
                        <dd className="mt-1 font-mono font-medium tabular-nums text-slate-200">{service.relatedAnomalyCount}</dd>
                      </div>
                    </dl>

                    <div className="flex items-center gap-1 xl:flex-col">
                      <Link
                        href={`/services/${service.serviceId}`}
                        aria-label={`Open ${service.serviceName} details`}
                        className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                      >
                        <RiEyeLine aria-hidden="true" className="h-5 w-5" />
                      </Link>
                      {service.grafanaUrl ? (
                        <a
                          href={service.grafanaUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${service.serviceName} in Grafana`}
                          className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
                        >
                          <RiExternalLinkLine aria-hidden="true" className="h-5 w-5" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </CardContent>

            <div className="flex flex-col gap-3 border-t border-pulse-border/60 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <div aria-label="Service status legend" className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-sm bg-emerald-400" />Healthy</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-sm bg-amber-400" />Degraded</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-sm bg-red-400" />Unhealthy</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 rounded-sm bg-slate-600" />Unknown</span>
              </div>
              <p>Hover a segment, or focus it and use arrow keys, to inspect a check.</p>
            </div>
          </Card>
        </>
      ) : (
        <EmptyState title="No service checks yet" description="Run the services connector to populate this monitoring workspace." />
      )}
    </div>
  );
}
