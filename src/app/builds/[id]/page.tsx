import Link from "next/link";
import { notFound } from "next/navigation";
import { RiArrowLeftLine, RiArchiveLine, RiGitCommitLine, RiTimerLine } from "@remixicon/react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { getBuildDetail } from "@/server/queries";
import { formatDuration, shortSha } from "@/shared/utils/format";

export default async function BuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getBuildDetail(id);
  if (!data) notFound();
  return (
    <div className="space-y-6">
      <Link href="/builds" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><RiArrowLeftLine className="h-4 w-4" /> Back to builds</Link>
      <PageHeader eyebrow="Build trace" title={`${data.buildType} #${data.buildNumber}`} description={`${data.branch} · ${data.environment} · ${data.startedAt?.toLocaleString() ?? "Queued"}`} actions={<StatusBadge status={data.status} />} />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Duration" value={formatDuration(data.durationMs)} detail={`Queue ${formatDuration(data.queueDurationMs)}`} icon={RiTimerLine} tone="blue" />
        <MetricCard label="Tests" value={data.tests.length} detail={`${data.testAnomalyCount} anomalies`} icon={RiTimerLine} tone={data.testAnomalyCount ? "amber" : "green"} />
        <MetricCard label="Artifacts" value={data.artifacts.length} detail={data.artifacts[0]?.version ?? "Metadata only"} icon={RiArchiveLine} tone="green" />
        <MetricCard label="Commit" value={shortSha(data.commitSha)} detail={data.commit?.authorName ?? "Not enriched"} icon={RiGitCommitLine} tone="blue" />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card><CardHeader><div><h2 className="font-semibold text-white">Test results</h2><p className="mt-1 text-xs text-slate-500">Slowest first</p></div></CardHeader><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Test</th><th>Status</th><th>Duration</th><th>Anomaly</th><th>Cause</th></tr></thead><tbody>{data.tests.map((test) => <tr key={test.id}><td><Link href={`/tests/${test.id}`} className="font-medium text-white hover:text-emerald-300">{test.testName}</Link></td><td><StatusBadge status={test.status} /></td><td className="font-mono">{formatDuration(test.durationMs)}</td><td><StatusBadge status={test.anomalyType === "NONE" ? "HEALTHY" : test.anomalyType} label={test.anomalyType === "NONE" ? "Normal" : test.anomalyType} /></td><td>{test.probableCause ?? "—"}</td></tr>)}</tbody></table></div></Card>
        <div className="space-y-4">
          <Card><CardHeader><h2 className="font-semibold text-white">Source revision</h2></CardHeader><CardContent>{data.commit ? <Link href={`/commits/${data.commit.sha}`} className="block rounded-lg border border-pulse-border bg-slate-950/50 p-4 hover:border-blue-400/40"><p className="font-mono text-xs text-blue-300">{data.commit.sha}</p><p className="mt-2 font-medium text-white">{data.commit.subject}</p><p className="mt-1 text-sm text-slate-500">{data.commit.authorName}</p></Link> : <p className="text-sm text-slate-500">No source revision supplied by TeamCity.</p>}</CardContent></Card>
          <Card><CardHeader><h2 className="font-semibold text-white">Deployment trail</h2></CardHeader><CardContent className="space-y-3">{data.deployments.length ? data.deployments.map((deployment) => <div key={deployment.id} className="flex items-center justify-between gap-3 rounded-lg border border-pulse-border p-3"><div><p className="text-sm font-medium text-white">{deployment.service ?? deployment.application}</p><p className="mt-1 font-mono text-xs text-slate-500">{deployment.artifactVersion}</p></div><StatusBadge status={deployment.status} /></div>) : <p className="text-sm text-slate-500">No matching deployment observed.</p>}</CardContent></Card>
        </div>
      </section>
    </div>
  );
}
