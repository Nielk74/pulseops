import Link from "next/link";
import { notFound } from "next/navigation";
import { RiArrowLeftLine, RiCheckLine, RiGitCommitLine, RiLightbulbFlashLine, RiServerLine } from "@remixicon/react";
import { TestHistoryChart } from "@/components/charts/test-history-chart";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { ProgressBar } from "@/components/tremor/progress-bar";
import { getTestDetail } from "@/server/queries";
import { formatDuration, formatPercent, shortSha } from "@/shared/utils/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getTestDetail(id);
  return { title: data ? `${data.occurrence.testName} explanation` : "Test not found" };
}

export default async function TestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getTestDetail(id);
  if (!data) notFound();
  const { occurrence, baseline, explanation, history, build, machine } = data;
  const topCause = explanation?.probableCauses[0];
  const delta = explanation?.anomaly.deltaPercent ?? 0;
  return (
    <div className="space-y-6">
      <Link href="/tests" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><RiArrowLeftLine aria-hidden="true" className="h-4 w-4" /> Back to tests</Link>
      <PageHeader
        eyebrow="Explain this run"
        title={occurrence.testName}
        description={`${occurrence.testType} · ${occurrence.environment} · build #${build?.buildNumber ?? occurrence.buildId}`}
        actions={<StatusBadge status={occurrence.anomalySeverity} label={`${occurrence.anomalySeverity} ${occurrence.anomalyType}`} />}
      />

      <section aria-label="Run comparison" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Current duration" value={formatDuration(occurrence.durationMs)} detail={occurrence.finishedAt.toLocaleString()} icon={RiServerLine} tone="blue" />
        <MetricCard label="Historical median" value={formatDuration(baseline?.medianMs)} detail={`${baseline?.sampleCount ?? 0} clean samples`} icon={RiCheckLine} tone="green" />
        <MetricCard label="Difference" value={formatPercent(delta, { signed: true })} detail={`${occurrence.anomalyScore.toFixed(1)} MAD score`} icon={RiLightbulbFlashLine} tone={occurrence.anomalyType === "NONE" ? "green" : "amber"} />
        <MetricCard label="Test count" value={occurrence.testCount ?? "—"} detail={baseline?.medianTestCount ? `Median ${baseline.medianTestCount}` : "No count baseline"} icon={RiFlaskLineFallback} tone={occurrence.anomalyType === "FAST" ? "red" : "green"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader><div><h2 className="font-semibold text-white">Duration history</h2><p className="mt-1 text-xs text-slate-500">Baseline shown as a dashed reference</p></div></CardHeader>
          <CardContent><TestHistoryChart medianMs={baseline?.medianMs ?? occurrence.durationMs} data={history.map((item) => ({ label: `#${item.buildId.replace("build-", "")}`, durationMinutes: Math.round(item.durationMs / 60_000), testCount: item.testCount }))} /></CardContent>
        </Card>
        <Card className="border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.08] to-pulse-surface">
          <CardHeader><div><p className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-300">Most likely cause</p><h2 className="mt-2 text-xl font-semibold text-white">{topCause?.entity ?? "Insufficient evidence"}</h2></div></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between"><span className="text-sm text-slate-400">Confidence score</span><span className="font-mono text-2xl font-semibold text-emerald-300">{topCause?.score ?? 0}%</span></div>
            <ProgressBar className="mt-3" value={topCause?.score ?? 0} label="Cause confidence" />
            <ul className="mt-5 space-y-3 text-sm leading-5 text-slate-300">
              {(topCause?.observations ?? ["More telemetry is needed before ranking a cause."]).map((observation) => <li key={observation} className="flex gap-2"><RiCheckLine aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{observation}</li>)}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><h2 className="font-semibold text-white">Ranked evidence</h2><p className="mt-1 text-xs text-slate-500">Deterministic, explainable correlation rules</p></div></CardHeader>
          <div className="divide-y divide-pulse-border/60">
            {(explanation?.evidence ?? []).map((evidence, index) => (
              <div key={`${evidence.category}-${evidence.entity}`} className="p-5">
                <div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-slate-800 font-mono text-xs text-slate-400">{index + 1}</span><div className="flex-1"><p className="font-medium text-white">{evidence.entity ?? evidence.category}</p><p className="text-xs text-slate-500">{evidence.category}</p></div><span className="font-mono text-sm text-slate-300">{evidence.score}%</span></div>
                <ul className="mt-3 space-y-1 pl-10 text-sm text-slate-400">{evidence.observations.map((item) => <li key={item}>· {item}</li>)}</ul>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader><div><h2 className="font-semibold text-white">Run context</h2><p className="mt-1 text-xs text-slate-500">Direct relationships used for correlation</p></div></CardHeader>
          <CardContent className="space-y-4">
            <ContextRow label="Build" value={build ? `#${build.buildNumber} · ${build.buildType}` : occurrence.buildId} href={build ? `/builds/${build.id}` : undefined} />
            <ContextRow label="Commit" value={shortSha(build?.commitSha)} href={build?.commitSha ? `/commits/${build.commitSha}` : undefined} icon={<RiGitCommitLine className="h-4 w-4" />} />
            <ContextRow label="Machine" value={machine?.hostname ?? "Not mapped"} href={machine ? `/fleet?machine=${machine.id}#machine-detail` : undefined} />
            <ContextRow label="Started" value={occurrence.startedAt.toLocaleString()} />
            <ContextRow label="Finished" value={occurrence.finishedAt.toLocaleString()} />
            <ContextRow label="Result" value={occurrence.status} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function RiFlaskLineFallback(props: { className?: string }) { return <RiLightbulbFlashLine {...props} />; }

function ContextRow({ label, value, href, icon }: { label: string; value: string; href?: string; icon?: React.ReactNode }) {
  const content = <span className="flex items-center gap-2 font-mono text-sm text-slate-200">{icon}{value}</span>;
  return <div className="flex min-h-11 items-center justify-between gap-4 border-b border-pulse-border/50 pb-3 last:border-0 last:pb-0"><span className="text-sm text-slate-500">{label}</span>{href ? <Link href={href} className="rounded text-emerald-300 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">{content}</Link> : content}</div>;
}
