import Link from "next/link";
import { RiArrowRightSLine, RiGitCommitLine } from "@remixicon/react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getCommits } from "@/server/queries";
import { shortSha } from "@/shared/utils/format";

export const metadata = { title: "Commits" };

export default function CommitsPage() {
  const commits = getCommits();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Local Git clone" title="Commits" description="Commit-native source enrichment, changed files, related builds, and deployments—without requiring provider or pull-request APIs." />
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Commit</th><th>Subject</th><th>Author</th><th>Date</th><th>Files</th><th>Builds</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{commits.map((commit) => <tr key={commit.sha}>
        <td><Link href={`/commits/${commit.sha}`} className="inline-flex min-h-11 items-center gap-2 font-mono text-blue-300 hover:text-blue-200"><RiGitCommitLine className="h-4 w-4" />{shortSha(commit.sha)}</Link></td><td className="max-w-md"><p className="truncate font-medium text-white">{commit.subject}</p></td><td>{commit.authorName}</td><td>{commit.committerDate.toLocaleString()}</td><td><StatusBadge status="INFO" label={String(commit.changedFileCount)} /></td><td><StatusBadge status={commit.buildCount ? "SUCCESS" : "UNKNOWN"} label={String(commit.buildCount)} /></td><td><Link href={`/commits/${commit.sha}`} aria-label={`Open commit ${shortSha(commit.sha)}`} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white"><RiArrowRightSLine className="h-5 w-5" /></Link></td>
      </tr>)}</tbody></table></div>
    </div>
  );
}
