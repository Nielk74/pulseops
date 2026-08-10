import Link from "next/link";
import { notFound } from "next/navigation";
import { RiArrowLeftLine, RiExternalLinkLine } from "@remixicon/react";
import { ServiceHistoryChart } from "@/components/charts/service-history-chart";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { getServiceDetail } from "@/server/queries";
import { formatDuration } from "@/shared/utils/format";

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getServiceDetail(id);
  if (!data) notFound();
  return (
    <div className="space-y-6">
      <Link data-detail-back href="/services" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white"><RiArrowLeftLine className="h-4 w-4" /> Back to services</Link>
      <PageHeader eyebrow="Service evidence" title={data.current.serviceName} description={`${data.current.environment} · ${data.current.instanceCount} instances · checked ${data.current.timestamp.toLocaleString()}`} actions={<div className="flex gap-2"><StatusBadge status={data.current.status} />{data.current.grafanaUrl ? <a className="button-secondary" href={data.current.grafanaUrl} target="_blank" rel="noreferrer">Grafana <RiExternalLinkLine className="h-4 w-4" /></a> : null}</div>} />
      <Card><CardHeader><div><h2 className="font-semibold text-white">Health history</h2><p className="mt-1 text-xs text-slate-500">Latency and summarized errors</p></div></CardHeader><CardContent><ServiceHistoryChart data={data.history.map((sample) => ({ time: sample.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), latencyMs: sample.latencyMs ?? 0, errors: sample.errorCount }))} /></CardContent></Card>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><h2 className="font-semibold text-white">Recent deployments</h2></CardHeader><div className="divide-y divide-pulse-border/60">{data.deployments.length ? data.deployments.map((deployment) => <div key={deployment.id} className="flex items-center justify-between gap-4 p-5"><div><p className="font-medium text-white">{deployment.artifactVersion ?? deployment.application}</p><p className="mt-1 text-xs text-slate-500">{deployment.startedAt?.toLocaleString() ?? deployment.requestedAt.toLocaleString()}</p></div><StatusBadge status={deployment.status} /></div>) : <p className="p-5 text-sm text-slate-500">No deployments correlated.</p>}</div></Card>
        <Card><CardHeader><h2 className="font-semibold text-white">Related test anomalies</h2></CardHeader><div className="divide-y divide-pulse-border/60">{data.anomalies.length ? data.anomalies.map((test) => <Link key={test.id} href={`/tests/${test.id}`} className="flex min-h-16 items-center justify-between gap-4 p-5 hover:bg-slate-800/50"><div><p className="font-medium text-white">{test.testName}</p><p className="mt-1 text-xs text-slate-500">{formatDuration(test.durationMs)}</p></div><StatusBadge status={test.anomalySeverity} /></Link>) : <p className="p-5 text-sm text-slate-500">No test anomaly currently attributes this service.</p>}</div></Card>
      </section>
    </div>
  );
}
