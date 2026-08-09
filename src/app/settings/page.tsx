import { RiInformationLine, RiLock2Line } from "@remixicon/react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { loadConfig, sourceConfigurationIssue } from "@/server/config";
import { getConnectorHealth } from "@/server/queries";
import type { SourceId } from "@/shared/types/domain";
import { formatRelativeTime } from "@/shared/utils/format";

const switches: Array<{ source: SourceId; variable: string; description: string }> = [
  { source: "teamcity", variable: "MOCK_TEAMCITY", description: "Builds, test occurrences, artifacts, and agents" },
  { source: "deployments", variable: "MOCK_DEPLOYMENTS", description: "Deployment history, stages, artifacts, and targets" },
  { source: "services", variable: "MOCK_SERVICES", description: "Service status, latency, errors, and Grafana links" },
  { source: "git", variable: "MOCK_GIT", description: "Commits and changed-file enrichment" },
  { source: "oracle", variable: "MOCK_ORACLE", description: "Connectivity, minimal query, and representative probe" },
  { source: "machines", variable: "MOCK_MACHINES", description: "Machine health, packages, and allow-listed environment" }
];

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  const config = loadConfig();
  const health = new Map(getConnectorHealth().map((item) => [item.id, item]));
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configuration & freshness" title="Settings" description="Source selection is environment-driven so secrets and internal endpoints never pass through the browser." />
      <div className="flex gap-3 rounded-xl border border-blue-400/20 bg-blue-400/[0.08] p-4 text-sm leading-6 text-blue-100"><RiInformationLine className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" /><p><strong>Local default:</strong> when no mock variables are specified outside production, all sources use deterministic mocks. Set <code className="rounded bg-slate-950/60 px-1.5 py-0.5 font-mono text-xs">MOCK_ALL=false</code> to select sources individually.</p></div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {switches.map((item) => {
          const connector = health.get(item.source);
          const mode = config.connectorMode(item.source);
          const issue = sourceConfigurationIssue(item.source, config);
          return <Card key={item.source}><CardHeader><div><h2 className="font-semibold capitalize text-white">{item.source}</h2><p className="mt-1 font-mono text-xs text-emerald-300">{item.variable}</p></div><StatusBadge status={mode} /></CardHeader><CardContent><p className="min-h-10 text-sm leading-5 text-slate-400">{item.description}</p><dl className="mt-4 space-y-2 border-t border-pulse-border/60 pt-4 text-xs"><div className="flex justify-between gap-4"><dt className="text-slate-500">Connector state</dt><dd><StatusBadge status={connector?.status ?? (issue ? "UNCONFIGURED" : "IDLE")} /></dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Last success</dt><dd className="text-slate-300">{formatRelativeTime(connector?.lastSuccessAt)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Poll interval</dt><dd className="font-mono text-slate-300">{config.pollingSeconds[item.source]}s</dd></div></dl>{issue ? <p className="mt-4 rounded-lg bg-red-400/10 p-3 text-xs text-red-200">{issue}</p> : null}</CardContent></Card>;
        })}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><h2 className="font-semibold text-white">Mocking recipe</h2></CardHeader><CardContent><pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-300"><code>{`# Everything mocked\nMOCK_ALL=true\n\n# Mixed mode example\nMOCK_ALL=false\nMOCK_TEAMCITY=true\nMOCK_DEPLOYMENTS=false\nMOCK_SERVICES=true\nMOCK_GIT=false\nMOCK_ORACLE=true\nMOCK_MACHINES=true`}</code></pre></CardContent></Card>
        <Card><CardHeader><h2 className="font-semibold text-white">Security boundary</h2></CardHeader><CardContent><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300"><RiLock2Line className="h-5 w-5" /></span><div><p className="font-medium text-white">Trusted SSO proxy</p><p className="mt-2 text-sm leading-6 text-slate-400">Viewer, Operator, and Admin roles can be supplied through trusted identity headers. Without an explicitly trusted proxy, caller-provided identity headers are ignored.</p></div></div><div className="mt-5 rounded-lg border border-pulse-border p-4"><p className="text-xs uppercase tracking-wider text-slate-500">Current default role</p><p className="mt-2 font-mono text-sm text-slate-200">{config.env.AUTH_DEFAULT_ROLE}</p></div></CardContent></Card>
      </section>
    </div>
  );
}
