import type { HTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

export type BarListTone = "success" | "warning" | "danger" | "info" | "neutral";

export type BarListItem = {
  key?: string;
  name: string;
  value: number;
  tone?: BarListTone;
};

const barClasses: Record<BarListTone, string> = {
  success: "bg-emerald-400/20",
  warning: "bg-amber-400/20",
  danger: "bg-red-400/20",
  info: "bg-blue-400/20",
  neutral: "bg-slate-500/20"
};

const dotClasses: Record<BarListTone, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-blue-400",
  neutral: "bg-slate-500"
};

export function BarList({
  data,
  valueFormatter = (value) => value.toLocaleString(),
  sortOrder = "descending",
  label,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  data: BarListItem[];
  valueFormatter?: (value: number) => string;
  sortOrder?: "ascending" | "descending" | "none";
  label: string;
}) {
  const sorted = sortOrder === "none"
    ? data
    : [...data].sort((a, b) => sortOrder === "ascending" ? a.value - b.value : b.value - a.value);
  const maximum = Math.max(...sorted.map((item) => item.value), 0);

  return (
    <div role="list" aria-label={label} className={cn("space-y-2", className)} {...props}>
      {sorted.map((item) => {
        const tone = item.tone ?? "info";
        const width = item.value <= 0 || maximum <= 0 ? 0 : Math.max((item.value / maximum) * 100, 3);
        return (
          <div key={item.key ?? item.name} role="listitem" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="relative h-9 overflow-hidden rounded-md bg-slate-900/70">
              <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 rounded-md", barClasses[tone])} style={{ width: `${width}%` }} />
              <span className="relative flex h-full min-w-0 items-center gap-2 px-3 text-sm text-slate-200">
                <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", dotClasses[tone])} />
                <span className="truncate">{item.name}</span>
              </span>
            </div>
            <span className="min-w-8 text-right font-mono text-sm font-medium tabular-nums text-slate-100">{valueFormatter(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
