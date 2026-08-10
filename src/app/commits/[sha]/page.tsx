import Link from "next/link";
import { notFound } from "next/navigation";
import { RiArrowLeftLine, RiFileEditLine, RiGitCommitLine } from "@remixicon/react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { getCommitDetail } from "@/server/queries";
import { shortSha } from "@/shared/utils/format";

export default async function CommitDetailPage({ params }: { params: Promise<{ sha: string }> }) {
  const { sha } = await params;
  const data = getCommitDetail(sha);
  if (!data) notFound();
  return (
    <div className="space-y-6">
      <Link data-detail-back href="/commits" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"><RiArrowLeftLine className="h-4 w-4" /> Back to commits</Link>
      <PageHeader eyebrow="Source change" title={data.commit.subject} description={`${data.commit.authorName} · ${data.commit.committerDate.toLocaleString()}`} actions={<StatusBadge status="INFO" label={shortSha(data.commit.sha)} />} />
      <Card><CardContent><div className="flex items-start gap-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-400/10 text-blue-300"><RiGitCommitLine className="h-5 w-5" /></span><div><p className="break-all font-mono text-xs text-blue-300">{data.commit.sha}</p><p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-300">{data.commit.body || data.commit.subject}</p></div></div></CardContent></Card>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card><CardHeader><div><h2 className="font-semibold text-white">Changed files</h2><p className="mt-1 text-xs text-slate-500">{data.files.length} paths enriched from the local clone</p></div></CardHeader><div className="divide-y divide-pulse-border/60">{data.files.map((file) => <div key={file.path} className="flex min-h-14 items-center gap-3 px-5 py-3"><RiFileEditLine className="h-4 w-4 shrink-0 text-slate-500" /><p className="min-w-0 flex-1 break-all font-mono text-xs text-slate-300">{file.path}</p><StatusBadge status={file.changeType === "DELETED" ? "HIGH" : "INFO"} label={file.changeType} /><span className="hidden font-mono text-xs text-slate-600 sm:inline">+{file.additions ?? "?"} −{file.deletions ?? "?"}</span></div>)}</div></Card>
        <div className="space-y-4"><Card><CardHeader><h2 className="font-semibold text-white">Related builds</h2></CardHeader><div className="divide-y divide-pulse-border/60">{data.builds.length ? data.builds.map((build) => <Link key={build.id} href={`/builds/${build.id}`} className="flex min-h-16 items-center justify-between gap-4 p-5 hover:bg-slate-800/50"><div><p className="font-medium text-white">#{build.buildNumber} · {build.buildType}</p><p className="mt-1 text-xs text-slate-500">{build.environment}</p></div><StatusBadge status={build.status} /></Link>) : <p className="p-5 text-sm text-slate-500">No matching build ingested.</p>}</div></Card><Card><CardHeader><h2 className="font-semibold text-white">Related deployments</h2></CardHeader><div className="divide-y divide-pulse-border/60">{data.deployments.length ? data.deployments.map((deployment) => <div key={deployment.id} className="flex items-center justify-between gap-4 p-5"><div><p className="font-medium text-white">{deployment.service ?? deployment.application}</p><p className="mt-1 text-xs text-slate-500">{deployment.artifactVersion}</p></div><StatusBadge status={deployment.status} /></div>) : <p className="p-5 text-sm text-slate-500">No matching deployment ingested.</p>}</div></Card></div>
      </section>
    </div>
  );
}
