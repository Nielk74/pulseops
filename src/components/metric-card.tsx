import type { ElementType, ReactNode } from "react";
import { RiArrowRightUpLine } from "@remixicon/react";
import { Card } from "@/components/tremor/card";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "green",
  footer
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ElementType;
  tone?: "green" | "amber" | "red" | "blue";
  footer?: ReactNode;
}) {
  const toneClass = {
    green: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    amber: "bg-amber-400/10 text-amber-200 ring-amber-400/20",
    red: "bg-red-400/10 text-red-300 ring-red-400/20",
    blue: "bg-blue-400/10 text-blue-300 ring-blue-400/20"
  }[tone];
  return (
    <Card className="group relative overflow-hidden p-5 transition-colors duration-200 hover:border-slate-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-lg ring-1 ${toneClass}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{detail}</span>
        {footer ?? <RiArrowRightUpLine aria-hidden="true" className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
    </Card>
  );
}
