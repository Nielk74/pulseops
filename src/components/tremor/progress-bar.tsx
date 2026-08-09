import { cn } from "@/shared/utils/cn";

export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const bounded = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-800", className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(bounded)}>
      <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${bounded}%` }} />
    </div>
  );
}
