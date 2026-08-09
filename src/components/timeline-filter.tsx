"use client";

import { useState } from "react";
import { RiFilter3Line, RiSearchLine } from "@remixicon/react";
import { StatusBadge } from "@/components/status-badge";

export interface TimelineItem {
  id: string;
  timestamp: string;
  source: string;
  type: string;
  severity: string;
  environment: string;
  summary: string;
}

export function TimelineFilter({ items }: { items: TimelineItem[] }) {
  const [source, setSource] = useState("ALL");
  const [severity, setSeverity] = useState("ALL");
  const [query, setQuery] = useState("");
  const sources = [...new Set(items.map((item) => item.source))].sort();
  const filtered = items.filter((item) =>
    (source === "ALL" || item.source === source) &&
    (severity === "ALL" || item.severity === severity) &&
    (!query || `${item.summary} ${item.type} ${item.environment}`.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-pulse-border bg-pulse-surface/80 p-4 md:grid-cols-[1fr_12rem_12rem]">
        <label className="relative"><span className="sr-only">Search timeline</span><RiSearchLine aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search build, service, machine…" /></label>
        <label><span className="sr-only">Filter by source</span><select className="field" value={source} onChange={(event) => setSource(event.target.value)}><option value="ALL">All sources</option>{sources.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">Filter by severity</span><select className="field" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="ALL">All severities</option>{["INFO", "MEDIUM", "HIGH", "CRITICAL"].map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      </div>
      <p className="flex items-center gap-2 text-xs text-slate-500"><RiFilter3Line aria-hidden="true" className="h-4 w-4" /> Showing {filtered.length} of {items.length} events</p>
      <ol className="relative ml-3 border-l border-slate-700/80">
        {filtered.map((item) => (
          <li key={item.id} className="relative pb-7 pl-8 last:pb-0">
            <span aria-hidden="true" className={`absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full ring-4 ring-pulse-bg ${item.severity === "CRITICAL" || item.severity === "HIGH" ? "bg-red-400" : item.severity === "MEDIUM" ? "bg-amber-400" : "bg-emerald-400"}`} />
            <article className="rounded-xl border border-pulse-border/80 bg-pulse-surface/80 p-4 transition-colors hover:border-slate-500">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><StatusBadge status={item.severity} /><span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{item.source} · {item.type.replaceAll("_", " ")}</span></div><time dateTime={item.timestamp} className="font-mono text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</time></div>
              <p className="mt-3 text-sm font-medium text-slate-100">{item.summary}</p><p className="mt-1 text-xs text-slate-500">Environment {item.environment}</p>
            </article>
          </li>
        ))}
      </ol>
      {!filtered.length ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">No events match those filters.</div> : null}
    </div>
  );
}
