import Link from "next/link";
import { RiArrowRightSLine, RiExternalLinkLine } from "@remixicon/react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getServices } from "@/server/queries";
import { formatRelativeTime } from "@/shared/utils/format";

export const metadata = { title: "Services" };

export default function ServicesPage() {
  const rows = getServices();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dependency health" title="Services" description="Fresh snapshots and Grafana summaries—without turning PulseOps into another log viewer." />
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Service</th><th>Environment</th><th>Status</th><th>Latency</th><th>Errors</th><th>Instances</th><th>Freshness</th><th>Related anomalies</th><th><span className="sr-only">Links</span></th></tr></thead><tbody>{rows.map((service) => (
        <tr key={`${service.serviceId}-${service.environment}`}>
          <td><Link href={`/services/${service.serviceId}`} className="inline-flex min-h-11 items-center font-medium text-white hover:text-emerald-300">{service.serviceName}</Link></td>
          <td className="font-mono text-xs">{service.environment}</td><td><StatusBadge status={service.status} /></td><td className="font-mono tabular-nums">{service.latencyMs ?? "—"} ms</td><td className="font-mono tabular-nums">{service.errorCount}</td><td className="font-mono tabular-nums">{service.instanceCount}</td><td>{formatRelativeTime(service.timestamp)}</td><td><StatusBadge status={service.relatedAnomalyCount ? "HIGH" : "HEALTHY"} label={String(service.relatedAnomalyCount)} /></td>
          <td><div className="flex items-center"><Link href={`/services/${service.serviceId}`} aria-label={`Open ${service.serviceName}`} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white"><RiArrowRightSLine className="h-5 w-5" /></Link>{service.grafanaUrl ? <a href={service.grafanaUrl} target="_blank" rel="noreferrer" aria-label={`Open ${service.serviceName} in Grafana`} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white"><RiExternalLinkLine className="h-4 w-4" /></a> : null}</div></td>
        </tr>
      ))}</tbody></table></div>
    </div>
  );
}
