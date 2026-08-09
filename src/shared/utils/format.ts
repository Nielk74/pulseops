export function formatDuration(milliseconds?: number | null): string {
  if (milliseconds === undefined || milliseconds === null) return "—";
  if (milliseconds < 1_000) return `${Math.round(milliseconds)} ms`;

  const totalSeconds = Math.round(milliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatPercent(value?: number | null, options: { signed?: boolean } = {}): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  const prefix = options.signed && value > 0 ? "+" : "";
  return `${prefix}${Math.round(value)}%`;
}

export function formatRelativeTime(date?: Date | null, now = new Date()): string {
  if (!date) return "never";
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1_000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function shortSha(sha?: string | null): string {
  return sha ? sha.slice(0, 8) : "—";
}
