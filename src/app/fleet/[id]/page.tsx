import Link from "next/link";
import { notFound } from "next/navigation";
import { RiArrowLeftLine, RiComputerLine, RiCpuLine, RiDatabase2Line, RiHardDrive3Line } from "@remixicon/react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/tremor/card";
import { ProgressBar } from "@/components/tremor/progress-bar";
import { getMachineDetail } from "@/server/queries";

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getMachineDetail(id);
  if (!data) notFound();
  const latest = data.health[0];
  return (
    <div className="space-y-6">
      <Link href="/fleet" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white"><RiArrowLeftLine className="h-4 w-4" /> Back to fleet</Link>
      <PageHeader eyebrow="Machine detail" title={data.machine.hostname} description={`${data.machine.role.replaceAll("_", " ")} · ${data.machine.environment} · ${data.agent?.pool ?? "No TeamCity pool"}`} actions={<StatusBadge status={latest?.reachable ? "HEALTHY" : "OFFLINE"} label={latest?.reachable ? "Reachable" : "Offline"} />} />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="CPU" value={latest?.cpuPercent === null || latest?.cpuPercent === undefined ? "—" : `${Math.round(latest.cpuPercent)}%`} detail="Latest lightweight sample" icon={RiCpuLine} tone={(latest?.cpuPercent ?? 0) >= 80 ? "red" : "green"} />
        <MetricCard label="Memory" value={latest?.memoryPercent === null || latest?.memoryPercent === undefined ? "—" : `${Math.round(latest.memoryPercent)}%`} detail="Physical memory used" icon={RiDatabase2Line} tone={(latest?.memoryPercent ?? 0) >= 85 ? "red" : "blue"} />
        <MetricCard label="Disk free" value={latest?.diskFreePercent === null || latest?.diskFreePercent === undefined ? "—" : `${Math.round(latest.diskFreePercent)}%`} detail="Lowest monitored volume" icon={RiHardDrive3Line} tone={(latest?.diskFreePercent ?? 100) <= 15 ? "red" : "green"} />
        <MetricCard label="Drift" value={data.drift.length} detail={data.machine.referenceMachineId ? "Compared with reference" : "No reference configured"} icon={RiComputerLine} tone={data.drift.length ? "amber" : "green"} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card><CardHeader><div><h2 className="font-semibold text-white">Configuration drift</h2><p className="mt-1 text-xs text-slate-500">Only allow-listed facts are compared</p></div></CardHeader><div className="divide-y divide-pulse-border/60">{data.drift.length ? data.drift.map((item) => <div key={`${item.type}-${item.name}`} className="p-5"><div className="flex items-center justify-between gap-3"><p className="font-medium text-white">{item.name}</p><StatusBadge status="MEDIUM" label={item.type.replaceAll("_", " ")} /></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div className="rounded-lg bg-slate-950/60 p-3"><p className="text-slate-600">Current</p><p className="mt-1 break-all font-mono text-red-300">{item.current ?? "Missing"}</p></div><div className="rounded-lg bg-slate-950/60 p-3"><p className="text-slate-600">Expected</p><p className="mt-1 break-all font-mono text-emerald-300">{item.expected ?? "Absent"}</p></div></div></div>) : <div className="p-8 text-center text-sm text-slate-500">No drift detected against the reference machine.</div>}</div></Card>
        <Card><CardHeader><div><h2 className="font-semibold text-white">Health samples</h2><p className="mt-1 text-xs text-slate-500">Sparse snapshots, not second-by-second telemetry</p></div></CardHeader><CardContent className="space-y-5">{data.health.slice(0, 8).map((sample) => <div key={sample.id}><div className="mb-2 flex items-center justify-between text-xs"><time className="text-slate-500">{sample.timestamp.toLocaleString()}</time><span className="font-mono text-slate-300">CPU {Math.round(sample.cpuPercent ?? 0)}%</span></div><ProgressBar value={sample.cpuPercent ?? 0} label={`CPU at ${sample.timestamp.toLocaleString()}`} /></div>)}</CardContent></Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><h2 className="font-semibold text-white">Chocolatey packages</h2></CardHeader><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Package</th><th>Version</th><th>Captured</th></tr></thead><tbody>{data.packages.map((item) => <tr key={item.packageName}><td className="font-medium text-white">{item.packageName}</td><td className="font-mono">{item.version}</td><td>{item.capturedAt.toLocaleString()}</td></tr>)}</tbody></table></div></Card>
        <Card><CardHeader><div><h2 className="font-semibold text-white">Environment variables</h2><p className="mt-1 text-xs text-slate-500">Sensitive values remain hashed and masked</p></div></CardHeader><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Variable</th><th>Display value</th><th>Sensitive</th></tr></thead><tbody>{data.environment.map((item) => <tr key={item.variableName}><td className="font-mono text-white">{item.variableName}</td><td className="max-w-64 break-all font-mono text-xs">{item.displayValue}</td><td><StatusBadge status={item.sensitive ? "HIGH" : "INFO"} label={item.sensitive ? "Masked" : "Visible"} /></td></tr>)}</tbody></table></div></Card>
      </section>
    </div>
  );
}
