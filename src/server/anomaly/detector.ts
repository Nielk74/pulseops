import type { AnomalyType, Severity } from "@/shared/types/domain";
import type { Baseline } from "@/server/anomaly/statistics";

export interface AnomalyRules {
  minimumSamples: number;
  warningMadMultiplier: number;
  criticalMadMultiplier: number;
  minimumDeltaPercent: number;
  minimumDeltaMs: number;
  fastDurationRatio: number;
  fastTestCountRatio: number;
}

export const defaultAnomalyRules: AnomalyRules = {
  minimumSamples: 10,
  warningMadMultiplier: 3,
  criticalMadMultiplier: 6,
  minimumDeltaPercent: 20,
  minimumDeltaMs: 30_000,
  fastDurationRatio: 0.7,
  fastTestCountRatio: 0.75
};

export interface AnomalyResult {
  type: AnomalyType;
  severity: Severity;
  score: number;
  deltaPercent: number;
  reasons: string[];
}

export function detectAnomaly(
  durationMs: number,
  baseline: Baseline,
  currentTestCount?: number,
  rules: AnomalyRules = defaultAnomalyRules
): AnomalyResult {
  const deltaMs = durationMs - baseline.medianMs;
  const deltaPercent = baseline.medianMs === 0 ? 0 : (deltaMs / baseline.medianMs) * 100;
  const effectiveMad = baseline.madMs > 0 ? baseline.madMs : Math.max(baseline.medianMs * 0.1, 1);
  const signedScore = deltaMs / effectiveMad;

  if (baseline.sampleCount < rules.minimumSamples) {
    return { type: "NONE", severity: "INFO", score: Math.abs(signedScore), deltaPercent, reasons: ["Baseline is still learning"] };
  }

  const slowEnough = deltaPercent >= rules.minimumDeltaPercent && deltaMs >= rules.minimumDeltaMs;
  if (slowEnough && signedScore >= rules.warningMadMultiplier) {
    return {
      type: "SLOW",
      severity: signedScore >= rules.criticalMadMultiplier ? "CRITICAL" : "HIGH",
      score: signedScore,
      deltaPercent,
      reasons: [
        `${Math.round(deltaPercent)}% slower than the historical median`,
        `${signedScore.toFixed(1)} median absolute deviations from normal`
      ]
    };
  }

  const durationRatio = baseline.medianMs === 0 ? 1 : durationMs / baseline.medianMs;
  const testCountRatio = currentTestCount && baseline.medianTestCount
    ? currentTestCount / baseline.medianTestCount
    : undefined;
  const countSupportsFastAnomaly = testCountRatio === undefined || testCountRatio <= rules.fastTestCountRatio;
  if (durationRatio <= rules.fastDurationRatio && Math.abs(deltaMs) >= rules.minimumDeltaMs && countSupportsFastAnomaly) {
    const reasons = [`${Math.round(Math.abs(deltaPercent))}% faster than the historical median`];
    if (testCountRatio !== undefined) reasons.push(`${Math.round((1 - testCountRatio) * 100)}% fewer tests executed`);
    return {
      type: "FAST",
      severity: durationRatio <= 0.4 || (testCountRatio !== undefined && testCountRatio <= 0.5) ? "CRITICAL" : "HIGH",
      score: Math.abs(signedScore),
      deltaPercent,
      reasons
    };
  }

  return { type: "NONE", severity: "INFO", score: Math.abs(signedScore), deltaPercent, reasons: ["Within the expected historical range"] };
}
