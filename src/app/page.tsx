import Link from "next/link";
import {
  RiArrowRightLine,
  RiCheckboxCircleLine,
  RiCloudLine,
  RiDatabase2Line,
  RiFlaskLine,
  RiHammerLine,
  RiRobot2Line
} from "@remixicon/react";
import { BuildDurationChart, ServiceDistributionChart, TestComparisonChart } from "@/components/charts/overview-charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { getOverviewData } from "@/server/queries";
import { formatRelativeTime } from "@/shared/utils/format";

export default function OverviewPage() {
  const data = getOverviewData();
  const metrics = data.metrics;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operational cockpit"
        title="Everything affecting the run, in one timeline."
        description="PulseOps correlates builds, tests, deployments, service health, source changes, machines, and Oracle—then ranks the evidence that matters."
        actions={<Link href="/timeline" className="button-secondary">Open timeline <RiArrowRightLine aria-hidden="true" className="h-4 w-4" /></Link>}
      />

      <section aria-label="Current operational metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Build success" value={`${metrics.buildSuccessPercent}%`} detail="Last 20 finished builds" icon={RiHammerLine} tone={metrics.buildSuccessPercent >= 90 ? "green" : "amber"} />
        <MetricCard label="Test anomalies" value={metrics.testAnomalies} detail="High or critical" icon={RiFlaskLine} tone={metrics.testAnomalies > 0 ? "amber" : "green"} />
        <MetricCard label="Services" value={`${metrics.healthyServices}/${metrics.totalServices}`} detail="Healthy right now" icon={RiCloudLine} tone={metrics.healthyServices === metrics.totalServices ? "green" : "amber"} />
        <MetricCard label="Agents" value={`${metrics.onlineAgents}/${metrics.totalAgents}`} detail="Connected and enabled" icon={RiRobot2Line} tone={metrics.onlineAgents === metrics.totalAgents ? "green" : "amber"} />
        <MetricCard label="Oracle" value={metrics.oracleQueryMs === null ? "—" : `${metrics.oracleQueryMs} ms`} detail="Minimal query latency" icon={RiDatabase2Line} tone={metrics.oracleHealthy ? "green" : "red"} />
      </section>

      <section aria-label="Operational trends" className="grid gap-4 xl:grid-cols-[1.25fr_1.25fr_0.7fr]">
        <Card>
          <CardHeader><div><h2 className="font-semibold text-white">Build duration</h2><p className="mt-1 text-xs text-slate-500">Latest builds · minutes</p></div><StatusBadge status="HEALTHY" label="Stable" /></CardHeader>
          <CardContent><BuildDurationChart data={data.buildTrend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><h2 className="font-semibold text-white">Test vs baseline</h2><p className="mt-1 text-xs text-slate-500">Latest occurrence per suite</p></div><Link className="text-xs font-semibold text-emerald-300 hover:text-emerald-200" href="/tests">View tests</Link></CardHeader>
          <CardContent><TestComparisonChart data={data.testComparison} /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><h2 className="font-semibold text-white">Service health</h2><p className="mt-1 text-xs text-slate-500">Latest known state</p></div></CardHeader>
          <CardContent><ServiceDistributionChart data={data.serviceDistribution} /></CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div><h2 className="font-semibold text-white">Active incidents</h2><p className="mt-1 text-xs text-slate-500">Anomalies with a ranked explanation</p></div>
            <Link href="/incidents" className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">View all</Link>
          </CardHeader>
          <div className="divide-y divide-pulse-border/60">
            {data.incidents.map((incident) => (
              <Link key={incident.id} href={incident.primaryEntityType === "TEST_OCCURRENCE" ? `/tests/${incident.primaryEntityId}` : "/incidents"} className="flex min-h-20 items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-800 text-slate-300"><RiCheckboxCircleLine aria-hidden="true" className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-100">{incident.title}</span><span className="mt-1 block text-xs text-slate-500">Opened {formatRelativeTime(incident.startedAt)}</span></span>
                <StatusBadge status={incident.severity} />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div><h2 className="font-semibold text-white">Unified timeline</h2><p className="mt-1 text-xs text-slate-500">Newest correlated facts</p></div>
            <Link href="/timeline" className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Explore</Link>
          </CardHeader>
          <div className="relative divide-y divide-pulse-border/60">
            {data.timeline.map((event) => (
              <div key={event.id} className="grid grid-cols-[4.25rem_1fr] gap-3 px-5 py-3.5">
                <time className="font-mono text-xs tabular-nums text-slate-500" dateTime={event.timestamp.toISOString()}>{event.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                <div><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /><p className="text-sm text-slate-200">{event.summary}</p></div><p className="mt-1 pl-3.5 text-[11px] uppercase tracking-wider text-slate-600">{event.source} · {event.environment}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section aria-labelledby="connector-heading">
        <div className="mb-4 flex items-end justify-between"><div><h2 id="connector-heading" className="font-semibold text-white">Source freshness</h2><p className="mt-1 text-sm text-slate-500">Connector failures are never presented as healthy data.</p></div><Link href="/settings" className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Configure</Link></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {data.connectors.map((connector) => (
            <Card key={connector.id} className="p-4">
              <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium text-slate-200">{connector.label}</p><StatusBadge status={connector.status} /></div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span className="uppercase tracking-wider">{connector.mode}</span><span>{formatRelativeTime(connector.lastSuccessAt)}</span></div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
