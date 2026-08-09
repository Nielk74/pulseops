import Link from "next/link";
import { RiArrowRightSLine } from "@remixicon/react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { getFleet } from "@/server/queries";
import { formatRelativeTime } from "@/shared/utils/format";

export const metadata = { title: "Fleet" };

export default function FleetPage() {
  const rows = getFleet();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Windows inventory" title="Fleet" description="Machine health, TeamCity mapping, package versions, and allow-listed environment drift at a glance." />
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Machine</th><th>Role</th><th>Reachable</th><th>TeamCity agent</th><th>CPU</th><th>Memory</th><th>Disk free</th><th>Drift</th><th>Last check</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{rows.map((machine) => (
        <tr key={machine.id}>
          <td><Link href={`/fleet/${machine.id}`} className="inline-flex min-h-11 items-center font-mono font-semibold text-white hover:text-emerald-300">{machine.hostname}</Link></td>
          <td><span className="text-xs text-slate-400">{machine.role.replaceAll("_", " ")}</span></td>
          <td><StatusBadge status={machine.health?.reachable ? "HEALTHY" : "OFFLINE"} label={machine.health?.reachable ? "Reachable" : "Offline"} /></td>
          <td><StatusBadge status={machine.agent?.connected ? "CONNECTED" : "DISCONNECTED"} label={machine.agent?.name ?? "Unmapped"} /></td>
          <td className="font-mono tabular-nums">{machine.health?.cpuPercent === null || machine.health?.cpuPercent === undefined ? "—" : `${Math.round(machine.health.cpuPercent)}%`}</td>
          <td className="font-mono tabular-nums">{machine.health?.memoryPercent === null || machine.health?.memoryPercent === undefined ? "—" : `${Math.round(machine.health.memoryPercent)}%`}</td>
          <td className="font-mono tabular-nums">{machine.health?.diskFreePercent === null || machine.health?.diskFreePercent === undefined ? "—" : `${Math.round(machine.health.diskFreePercent)}%`}</td>
          <td><StatusBadge status={machine.drift.length ? "MEDIUM" : "HEALTHY"} label={machine.drift.length ? `${machine.drift.length} items` : "None"} /></td>
          <td>{formatRelativeTime(machine.health?.timestamp)}</td>
          <td><Link href={`/fleet/${machine.id}`} aria-label={`Open ${machine.hostname}`} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white"><RiArrowRightSLine className="h-5 w-5" /></Link></td>
        </tr>
      ))}</tbody></table></div>
    </div>
  );
}
