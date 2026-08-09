import { describe, expect, it } from "vitest";
import { calculateBaseline, median, medianAbsoluteDeviation, percentile } from "@/server/anomaly/statistics";

describe("robust statistics", () => {
  it("calculates percentiles and median for odd and even samples", () => {
    expect(median([1, 9, 3])).toBe(3);
    expect(median([1, 3, 5, 7])).toBe(4);
    expect(percentile([10, 20, 30, 40, 50], 0.9)).toBe(46);
  });

  it("keeps the baseline robust in the presence of an outlier", () => {
    const values = [100, 101, 98, 103, 99, 102, 100, 97, 101, 99, 900];
    const baseline = calculateBaseline(values);
    expect(baseline.medianMs).toBe(100);
    expect(medianAbsoluteDeviation(values, baseline.medianMs)).toBe(1);
  });
});
