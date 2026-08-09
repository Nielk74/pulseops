import type { HTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

const variants = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  neutral: "border-slate-600 bg-slate-800/70 text-slate-300"
} as const;

export function Badge({
  className,
  variant = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn("inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide", variants[variant], className)}
      {...props}
    />
  );
}
