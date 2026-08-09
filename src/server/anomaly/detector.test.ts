import { describe, expect, it } from "vitest";
import { detectAnomaly } from "@/server/anomaly/detector";
import { calculateBaseline } from "@/server/anomaly/statistics";

const durations = [1_830_000, 1_870_000, 1_850_000, 1_910_000, 1_860_000, 1_820_000, 1_900_000, 1_840_000, 1_890_000, 1_875_000];

describe("test anomaly detector", () => {
  it("detects a materially slow run", () => {
    const result = detectAnomaly(2_830_000, calculateBaseline(durations));
    expect(result.type).toBe("SLOW");
    expect(result.severity).toBe("CRITICAL");
  });

  it("detects suspiciously fast incomplete execution", () => {
    const baseline = calculateBaseline(durations, Array(10).fill(140));
    const result = detectAnomaly(480_000, baseline, 42);
    expect(result.type).toBe("FAST");
    expect(result.reasons.some((reason) => reason.includes("fewer tests"))).toBe(true);
  });

  it("does not alert before the minimum sample count", () => {
    expect(detectAnomaly(5_000_000, calculateBaseline(durations.slice(0, 5))).type).toBe("NONE");
  });
});
