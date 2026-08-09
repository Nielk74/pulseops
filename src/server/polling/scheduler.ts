import { loadConfig } from "@/server/config";
import { syncSource } from "@/server/polling/sync";
import type { SourceId } from "@/shared/types/domain";

type SchedulerState = { started: boolean; timers: Array<ReturnType<typeof setInterval>> };
const globalScheduler = globalThis as typeof globalThis & { __pulseOpsScheduler?: SchedulerState };
const state = globalScheduler.__pulseOpsScheduler ?? { started: false, timers: [] };
globalScheduler.__pulseOpsScheduler = state;

export function startPollingScheduler() {
  const config = loadConfig();
  if (!config.pollingEnabled || state.started) return;
  state.started = true;

  for (const source of Object.keys(config.pollingSeconds) as SourceId[]) {
    void syncSource(source);
    const timer = setInterval(() => void syncSource(source), config.pollingSeconds[source] * 1_000);
    timer.unref?.();
    state.timers.push(timer);
  }
}
