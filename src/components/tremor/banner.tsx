import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

const variants = {
  success: {
    shell: "border-emerald-400/20 bg-emerald-400/[0.08]",
    icon: "bg-emerald-400/[0.12] text-emerald-300",
    title: "text-emerald-100"
  },
  warning: {
    shell: "border-amber-400/20 bg-amber-400/[0.08]",
    icon: "bg-amber-400/[0.12] text-amber-300",
    title: "text-amber-100"
  },
  danger: {
    shell: "border-red-400/20 bg-red-400/[0.08]",
    icon: "bg-red-400/[0.12] text-red-300",
    title: "text-red-100"
  },
  info: {
    shell: "border-blue-400/20 bg-blue-400/[0.08]",
    icon: "bg-blue-400/[0.12] text-blue-300",
    title: "text-blue-100"
  }
} as const;

export function Banner({
  title,
  description,
  icon,
  actions,
  variant = "info",
  className,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: keyof typeof variants;
}) {
  const styles = variants[variant];
  return (
    <div role="note" className={cn("flex flex-wrap items-start gap-3 rounded-xl border p-4 sm:flex-nowrap sm:items-center", styles.shell, className)} {...props}>
      {icon ? <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", styles.icon)}>{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <h2 className={cn("font-semibold", styles.title)}>{title}</h2>
        {description ? <div className="mt-1 text-sm leading-6 text-slate-300">{description}</div> : null}
      </div>
      {actions ? <div className="basis-full pl-[3.25rem] sm:basis-auto sm:pl-0">{actions}</div> : null}
    </div>
  );
}
