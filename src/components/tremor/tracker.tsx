"use client";

import { useId, useState, type HTMLAttributes, type KeyboardEvent } from "react";
import { cn } from "@/shared/utils/cn";

export type TrackerTone = "success" | "warning" | "danger" | "info" | "neutral";

export type TrackerItem = {
  key?: string | number;
  tone?: TrackerTone;
  tooltip: string;
};

const toneClasses: Record<TrackerTone, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  info: "bg-blue-400",
  neutral: "bg-slate-600"
};

export function Tracker({
  data,
  label,
  className,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "children"> & { data: TrackerItem[]; label: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const tooltipId = useId();
  const activeItem = activeIndex === null ? undefined : data[activeIndex];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!data.length) return;
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    setActiveIndex((currentIndex) => {
      const current = currentIndex ?? data.length - 1;
      if (event.key === "ArrowLeft") return Math.max(0, current - 1);
      if (event.key === "ArrowRight") return Math.min(data.length - 1, current + 1);
      if (event.key === "Home") return 0;
      return data.length - 1;
    });
  }

  const tooltipPosition = activeIndex !== null && activeIndex < data.length / 3
    ? "left-0"
    : activeIndex !== null && activeIndex >= (data.length * 2) / 3
      ? "right-0"
      : "left-1/2 -translate-x-1/2";

  return (
    <div className={cn("relative", className)} {...props}>
      <div
        role="group"
        tabIndex={data.length ? 0 : -1}
        aria-label={`${label}. Use left and right arrow keys to inspect checks.`}
        aria-describedby={activeItem ? tooltipId : undefined}
        onFocus={() => setActiveIndex((current) => current ?? data.length - 1)}
        onBlur={() => setActiveIndex(null)}
        onKeyDown={handleKeyDown}
        onPointerLeave={() => setActiveIndex(null)}
        className="group flex h-5 w-full items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {data.length ? data.map((item, index) => (
          <span
            key={item.key ?? index}
            aria-hidden="true"
            title={item.tooltip}
            onPointerEnter={() => setActiveIndex(index)}
            className="h-3 min-w-0 flex-1 overflow-hidden px-[1px] first:rounded-l first:pl-0 last:rounded-r last:pr-0"
          >
            <span
              className={cn(
                "block h-full rounded-[2px] transition duration-150 group-hover:opacity-80",
                activeIndex === index && "opacity-100 ring-1 ring-white/70",
                toneClasses[item.tone ?? "neutral"]
              )}
            />
          </span>
        )) : (
          <span aria-hidden="true" className="h-3 w-full rounded bg-slate-800" />
        )}
      </div>

      {activeItem ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute bottom-full z-30 mb-2 w-max max-w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-200 shadow-xl",
            tooltipPosition
          )}
        >
          {activeItem.tooltip}
        </span>
      ) : null}
    </div>
  );
}
