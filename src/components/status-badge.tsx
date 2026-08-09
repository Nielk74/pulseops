import { Badge } from "@/components/tremor/badge";

export function statusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  const normalized = status.toUpperCase();
  if (["HEALTHY", "SUCCESS", "PASSED", "ONLINE", "CONNECTED", "MOCK", "READY"].includes(normalized)) return "success";
  if (["DEGRADED", "WARNING", "MEDIUM", "RUNNING", "SYNCING", "PLANNED", "STALE"].includes(normalized)) return "warning";
  if (["CRITICAL", "FAILURE", "FAILED", "UNHEALTHY", "OFFLINE", "ERROR", "DISCONNECTED", "BLOCKED"].includes(normalized)) return "danger";
  if (["HIGH", "LIVE", "SLOW", "FAST"].includes(normalized)) return "info";
  return "neutral";
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const variant = statusVariant(status);
  const dot = variant === "success" ? "bg-emerald-400" : variant === "warning" ? "bg-amber-400" : variant === "danger" ? "bg-red-400" : variant === "info" ? "bg-blue-400" : "bg-slate-400";
  return (
    <Badge variant={variant}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label ?? status.replaceAll("_", " ")}
    </Badge>
  );
}
