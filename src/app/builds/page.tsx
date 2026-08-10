import Link from "next/link";
import { RiEyeLine } from "@remixicon/react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getBuilds } from "@/server/queries";
import { formatDuration, shortSha } from "@/shared/utils/format";

export const metadata = { title: "Builds" };

export default function BuildsPage() {
  const rows = getBuilds();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="TeamCity" title="Builds" description="Follow source revisions through artifacts, deployments, agents, and test anomalies." />
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Build</th><th>Configuration</th><th>Commit</th><th>Status</th><th>Duration</th><th>Agent</th><th>Artifacts</th><th>Anomalies</th><th>Deployment</th><th><span className="sr-only">Open</span></th></tr></thead>
          <tbody>{rows.map((build) => (
            <tr key={build.id}>
              <td><Link className="inline-flex min-h-11 items-center font-mono font-semibold text-white hover:text-emerald-300" href={`/builds/${build.id}`}>#{build.buildNumber}</Link></td>
              <td><div className="max-w-56"><p className="truncate text-slate-200">{build.buildType}</p><p className="mt-1 font-mono text-xs text-slate-500">{build.branch}</p></div></td>
              <td>{build.commitSha ? <Link href={`/commits/${build.commitSha}`} className="font-mono text-xs text-blue-300 hover:text-blue-200">{shortSha(build.commitSha)}</Link> : "—"}</td>
              <td><StatusBadge status={build.status} /></td>
              <td className="font-mono tabular-nums">{formatDuration(build.durationMs)}</td>
              <td>{build.agent?.name ?? build.agentId ?? "—"}</td>
              <td className="font-mono tabular-nums">{build.artifactCount}</td>
              <td><StatusBadge status={build.testAnomalyCount > 0 ? "HIGH" : "HEALTHY"} label={String(build.testAnomalyCount)} /></td>
              <td>{build.deployment ? <StatusBadge status={build.deployment.status} /> : "—"}</td>
              <td><Link href={`/builds/${build.id}`} aria-label={`Open build ${build.buildNumber} details`} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"><RiEyeLine aria-hidden="true" className="h-5 w-5" /></Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
