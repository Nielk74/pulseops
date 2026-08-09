import { describe, expect, it } from "vitest";
import { scoreEvidence } from "@/server/correlation/scoring";

describe("rule-based evidence scoring", () => {
  it("ranks an overlapping service degradation above a routine deployment", () => {
    const result = scoreEvidence({
      anomalyType: "SLOW",
      services: [{ serviceName: "PricingApi", status: "DEGRADED", latencyMs: 480, errorCount: 72, overlapPercent: 61 }],
      deployment: { service: "PricingApi", status: "SUCCESS", minutesBeforeRun: 48 }
    });
    expect(result[0].category).toBe("SERVICE");
    expect(result[0].entity).toBe("PricingApi");
  });

  it("ranks reduced discovery for a fast run", () => {
    const result = scoreEvidence({ anomalyType: "FAST", currentTestCount: 38, medianTestCount: 143, services: [] });
    expect(result[0].category).toBe("TEST_CONFIGURATION");
    expect(result[0].score).toBeGreaterThan(80);
  });
});
