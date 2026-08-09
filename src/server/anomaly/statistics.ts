export function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, quantile));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function median(values: number[]): number {
  return percentile(values, 0.5);
}

export function medianAbsoluteDeviation(values: number[], center = median(values)): number {
  return median(values.map((value) => Math.abs(value - center)));
}

export interface Baseline {
  sampleCount: number;
  medianMs: number;
  p25Ms: number;
  p75Ms: number;
  p90Ms: number;
  p95Ms: number;
  madMs: number;
  medianTestCount?: number;
}

export function calculateBaseline(durations: number[], testCounts: number[] = []): Baseline {
  const medianMs = median(durations);
  return {
    sampleCount: durations.length,
    medianMs: Math.round(medianMs),
    p25Ms: Math.round(percentile(durations, 0.25)),
    p75Ms: Math.round(percentile(durations, 0.75)),
    p90Ms: Math.round(percentile(durations, 0.9)),
    p95Ms: Math.round(percentile(durations, 0.95)),
    madMs: Math.round(medianAbsoluteDeviation(durations, medianMs)),
    medianTestCount: testCounts.length ? Math.round(median(testCounts)) : undefined
  };
}
